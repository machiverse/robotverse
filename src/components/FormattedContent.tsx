import { cn } from "@/lib/utils";

interface FormattedContentProps {
  content: string;
  className?: string;
}

// Sanitize potentially-unsafe HTML by removing script/style/event handlers.
const sanitizeHtml = (html: string): string => {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/ on\w+="[^"]*"/gi, "")
    .replace(/ on\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
};

const FormattedContent = ({ content, className }: FormattedContentProps) => {
  // If content already contains HTML markup (from the rich editor),
  // render it directly so alignment, lists, and formatting are preserved
  // exactly as the author wrote/pasted them.
  const looksLikeHtml = /<\/?(p|div|span|h[1-6]|ul|ol|li|br|strong|em|u|a|img|blockquote|figure|table|iframe)\b/i.test(content || "");

  if (looksLikeHtml) {
    return (
      <div
        className={cn(
          "prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap break-words",
          className
        )}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
      />
    );
  }

  // Parse and render formatted content (markdown-like fallback)
  const parseContent = (text: string) => {
    if (!text) return [];

    const lines = text.split('\n');
    const elements: JSX.Element[] = [];

    lines.forEach((line, index) => {
      if (!line.trim()) {
        elements.push(<br key={`br-${index}`} />);
        return;
      }

      // Process inline formatting
      let processedLine = line;
      const lineElements: (string | JSX.Element)[] = [];
      let lastIndex = 0;

      // Handle bold text **text**
      processedLine.replace(/\*\*(.*?)\*\*/g, (match, p1, offset) => {
        if (offset > lastIndex) {
          lineElements.push(processedLine.slice(lastIndex, offset));
        }
        lineElements.push(<strong key={`bold-${index}-${offset}`}>{p1}</strong>);
        lastIndex = offset + match.length;
        return match;
      });

      // Handle italic text *text*
      const remainingText = processedLine.slice(lastIndex);
      let currentIndex = lastIndex;
      remainingText.replace(/\*(.*?)\*/g, (match, p1, offset) => {
        const absoluteOffset = currentIndex + offset;
        if (absoluteOffset > lastIndex) {
          lineElements.push(processedLine.slice(lastIndex, absoluteOffset));
        }
        lineElements.push(<em key={`italic-${index}-${absoluteOffset}`}>{p1}</em>);
        lastIndex = absoluteOffset + match.length;
        return match;
      });

      // Add remaining text
      if (lastIndex < processedLine.length) {
        lineElements.push(processedLine.slice(lastIndex));
      }

      // Handle underline <u>text</u>
      const finalElements: (string | JSX.Element)[] = [];
      lineElements.forEach((element, elemIndex) => {
        if (typeof element === 'string') {
          const parts = element.split(/(<u>.*?<\/u>)/g);
          parts.forEach((part, partIndex) => {
            if (part.startsWith('<u>') && part.endsWith('</u>')) {
              const underlineText = part.slice(3, -4);
              finalElements.push(
                <u key={`underline-${index}-${elemIndex}-${partIndex}`}>{underlineText}</u>
              );
            } else if (part) {
              finalElements.push(part);
            }
          });
        } else {
          finalElements.push(element);
        }
      });

      // Handle links [text](url)
      const linkElements: (string | JSX.Element)[] = [];
      finalElements.forEach((element, elemIndex) => {
        if (typeof element === 'string') {
          const parts = element.split(/(\[.*?\]\(.*?\))/g);
          parts.forEach((part, partIndex) => {
            const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
            if (linkMatch) {
              const [, linkText, url] = linkMatch;
              linkElements.push(
                <a 
                  key={`link-${index}-${elemIndex}-${partIndex}`}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 underline font-medium"
                >
                  {linkText}
                </a>
              );
            } else if (part) {
              linkElements.push(part);
            }
          });
        } else {
          linkElements.push(element);
        }
      });

      // Determine line type and create appropriate element
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('## ')) {
        // Heading
        const headingText = trimmedLine.slice(3);
        elements.push(
          <h2 key={`heading-${index}`} className="text-2xl font-bold mt-6 mb-3 text-foreground">
            {headingText}
          </h2>
        );
      } else if (trimmedLine.startsWith('• ')) {
        // Bullet point
        const bulletText = trimmedLine.slice(2);
        elements.push(
          <div key={`bullet-${index}`} className="flex items-start gap-2 mb-2">
            <span className="text-primary font-bold mt-1">•</span>
            <span className="flex-1">{bulletText}</span>
          </div>
        );
      } else if (trimmedLine.match(/^\d+\.\s/)) {
        // Numbered list
        const numberMatch = trimmedLine.match(/^(\d+)\.\s(.*)$/);
        if (numberMatch) {
          const [, number, text] = numberMatch;
          elements.push(
            <div key={`numbered-${index}`} className="flex items-start gap-2 mb-2">
              <span className="text-primary font-bold mt-1">{number}.</span>
              <span className="flex-1">{text}</span>
            </div>
          );
        }
      } else if (trimmedLine.startsWith('✅ ')) {
        // Checkmark list
        const checkText = trimmedLine.slice(2);
        elements.push(
          <div key={`check-${index}`} className="flex items-start gap-2 mb-2">
            <span className="text-green-500 mt-1">✅</span>
            <span className="flex-1">{checkText}</span>
          </div>
        );
      } else if (trimmedLine.startsWith('> ')) {
        // Quote
        const quoteText = trimmedLine.slice(2);
        elements.push(
          <blockquote key={`quote-${index}`} className="border-l-4 border-primary/30 pl-4 py-2 my-3 bg-muted/30 rounded-r-lg">
            <span className="italic text-muted-foreground">{quoteText}</span>
          </blockquote>
        );
      } else if (trimmedLine.startsWith('<div style="text-align:')) {
        // Alignment divs
        const alignMatch = trimmedLine.match(/^<div style="text-align:\s*(left|center|right|justify);">(.*)<\/div>$/);
        if (alignMatch) {
          const [, alignment, text] = alignMatch;
          elements.push(
            <div key={`align-${index}`} style={{ textAlign: alignment as any }} className="mb-2">
              {text}
            </div>
          );
        }
      } else {
        // Regular paragraph
        elements.push(
          <p key={`para-${index}`} className="mb-3 leading-relaxed">
            {linkElements.length > 0 ? linkElements : line}
          </p>
        );
      }
    });

    return elements;
  };

  const renderedContent = parseContent(content);

  return (
    <div className={cn("prose prose-sm max-w-none dark:prose-invert", className)}>
      {renderedContent}
    </div>
  );
};

export default FormattedContent;