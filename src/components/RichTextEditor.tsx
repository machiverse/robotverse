import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  Type,
  Heading2,
  Quote,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const RichTextEditor = ({ value, onChange, placeholder, className }: RichTextEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeFormats, setActiveFormats] = useState<string[]>([]);

  const insertAtCursor = useCallback((insertText: string, selectionOffset: number = 0) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const beforeText = value.substring(0, start);
    const afterText = value.substring(end);
    const newValue = beforeText + insertText + afterText;
    
    onChange(newValue);

    // Set cursor position after insertion
    setTimeout(() => {
      const newCursorPos = start + insertText.length + selectionOffset;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  }, [value, onChange]);

  const wrapSelection = useCallback((prefix: string, suffix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const beforeText = value.substring(0, start);
    const afterText = value.substring(end);
    
    const wrappedText = prefix + selectedText + suffix;
    const newValue = beforeText + wrappedText + afterText;
    
    onChange(newValue);

    // Set cursor position after wrapping
    setTimeout(() => {
      if (selectedText) {
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
      } else {
        textarea.setSelectionRange(start + prefix.length, start + prefix.length);
      }
      textarea.focus();
    }, 0);
  }, [value, onChange]);

  const applyFormat = useCallback((format: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    switch (format) {
      case 'bold':
        wrapSelection('**', '**');
        break;
      case 'italic':
        wrapSelection('*', '*');
        break;
      case 'underline':
        wrapSelection('<u>', '</u>');
        break;
      case 'heading':
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const lineEnd = value.indexOf('\n', start);
        const currentLine = value.substring(lineStart, lineEnd === -1 ? value.length : lineEnd);
        
        if (currentLine.startsWith('## ')) {
          // Remove heading
          const newValue = value.substring(0, lineStart) + currentLine.substring(3) + value.substring(lineEnd === -1 ? value.length : lineEnd);
          onChange(newValue);
        } else {
          // Add heading
          const newValue = value.substring(0, lineStart) + '## ' + currentLine + value.substring(lineEnd === -1 ? value.length : lineEnd);
          onChange(newValue);
        }
        break;
      case 'bullet':
        if (start === 0 || value.charAt(start - 1) === '\n') {
          insertAtCursor('• ');
        } else {
          insertAtCursor('\n• ');
        }
        break;
      case 'numbered':
        if (start === 0 || value.charAt(start - 1) === '\n') {
          insertAtCursor('1. ');
        } else {
          insertAtCursor('\n1. ');
        }
        break;
      case 'checkmark':
        if (start === 0 || value.charAt(start - 1) === '\n') {
          insertAtCursor('✅ ');
        } else {
          insertAtCursor('\n✅ ');
        }
        break;
      case 'align-left':
        wrapSelection('<div style="text-align: left;">', '</div>');
        break;
      case 'align-center':
        wrapSelection('<div style="text-align: center;">', '</div>');
        break;
      case 'align-right':
        wrapSelection('<div style="text-align: right;">', '</div>');
        break;
      case 'align-justify':
        wrapSelection('<div style="text-align: justify;">', '</div>');
        break;
      case 'link':
        const url = prompt('Enter URL:');
        if (url) {
          if (selectedText) {
            wrapSelection(`[`, `](${url})`);
          } else {
            insertAtCursor(`[Link Text](${url})`, -1);
          }
        }
        break;
      case 'quote':
        if (start === 0 || value.charAt(start - 1) === '\n') {
          insertAtCursor('> ');
        } else {
          insertAtCursor('\n> ');
        }
        break;
    }
  }, [value, onChange, wrapSelection, insertAtCursor]);

  const toolbarButtons = [
    { id: 'bold', icon: Bold, label: 'Bold', shortcut: 'Ctrl+B' },
    { id: 'italic', icon: Italic, label: 'Italic', shortcut: 'Ctrl+I' },
    { id: 'underline', icon: Underline, label: 'Underline', shortcut: 'Ctrl+U' },
    { id: 'heading', icon: Heading2, label: 'Heading', shortcut: 'Ctrl+H' },
    { id: 'separator' },
    { id: 'bullet', icon: List, label: 'Bullet List' },
    { id: 'numbered', icon: ListOrdered, label: 'Numbered List' },
    { id: 'checkmark', icon: Check, label: 'Checkmark List' },
    { id: 'separator' },
    { id: 'align-left', icon: AlignLeft, label: 'Align Left' },
    { id: 'align-center', icon: AlignCenter, label: 'Align Center' },
    { id: 'align-right', icon: AlignRight, label: 'Align Right' },
    { id: 'align-justify', icon: AlignJustify, label: 'Justify' },
    { id: 'separator' },
    { id: 'link', icon: LinkIcon, label: 'Insert Link', shortcut: 'Ctrl+K' },
    { id: 'quote', icon: Quote, label: 'Quote' },
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          applyFormat('bold');
          break;
        case 'i':
          e.preventDefault();
          applyFormat('italic');
          break;
        case 'u':
          e.preventDefault();
          applyFormat('underline');
          break;
        case 'h':
          e.preventDefault();
          applyFormat('heading');
          break;
        case 'k':
          e.preventDefault();
          applyFormat('link');
          break;
      }
    }
  };

  return (
    <div className={cn("border rounded-lg bg-background", className)}>
      {/* Toolbar */}
      <div className="border-b bg-muted/30 p-2">
        <div className="flex flex-wrap items-center gap-1">
          {toolbarButtons.map((button, index) => {
            if (button.id === 'separator') {
              return <div key={index} className="w-px h-6 bg-border mx-1" />;
            }

            const Icon = button.icon!;
            const isActive = activeFormats.includes(button.id);

            return (
              <Button
                key={button.id}
                variant="ghost"
                size="sm"
                onClick={() => applyFormat(button.id)}
                className={cn(
                  "h-8 w-8 p-0 hover:bg-accent",
                  isActive && "bg-accent text-accent-foreground"
                )}
                title={button.label + (button.shortcut ? ` (${button.shortcut})` : '')}
              >
                <Icon className="h-4 w-4" />
              </Button>
            );
          })}
        </div>
      </div>

      {/* Editor */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="min-h-[200px] border-0 resize-none focus-visible:ring-0 rounded-t-none"
      />
    </div>
  );
};

export default RichTextEditor;