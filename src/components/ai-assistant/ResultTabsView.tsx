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
  color: string;
}

const SECTION_PATTERNS: { regex: RegExp; key: string; label: string; icon: React.ReactNode; countKey?: keyof ResultCounts; color: string }[] = [
  { regex: /###\s*🤖\s*Top Matching Robots/i, key: "robots", label: "Robots", icon: <Bot className="w-3.5 h-3.5" />, countKey: "robots", color: "from-blue-500/15 to-blue-500/5 border-blue-500/20" },
  { regex: /###\s*🔧\s*(EOAT|Spare Parts)/i, key: "eoat", label: "EOAT & Parts", icon: <Wrench className="w-3.5 h-3.5" />, countKey: "spareParts", color: "from-orange-500/15 to-orange-500/5 border-orange-500/20" },
  { regex: /###\s*🏭\s*(Application Builder|System Integrator|Service)/i, key: "integrators", label: "Integrators", icon: <Factory className="w-3.5 h-3.5" />, countKey: "services", color: "from-green-500/15 to-green-500/5 border-green-500/20" },
  { regex: /###\s*💻\s*(Software|Programming)/i, key: "software", label: "Software", icon: <Cpu className="w-3.5 h-3.5" />, color: "from-purple-500/15 to-purple-500/5 border-purple-500/20" },
  { regex: /###\s*🚚\s*(Logistics|Transport)/i, key: "logistics", label: "Logistics", icon: <Truck className="w-3.5 h-3.5" />, countKey: "logistics", color: "from-teal-500/15 to-teal-500/5 border-teal-500/20" },
  { regex: /###\s*💰\s*(Financ|Loan)/i, key: "financing", label: "Financing", icon: <Banknote className="w-3.5 h-3.5" />, color: "from-yellow-500/15 to-yellow-500/5 border-yellow-500/20" },
  
  { regex: /###\s*💡\s*(AI Analysis|Recommendation|Best Match)/i, key: "analysis", label: "AI Analysis", icon: <Lightbulb className="w-3.5 h-3.5" />, color: "from-primary/15 to-primary/5 border-primary/20" },
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
          color: pattern.color,
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
              <div className={cn(
                "w-full overflow-x-auto rounded-xl p-4 border bg-gradient-to-br",
                section.color
              )}>
                {/* Section header */}
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/20">
                  <div className="w-7 h-7 rounded-lg bg-background/80 flex items-center justify-center shadow-sm">
                    {section.icon}
                  </div>
                  <span className="font-bold text-sm text-foreground">{section.label}</span>
                  {section.count > 0 && (
                    <Badge variant="secondary" className="h-5 text-[10px] px-1.5 rounded-full">
                      {section.count} found
                    </Badge>
                  )}
                </div>
                <div className={cn(markdownClasses)}>
                  <ReactMarkdown components={markdownComponents}>{section.content}</ReactMarkdown>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="space-y-3">
          {sections.map((section) => (
            <div key={section.key} className={cn(
              "w-full overflow-x-auto rounded-xl p-4 border bg-gradient-to-br",
              section.color
            )}>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/20">
                <div className="w-7 h-7 rounded-lg bg-background/80 flex items-center justify-center shadow-sm">
                  {section.icon}
                </div>
                <span className="font-bold text-sm text-foreground">{section.label}</span>
                {section.count > 0 && (
                  <Badge variant="secondary" className="h-5 text-[10px] px-1.5 rounded-full">
                    {section.count} found
                  </Badge>
                )}
              </div>
              <div className={cn(markdownClasses)}>
                <ReactMarkdown components={markdownComponents}>{section.content}</ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResultTabsView;
