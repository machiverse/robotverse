export type PostMediaKind = 'image' | 'video' | 'document';

export interface PostMediaItem {
  url: string;
  type: PostMediaKind;
  name?: string;
  size?: number;
}

export const MAX_VISUAL_ITEMS = 6; // images + videos
export const MAX_DOCUMENT_ITEMS = 3; // pdf / doc attachments
export const MAX_MEDIA_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

export const VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/mov',
  'video/quicktime',
  'video/avi',
];

export const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const MEDIA_ACCEPT_ATTR =
  '.jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.mov,.avi,.pdf,.doc,.docx';

export const kindForMimeType = (mime: string): PostMediaKind | null => {
  if (IMAGE_MIME_TYPES.includes(mime)) return 'image';
  if (VIDEO_MIME_TYPES.includes(mime) || mime.startsWith('video/')) return 'video';
  if (DOCUMENT_MIME_TYPES.includes(mime)) return 'document';
  return null;
};

export const kindForUrl = (url: string): PostMediaKind => {
  const clean = url.split('?')[0].toLowerCase();
  if (/\.(mp4|webm|mov|avi)$/.test(clean) || clean.includes('youtube') || clean.includes('vimeo')) {
    return 'video';
  }
  if (/\.(pdf|doc|docx)$/.test(clean)) return 'document';
  return 'image';
};

export const formatFileSize = (bytes?: number) => {
  if (!bytes || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(1))} ${units[i]}`;
};

/**
 * Normalises whatever is stored in community_posts.media_items (jsonb) plus the
 * legacy single media_url/media_type pair into one ordered list.
 */
export const normalizePostMedia = (
  mediaItems: unknown,
  legacyUrl?: string | null,
  legacyType?: string | null,
): PostMediaItem[] => {
  const items: PostMediaItem[] = [];

  if (Array.isArray(mediaItems)) {
    for (const raw of mediaItems) {
      if (!raw || typeof raw !== 'object') continue;
      const url = (raw as any).url;
      if (typeof url !== 'string' || !url.trim()) continue;
      const rawType = (raw as any).type;
      const type: PostMediaKind =
        rawType === 'image' || rawType === 'video' || rawType === 'document'
          ? rawType
          : kindForUrl(url);
      items.push({
        url,
        type,
        name: typeof (raw as any).name === 'string' ? (raw as any).name : undefined,
        size: typeof (raw as any).size === 'number' ? (raw as any).size : undefined,
      });
    }
  }

  if (items.length === 0 && legacyUrl) {
    items.push({
      url: legacyUrl,
      type: legacyType === 'video' ? 'video' : kindForUrl(legacyUrl),
    });
  }

  // De-duplicate by url, preserving order
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
};

export const splitPostMedia = (items: PostMediaItem[]) => ({
  visuals: items.filter((i) => i.type === 'image' || i.type === 'video'),
  documents: items.filter((i) => i.type === 'document'),
});
