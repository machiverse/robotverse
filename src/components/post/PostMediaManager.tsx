import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Upload,
  X,
  Loader2,
  AlertCircle,
  FileText,
  Video as VideoIcon,
  Image as ImageIcon,
  GripVertical,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_ITEMS,
  MAX_MEDIA_FILE_SIZE,
  MAX_VISUAL_ITEMS,
  MEDIA_ACCEPT_ATTR,
  PostMediaItem,
  formatFileSize,
  kindForMimeType,
  splitPostMedia,
} from "./postMedia";

interface PostMediaManagerProps {
  items: PostMediaItem[];
  onChange: (items: PostMediaItem[]) => void;
  label?: string;
}

const PostMediaManager = ({ items, onChange, label = "Images & Attachments" }: PostMediaManagerProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const { visuals, documents } = splitPostMedia(items);

  const uploadFile = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop();
    const filePath = `community-media/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage
      .from('robot-images')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from('robot-images').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const nextErrors: string[] = [];
    const accepted: { file: File; kind: 'image' | 'video' | 'document' }[] = [];

    let visualCount = visuals.length;
    let documentCount = documents.length;

    for (const file of files) {
      const kind = kindForMimeType(file.type);
      if (!kind) {
        nextErrors.push(`${file.name}: file type not supported (use JPG, PNG, GIF, WebP, MP4, WebM, MOV, AVI, PDF, DOC, DOCX)`);
        continue;
      }
      if (file.size > MAX_MEDIA_FILE_SIZE) {
        nextErrors.push(`${file.name}: larger than 50MB (${formatFileSize(file.size)})`);
        continue;
      }
      if (kind === 'document') {
        if (documentCount >= MAX_DOCUMENT_ITEMS) {
          nextErrors.push(`${file.name}: you can attach up to ${MAX_DOCUMENT_ITEMS} documents`);
          continue;
        }
        documentCount += 1;
      } else {
        if (visualCount >= MAX_VISUAL_ITEMS) {
          nextErrors.push(`${file.name}: you can add up to ${MAX_VISUAL_ITEMS} images or videos`);
          continue;
        }
        visualCount += 1;
      }
      accepted.push({ file, kind });
    }

    setErrors(nextErrors);
    if (accepted.length === 0) return;

    try {
      setUploading(true);
      const uploaded: PostMediaItem[] = [];
      for (const { file, kind } of accepted) {
        try {
          const url = await uploadFile(file);
          uploaded.push({ url, type: kind, name: file.name, size: file.size });
        } catch (err: any) {
          nextErrors.push(`${file.name}: upload failed (${err?.message || 'unknown error'})`);
        }
      }
      setErrors(nextErrors);
      if (uploaded.length > 0) onChange([...items, ...uploaded]);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeAt = (url: string) => {
    onChange(items.filter((item) => item.url !== url));
    setErrors([]);
  };

  const move = (url: string, direction: -1 | 1) => {
    const index = items.findIndex((item) => item.url === url);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const visualsFull = visuals.length >= MAX_VISUAL_ITEMS;
  const documentsFull = documents.length >= MAX_DOCUMENT_ITEMS;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-base font-semibold">{label}</Label>
        <span className="text-xs text-muted-foreground">
          {visuals.length}/{MAX_VISUAL_ITEMS} media · {documents.length}/{MAX_DOCUMENT_ITEMS} documents
        </span>
      </div>

      {errors.length > 0 && (
        <div className="border border-destructive rounded-lg p-3 bg-destructive/5">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium text-destructive">Some files were not added</span>
          </div>
          <ul className="text-xs text-destructive space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {visuals.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {visuals.map((item) => (
            <div key={item.url} className="relative group rounded-lg overflow-hidden border border-border bg-muted">
              <div className="aspect-[4/3] w-full">
                {item.type === 'video' ? (
                  <video src={item.url} className="h-full w-full object-cover" muted playsInline />
                ) : (
                  <img src={item.url} alt={item.name || 'Post media'} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-foreground/60 px-1.5 py-1">
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-background hover:text-background"
                    onClick={() => move(item.url, -1)}
                    aria-label="Move earlier"
                  >
                    <GripVertical className="h-3.5 w-3.5 rotate-180" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-background hover:text-background"
                    onClick={() => move(item.url, 1)}
                    aria-label="Move later"
                  >
                    <GripVertical className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex items-center gap-1 text-background">
                  {item.type === 'video' ? <VideoIcon className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-background hover:text-background"
                    onClick={() => removeAt(item.url)}
                    aria-label="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((item) => (
            <div key={item.url} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name || 'Attachment'}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(item.size) || 'Document'}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => removeAt(item.url)}
                aria-label="Remove attachment"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border-2 border-dashed border-primary/25 bg-primary/5 p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : (
            <Upload className="h-6 w-6 text-primary" />
          )}
        </div>
        <h4 className="font-semibold text-foreground">Add images, videos or documents</h4>
        <p className="mx-auto mt-1 mb-4 max-w-md text-sm text-muted-foreground">
          Up to {MAX_VISUAL_ITEMS} images/videos and {MAX_DOCUMENT_ITEMS} PDF or Word documents. JPG, PNG, GIF, WebP,
          MP4, WebM, MOV, AVI, PDF, DOC, DOCX — max 50MB each.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={MEDIA_ACCEPT_ATTR}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
        <Button
          type="button"
          size="sm"
          className="rounded-full px-6"
          disabled={uploading || (visualsFull && documentsFull)}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? 'Uploading...' : 'Choose files'}
        </Button>
        {visualsFull && documentsFull && (
          <p className="mt-2 text-xs text-muted-foreground">Limit reached — remove a file to add another.</p>
        )}
      </div>
    </div>
  );
};

export default PostMediaManager;
export { DOCUMENT_MIME_TYPES };
