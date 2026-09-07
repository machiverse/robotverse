// Shared suppression helper for service-role edge functions.
//
// Service-role clients bypass RLS, so any function that returns PUBLIC content
// must apply the same moderation filter the database applies to browsers:
// content owned by an account whose profiles.account_status is not 'active'
// must not be served (sitemaps, prerendered HTML, public API).
//
// Suppression is reversible and is never a delete. Business fields such as
// robots.availability are unrelated and must not be used for this purpose.

export async function getSuppressedUserIds(admin: any): Promise<string[]> {
  try {
    const { data } = await admin
      .from("profiles")
      .select("user_id")
      .neq("account_status", "active");
    return (data ?? []).map((r: any) => r.user_id).filter(Boolean);
  } catch (_e) {
    return [];
  }
}

/** Adds `owner NOT IN (...suppressed)` to a PostgREST query builder. */
export function excludeSuppressed<T>(query: T, ownerColumn: string, suppressed: string[]): T {
  if (!suppressed.length) return query;
  return (query as any).not(ownerColumn, "in", `(${suppressed.join(",")})`);
}

/** True when the owner of a single record is suppressed. */
export function isSuppressedOwner(ownerId: string | null | undefined, suppressed: string[]): boolean {
  return !!ownerId && suppressed.includes(ownerId);
}
