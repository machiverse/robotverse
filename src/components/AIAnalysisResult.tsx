import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, TrendingUp, Settings, Building2, Lightbulb, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// --- Types ---

interface AIAnalysisData {
  summary: string;
  suitability?: string;
  technicalInsights?: string;
  governmentSchemes?: string;
  suggestedIndustries?: string;
  timestamp: string;
}

interface AIAnalysisResultProps {
  analysis: AIAnalysisData;
  cached?: boolean;
  className?: string;
  /** Show as overlay popup/modal */
  popup?: boolean;
  onClose?: () => void;
}

// --- Utils: Split text into crisp sentences ----

function toSentences(text: string): string[] {
  // Remove markdown, bullets, and split by sentence or line
  if (!text) return [];
  return text
    .replace(/[#*\-•]+/g, '')           // Remove markdown/symbols
    .replace(/\r?\n+/g, ' ')            // Newlines to space
    .replace(/\s{2,}/g, ' ')            // Remove double spaces
    .split(/(?<=[?.!])\s+(?=[A-Z])/g)   // Split on punctuation + capital
    .map(s => s.trim())
    .filter(Boolean);
}

// Schemes: Heuristic extract to a short list
function extractSchemes(text: string): string[] {
  if (!text) return [];
  const found: string[] = [];
  if (/pli|production linked/i.test(text))
    found.push('PLI (Production Linked Incentive) Scheme: Financial incentives for eligible robotics manufacturers.');
  if (/msme|micro, small/i.test(text))
    found.push('MSME Support: Subsidy and credit guarantees for automation adoption.');
  if (/make in india|atmanirbhar/i.test(text))
    found.push('Make in India: Tax benefits and fast-track clearances for domestic robotics.');
  if (/startup/i.test(text))
    found.push('Startup India: Grants and early-stage support for robotics ventures.');
  return found;
}

// --- Main Component ---

const AIAnalysisResult: React.FC<AIAnalysisResultProps> = ({
  analysis,
  cached = false,
  className = "",
  popup = false,
  onClose,
}) => {
  // Section points
  const suitabilityPoints = toSentences(analysis.suitability || analysis.summary);
  const technicalPoints = toSentences(analysis.technicalInsights || '');
  const industryPoints = toSentences(analysis.suggestedIndustries || '');
  const governmentPoints = extractSchemes(analysis.governmentSchemes || analysis.summary);
  const summaryPoints = toSentences(analysis.summary);

  // Timestamp
  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return 'Recently';
    }
  };

  // --- Popup overlay styles ---
  const popupClass = popup
    ? "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-2"
    : "";

  return (
    <div className={`${popupClass}`}>
      <Card
        className={`
          relative max-w-2xl w-full shadow-2xl border-2 border-primary/30
          ${popup ? "animate-in fade-in bg-card rounded-xl" : ""}
          ${className}
        `}
      >
        {popup && onClose && (
          <Button
            aria-label="Close analysis popup"
            size="icon"
            variant="ghost"
            className="absolute top-3 right-3"
            onClick={onClose}
          >
            <X className="h-5 w-5 text-foreground" />
          </Button>
        )}
        <CardHeader className="pb-3 bg-primary/10 rounded-t-lg">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl font-bold">Professional Analysis Summary</CardTitle>
            {cached && (
              <Badge variant="outline" className="ml-2 text-xs">Cached</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Analyzed {formatTimestamp(analysis.timestamp)}</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 py-6 px-6">
          {/* Each section shown only if not empty */}
          {suitabilityPoints.length > 0 && (
            <>
              <SectionBullets
                icon={<CheckCircle className="h-4 w-4 text-green-600" />}
                title="Product Suitability"
                points={suitabilityPoints}
              />
              <Separator />
            </>
          )}
          {technicalPoints.length > 0 && (
            <>
              <SectionBullets
                icon={<Settings className="h-4 w-4 text-blue-600" />}
                title="Technical Insights"
                points={technicalPoints}
              />
              <Separator />
            </>
          )}
          {industryPoints.length > 0 && (
            <>
              <SectionBullets
                icon={<Lightbulb className="h-4 w-4 text-purple-600" />}
                title="Suggested Industries & Applications"
                points={industryPoints}
              />
              <Separator />
            </>
          )}
          {governmentPoints.length > 0 && (
            <>
              <SectionBullets
                icon={<Building2 className="h-4 w-4 text-orange-600" />}
                title="Applicable Govt. Schemes"
                points={governmentPoints}
              />
              <Separator />
            </>
          )}

          <SectionBullets
            icon={<TrendingUp className="h-4 w-4 text-primary" />}
            title="Structured Analysis"
            points={summaryPoints}
          />
        </CardContent>
      </Card>
    </div>
  );
};

// --- Helper to display one section as bullets ---
const SectionBullets: React.FC<{
  icon: React.ReactNode;
  title: string;
  points: string[];
}> = ({ icon, title, points }) => (
  <div>
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className="font-semibold text-base">{title}</span>
    </div>
    <ul className="list-disc space-y-2 pl-6 text-sm text-muted-foreground">
      {points.length > 0
        ? points.map((line, i) => <li key={i}>{line}</li>)
        : <li>No information found.</li>
      }
    </ul>
  </div>
);

export default AIAnalysisResult;
