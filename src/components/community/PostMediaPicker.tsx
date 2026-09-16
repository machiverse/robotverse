import { useRef } from "react";
import { Upload, X, FileText, Image as ImageIcon, Video, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  MediaItem,
  MAX_IMAGES,
  MAX_DOCUMENTS,
  FILE_ACCEPT,
  formatFileSize,
  kindOfType,
  validateSelection,
} from "@/lib/postMedia";

interface PostMediaPickerProps {
  /** Already-saved media (edit mode). */
  existingItems?: MediaItem[];
  onRemoveExisting?: (url: string) => void;
  files: File[];
  onFilesChange: (files: File[]) => void;
  errors: string[];
  onErrorsChange: (errors: string[]) => void;
}

const iconFor = (kind: MediaItem['type']) =>
  kind === 'image' ? ImageIcon : kind === 'video' ? Video : FileText;

const PostMediaPicker = ({
  existingItems = [],
  onRemoveExisting,
  files,
  onFilesChange,
  errors,
  onErrorsChange,
}: PostMediaPickerProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const count = (kind: MediaItem['type']) =>
    existingItems.filter((i) => i.type === kind).length +
    files.filter((f) => kindOfType(f.type) === kind).length;

  const imageCount = count('image');
  const documentCount = count('document');

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    if (selected.length === 0) return;
    const { accepted, errors: selectionErrors } = validateSelection(selected, {
      images: imageCount,
      documents: documentCount,
      videos: count('video'),
    });
    onErrorsChange(selectionErrors);
    if (accepted.length > 0) onFilesChange([...files, ...accepted]);
    event.target.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-base font-semibold">Photos & Files</Label>
        <span className="text-xs text-muted-foreground">
          {imageCount}/{MAX_IMAGES} images · {documentCount}/{MAX_DOCUMENTS} PDF/Word
        </span>
      </div>

      {errors.length > 0 && (
        <div className="rounded-lg border border-destructive bg-destructive/5 p-3">
          <div className="mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium text-destructive">Upload issues</span>
          </div>
          <ul className="space-y-1 text-xs text-destructive">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {(existingItems.length > 0 || files.length > 0) && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {existingItems.map((item) => {
            const Icon = iconFor(item.type);
            return (
              <div key={item.url} className="relative overflow-hidden rounded-lg border border-border bg-card">
                {item.type === 'image' ? (
                  <img src={item.url} alt={item.name || 'Attachment'} className="aspect-square w-full object-cover" />
                ) : (
                  <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 p-3 text-center">
                    <Icon className="h-7 w-7 text-muted-foreground" />
                    <span className="line-clamp-2 text-xs text-muted-foreground">{item.name || item.type}</span>
                  </div>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute right-1.5 top-1.5 h-7 w-7"
                  onClick={() => onRemoveExisting?.(item.url)}
                  aria-label="Remove attachment"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}

          {files.map((file, index) => {
            const kind = kindOfType(file.type);
            const Icon = iconFor(kind);
            return (
              <div
                key={`${file.name}-${index}`}
                className="relative overflow-hidden rounded-lg border border-border bg-card"
              >
                {kind === 'image' ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 p-3 text-center">
                    <Icon className="h-7 w-7 text-muted-foreground" />
                    <span className="line-clamp-2 text-xs font-medium">{file.name}</span>
                    <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                  </div>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute right-1.5 top-1.5 h-7 w-7"
                  onClick={() => onFilesChange(files.filter((_, i) => i !== index))}
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border-2 border-dashed border-primary/25 bg-primary/5 p-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Upload className="h-7 w-7 text-primary" />
        </div>
        <h4 className="mb-1 font-semibold text-foreground">Add photos, video or documents</h4>
        <p className="mb-4 text-sm text-muted-foreground">
          Up to {MAX_IMAGES} images and {MAX_DOCUMENTS} PDF/Word files (max 50MB each)
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={FILE_ACCEPT}
          onChange={handleChange}
          className="hidden"
        />
        <Button
          type="button"
          variant="default"
          size="sm"
          className="rounded-full px-6"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          Choose Files
        </Button>
      </div>
    </div>
  );
};

export default PostMediaPicker;
