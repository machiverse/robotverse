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

  const extractBulletPoints = (text: string): string[] => {
    if (!text) return [];
    
    // Extract bullet points or numbered lists
    const lines = text.split('\n').filter(line => line.trim());
    const bulletPoints = lines.filter(line => 
      line.match(/^[\-\*\•]\s+/) || 
      line.match(/^\d+[\.\)]\s+/) ||
      line.includes(':')
    );
    
    return bulletPoints.length > 0 ? bulletPoints.slice(0, 5) : lines.slice(0, 3);
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

      {/* Full Analysis Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Complete Analysis Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {analysis.summary}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIAnalysisResult;