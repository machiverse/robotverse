export type PostSaveMode = 'draft' | 'publish' | 'schedule' | 'save';

export function canManagePost(authorId?: string, userId?: string, source?: string): boolean {
  return !!authorId && !!userId && authorId === userId;
}

export function postManagementStatus(status?: string, scheduledAt?: string | null): string {
  return status === 'draft' && scheduledAt ? 'scheduled' : status || 'published';
}

export function postPublicationUpdate(mode: PostSaveMode, status?: string, scheduledAt?: string | null, newSchedule?: string | null) {
  const nextStatus = mode === 'save' ? status || 'published' : mode === 'publish' ? 'published' : mode === 'schedule' ? 'scheduled' : 'draft';
  return {
    status: nextStatus,
    is_draft: nextStatus === 'draft',
    scheduled_publish_at: mode === 'save' ? scheduledAt ?? null : mode === 'schedule' ? newSchedule ?? null : null,
  };
}