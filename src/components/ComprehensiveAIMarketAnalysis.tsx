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
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
          robotId: robotData.id,
          analysisType: 'comprehensive_market'
        }
      });
      
      if (res.error) {
        console.error('Analysis fetch error:', res.error);
        throw new Error(res.error.message || 'Failed to fetch market analysis');
      }
      
      setAnalysisData(res.data);
      
      if (res.data?.cached) {
        toast({
          title: "Analysis Loaded",
          description: "Market analysis loaded successfully.",
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
    if (!robotData || !analysisData) return;
    setDownloading(true);
    
    try {
      const pdfContainer = document.createElement('div');
      pdfContainer.style.position = 'absolute';
      pdfContainer.style.left = '-9999px';
      pdfContainer.style.width = '210mm';
      pdfContainer.style.padding = '20mm';
      pdfContainer.style.backgroundColor = 'white';
      pdfContainer.style.fontFamily = 'Arial, sans-serif';
      pdfContainer.style.color = '#333';
      pdfContainer.style.lineHeight = '1.6';
      
      pdfContainer.innerHTML = `
        <div style="text-align: center; margin-bottom: 40px; padding-bottom: 30px; border-bottom: 4px solid #3b82f6;">
          <h1 style="margin: 0; color: #1e40af; font-size: 32px; font-weight: bold;">AI Market Intelligence Report</h1>
          <h2 style="margin: 10px 0; color: #6b7280; font-size: 20px;">${robotData.name} - ${robotData.model}</h2>
          <p style="margin: 5px 0 0; color: #9ca3af; font-size: 14px;">Comprehensive Market Analysis Generated on ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h2 style="color: #1e40af; border-bottom: 3px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px; font-size: 22px;">Executive Summary</h2>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 6px solid #3b82f6;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
              <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">
                <strong style="color: #374151;">Robot:</strong> ${robotData.name}
              </div>
              <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">
                <strong style="color: #374151;">Model:</strong> ${robotData.model}
              </div>
              <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">
                <strong style="color: #374151;">Type:</strong> ${robotData.robot_type}
              </div>
              <div style="background: #ecfdf5; padding: 15px; border-radius: 6px; border: 1px solid #d1fae5;">
                <strong style="color: #059669;">Price:</strong> ${formatCurrency(robotData.price, robotData.currency)}
              </div>
            </div>
          </div>
        </div>

        ${analysisData.marketOverview ? `
          <div style="margin-bottom: 30px;">
            <h2 style="color: #1e40af; border-bottom: 3px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px; font-size: 22px;">📊 Market Overview</h2>
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 6px solid #0ea5e9;">
              ${formatSection(analysisData.marketOverview).map(point => `
                <p style="margin-bottom: 12px; color: #0369a1; line-height: 1.7;">• ${point}</p>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${analysisData.competitiveAnalysis ? `
          <div style="margin-bottom: 30px;">
            <h2 style="color: #1e40af; border-bottom: 3px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px; font-size: 22px;">🏆 Competitive Analysis</h2>
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 6px solid #f59e0b;">
              ${formatSection(analysisData.competitiveAnalysis).map(point => `
                <p style="margin-bottom: 12px; color: #92400e; line-height: 1.7;">• ${point}</p>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${analysisData.targetMarkets ? `
          <div style="margin-bottom: 30px;">
            <h2 style="color: #1e40af; border-bottom: 3px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px; font-size: 22px;">🎯 Target Markets</h2>
            <div style="background: #f3e8ff; padding: 20px; border-radius: 8px; border-left: 6px solid #a855f7;">
              ${formatSection(analysisData.targetMarkets).map(point => `
                <p style="margin-bottom: 12px; color: #7c2d12; line-height: 1.7;">• ${point}</p>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${analysisData.priceAnalysis ? `
          <div style="margin-bottom: 30px;">
            <h2 style="color: #1e40af; border-bottom: 3px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px; font-size: 22px;">💰 Price Analysis</h2>
            <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; border-left: 6px solid #10b981;">
              ${formatSection(analysisData.priceAnalysis).map(point => `
                <p style="margin-bottom: 12px; color: #065f46; line-height: 1.7;">• ${point}</p>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${analysisData.technologyTrends ? `
          <div style="margin-bottom: 30px;">
            <h2 style="color: #1e40af; border-bottom: 3px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px; font-size: 22px;">⚡ Technology Trends</h2>
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; border-left: 6px solid #ef4444;">
              ${formatSection(analysisData.technologyTrends).map(point => `
                <p style="margin-bottom: 12px; color: #991b1b; line-height: 1.7;">• ${point}</p>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${analysisData.riskAssessment ? `
          <div style="margin-bottom: 30px;">
            <h2 style="color: #1e40af; border-bottom: 3px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px; font-size: 22px;">🛡️ Risk Assessment</h2>
            <div style="background: #fef7f2; padding: 20px; border-radius: 8px; border-left: 6px solid #f97316;">
              ${formatSection(analysisData.riskAssessment).map(point => `
                <p style="margin-bottom: 12px; color: #9a3412; line-height: 1.7;">• ${point}</p>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${analysisData.investmentOutlook ? `
          <div style="margin-bottom: 30px;">
            <h2 style="color: #1e40af; border-bottom: 3px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px; font-size: 22px;">📈 Investment Outlook</h2>
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 6px solid #22c55e;">
              ${formatSection(analysisData.investmentOutlook).map(point => `
                <p style="margin-bottom: 12px; color: #15803d; line-height: 1.7;">• ${point}</p>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${analysisData.businessOpportunities ? `
          <div style="margin-bottom: 30px;">
            <h2 style="color: #1e40af; border-bottom: 3px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px; font-size: 22px;">💡 Business Opportunities</h2>
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 6px solid #0ea5e9;">
              ${formatSection(analysisData.businessOpportunities).map(point => `
                <p style="margin-bottom: 12px; color: #0369a1; line-height: 1.7;">• ${point}</p>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${analysisData.recommendations ? `
          <div style="margin-bottom: 30px;">
            <h2 style="color: #1e40af; border-bottom: 3px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px; font-size: 22px;">🎯 Strategic Recommendations</h2>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 2px solid #3b82f6;">
              ${formatSection(analysisData.recommendations).map(point => `
                <p style="margin-bottom: 12px; color: #1e40af; line-height: 1.7; font-weight: 500;">• ${point}</p>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        <div style="text-align: center; padding: 25px; background: #f1f5f9; border-radius: 8px; margin-top: 40px;">
          <p style="margin: 0; color: #64748b; font-size: 14px; font-weight: 600;">
            AI Market Intelligence Report | RoboVerse Analytics Platform
          </p>
          <p style="margin: 8px 0 0; color: #64748b; font-size: 12px;">
            Professional market analysis powered by advanced AI technology | Generated ${new Date().toLocaleDateString()}
          </p>
          <p style="margin: 5px 0 0; color: #64748b; font-size: 12px;">
            This report provides strategic insights for informed business decision-making
          </p>
        </div>
      `;
      
      document.body.appendChild(pdfContainer);
      
      const canvas = await html2canvas(pdfContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      
      pdf.save(`${robotData.name.replace(/\s+/g, '_')}_Market_Analysis_Report.pdf`);
      
      document.body.removeChild(pdfContainer);
      
      toast({
        title: "PDF Downloaded",
        description: "The comprehensive market analysis report has been downloaded successfully.",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Download Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDownloading(false);
    }
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
                Download PDF
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