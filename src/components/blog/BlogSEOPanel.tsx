import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";
import { slugify, SITE_URL } from "@/utils/blogSeo";

export interface SeoFields {
  slug: string;
  meta_title: string;
  meta_description: string;
  focus_keywords: string[];
  seo_tags: string[];
  canonical_url: string;
  category: string;
}

interface BlogSEOPanelProps {
  title: string;
  excerpt: string;
  fields: SeoFields;
  onChange: (next: SeoFields) => void;
}

const ChipInput = ({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) => {
  const add = (raw: string) => {
    const v = raw.trim().replace(/^#/, "");
    if (!v) return;
    if (values.includes(v)) return;
    onChange([...values, v]);
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add((e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).value = "";
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={(e) => {
            const input = (e.currentTarget.previousSibling as HTMLInputElement);
            if (input?.value) {
              add(input.value);
              input.value = "";
            }
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <Badge key={v} variant="secondary" className="gap-1 pr-1">
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="hover:bg-muted rounded p-0.5"
                aria-label={`Remove ${v}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

const BlogSEOPanel = ({ title, excerpt, fields, onChange }: BlogSEOPanelProps) => {
  // Auto-generate slug from title if user hasn't customized
  useEffect(() => {
    if (!fields.slug && title) {
      onChange({ ...fields, slug: slugify(title) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  const set = <K extends keyof SeoFields>(k: K, v: SeoFields[K]) =>
    onChange({ ...fields, [k]: v });

  const metaTitle = fields.meta_title || title;
  const metaDesc = fields.meta_description || excerpt;

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="seo-meta-title" className="text-sm font-semibold">
          Meta title
        </Label>
        <Input
          id="seo-meta-title"
          value={fields.meta_title}
          onChange={(e) => set("meta_title", e.target.value)}
          placeholder={title || "Page title for search engines"}
          maxLength={70}
        />
        <p className="text-xs text-muted-foreground">
          {(metaTitle || "").length}/60 chars · shown in Google &amp; social previews
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="seo-meta-desc" className="text-sm font-semibold">
          Meta description
        </Label>
        <Textarea
          id="seo-meta-desc"
          value={fields.meta_description}
          onChange={(e) => set("meta_description", e.target.value)}
          placeholder={excerpt || "Short summary for search engines and social previews"}
          maxLength={180}
          className="min-h-[80px]"
        />
        <p className="text-xs text-muted-foreground">{(metaDesc || "").length}/160 chars</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="seo-slug" className="text-sm font-semibold">
          URL slug
        </Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {SITE_URL}/blog/
          </span>
          <Input
            id="seo-slug"
            value={fields.slug}
            onChange={(e) => set("slug", slugify(e.target.value))}
            placeholder="my-blog-post"
          />
        </div>
        <p className="text-xs text-muted-foreground">Lowercase, hyphens only. Auto-generated from title.</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">Focus keywords</Label>
        <ChipInput
          values={fields.focus_keywords}
          onChange={(v) => set("focus_keywords", v)}
          placeholder="Press Enter to add a keyword"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">SEO tags</Label>
        <ChipInput
          values={fields.seo_tags}
          onChange={(v) => set("seo_tags", v)}
          placeholder="Press Enter to add a tag"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="seo-category" className="text-sm font-semibold">
          Category
        </Label>
        <Input
          id="seo-category"
          value={fields.category}
          onChange={(e) => set("category", e.target.value)}
          placeholder="e.g. Industrial Automation"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="seo-canonical" className="text-sm font-semibold">
          Canonical URL <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id="seo-canonical"
          value={fields.canonical_url}
          onChange={(e) => set("canonical_url", e.target.value)}
          placeholder="Leave blank to use the default URL"
          type="url"
        />
      </div>
    </div>
  );
};

export default BlogSEOPanel;
