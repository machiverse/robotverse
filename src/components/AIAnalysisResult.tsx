import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, TrendingUp, Settings, Building2, Lightbulb, Clock, ExternalLink, ListOrdered } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
}

export const AIAnalysisResult: React.FC<AIAnalysisResultProps> = ({ 
  analysis, 
  cached = false, 
  className = "" 
}) => {
  // Utility functions for formatting
  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Recently';
    }
  };

  // Extract bullet points from text
  const extractPoints = (text: string, fallback?: string): string[] => {
    if (!text && fallback) text = fallback;
    if (!text) return [];
    // Split by line or sentence, ensure neat points
    return text
      .split(/[\n•*-]+|\.\s+/)
      .map(s => s.trim().replace(/^(?:[\d]+[.)]|\*|-|•)\s*/, ''))
      .filter(s => s.length > 5);
  };

  // GOVT schemes extraction as point list (simple heuristic)
  const extractSchemes = (text: string): string[] => {
    if (!text) return [];
    const schemeSet = new Set<string>();
    if (/pli|production linked/i.test(text)) schemeSet.add('PLI (Production Linked Incentive) Scheme: Financial incentives for eligible manufacturing, including robotics.');
    if (/msme|micro, small/i.test(text)) schemeSet.add('MSME Support: Subsidies and credit guarantees for small and medium enterprises adopting automation.');
    if (/make in india|atmanirbhar/i.test(text)) schemeSet.add('Make in India: Faster approvals and tax benefits for Indian robotics manufacturers.');
    if (/startup/i.test(text)) schemeSet.add('Startup India: Exemptions, grants, and support for early-stage robotics startups.');
    return Array.from(schemeSet);
  };

  // Each block as bullet points
  const suitabilityPoints      = extractPoints(analysis.suitability || analysis.summary);
  const technicalPoints        = extractPoints(analysis.technicalInsights || '');
  const industryPoints         = extractPoints(analysis.suggestedIndustries || '');
  const governmentSchemes      = extractSchemes(analysis.governmentSchemes || analysis.summary);

  // Summary block as clear bullet points, fallback to nice chunked sentences if needed
  const summaryPoints = extractPoints(analysis.summary);
  const summaryDisplayPoints =
    summaryPoints.length > 1
      ? summaryPoints
      : analysis.summary.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">AI Market Analysis</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Analyzed {formatTimestamp(analysis.timestamp)}</span>
              {cached && (
                <Badge variant="outline" className="text-xs">
                  Cached Result
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid of Points */}
      <div className="grid gap-8 md:grid-cols-2">
        {/* PRODUCT SUITABILITY */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Product Suitability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              {suitabilityPoints.length
                ? suitabilityPoints.map((point, idx) => <li key={idx}>{point}</li>)
                : <li>Suitable for multiple applications; contact us for custom suitability insights.</li>}
            </ul>
          </CardContent>
        </Card>

        {/* TECHNICAL INSIGHTS */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="h-5 w-5 text-blue-600" />
              Technical Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              {technicalPoints.length
                ? technicalPoints.map((point, idx) => <li key={idx}>{point}</li>)
                : <li>Detailed technical capabilities and specifications available on request.</li>}
            </ul>
          </CardContent>
        </Card>

        {/* GOVT SCHEMES */}
        { governmentSchemes.length > 0 && (
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-orange-600" />
              Applicable Govt. Schemes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              {governmentSchemes.map((point, idx) => <li key={idx}>{point}</li>)}
            </ul>
          </CardContent>
        </Card>
        )}

        {/* Suggested Industries */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="h-5 w-5 text-purple-600" />
              Suggested Industries & Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              {industryPoints.length
                ? industryPoints.map((point, idx) => <li key={idx}>{point}</li>)
                : <li>Diverse industry use-cases possible. Request tailored applications analysis.</li>
              }
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* NEAT POINT-BY-POINT SUMMARY */}
      <Card className="border border-primary/20">
        <CardHeader className="bg-primary/5">
          <CardTitle className="flex items-center gap-2 text-xl">
            <ListOrdered className="h-6 w-6 text-primary" />
            Professional Analysis Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <ul className="list-disc space-y-3 pl-6 text-base text-muted-foreground">
            {summaryDisplayPoints?.length
              ? summaryDisplayPoints.map((point, idx) => <li key={idx}>{point}</li>)
              : (
                <li>
                  {analysis.summary?.slice(0, 200) || "No summary insights available."}
                </li>
              )
            }
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIAnalysisResult;
