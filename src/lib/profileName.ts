// Single source of truth for how a signed-in person is identified in the UI.
// Rule: show the account's Name only — never the email address, and never an
// email-derived username, so the same person reads the same everywhere.

type ProfileLike = {
  full_name?: string | null;
  display_name?: string | null;
  email?: string | null;
} | null | undefined;

type UserLike = {
  email?: string | null;
  user_metadata?: { full_name?: string | null; name?: string | null } | null;
} | null | undefined;

const FALLBACK_NAME = "User";

const clean = (value?: string | null) => (typeof value === "string" ? value.trim() : "");

/** True when a value is a real name rather than an email or an email prefix. */
const isName = (value: string) => value.length > 0 && !value.includes("@");

/**
 * The name to show for a signed-in account.
 * Order: saved profile name → name given at sign-up → neutral "User".
 * Email addresses (and email prefixes) are never returned.
 */
export function getProfileDisplayName(profile?: ProfileLike, user?: UserLike): string {
  const candidates = [
    profile?.full_name,
    profile?.display_name,
    user?.user_metadata?.full_name,
    user?.user_metadata?.name,
  ];
  for (const candidate of candidates) {
    const value = clean(candidate);
    if (isName(value)) return value;
  }
  return FALLBACK_NAME;
}

/** Initials for the avatar, taken from the display name only. */
export function getProfileInitials(displayName: string): string {
  const name = clean(displayName);
  if (!name || name === FALLBACK_NAME) return "U";
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}
