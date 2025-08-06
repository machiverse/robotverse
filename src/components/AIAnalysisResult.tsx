import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, TrendingUp, Settings, Building2, Lightbulb, Clock, ExternalLink } from 'lucide-react';
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

  const cleanText = (text: string): string => {
    if (!text) return '';
    
    return text
      // Remove markdown headers (#, ##, ###)
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bullet points (*, -, •)
      .replace(/^[\*\-\•]\s+/gm, '')
      // Remove numbered lists
      .replace(/^\d+[\.\)]\s+/gm, '')
      // Clean up extra spaces and line breaks
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  };

  const extractStructuredContent = (text: string): Array<{title: string, content: string}> => {
    if (!text) return [];
    
    const cleanedText = cleanText(text);
    const sections = [];
    
    // Split by common section indicators
    const parts = cleanedText.split(/(?:Key Features|Technical Specifications|Market Analysis|Benefits|Applications|Recommendations|Summary):/i);
    
    if (parts.length > 1) {
      for (let i = 1; i < parts.length; i++) {
        const title = cleanedText.match(new RegExp(`(Key Features|Technical Specifications|Market Analysis|Benefits|Applications|Recommendations|Summary)(?=:)`, 'gi'))?.[i-1] || `Section ${i}`;
        const content = parts[i].trim().slice(0, 300);
        sections.push({ title, content });
      }
    } else {
      // Fallback: create sections from sentences
      const sentences = cleanedText.split(/[.!?]+/).filter(s => s.trim().length > 20);
      const chunkSize = Math.ceil(sentences.length / 3);
      
      for (let i = 0; i < sentences.length; i += chunkSize) {
        const chunk = sentences.slice(i, i + chunkSize).join('. ').trim();
        if (chunk) {
          sections.push({
            title: i === 0 ? 'Product Overview' : i === chunkSize ? 'Technical Assessment' : 'Market Potential',
            content: chunk
          });
        }
      }
    }
    
    return sections.slice(0, 3);
  };

  const extractBulletPoints = (text: string): string[] => {
    if (!text) return [];
    
    const cleanedText = cleanText(text);
    const sentences = cleanedText
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10)
      .slice(0, 4);
    
    return sentences.length > 0 ? sentences : [cleanedText.slice(0, 150)];
  };

  const extractSchemes = (text: string): Array<{name: string, benefit: string}> => {
    if (!text) return [];
    
    const schemes = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      if (line.includes('PLI') || line.includes('Production Linked Incentive')) {
        schemes.push({
          name: 'PLI Scheme',
          benefit: 'Up to 25% incentive on incremental sales'
        });
      }
      if (line.includes('MSME') || line.includes('Micro, Small')) {
        schemes.push({
          name: 'MSME Support',
          benefit: 'Credit guarantee and subsidies'
        });
      }
      if (line.includes('Make in India') || line.includes('Atmanirbhar')) {
        schemes.push({
          name: 'Make in India',
          benefit: 'Tax benefits and easier approvals'
        });
      }
    }
    
    return schemes.slice(0, 3);
  };

  const suitabilityPoints = extractBulletPoints(analysis.suitability || analysis.summary);
  const technicalPoints = extractBulletPoints(analysis.technicalInsights || '');
  const industryPoints = extractBulletPoints(analysis.suggestedIndustries || '');
  const governmentSchemes = extractSchemes(analysis.governmentSchemes || analysis.summary);
  const structuredContent = extractStructuredContent(analysis.summary);

  return (
    <div className={`space-y-6 ${className}`}>
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

      <div className="grid gap-6 md:grid-cols-2">
        {/* Product Suitability Summary */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Product Suitability Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suitabilityPoints.length > 0 ? (
                <ul className="space-y-2">
                  {suitabilityPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-muted-foreground leading-relaxed">
                        {point.replace(/^[\-\*\•\d\.\)]\s*/, '')}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {analysis.summary.slice(0, 200)}...
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Technical Insights */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="h-5 w-5 text-blue-600" />
              Technical Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {technicalPoints.length > 0 ? (
                <ul className="space-y-2">
                  {technicalPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-muted-foreground leading-relaxed">
                        {point.replace(/^[\-\*\•\d\.\)]\s*/, '')}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Detailed technical specifications and performance insights available in full analysis.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Government Schemes */}
        {governmentSchemes.length > 0 && (
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5 text-orange-600" />
                Applicable Government Schemes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {governmentSchemes.map((scheme, index) => (
                  <div key={index} className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm text-orange-900 dark:text-orange-100">
                        {scheme.name}
                      </h4>
                      <Button variant="ghost" size="sm" className="h-6 px-2">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-orange-700 dark:text-orange-300">
                      {scheme.benefit}
                    </p>
                  </div>
                ))}
              </div>
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
            <div className="space-y-3">
              {industryPoints.length > 0 ? (
                <ul className="space-y-2">
                  {industryPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-muted-foreground leading-relaxed">
                        {point.replace(/^[\-\*\•\d\.\)]\s*/, '')}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Multiple industry applications identified. Contact for detailed sector-specific analysis.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Professional Structured Analysis Summary */}
      <Card className="border border-primary/20">
        <CardHeader className="bg-primary/5">
          <CardTitle className="flex items-center gap-2 text-xl">
            <TrendingUp className="h-6 w-6 text-primary" />
            Complete Analysis Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {structuredContent.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-1">
              {structuredContent.map((section, index) => (
                <div key={index} className="relative">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">{index + 1}</span>
                    </div>
                    <div className="flex-1 space-y-3">
                      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        {section.title}
                      </h3>
                      <div className="bg-muted/30 rounded-lg p-4 border-l-4 border-primary/50">
                        <p className="text-muted-foreground leading-relaxed text-sm">
                          {section.content}
                        </p>
                      </div>
                    </div>
                  </div>
                  {index < structuredContent.length - 1 && (
                    <Separator className="mt-6" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-6 border border-dashed border-primary/30">
                <div className="prose prose-sm max-w-none">
                  <p className="text-muted-foreground leading-relaxed">
                    {cleanText(analysis.summary)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AIAnalysisResult;