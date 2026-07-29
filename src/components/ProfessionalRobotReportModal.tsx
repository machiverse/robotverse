import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  X, 
  MapPin, 
  Building, 
  Clock, 
  DollarSign, 
  Settings, 
  Brain, 
  Loader2,
  Download,
  Calendar,
  Shield,
  Zap,
  Package,
  Image as ImageIcon
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
// jspdf/html2canvas are browser-only; imported dynamically at point of use for SSR safety.

interface ProfessionalRobotReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  robotData: any;
}

interface ReportData {
  report: string;
  robotData: any;
  timestamp: string;
  cached?: boolean;
}

export function ProfessionalRobotReportModal({ isOpen, onClose, robotData }: ProfessionalRobotReportModalProps) {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (isOpen && robotData) {
      fetchReport();
    }
  }, [isOpen, robotData]);

  async function fetchReport() {
    setLoading(true);
    setError(null);
    try {
      const res = await supabase.functions.invoke('roboverse-robot-report', {
        body: { robotId: robotData.id }
      });

      if (res.error) {
        console.error('Report fetch error:', res.error);

        const responseContext = (res.error as { context?: Response })?.context;
        if (responseContext) {
          try {
            const errorBody = await responseContext.json();
            throw new Error(errorBody?.error || res.error.message || 'Failed to fetch report');
          } catch {
            throw new Error(res.error.message || 'Failed to fetch report');
          }
        }

        throw new Error(res.error.message || 'Failed to fetch report');
      }

      setReportData(res.data);

      if (res.data?.cached) {
        toast({
          title: "Report Loaded",
          description: "Analysis report loaded successfully.",
        });
      }
    } catch (e: any) {
      console.error('Error fetching report:', e);
      setError(e.message || "Failed to fetch report. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function formatPrice(price: number, currency: string) {
    const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₹";
    return `${symbol}${price.toLocaleString()}`;
  }

  const formatReportForDisplay = (text: string) => {
    const sections = text.split(/\n{2,}/g);
    return sections.map((section, i) => {
      if (section.match(/^\d+\.\s*\*.*\*/) || section.match(/^\*.*\*/)) {
        const [header, ...content] = section.split('\n');
        return (
          <div key={i} className="mb-6">
            <h3 className="text-lg font-semibold text-primary mb-3 pb-2 border-b border-border">
              {header.replace(/\*/g, '').replace(/^\d+\.\s*/, '')}
            </h3>
            <div className="text-foreground leading-relaxed space-y-2">
              {content.map((line, j) => (
                <p key={j} className="pl-2 border-l-2 border-muted">
                  {line.replace(/^\s*-\s*/, '• ')}
                </p>
              ))}
            </div>
          </div>
        );
      }
      return (
        <p key={i} className="text-foreground leading-relaxed mb-4 pl-2 border-l-2 border-muted">
          {section.replace(/^\s*-\s*/, '• ')}
        </p>
      );
    });
  };

  async function downloadAsPDF() {
    if (!robotData || !reportData) return;
    setDownloading(true);
    
    try {
      // Create a temporary container for PDF content
      const pdfContainer = document.createElement('div');
      pdfContainer.style.position = 'absolute';
      pdfContainer.style.left = '-9999px';
      pdfContainer.style.width = '210mm'; // A4 width
      pdfContainer.style.padding = '20mm';
      pdfContainer.style.backgroundColor = 'white';
      pdfContainer.style.fontFamily = 'Arial, sans-serif';
      pdfContainer.style.color = '#333';
      
      pdfContainer.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #3b82f6;">
          <h1 style="margin: 0; color: #1e40af; font-size: 28px; font-weight: bold;">${robotData.name}</h1>
          <p style="margin: 10px 0 0; color: #6b7280; font-size: 16px;">${robotData.model} - Professional Analysis Report</p>
          <p style="margin: 5px 0 0; color: #9ca3af; font-size: 14px;">Generated on ${new Date().toLocaleDateString()}</p>
        </div>
        
        ${robotData.images?.[0] ? `
          <div style="margin-bottom: 25px; text-align: center; max-width: 100%; overflow: hidden;">
            <img src="${robotData.images[0]}" alt="${robotData.name}" style="max-width: 100%; max-height: 400px; width: auto; height: auto; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: block; margin: 0 auto;" />
          </div>
        ` : ''}
        
        <div style="margin-bottom: 25px;">
          <h2 style="color: #1e40af; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 15px; font-size: 20px;">Robot Overview</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border-left: 4px solid #3b82f6;">
              <strong style="color: #374151;">Name:</strong> ${robotData.name}
            </div>
            <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border-left: 4px solid #3b82f6;">
              <strong style="color: #374151;">Model:</strong> ${robotData.model}
            </div>
            <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border-left: 4px solid #3b82f6;">
              <strong style="color: #374151;">Brand:</strong> ${robotData.brand || 'N/A'}
            </div>
            <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border-left: 4px solid #3b82f6;">
              <strong style="color: #374151;">Type:</strong> ${robotData.robot_type}
            </div>
            <div style="background: #ecfdf5; padding: 12px; border-radius: 6px; border-left: 4px solid #059669;">
              <strong style="color: #059669;">Price:</strong> ${formatPrice(robotData.price, robotData.currency)}
            </div>
            <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border-left: 4px solid #3b82f6;">
              <strong style="color: #374151;">Location:</strong> ${robotData.location}
            </div>
            <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border-left: 4px solid #3b82f6;">
              <strong style="color: #374151;">Condition:</strong> ${robotData.condition || 'N/A'}
            </div>
            <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border-left: 4px solid #3b82f6;">
              <strong style="color: #374151;">Year:</strong> ${robotData.year_manufactured || 'N/A'}
            </div>
          </div>
        </div>
        
        ${robotData.description ? `
          <div style="margin-bottom: 25px;">
            <h2 style="color: #1e40af; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 15px; font-size: 20px;">Description</h2>
            <div style="background: #f8fafc; padding: 15px; border-radius: 6px; line-height: 1.6;">
              ${robotData.description}
            </div>
          </div>
        ` : ''}
        
        <div style="margin-bottom: 25px;">
          <h2 style="color: #1e40af; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 15px; font-size: 20px;">Technical Specifications</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            ${robotData.payload_capacity ? `
              <div style="background: #fef3c7; padding: 12px; border-radius: 6px; border-left: 4px solid #f59e0b;">
                <strong style="color: #92400e;">Payload Capacity:</strong> ${robotData.payload_capacity} kg
              </div>
            ` : ''}
            ${robotData.reach ? `
              <div style="background: #fef3c7; padding: 12px; border-radius: 6px; border-left: 4px solid #f59e0b;">
                <strong style="color: #92400e;">Reach:</strong> ${robotData.reach} mm
              </div>
            ` : ''}
            ${robotData.repeatability ? `
              <div style="background: #fef3c7; padding: 12px; border-radius: 6px; border-left: 4px solid #f59e0b;">
                <strong style="color: #92400e;">Repeatability:</strong> ${robotData.repeatability} mm
              </div>
            ` : ''}
            ${robotData.power_consumption ? `
              <div style="background: #fef3c7; padding: 12px; border-radius: 6px; border-left: 4px solid #f59e0b;">
                <strong style="color: #92400e;">Power Consumption:</strong> ${robotData.power_consumption} kW
              </div>
            ` : ''}
            ${robotData.operating_environment ? `
              <div style="background: #fef3c7; padding: 12px; border-radius: 6px; border-left: 4px solid #f59e0b;">
                <strong style="color: #92400e;">Operating Environment:</strong> ${robotData.operating_environment}
              </div>
            ` : ''}
            ${robotData.warranty_info ? `
              <div style="background: #fef3c7; padding: 12px; border-radius: 6px; border-left: 4px solid #f59e0b;">
                <strong style="color: #92400e;">Warranty:</strong> ${robotData.warranty_info}
              </div>
            ` : ''}
          </div>
        </div>
        
        ${robotData.applications?.length ? `
          <div style="margin-bottom: 25px;">
            <h2 style="color: #1e40af; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 15px; font-size: 20px;">Applications</h2>
            <div>
              ${robotData.applications.map((app: string) => 
                `<span style="display: inline-block; background: #dbeafe; color: #1d4ed8; padding: 6px 12px; border-radius: 15px; font-size: 12px; margin: 2px 4px 2px 0;">${app}</span>`
              ).join('')}
            </div>
          </div>
        ` : ''}
        
        <div style="margin-bottom: 25px;">
          <h2 style="color: #1e40af; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 15px; font-size: 20px;">🤖 AI Market Intelligence Analysis</h2>
          <div style="background: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 8px; padding: 20px;">
            <div style="line-height: 1.7; color: #0369a1;">
              ${reportData.report.replace(/\*/g, '').replace(/\n/g, '<br/>').replace(/• /g, '<span style="color: #0ea5e9;">• </span>')}
            </div>
          </div>
        </div>
        
        <div style="text-align: center; padding: 20px; background: #f1f5f9; border-radius: 8px; margin-top: 30px;">
          <p style="margin: 0; color: #64748b; font-size: 12px;">
            Report generated by RoboVerse AI Analysis Platform | ${new Date().toLocaleDateString()}
          </p>
          <p style="margin: 5px 0 0; color: #64748b; font-size: 12px;">
            Professional market intelligence and technical analysis for business decision-making
          </p>
        </div>
      `;
      
      document.body.appendChild(pdfContainer);
      
      // Generate PDF using html2canvas and jsPDF (dynamic imports — browser-only libs)
      const [{ default: html2canvas }, { default: JsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const canvas = await html2canvas(pdfContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new JsPDF({
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
      
      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
      
      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      
      // Save the PDF
      pdf.save(`${robotData.name.replace(/\s+/g, '_')}_Analysis_Report.pdf`);
      
      // Clean up
      document.body.removeChild(pdfContainer);
      
      toast({
        title: "PDF Downloaded",
        description: "The robot analysis report has been downloaded as PDF successfully.",
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="flex justify-between items-center p-6 pb-4 border-b shrink-0">
          <div>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-primary">
              <Brain className="w-7 h-7" /> 
              Professional Robot Report
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {robotData?.name} - {robotData?.model}
            </p>
            {reportData?.cached && (
              <Badge variant="secondary" className="mt-2 inline-flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                Cached Report
              </Badge>
            )}
          </div>
          <Button variant="ghost" onClick={onClose} size="sm">
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {loading ? (
                <div className="flex justify-center items-center h-[400px]">
                  <div className="text-center">
                    <Loader2 className="animate-spin w-12 h-12 text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Generating comprehensive robot analysis...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <div className="text-destructive mb-4 text-lg font-medium">{error}</div>
                  <Button onClick={fetchReport} variant="outline" className="inline-flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Retry Analysis
                  </Button>
                </div>
              ) : reportData ? (
                <div className="space-y-6">
                  {/* Robot Image */}
                  {robotData.images?.[0] && (
                    <Card className="border-2 shadow-xs overflow-hidden">
                      <CardContent className="p-0">
                        <div className="relative w-full aspect-video bg-muted">
                          <img 
                            src={robotData.images[0]} 
                            alt={robotData.name}
                            className="absolute inset-0 w-full h-full object-contain"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Robot Overview Card */}
                  <Card className="border-2 shadow-xs">
                    <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
                      <CardTitle className="flex items-center gap-2 text-primary">
                        <Building className="w-6 h-6" />
                        Robot Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-4">
                          <div className="p-4 bg-card border border-border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Package className="w-4 h-4 text-primary" />
                              <span className="font-medium text-sm text-muted-foreground">Name</span>
                            </div>
                            <p className="font-semibold text-lg">{robotData.name}</p>
                          </div>
                          <div className="p-4 bg-card border border-border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Settings className="w-4 h-4 text-primary" />
                              <span className="font-medium text-sm text-muted-foreground">Model</span>
                            </div>
                            <p className="font-semibold">{robotData.model}</p>
                          </div>
                          <div className="p-4 bg-card border border-border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Building className="w-4 h-4 text-primary" />
                              <span className="font-medium text-sm text-muted-foreground">Brand</span>
                            </div>
                            <p className="font-semibold">{robotData.brand || 'N/A'}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="p-4 bg-card border border-border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Shield className="w-4 h-4 text-primary" />
                              <span className="font-medium text-sm text-muted-foreground">Type</span>
                            </div>
                            <Badge variant="secondary" className="text-sm">{robotData.robot_type}</Badge>
                          </div>
                          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <DollarSign className="w-4 h-4 text-emerald-600" />
                              <span className="font-medium text-sm text-emerald-700">Price</span>
                            </div>
                            <p className="font-bold text-xl text-emerald-800">{formatPrice(robotData.price, robotData.currency)}</p>
                          </div>
                          <div className="p-4 bg-card border border-border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <MapPin className="w-4 h-4 text-primary" />
                              <span className="font-medium text-sm text-muted-foreground">Location</span>
                            </div>
                            <p className="font-semibold">{robotData.location}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="p-4 bg-card border border-border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Shield className="w-4 h-4 text-primary" />
                              <span className="font-medium text-sm text-muted-foreground">Condition</span>
                            </div>
                            <Badge variant="outline">{robotData.condition || 'N/A'}</Badge>
                          </div>
                          <div className="p-4 bg-card border border-border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar className="w-4 h-4 text-primary" />
                              <span className="font-medium text-sm text-muted-foreground">Year</span>
                            </div>
                            <p className="font-semibold">{robotData.year_manufactured || 'N/A'}</p>
                          </div>
                          <div className="p-4 bg-card border border-border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Package className="w-4 h-4 text-primary" />
                              <span className="font-medium text-sm text-muted-foreground">Availability</span>
                            </div>
                            <Badge variant={robotData.availability === 'Available' ? 'default' : 'secondary'}>
                              {robotData.availability}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Description Card */}
                  {robotData.description && (
                    <Card className="border-2 shadow-xs">
                      <CardHeader className="bg-gradient-to-r from-blue-500/5 to-blue-500/10">
                        <CardTitle className="flex items-center gap-2 text-blue-700">
                          <FileText className="w-6 h-6" />
                          Product Description
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="prose max-w-none">
                          <p className="text-foreground leading-relaxed whitespace-pre-wrap bg-muted/30 p-4 rounded-lg border">
                            {robotData.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Technical Specifications Card */}
                  <Card className="border-2 shadow-xs">
                    <CardHeader className="bg-gradient-to-r from-orange-500/5 to-orange-500/10">
                      <CardTitle className="flex items-center gap-2 text-orange-700">
                        <Zap className="w-6 h-6" />
                        Technical Specifications
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {robotData.payload_capacity && (
                          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Package className="w-4 h-4 text-amber-600" />
                              <span className="font-medium text-amber-700">Payload Capacity</span>
                            </div>
                            <p className="font-bold text-lg text-amber-800">{robotData.payload_capacity} kg</p>
                          </div>
                        )}
                        {robotData.reach && (
                          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Zap className="w-4 h-4 text-amber-600" />
                              <span className="font-medium text-amber-700">Reach</span>
                            </div>
                            <p className="font-bold text-lg text-amber-800">{robotData.reach} mm</p>
                          </div>
                        )}
                        {robotData.repeatability && (
                          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Settings className="w-4 h-4 text-amber-600" />
                              <span className="font-medium text-amber-700">Repeatability</span>
                            </div>
                            <p className="font-bold text-lg text-amber-800">{robotData.repeatability} mm</p>
                          </div>
                        )}
                        {robotData.power_consumption && (
                          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Zap className="w-4 h-4 text-amber-600" />
                              <span className="font-medium text-amber-700">Power Consumption</span>
                            </div>
                            <p className="font-bold text-lg text-amber-800">{robotData.power_consumption} kW</p>
                          </div>
                        )}
                        {robotData.operating_environment && (
                          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Shield className="w-4 h-4 text-amber-600" />
                              <span className="font-medium text-amber-700">Operating Environment</span>
                            </div>
                            <p className="font-semibold text-amber-800">{robotData.operating_environment}</p>
                          </div>
                        )}
                        {robotData.warranty_info && (
                          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Shield className="w-4 h-4 text-amber-600" />
                              <span className="font-medium text-amber-700">Warranty</span>
                            </div>
                            <p className="font-semibold text-amber-800">{robotData.warranty_info}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Applications */}
                  {robotData.applications?.length > 0 && (
                    <Card className="border-2 shadow-xs">
                      <CardHeader className="bg-gradient-to-r from-green-500/5 to-green-500/10">
                        <CardTitle className="flex items-center gap-2 text-green-700">
                          <Package className="w-6 h-6" />
                          Applications
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="flex flex-wrap gap-2">
                          {robotData.applications.map((app: string, index: number) => (
                            <Badge key={index} variant="secondary" className="text-sm px-3 py-1">
                              {app}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* AI Analysis Report Card */}
                  <Card className="border-2 border-primary/20 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-primary">
                          <Brain className="w-6 h-6" />
                          AI Market Intelligence Analysis
                        </div>
                        <Badge variant="default" className="bg-primary text-primary-foreground">
                          🤖 Professional Analysis
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-6">
                        <div className="text-center py-4 border-b border-primary/20">
                          <Badge variant="outline" className="text-sm border-primary/40 text-primary">
                            📊 Comprehensive Market Intelligence Report
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-2">
                            Advanced AI analysis with market insights and professional recommendations
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-primary/5 to-background p-6 rounded-lg border border-primary/10">
                          <div className="prose prose-sm max-w-none text-foreground">
                            {formatReportForDisplay(reportData.report)}
                          </div>
                        </div>
                        <div className="text-center pt-4 border-t border-primary/20">
                          <Badge variant="outline" className="text-xs border-primary/40 text-primary">
                            ✅ End of Professional Analysis Report
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Brain className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg">No analysis data available</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <Separator />

        <DialogFooter className="flex justify-between items-center p-6 pt-4 shrink-0 bg-muted/20">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>Generated on {new Date().toLocaleDateString()}</span>
            {reportData?.timestamp && (
              <span>• Report from {new Date(reportData.timestamp).toLocaleDateString()}</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button 
              onClick={downloadAsPDF} 
              disabled={downloading || loading || !reportData} 
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download as PDF
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ProfessionalRobotReportModal;