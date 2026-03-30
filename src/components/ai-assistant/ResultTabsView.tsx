import React, { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Bot, Cpu, Wrench, Factory, Truck, Banknote, Users, Lightbulb, LayoutList, AlignJustify, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResultCounts } from "@/contexts/AIAssistantContext";

interface ResultTabsViewProps {
  content: string;
  resultCounts: ResultCounts | null;
  className?: string;
}

interface ParsedSection {
  key: string;
  label: string;
  icon: React.ReactNode;
  content: string;
  count: number;
}

const SECTION_PATTERNS: { regex: RegExp; key: string; label: string; icon: React.ReactNode; countKey?: keyof ResultCounts }[] = [
  { regex: /###\s*🤖\s*Top Matching Robots/i, key: "robots", label: "Robots", icon: <Bot className="w-3.5 h-3.5" />, countKey: "robots" },
  { regex: /###\s*🔧\s*(EOAT|Spare Parts)/i, key: "eoat", label: "EOAT & Parts", icon: <Wrench className="w-3.5 h-3.5" />, countKey: "spareParts" },
  { regex: /###\s*🏭\s*(System Integrators|Service)/i, key: "services", label: "Services", icon: <Factory className="w-3.5 h-3.5" />, countKey: "services" },
  { regex: /###\s*👥\s*(Verified Sellers|Sellers)/i, key: "sellers", label: "Sellers", icon: <Users className="w-3.5 h-3.5" />, countKey: "sellers" },
  { regex: /###\s*🚚\s*Logistics/i, key: "logistics", label: "Logistics", icon: <Truck className="w-3.5 h-3.5" />, countKey: "logistics" },
  { regex: /###\s*💰\s*(Financ|Loan)/i, key: "financing", label: "Financing", icon: <Banknote className="w-3.5 h-3.5" /> },
  { regex: /###\s*💡\s*(Recommendation|Best Match)/i, key: "recommendation", label: "Best Match", icon: <Lightbulb className="w-3.5 h-3.5" /> },
];

function parseSections(content: string, resultCounts: ResultCounts | null): { summary: string; sections: ParsedSection[] } {
  const lines = content.split("\n");
  let summaryLines: string[] = [];
  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection | null = null;
  let currentLines: string[] = [];
  let pastSummary = false;

  for (const line of lines) {
    // Check if line matches any section header
    let matched = false;
    for (const pattern of SECTION_PATTERNS) {
      if (pattern.regex.test(line)) {
        // Save previous section
        if (currentSection) {
          currentSection.content = currentLines.join("\n").trim();
          if (currentSection.content) sections.push(currentSection);
        }
        pastSummary = true;
        const count = pattern.countKey && resultCounts ? resultCounts[pattern.countKey] : 0;
        currentSection = {
          key: pattern.key,
          label: pattern.label,
          icon: pattern.icon,
          content: "",
          count,
        };
        currentLines = [];
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Check for first --- separator (end of summary)
    if (!pastSummary && line.trim() === "---") {
      pastSummary = true;
      continue;
    }

    if (currentSection) {
      // Skip standalone --- separators between sections
      if (line.trim() === "---") continue;
      currentLines.push(line);
    } else if (!pastSummary) {
      summaryLines.push(line);
    }
  }

  // Save last section
  if (currentSection) {
    currentSection.content = currentLines.join("\n").trim();
    if (currentSection.content) sections.push(currentSection);
  }

  return {
    summary: summaryLines.join("\n").trim(),
    sections: sections.filter(s => s.content.length > 0),
  };
}

const markdownClasses = `
  prose prose-sm dark:prose-invert max-w-none
  text-[13.5px] leading-[1.7]
  [&>h2]:text-base [&>h2]:font-bold [&>h2]:mt-3 [&>h2]:mb-2 [&>h2]:text-foreground
  [&>h3]:text-[15px] [&>h3]:font-bold [&>h3]:mt-3 [&>h3]:mb-2 [&>h3]:text-foreground
  [&>p]:my-1.5 [&>p]:text-muted-foreground [&>p]:leading-relaxed
  [&>p>strong]:text-foreground [&>p>strong]:font-semibold
  [&>ul]:pl-5 [&>ul]:my-2 [&>ul]:space-y-1.5
  [&>ol]:pl-5 [&>ol]:my-2 [&>ol]:space-y-1.5
  [&_li]:my-0 [&_li]:text-muted-foreground [&_li]:leading-relaxed
  [&_li>strong]:text-foreground [&_li>strong]:font-semibold
  [&_li::marker]:text-primary
  [&>hr]:my-3 [&>hr]:border-border/30
  [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2
`;

// Custom link component that uses React Router for internal links
const InternalLinkRenderer = ({ href, children, ...props }: any) => {
  const navigate = useNavigate();
  const isInternal = href && (href.startsWith('/') || href.startsWith('https://robotverse.in/'));

  if (isInternal) {
    const path = href.startsWith('https://robotverse.in') ? href.replace('https://robotverse.in', '') : href;
    return (
      <button
        onClick={(e) => { e.preventDefault(); navigate(path); }}
        className="inline-flex items-center gap-1 text-primary font-semibold hover:text-primary/80 underline underline-offset-2 transition-colors cursor-pointer text-[12px] bg-primary/5 hover:bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 no-underline"
        {...props}
      >
        {children}
        <ExternalLink className="w-3 h-3" />
      </button>
    );
  }

  return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
};

const markdownComponents = {
  a: InternalLinkRenderer,
};

const ResultTabsView: React.FC<ResultTabsViewProps> = ({ content, resultCounts, className }) => {
  const [viewMode, setViewMode] = useState<"tabs" | "full">("tabs");
  const { summary, sections } = useMemo(() => parseSections(content, resultCounts), [content, resultCounts]);

  // If no sections parsed, fall back to full view
  if (sections.length === 0) {
    return (
      <div className={cn(markdownClasses, "w-full overflow-x-auto", className)}>
        <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
      </div>
    );
  }

  const defaultTab = sections[0]?.key || "robots";

  return (
    <div className={cn("space-y-3", className)}>
      {/* Summary */}
      {summary && (
        <div className={cn(markdownClasses, "pb-2 border-b border-border/30")}>
          <ReactMarkdown components={markdownComponents}>{summary}</ReactMarkdown>
        </div>
      )}

      {/* View toggle */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Results ({sections.length} categories)
        </span>
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode("tabs")}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors",
              viewMode === "tabs" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutList className="w-3 h-3" />
            Tabs
          </button>
          <button
            onClick={() => setViewMode("full")}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors",
              viewMode === "full" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <AlignJustify className="w-3 h-3" />
            Full
          </button>
        </div>
      </div>

      {viewMode === "tabs" ? (
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/40 p-1.5 rounded-xl">
            {sections.map((section) => (
              <TabsTrigger
                key={section.key}
                value={section.key}
                className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm whitespace-nowrap"
              >
                {section.icon}
                <span className="hidden sm:inline">{section.label}</span>
                <span className="sm:hidden">{section.label.split(" ")[0]}</span>
                {section.count > 0 && (
                  <Badge variant="secondary" className="h-4 min-w-[18px] text-[9px] px-1 rounded-full">
                    {section.count}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {sections.map((section) => (
            <TabsContent key={section.key} value={section.key} className="mt-3 animate-in fade-in duration-200">
              <div className={cn(markdownClasses, "w-full overflow-x-auto bg-muted/20 rounded-xl p-4 border border-border/20")}>
                <ReactMarkdown components={markdownComponents}>{section.content}</ReactMarkdown>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className={cn(markdownClasses, "w-full overflow-x-auto")}>
          <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
        </div>
      )}
    </div>
  );
};

export default ResultTabsView;
