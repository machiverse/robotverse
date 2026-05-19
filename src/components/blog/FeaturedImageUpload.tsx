import { useCallback, useState } from "react";
import imageCompression from "browser-image-compression";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { slugify } from "@/utils/blogSeo";
import { cn } from "@/lib/utils";

interface FeaturedImageUploadProps {
  imageUrl: string;
  alt: string;
  caption: string;
  onChange: (next: { imageUrl: string; alt: string; caption: string }) => void;
  userId?: string;
}

const FeaturedImageUpload = ({ imageUrl, alt, caption, onChange, userId }: FeaturedImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const upload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }
      try {
        setUploading(true);
        const compressed = await imageCompression(file, {
          maxSizeMB: 0.6,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const baseName = slugify(file.name.replace(/\.[^.]+$/, "")) || "featured";
        const filename = `${userId || "anon"}/blog/${Date.now()}-${baseName}.${ext}`;
        const { error } = await supabase.storage
          .from("robot-images")
          .upload(filename, compressed, {
            cacheControl: "31536000",
            upsert: false,
            contentType: file.type,
          });
        if (error) throw error;
        const { data } = supabase.storage.from("robot-images").getPublicUrl(filename);
        onChange({ imageUrl: data.publicUrl, alt: alt || baseName.replace(/-/g, " "), caption });
        toast.success("Featured image uploaded");
      } catch (e) {
        console.error(e);
        toast.error("Failed to upload image");
      } finally {
        setUploading(false);
      }
    },
    [alt, caption, onChange, userId]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold">Featured image</Label>

      {imageUrl ? (
        <div className="space-y-3">
          <div className="relative group rounded-lg overflow-hidden border bg-muted">
            <img src={imageUrl} alt={alt || ""} className="w-full aspect-[1.91/1] object-cover" />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => onChange({ imageUrl: "", alt: "", caption: "" })}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4 mr-1" /> Remove
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="img-alt" className="text-xs">
                ALT text <span className="text-muted-foreground">(SEO &amp; accessibility)</span>
              </Label>
              <Input
                id="img-alt"
                value={alt}
                onChange={(e) => onChange({ imageUrl, alt: e.target.value, caption })}
                placeholder="Describe the image"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="img-caption" className="text-xs">
                Caption <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="img-caption"
                value={caption}
                onChange={(e) => onChange({ imageUrl, alt, caption: e.target.value })}
                placeholder="Image caption shown under the photo"
                className="min-h-[40px] h-[40px] py-2"
                rows={1}
              />
            </div>
          </div>
        </div>
      ) : (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn(
            "flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg py-10 px-4 text-center cursor-pointer transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/20 hover:bg-muted/40"
          )}
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
            }}
          />
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background border">
            {uploading ? (
              <Upload className="h-5 w-5 animate-pulse" />
            ) : (
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="font-medium text-sm">
              {uploading ? "Uploading…" : "Drop image here or click to upload"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Auto-compressed. Recommended 1200×630 for social sharing.
            </p>
          </div>
        </label>
      )}
    </div>
  );
};

export default FeaturedImageUpload;
