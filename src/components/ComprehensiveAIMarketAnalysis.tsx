import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain,
  TrendingUp,
  BarChart3,
  Target,
  Building2,
  Lightbulb,
  Shield,
  Globe,
  Users,
  DollarSign,
  Calendar,
  Download,
  Loader2,
  X,
  Zap,
  Package,
  Settings
} from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ComprehensiveAIMarketAnalysisProps {
  isOpen: boolean;
  onClose: () => void;
  robotData: any;
}

interface MarketAnalysisData {
  marketOverview: string;
  competitiveAnalysis: string;
  targetMarkets: string;
  priceAnalysis: string;
  technologyTrends: string;
  riskAssessment: string;
  investmentOutlook: string;
  regulatoryLandscape: string;
  businessOpportunities: string;
  recommendations: string;
  timestamp: string;
  cached?: boolean;
}

export function ComprehensiveAIMarketAnalysis({ isOpen, onClose, robotData }: ComprehensiveAIMarketAnalysisProps) {
  const [analysisData, setAnalysisData] = useState<MarketAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (isOpen && robotData) {
      fetchAnalysis();
    }
  }, [isOpen, robotData]);

  async function fetchAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const res = await supabase.functions.invoke('roboverse-ai-analyze', { 
        body: { 
          robotId: robotData.id
        }
      });
      
      if (res.error) {
        console.error('Analysis fetch error:', res.error);
        throw new Error(res.error.message || 'Failed to fetch market analysis');
      }
      
      // Transform the analysis data to match the expected format
      const analysisResult = res.data;
      
      if (analysisResult?.analysis) {
        const analysis = analysisResult.analysis;
        setAnalysisData({
          marketOverview: analysis.summary || '',
          competitiveAnalysis: analysis.technicalInsights || '',
          targetMarkets: analysis.suggestedIndustries || '',
          priceAnalysis: analysisResult.robot?.marketInsights?.priceRange || '',
          technologyTrends: analysis.suitability || '',
          riskAssessment: '',
          investmentOutlook: '',
          regulatoryLandscape: analysis.governmentSchemes || '',
          businessOpportunities: '',
          recommendations: JSON.stringify(analysisResult.marketEcosystem || {}),
          timestamp: analysis.timestamp || new Date().toISOString(),
          cached: analysisResult.cached
        });
      }
      
      if (analysisResult?.cached) {
        toast({
          title: "Analysis Loaded",
          description: "Market analysis loaded from cache.",
        });
      } else {
        toast({
          title: "Analysis Complete",
          description: "Fresh market analysis generated successfully.",
        });
      }
    } catch (e: any) {
      console.error('Error fetching analysis:', e);
      setError(e.message || "Failed to fetch analysis. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(price: number, currency: string) {
    const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₹";
    return `${symbol}${price.toLocaleString()}`;
  }

  const cleanText = (text: string) => {
    return text
      .replace(/[*#_`~]+/g, '') // Remove markdown symbols
      .replace(/^\s*[-•]\s*/gm, '') // Remove bullet points
      .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double
      .trim();
  };

  const formatSection = (text: string) => {
    if (!text) return [];
    
    const cleaned = cleanText(text);
    const sentences = cleaned
      .split(/(?<=[.!?])\s+/)
      .filter(s => s.trim().length > 10)
      .map(s => s.trim());
    
    return sentences;
  };

  async function downloadAsPDF() {
    // Simplified download - will download as HTML for now
    const content = generateReportHTML();
    const blob = new Blob([content], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${robotData.name.replace(/\s+/g, '_')}_Market_Analysis_Report.html`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Report Downloaded",
      description: "The market analysis report has been downloaded as HTML.",
    });
  }

  function generateReportHTML() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${robotData.name} - Market Analysis Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
          .header { text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
          .section { margin-bottom: 30px; }
          .section h2 { color: #1e40af; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
          .point { margin-bottom: 10px; padding-left: 20px; }
          .point:before { content: "• "; color: #3b82f6; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>AI Market Intelligence Report</h1>
          <h2>${robotData.name} - ${robotData.model}</h2>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
        </div>
        
        ${analysisData?.marketOverview ? `
          <div class="section">
            <h2>📊 Market Overview</h2>
            ${formatSection(analysisData.marketOverview).map(point => `<div class="point">${point}</div>`).join('')}
          </div>
        ` : ''}
        
        ${analysisData?.competitiveAnalysis ? `
          <div class="section">
            <h2>🏆 Competitive Analysis</h2>
            ${formatSection(analysisData.competitiveAnalysis).map(point => `<div class="point">${point}</div>`).join('')}
          </div>
        ` : ''}
        
        ${analysisData?.targetMarkets ? `
          <div class="section">
            <h2>🎯 Target Markets</h2>
            ${formatSection(analysisData.targetMarkets).map(point => `<div class="point">${point}</div>`).join('')}
          </div>
        ` : ''}
        
        ${analysisData?.recommendations ? `
          <div class="section">
            <h2>🎯 Strategic Recommendations</h2>
            ${formatSection(analysisData.recommendations).map(point => `<div class="point">${point}</div>`).join('')}
          </div>
        ` : ''}
      </body>
      </html>
    `;
  }

  const SectionCard = ({ 
    title, 
    content, 
    icon, 
    bgColor = "bg-card",
    borderColor = "border-border",
    textColor = "text-foreground"
  }: {
    title: string;
    content: string;
    icon: React.ReactNode;
    bgColor?: string;
    borderColor?: string;
    textColor?: string;
  }) => {
    const points = formatSection(content);
    
    return (
      <Card className={`${bgColor} ${borderColor} shadow-sm hover:shadow-md transition-shadow`}>
        <CardHeader className="pb-3">
          <CardTitle className={`flex items-center gap-3 ${textColor}`}>
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {points.map((point, index) => (
              <div key={index} className={`flex items-start gap-3 ${textColor}`}>
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <p className="text-sm leading-relaxed">{point}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="flex justify-between items-center p-6 pb-4 border-b shrink-0 bg-gradient-to-r from-primary/5 to-primary/10">
          <div>
            <DialogTitle className="text-3xl font-bold flex items-center gap-3 text-primary">
              <Brain className="w-8 h-8" /> 
              AI Market Intelligence Report
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">
              {robotData?.name} - {robotData?.model} | Comprehensive Market Analysis
            </p>
            {analysisData?.cached && (
              <Badge variant="secondary" className="mt-2 inline-flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                Cached Analysis
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {analysisData && (
              <Button 
                onClick={downloadAsPDF} 
                disabled={downloading}
                className="bg-primary hover:bg-primary/90"
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Download HTML Report
              </Button>
            )}
            <Button variant="ghost" onClick={onClose} size="sm">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {loading ? (
                <div className="flex justify-center items-center h-[500px]">
                  <div className="text-center">
                    <Loader2 className="animate-spin w-16 h-16 text-primary mx-auto mb-6" />
                    <p className="text-xl font-medium text-foreground mb-2">Generating Comprehensive Market Analysis</p>
                    <p className="text-muted-foreground">Analyzing market trends, competition, and opportunities...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="text-center py-16">
                  <div className="text-destructive mb-6 text-xl font-medium">{error}</div>
                  <Button onClick={fetchAnalysis} variant="outline" className="inline-flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Retry Analysis
                  </Button>
                </div>
              ) : analysisData ? (
                <div className="space-y-8">
                  {/* Analysis Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {analysisData.marketOverview && (
                      <SectionCard
                        title="Market Overview"
                        content={analysisData.marketOverview}
                        icon={<BarChart3 className="w-5 h-5" />}
                        bgColor="bg-blue-50"
                        borderColor="border-blue-200"
                        textColor="text-blue-900"
                      />
                    )}
                    
                    {analysisData.competitiveAnalysis && (
                      <SectionCard
                        title="Competitive Analysis"
                        content={analysisData.competitiveAnalysis}
                        icon={<Target className="w-5 h-5" />}
                        bgColor="bg-amber-50"
                        borderColor="border-amber-200"
                        textColor="text-amber-900"
                      />
                    )}
                    
                    {analysisData.targetMarkets && (
                      <SectionCard
                        title="Target Markets"
                        content={analysisData.targetMarkets}
                        icon={<Users className="w-5 h-5" />}
                        bgColor="bg-purple-50"
                        borderColor="border-purple-200"
                        textColor="text-purple-900"
                      />
                    )}
                    
                    {analysisData.priceAnalysis && (
                      <SectionCard
                        title="Price Analysis"
                        content={analysisData.priceAnalysis}
                        icon={<DollarSign className="w-5 h-5" />}
                        bgColor="bg-green-50"
                        borderColor="border-green-200"
                        textColor="text-green-900"
                      />
                    )}
                    
                    {analysisData.technologyTrends && (
                      <SectionCard
                        title="Technology Trends"
                        content={analysisData.technologyTrends}
                        icon={<Zap className="w-5 h-5" />}
                        bgColor="bg-red-50"
                        borderColor="border-red-200"
                        textColor="text-red-900"
                      />
                    )}
                    
                    {analysisData.riskAssessment && (
                      <SectionCard
                        title="Risk Assessment"
                        content={analysisData.riskAssessment}
                        icon={<Shield className="w-5 h-5" />}
                        bgColor="bg-orange-50"
                        borderColor="border-orange-200"
                        textColor="text-orange-900"
                      />
                    )}
                    
                    {analysisData.investmentOutlook && (
                      <SectionCard
                        title="Investment Outlook"
                        content={analysisData.investmentOutlook}
                        icon={<TrendingUp className="w-5 h-5" />}
                        bgColor="bg-emerald-50"
                        borderColor="border-emerald-200"
                        textColor="text-emerald-900"
                      />
                    )}
                    
                    {analysisData.businessOpportunities && (
                      <SectionCard
                        title="Business Opportunities"
                        content={analysisData.businessOpportunities}
                        icon={<Lightbulb className="w-5 h-5" />}
                        bgColor="bg-cyan-50"
                        borderColor="border-cyan-200"
                        textColor="text-cyan-900"
                      />
                    )}
                  </div>
                  
                  {/* Strategic Recommendations - Full Width */}
                  {analysisData.recommendations && (
                    <div className="mt-8">
                      <SectionCard
                        title="Strategic Recommendations"
                        content={analysisData.recommendations}
                        icon={<Building2 className="w-6 h-6" />}
                        bgColor="bg-gradient-to-br from-primary/5 to-primary/10"
                        borderColor="border-primary/20"
                        textColor="text-primary"
                      />
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}