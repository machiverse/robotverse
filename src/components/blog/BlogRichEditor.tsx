import { useEffect, useCallback } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import Youtube from "@tiptap/extension-youtube";
import TextAlign from "@tiptap/extension-text-align";
import imageCompression from "browser-image-compression";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { toast } from "sonner";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Youtube as YoutubeIcon,
  Undo2,
  Redo2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { slugify } from "@/utils/blogSeo";

interface BlogRichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  userId?: string;
  className?: string;
}

const ToolbarBtn = ({
  active,
  onClick,
  label,
  children,
  disabled,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}) => (
  <Toggle
    size="sm"
    pressed={!!active}
    onPressedChange={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
    className="h-8 w-8 p-0 data-[state=on]:bg-accent"
  >
    {children}
  </Toggle>
);

const Sep = () => <div className="w-px h-6 bg-border mx-1" />;

async function uploadEditorImage(file: File, userId?: string): Promise<string> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
  });
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const baseName = slugify(file.name.replace(/\.[^.]+$/, "")) || "image";
  const filename = `${userId || "anon"}/${Date.now()}-${baseName}.${ext}`;
  const { error } = await supabase.storage.from("robot-images").upload(filename, compressed, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("robot-images").getPublicUrl(filename);
  return data.publicUrl;
}

const BlogRichEditor = ({ value, onChange, placeholder, userId, className }: BlogRichEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Image.configure({ HTMLAttributes: { loading: "lazy", decoding: "async" } }),
      Youtube.configure({ controls: true, nocookie: true, width: 640, height: 360 }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: placeholder || "Write your article…" }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "prose prose-lg dark:prose-invert max-w-none min-h-[400px] px-4 py-3 focus:outline-hidden",
      },
      handleDrop(_view, event) {
        const files = Array.from(event.dataTransfer?.files || []).filter((f) =>
          f.type.startsWith("image/")
        );
        if (files.length === 0) return false;
        event.preventDefault();
        files.forEach(async (f) => {
          try {
            const url = await uploadEditorImage(f, userId);
            editor?.chain().focus().setImage({ src: url, alt: f.name }).run();
          } catch (e) {
            toast.error("Failed to upload image");
          }
        });
        return true;
      },
      handlePaste(_view, event) {
        const files = Array.from(event.clipboardData?.files || []).filter((f) =>
          f.type.startsWith("image/")
        );
        if (files.length === 0) return false;
        event.preventDefault();
        files.forEach(async (f) => {
          try {
            const url = await uploadEditorImage(f, userId);
            editor?.chain().focus().setImage({ src: url, alt: "Pasted image" }).run();
          } catch {
            toast.error("Failed to upload pasted image");
          }
        });
        return true;
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  // Sync external value changes (e.g. when loading existing blog)
  useEffect(() => {
    if (!editor) return;
    if (value && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [editor, value]);

  const insertImage = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !editor) return;
      try {
        toast.loading("Uploading image…", { id: "img-up" });
        const url = await uploadEditorImage(file, userId);
        editor.chain().focus().setImage({ src: url, alt: file.name }).run();
        toast.success("Image inserted", { id: "img-up" });
      } catch {
        toast.error("Failed to upload image", { id: "img-up" });
      }
    };
    input.click();
  }, [editor, userId]);

  const insertLink = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL (use https://… or relative /path)", previous || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const insertYoutube = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("YouTube URL");
    if (!url) return;
    editor.commands.setYoutubeVideo({ src: url });
  }, [editor]);

  if (!editor) return null;

  return (
    <div className={cn("border rounded-lg bg-background overflow-hidden", className)}>
      <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/30 sticky top-0 z-10">
        <ToolbarBtn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} label="Heading 1">
          <Heading1 className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} label="Heading 2">
          <Heading2 className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} label="Heading 3">
          <Heading3 className="h-4 w-4" />
        </ToolbarBtn>
        <Sep />
        <ToolbarBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} label="Bold">
          <Bold className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} label="Italic">
          <Italic className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} label="Underline">
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} label="Strike">
          <Strikethrough className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} label="Inline code">
          <Code className="h-4 w-4" />
        </ToolbarBtn>
        <Sep />
        <ToolbarBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} label="Bullet list">
          <List className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} label="Numbered list">
          <ListOrdered className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} label="Quote">
          <Quote className="h-4 w-4" />
        </ToolbarBtn>
        <Sep />
        <ToolbarBtn active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} label="Align left">
          <AlignLeft className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} label="Align center">
          <AlignCenter className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} label="Align right">
          <AlignRight className="h-4 w-4" />
        </ToolbarBtn>
        <Sep />
        <ToolbarBtn active={editor.isActive("link")} onClick={insertLink} label="Insert link">
          <LinkIcon className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={insertImage} label="Insert image">
          <ImageIcon className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={insertYoutube} label="Embed YouTube">
          <YoutubeIcon className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} label="Divider">
          <Minus className="h-4 w-4" />
        </ToolbarBtn>
        <Sep />
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().undo().run()} aria-label="Undo">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().redo().run()} aria-label="Redo">
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};

export type { Editor };
export default BlogRichEditor;
