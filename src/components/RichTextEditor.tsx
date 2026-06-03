import { useEffect, useRef, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link as LinkIcon,
  Heading2,
  Quote,
  Eraser,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// Strip scripts/styles/event handlers from pasted/loaded HTML.
const sanitize = (html: string): string =>
  html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<meta\b[^>]*>/gi, "")
    .replace(/<link\b[^>]*>/gi, "")
    .replace(/ on\w+="[^"]*"/gi, "")
    .replace(/ on\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");

/**
 * WYSIWYG editor that outputs sanitized HTML.
 * - Bullets / numbered lists work on the current selection (multi-line aware)
 * - Pasting from Word / Google Docs / web preserves alignment & lists
 * - Output is HTML, rendered by FormattedContent via dangerouslySetInnerHTML
 */
const RichTextEditor = ({ value, onChange, placeholder, className }: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Sync external value into the DOM only when it differs (avoid caret jumps while typing).
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const incoming = value || "";
    if (el.innerHTML !== incoming) {
      el.innerHTML = sanitize(incoming);
    }
  }, [value]);

  const emitChange = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    // Treat an editor containing only an empty <br>/<p><br></p> as empty string.
    const html = el.innerHTML;
    const isEmpty =
      el.textContent?.trim().length === 0 &&
      !/<img|<iframe|<video/i.test(html);
    onChange(isEmpty ? "" : html);
  }, [onChange]);

  const exec = useCallback(
    (command: string, arg?: string) => {
      editorRef.current?.focus();
      try {
        document.execCommand(command, false, arg);
      } catch {
        /* ignore */
      }
      emitChange();
    },
    [emitChange]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault();
      const cb = e.clipboardData;
      const html = cb.getData("text/html");
      const text = cb.getData("text/plain");

      if (html) {
        // Strip Office/Google wrappers but keep alignment, lists, headings.
        const cleaned = sanitize(
          html
            .replace(/<!--[\s\S]*?-->/g, "")
            .replace(/<\/?(html|body|head|meta|link|o:p|xml)[^>]*>/gi, "")
            .replace(/ class="[^"]*"/gi, "")
            .replace(/ style="([^"]*)"/gi, (_m, s) => {
              // Keep only alignment / text-decoration / font-weight / list-style.
              const allowed = s
                .split(";")
                .map((p: string) => p.trim())
                .filter((p: string) =>
                  /^(text-align|text-decoration|font-weight|font-style|list-style|margin-left|padding-left)\s*:/i.test(
                    p
                  )
                )
                .join("; ");
              return allowed ? ` style="${allowed}"` : "";
            })
        );
        document.execCommand("insertHTML", false, cleaned);
      } else if (text) {
        // Preserve newlines from plain-text paste.
        const escaped = text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\n/g, "<br>");
        document.execCommand("insertHTML", false, escaped);
      }
      emitChange();
    },
    [emitChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === "b") {
      e.preventDefault();
      exec("bold");
    } else if (k === "i") {
      e.preventDefault();
      exec("italic");
    } else if (k === "u") {
      e.preventDefault();
      exec("underline");
    } else if (k === "k") {
      e.preventDefault();
      const url = prompt("Enter URL:");
      if (url) exec("createLink", url);
    }
  };

  const insertHeading = () => {
    // Toggle H2 on current block.
    exec("formatBlock", "<h2>");
  };

  const insertQuote = () => exec("formatBlock", "<blockquote>");
  const clearFormat = () => {
    exec("removeFormat");
    exec("formatBlock", "<p>");
  };

  const insertLink = () => {
    const url = prompt("Enter URL:");
    if (url) exec("createLink", url);
  };

  const tools: Array<
    | { id: "sep" }
    | {
        id: string;
        icon: typeof Bold;
        label: string;
        run: () => void;
      }
  > = [
    { id: "bold", icon: Bold, label: "Bold (Ctrl+B)", run: () => exec("bold") },
    { id: "italic", icon: Italic, label: "Italic (Ctrl+I)", run: () => exec("italic") },
    { id: "underline", icon: Underline, label: "Underline (Ctrl+U)", run: () => exec("underline") },
    { id: "heading", icon: Heading2, label: "Heading", run: insertHeading },
    { id: "sep" },
    { id: "ul", icon: List, label: "Bullet list", run: () => exec("insertUnorderedList") },
    { id: "ol", icon: ListOrdered, label: "Numbered list", run: () => exec("insertOrderedList") },
    { id: "quote", icon: Quote, label: "Quote", run: insertQuote },
    { id: "sep" },
    { id: "left", icon: AlignLeft, label: "Align left", run: () => exec("justifyLeft") },
    { id: "center", icon: AlignCenter, label: "Align center", run: () => exec("justifyCenter") },
    { id: "right", icon: AlignRight, label: "Align right", run: () => exec("justifyRight") },
    { id: "justify", icon: AlignJustify, label: "Justify", run: () => exec("justifyFull") },
    { id: "sep" },
    { id: "link", icon: LinkIcon, label: "Insert link (Ctrl+K)", run: insertLink },
    { id: "clear", icon: Eraser, label: "Clear formatting", run: clearFormat },
  ];

  const showPlaceholder = !value && !isFocused;

  return (
    <div className={cn("border rounded-lg bg-background", className)}>
      {/* Toolbar */}
      <div className="border-b bg-muted/30 p-2 sticky top-0 z-10">
        <div className="flex flex-wrap items-center gap-1">
          {tools.map((t, i) => {
            if (t.id === "sep") {
              return <div key={`sep-${i}`} className="w-px h-6 bg-border mx-1" />;
            }
            const Icon = t.icon;
            return (
              <Button
                key={t.id}
                type="button"
                variant="ghost"
                size="sm"
                title={t.label}
                onMouseDown={(e) => e.preventDefault()} // keep selection
                onClick={t.run}
                className="h-8 w-8 p-0 hover:bg-accent"
              >
                <Icon className="h-4 w-4" />
              </Button>
            );
          })}
        </div>
      </div>

      {/* Editable area */}
      <div className="relative">
        {showPlaceholder && placeholder && (
          <div className="pointer-events-none absolute top-3 left-3 text-sm text-muted-foreground">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={emitChange}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={cn(
            "prose prose-sm max-w-none dark:prose-invert",
            "min-h-[200px] w-full px-3 py-2 text-sm focus:outline-none",
            "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6",
            "[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:my-3",
            "[&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:italic",
            "[&_a]:text-primary [&_a]:underline"
          )}
        />
      </div>
    </div>
  );
};

export default RichTextEditor;
