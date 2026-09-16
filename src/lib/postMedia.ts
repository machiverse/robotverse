import { supabase } from "@/integrations/supabase/client";

export interface MediaItem {
  url: string;
  type: 'image' | 'video' | 'document';
  name?: string;
  size?: number;
}

export const MAX_IMAGES = 6;
export const MAX_DOCUMENTS = 3;
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const ALLOWED_FILE_TYPES = {
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/webm', 'video/mov', 'video/quicktime', 'video/avi'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
};

export const FILE_ACCEPT = '.jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.mov,.avi,.pdf,.doc,.docx';

export const kindOfType = (mime: string): MediaItem['type'] => {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  return 'document';
};

export const kindOfUrl = (url: string): MediaItem['type'] => {
  if (/\.(mp4|webm|mov|avi)(\?|$)/i.test(url) || url.includes('youtube') || url.includes('vimeo')) return 'video';
  if (/\.(pdf|docx?|)(\?|$)/i.test(url) && /\.(pdf|docx?)(\?|$)/i.test(url)) return 'document';
  return 'image';
};

export const formatFileSize = (bytes?: number) => {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(1))} ${units[i]}`;
};

export const validateFile = (file: File): string[] => {
  const errors: string[] = [];
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`${file.name}: file must be under 50MB (currently ${(file.size / 1024 / 1024).toFixed(1)}MB)`);
  }
  const allowed = [
    ...ALLOWED_FILE_TYPES.image,
    ...ALLOWED_FILE_TYPES.video,
    ...ALLOWED_FILE_TYPES.document,
  ];
  if (!allowed.includes(file.type)) {
    errors.push(`${file.name}: type not supported. Allowed: JPG, PNG, GIF, WebP, MP4, WebM, MOV, AVI, PDF, DOC, DOCX`);
  }
  return errors;
};

/** Validates a new batch of files against already-selected files / existing items. */
export const validateSelection = (
  incoming: File[],
  existing: { images: number; documents: number; videos: number }
): { accepted: File[]; errors: string[] } => {
  const errors: string[] = [];
  const accepted: File[] = [];
  let images = existing.images;
  let documents = existing.documents;

  for (const file of incoming) {
    const fileErrors = validateFile(file);
    if (fileErrors.length) {
      errors.push(...fileErrors);
      continue;
    }
    const kind = kindOfType(file.type);
    if (kind === 'image') {
      if (images >= MAX_IMAGES) {
        errors.push(`You can attach up to ${MAX_IMAGES} images.`);
        continue;
      }
      images += 1;
    }
    if (kind === 'document') {
      if (documents >= MAX_DOCUMENTS) {
        errors.push(`You can attach up to ${MAX_DOCUMENTS} PDF/Word files.`);
        continue;
      }
      documents += 1;
    }
    accepted.push(file);
  }

  return { accepted, errors: Array.from(new Set(errors)) };
};

export const uploadPostFile = async (file: File): Promise<MediaItem> => {
  const ext = file.name.split('.').pop();
  const safeBase = file.name
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const filePath = `community-media/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safeBase || 'file'}.${ext}`;

  const { error } = await supabase.storage.from('robot-images').upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;

  const { data } = supabase.storage.from('robot-images').getPublicUrl(filePath);
  return {
    url: data.publicUrl,
    type: kindOfType(file.type),
    name: file.name,
    size: file.size,
  };
};

/** Reads media_items from a post row, falling back to the legacy single media_url. */
export const readMediaItems = (post: any): MediaItem[] => {
  const raw = post?.media_items;
  const items: MediaItem[] = Array.isArray(raw)
    ? raw.filter((i: any) => i && typeof i.url === 'string')
    : [];
  if (items.length > 0) return items;
  if (post?.media_url) {
    return [
      {
        url: post.media_url,
        type: (post.media_type as MediaItem['type']) || kindOfUrl(post.media_url),
        name: undefined,
      },
    ];
  }
  return [];
};
