import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Eye,
  Calendar,
  Shield,
  Zap,
  Wrench,
  FileVideo,
  Image as ImageIcon,
  ExternalLink,
  MinusSquare
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface RobotReportModalProps {
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

export function EnhancedRobotReportModal({ isOpen, onClose, robotData }: RobotReportModalProps) {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [minimized, setMinimized] = useState(false);

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
        throw new Error(res.error.message || 'Failed to fetch report');
      }
      
      setReportData(res.data);
      
      if (res.data?.cached) {
        toast({
          title: "Cached Report Loaded",
          description: "Using previously generated analysis report.",
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
            <h3 className="text-lg font-semibold text-primary mb-2 border-b border-border pb-1">
              {header.replace(/\*/g, '').replace(/^\d+\.\s*/, '')}
            </h3>
            <div className="text-muted-foreground leading-relaxed">
              {content.map((line, j) => (
                <p key={j} className="mb-2">{line.replace(/^\s*-\s*/, '• ')}</p>
              ))}
            </div>
          </div>
        );
      }
      return (
        <p key={i} className="text-muted-foreground leading-relaxed mb-4">
          {section.replace(/^\s*-\s*/, '• ')}
        </p>
      );
    });
  };

  async function downloadReport() {
    if (!robotData || !reportData) return;
    setDownloading(true);
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Robot Analysis Report - ${robotData.name}</title>
          <meta charset="UTF-8" />
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              margin: 0; 
              padding: 40px; 
              background: #f8fafc;
              color: #1e293b;
            }
            .container { 
              max-width: 1000px; 
              margin: 0 auto; 
              background: white; 
              border-radius: 12px; 
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); 
              overflow: hidden;
            }
            .header { 
              background: linear-gradient(135deg, #3b82f6, #1d4ed8); 
              color: white; 
              padding: 30px; 
              text-align: center;
            }
            .header h1 { margin: 0; font-size: 2.5rem; font-weight: 700; }
            .header p { margin: 10px 0 0; opacity: 0.9; font-size: 1.1rem; }
            .content { padding: 40px; }
            .section { margin-bottom: 40px; }
            .section h2 { 
              color: #1e40af; 
              border-bottom: 2px solid #e5e7eb; 
              padding-bottom: 10px; 
              margin-bottom: 20px;
              font-size: 1.5rem;
            }
            .section h3 { color: #374151; margin-top: 25px; margin-bottom: 10px; }
            .specs-grid { 
              display: grid; 
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
              gap: 15px; 
              margin: 20px 0;
            }
            .spec-item { 
              background: #f8fafc; 
              padding: 15px; 
              border-radius: 8px; 
              border-left: 4px solid #3b82f6;
            }
            .spec-label { font-weight: 600; color: #374151; margin-bottom: 5px; }
            .spec-value { color: #6b7280; }
            .badge { 
              display: inline-block; 
              background: #dbeafe; 
              color: #1d4ed8; 
              padding: 4px 12px; 
              border-radius: 20px; 
              font-size: 0.85rem; 
              margin-right: 8px; 
              margin-bottom: 8px;
            }
            .footer { 
              text-align: center; 
              padding: 30px; 
              background: #f1f5f9; 
              color: #64748b; 
              font-size: 0.9rem;
            }
            .ai-analysis { 
              background: #f0f9ff; 
              border: 1px solid #0ea5e9; 
              border-radius: 8px; 
              padding: 25px; 
              margin: 20px 0;
            }
            .ai-analysis h3 { color: #0369a1; margin-top: 0; }
            .highlight { background: #fef3c7; padding: 2px 6px; border-radius: 4px; }
            .price { font-size: 1.3rem; font-weight: 700; color: #059669; }
            ul { padding-left: 20px; }
            li { margin-bottom: 8px; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${robotData.name}</h1>
              <p>${robotData.model} - Comprehensive Analysis Report</p>
            </div>
            
            <div class="content">
              <div class="section">
                <h2>Robot Overview</h2>
                <div class="specs-grid">
                  <div class="spec-item">
                    <div class="spec-label">Robot Type</div>
                    <div class="spec-value">${robotData.robot_type || 'N/A'}</div>
                  </div>
                  <div class="spec-item">
                    <div class="spec-label">Brand</div>
                    <div class="spec-value">${robotData.brand || 'N/A'}</div>
                  </div>
                  <div class="spec-item">
                    <div class="spec-label">Price</div>
                    <div class="spec-value price">${formatPrice(robotData.price, robotData.currency)}</div>
                  </div>
                  <div class="spec-item">
                    <div class="spec-label">Location</div>
                    <div class="spec-value">${robotData.location}</div>
                  </div>
                  <div class="spec-item">
                    <div class="spec-label">Condition</div>
                    <div class="spec-value">${robotData.condition || 'N/A'}</div>
                  </div>
                  <div class="spec-item">
                    <div class="spec-label">Year</div>
                    <div class="spec-value">${robotData.year_manufactured || 'N/A'}</div>
                  </div>
                </div>
              </div>
              <div class="section">
                <h2>Description</h2>
                <p>${robotData.description || 'No description available.'}</p>
              </div>
              <div class="section">
                <h2>Technical Specifications</h2>
                <div class="specs-grid">
                  ${robotData.payload_capacity ? `
                    <div class="spec-item">
                      <div class="spec-label">Payload Capacity</div>
                      <div class="spec-value">${robotData.payload_capacity} kg</div>
                    </div>
                  ` : ''}
                  ${robotData.reach ? `
                    <div class="spec-item">
                      <div class="spec-label">Reach</div>
                      <div class="spec-value">${robotData.reach} mm</div>
                    </div>
                  ` : ''}
                  ${robotData.repeatability ? `
                    <div class="spec-item">
                      <div class="spec-label">Repeatability</div>
                      <div class="spec-value">${robotData.repeatability} mm</div>
                    </div>
                  ` : ''}
                  ${robotData.power_consumption ? `
                    <div class="spec-item">
                      <div class="spec-label">Power Consumption</div>
                      <div class="spec-value">${robotData.power_consumption} kW</div>
                    </div>
                  ` : ''}
                  ${robotData.operating_environment ? `
                    <div class="spec-item">
                      <div class="spec-label">Operating Environment</div>
                      <div class="spec-value">${robotData.operating_environment}</div>
                    </div>
                  ` : ''}
                  ${robotData.warranty_info ? `
                    <div class="spec-item">
                      <div class="spec-label">Warranty</div>
                      <div class="spec-value">${robotData.warranty_info}</div>
                    </div>
                  ` : ''}
                </div>
              </div>
              ${robotData.applications?.length ? `
                <div class="section">
                  <h2>Applications</h2>
                  <div>
                    ${robotData.applications.map((app: string) => `<span class="badge">${app}</span>`).join('')}
                  </div>
                </div>
              ` : ''}
              ${robotData.certification_standards?.length ? `
                <div class="section">
                  <h2>Certifications</h2>
                  <div>
                    ${robotData.certification_standards.map((cert: string) => `<span class="badge">${cert}</span>`).join('')}
                  </div>
                </div>
              ` : ''}
              <div class="ai-analysis">
                <h3>🤖 AI Market Intelligence Analysis</h3>
                ${reportData.report.replace(/\*/g, '').replace(/\n/g, '<br/>')}
              </div>
            </div>
            
            <div class="footer">
              <p>Report generated on ${new Date(reportData.timestamp).toLocaleDateString()} by RoboVerse AI Analysis Platform</p>
              <p>This report provides market intelligence and technical analysis for business decision-making purposes.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${robotData.name.replace(/\s+/g, '_')}_Analysis_Report.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Report Downloaded",
        description: "The robot analysis report has been downloaded successfully.",
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] p-0 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="min-h-full flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b border-border flex justify-between items-center">
          <div className="flex-1">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-primary">
              <Brain className="h-7 w-7" />
              Robot Analysis Report
            </DialogTitle>
            <p className="text-muted-foreground mt-1">
              {robotData?.name} - {robotData?.model}
            </p>
            {reportData?.cached && (
              <Badge variant="secondary" className="mt-2 inline-flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                Cached Report
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMinimized((m) => !m)}
              aria-label={minimized ? "Maximize Window" : "Minimize Window"}
              title={minimized ? "Maximize Window" : "Minimize Window"}
              className="flex items-center gap-1"
            >
              <MinusSquare className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadReport}
              disabled={downloading || loading || !reportData}
              className="flex items-center gap-2"
              aria-label="Download Report"
              title="Download Report"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download PDF
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Close Window"
              title="Close Window"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        {!minimized && (
          <ScrollArea className="flex-1 p-6">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-center">
                  <Loader2 className="animate-spin w-12 h-12 text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Generating comprehensive analysis...</p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-destructive mb-4 text-lg">{error}</div>
                <Button onClick={fetchReport} variant="outline" className="inline-flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Retry Analysis
                </Button>
              </div>
            ) : reportData ? (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-6">
                  <TabsTrigger value="overview" className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="specs" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Specifications
                  </TabsTrigger>
                  <TabsTrigger value="media" className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Media & Files
                  </TabsTrigger>
                  <TabsTrigger value="analysis" className="flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    AI Analysis
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Building className="h-5 w-5" />
                          Basic Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Name:</span>
                          <span className="font-medium">{robotData.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Model:</span>
                          <span className="font-medium">{robotData.model}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Brand:</span>
                          <span className="font-medium">{robotData.brand || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Type:</span>
                          <Badge variant="secondary">{robotData.robot_type}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5" />
                          Pricing & Location
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Price:</span>
                          <span className="font-bold text-lg text-primary">
                            {formatPrice(robotData.price, robotData.currency)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Location:</span>
                          <span className="font-medium flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {robotData.location}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Availability:</span>
                          <Badge variant="outline">{robotData.availability}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Condition:</span>
                          <Badge variant="secondary">{robotData.condition || 'N/A'}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <Card>
                    <CardHeader>
                      <CardTitle>Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed">
                        {robotData.description || 'No description available.'}
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="specs" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Zap className="h-5 w-5" />
                          Performance Specifications
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {robotData.payload_capacity && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Payload Capacity:</span>
                            <span className="font-medium">{robotData.payload_capacity} kg</span>
                          </div>
                        )}
                        {robotData.reach && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Reach:</span>
                            <span className="font-medium">{robotData.reach} mm</span>
                          </div>
                        )}
                        {robotData.repeatability && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Repeatability:</span>
                            <span className="font-medium">{robotData.repeatability} mm</span>
                          </div>
                        )}
                        {robotData.power_consumption && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Power Consumption:</span>
                            <span className="font-medium">{robotData.power_consumption} kW</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          Manufacturing & Support
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {robotData.year_manufactured && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Year Manufactured:</span>
                            <span className="font-medium">{robotData.year_manufactured}</span>
                          </div>
                        )}
                        {robotData.operating_environment && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Environment:</span>
                            <span className="font-medium">{robotData.operating_environment}</span>
                          </div>
                        )}
                        {robotData.warranty_info && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Warranty:</span>
                            <Badge variant="outline">
                              <Shield className="h-3 w-3 mr-1" />
                              {robotData.warranty_info}
                            </Badge>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                  {(robotData.applications?.length || robotData.certification_standards?.length) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {robotData.applications?.length && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Wrench className="h-5 w-5" />
                              Applications
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-wrap gap-2">
                              {robotData.applications.map((app: string, index: number) => (
                                <Badge key={index} variant="secondary">
                                  {app}
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      {robotData.certification_standards?.length && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Shield className="h-5 w-5" />
                              Certifications
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-wrap gap-2">
                              {robotData.certification_standards.map((cert: string, index: number) => (
                                <Badge key={index} variant="outline">
                                  {cert}
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="media" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {robotData.images?.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <ImageIcon className="h-5 w-5" />
                            Images
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            {robotData.images.slice(0, 4).map((image: string, index: number) => (
                              <div key={index} className="aspect-square rounded-lg overflow-hidden border border-border">
                                <img 
                                  src={image} 
                                  alt={`Robot ${index + 1}`}
                                  className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                                  onClick={() => window.open(image, '_blank')}
                                />
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Documents & Media
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {robotData.brochure_url && (
                          <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span>Product Brochure</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(robotData.brochure_url, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        
                        {robotData.video_url && (
                          <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                            <div className="flex items-center gap-2">
                              <FileVideo className="h-4 w-4 text-muted-foreground" />
                              <span>Product Video</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(robotData.video_url, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        
                        {!robotData.brochure_url && !robotData.video_url && (
                          <p className="text-muted-foreground text-center py-8">
                            No additional media files available
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                <TabsContent value="analysis" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5" />
                        AI Market Intelligence Analysis
                        {reportData.cached && (
                          <Badge variant="secondary" className="ml-2">
                            Cached
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="h-[70vh] overflow-y-auto p-6 border border-border rounded-lg bg-background/50">
                        <div className="prose prose-sm max-w-none text-foreground">
                          {formatReportForDisplay(reportData.report)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-12">
                <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No analysis data available</p>
              </div>
            )}
          </ScrollArea>
        )}
        {reportData && (
          <div className="border-t border-border p-4 bg-muted/30 flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              Report generated on {new Date(reportData.timestamp).toLocaleDateString()} • 
              {reportData.cached ? ' Using cached analysis' : ' Fresh analysis'}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button 
                onClick={downloadReport} 
                disabled={downloading}
                className="flex items-center gap-2"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download Report
              </Button>
            </div>
          </div>
        )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default EnhancedRobotReportModal;
