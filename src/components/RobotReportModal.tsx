import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Download, FileText, X, Settings, Calendar } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Clock, DollarSign, Tag, Building, MapPin } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";

interface RobotReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  robotData: any;
}

const RobotReportModal = ({ isOpen, onClose, robotData }: RobotReportModalProps) => {
  const [downloading, setDownloading] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportContent, setReportContent] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Generate AI analysis report when modal opens
  useEffect(() => {
    if (isOpen && robotData && !reportContent) {
      generateReport();
    }
  }, [isOpen, robotData]);

  const generateReport = async () => {
    if (!robotData) return;
    
    setGeneratingReport(true);
    setError('');
    
    try {
      const response = await supabase.functions.invoke('roboverse-robot-report', {
        body: { robotId: robotData.id }
      });

      if (response.error) throw response.error;
      
      if (response.data?.report) {
        setReportContent(response.data.report);
      } else {
        throw new Error('No report content received');
      }
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Failed to generate analysis report. Please try again.');
    } finally {
      setGeneratingReport(false);
    }
  };

  const formatReportForDisplay = (report: string) => {
    if (!report) return [];
    
    const sections = report.split(/(?=\*\*[A-Z\s]+\*\*)/g).filter(section => section.trim());
    
    return sections.map((section, index) => {
      const lines = section.split('\n').filter(line => line.trim());
      const title = lines[0]?.replace(/\*\*/g, '') || '';
      const content = lines.slice(1).join('\n');
      
      return (
        <div key={index} className="mb-8">
          {title && (
            <h3 className="text-lg font-semibold text-foreground mb-3 border-b border-border pb-2 flex items-center gap-2">
              <div className="w-1 h-6 bg-primary rounded-full"></div>
              {title.replace(/^\d+\.\s*/, '')}
            </h3>
          )}
          <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap pl-6">
            {content}
          </div>
        </div>
      );
    });
  };

  const downloadAsPDF = async () => {
    if (!robotData || !reportContent) return;
    
    setDownloading(true);
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Robot Analysis Report - ${robotData.name}</title>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              line-height: 1.6; color: #333; font-size: 14px; background: #fff;
            }
            .container { max-width: 800px; margin: 0 auto; padding: 30px; }
            .header { 
              border-bottom: 3px solid #2563eb; padding: 40px; margin-bottom: 40px; 
              text-align: center; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
              border-radius: 10px;
            }
            .logo { font-size: 32px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
            .header h1 { color: #1e40af; margin: 15px 0; font-size: 28px; font-weight: 700; }
            .header .subtitle { color: #64748b; font-size: 16px; margin: 10px 0; }
            .meta-info {
              background: #f1f5f9; padding: 15px; border-radius: 8px; 
              margin-top: 20px; border-left: 4px solid #2563eb;
            }
            .robot-overview { 
              background: linear-gradient(135deg, #fefefe 0%, #f8fafc 100%); 
              padding: 30px; margin: 30px 0; border-radius: 12px;
              border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            }
            .specs-grid { 
              display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
              gap: 20px; margin: 20px 0; 
            }
            .spec-card { 
              padding: 20px; background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
              border-radius: 10px; border: 1px solid #e2e8f0;
              box-shadow: 0 2px 4px rgba(0,0,0,0.02);
            }
            .spec-label { 
              font-weight: 600; color: #374151; display: block; margin-bottom: 8px;
              font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;
            }
            .spec-value { color: #1f2937; font-size: 16px; font-weight: 500; }
            .price-highlight {
              background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
              color: #92400e; padding: 15px 20px; border-radius: 8px;
              font-weight: 600; font-size: 18px; text-align: center;
              margin: 20px 0; border: 2px solid #f59e0b;
            }
            .analysis-section { 
              background: #ffffff; padding: 30px; margin: 30px 0; 
              border-radius: 12px; border: 1px solid #e2e8f0;
              box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            h2 { 
              color: #1e40af; border-bottom: 2px solid #e2e8f0; 
              padding-bottom: 12px; margin: 30px 0 20px 0;
              font-size: 22px; font-weight: 600;
            }
            .analysis-content {
              margin: 25px 0; padding: 25px;
              background: linear-gradient(135deg, #fafbfc 0%, #f1f5f9 100%);
              border-radius: 10px; white-space: pre-wrap; line-height: 1.8;
              border-left: 4px solid #10b981;
            }
            .footer { 
              margin-top: 60px; padding: 30px 0; border-top: 2px solid #e2e8f0; 
              text-align: center; color: #6b7280; background: #f8fafc; border-radius: 10px;
            }
            .footer .company-info {
              font-weight: 600; color: #2563eb; font-size: 16px; margin-bottom: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🤖 RoboVerse</div>
              <h1>Professional Robot Analysis Report</h1>
              <div class="subtitle">AI-Powered Robot Evaluation & Market Analysis</div>
              <div class="meta-info">
                <strong>Robot:</strong> ${robotData.name} - ${robotData.model}<br>
                <strong>Report Generated:</strong> ${new Date().toLocaleString()}<br>
                <strong>Report ID:</strong> RV-${Date.now()}
              </div>
            </div>
            
            <div class="robot-overview">
              <h2>🤖 Robot Specifications</h2>
              <div class="specs-grid">
                <div class="spec-card">
                  <span class="spec-label">Robot Name</span>
                  <div class="spec-value">${robotData.name}</div>
                </div>
                <div class="spec-card">
                  <span class="spec-label">Model</span>
                  <div class="spec-value">${robotData.model}</div>
                </div>
                <div class="spec-card">
                  <span class="spec-label">Type</span>
                  <div class="spec-value">${robotData.robot_type}</div>
                </div>
                <div class="spec-card">
                  <span class="spec-label">Brand</span>
                  <div class="spec-value">${robotData.brand || 'Not specified'}</div>
                </div>
                <div class="spec-card">
                  <span class="spec-label">Condition</span>
                  <div class="spec-value">${robotData.condition || 'Not specified'}</div>
                </div>
                <div class="spec-card">
                  <span class="spec-label">Year</span>
                  <div class="spec-value">${robotData.year_manufactured || 'Not specified'}</div>
                </div>
                <div class="spec-card">
                  <span class="spec-label">Location</span>
                  <div class="spec-value">${robotData.location}</div>
                </div>
                <div class="spec-card">
                  <span class="spec-label">Availability</span>
                  <div class="spec-value">${robotData.availability}</div>
                </div>
              </div>
              
              ${robotData.price ? `
                <div class="price-highlight">
                  💰 Price: ${robotData.currency} ${robotData.price.toLocaleString()}
                </div>
              ` : `
                <div class="price-highlight">
                  💰 Price: Available on Request
                </div>
              `}
              
              ${robotData.description ? `
                <div style="margin-top: 25px;">
                  <h3 style="color: #374151; margin: 15px 0; font-size: 18px;">📝 Description</h3>
                  <div style="padding: 20px; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
                    ${robotData.description}
                  </div>
                </div>
              ` : ''}
            </div>
            
            <div class="analysis-section">
              <h2>🧠 AI Analysis Report</h2>
              <div class="analysis-content">
                ${reportContent.replace(/\*\*(.*?)\*\*/g, '<h3 style="color: #374151; margin: 20px 0 10px 0; font-size: 16px; font-weight: 600;">$1</h3>').replace(/\n/g, '<br>')}
              </div>
            </div>
            
            <div class="footer">
              <div class="company-info">RoboVerse Professional Analysis</div>
              <p>Generated using advanced AI technology for comprehensive robot evaluation</p>
              <p style="font-size: 12px; margin-top: 15px;">
                <strong>Disclaimer:</strong> This analysis is AI-generated for reference purposes. 
                Please consult technical experts for critical decisions.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `robot-analysis-${robotData.name.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error downloading report:', error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold">Robot Analysis Report</DialogTitle>
                <DialogDescription className="text-base mt-1">
                  {robotData ? 
                    `Professional analysis for ${robotData.name} - ${robotData.model}` : 
                    'AI-powered robot evaluation and market analysis'}
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {robotData && (
            <div className="flex items-center gap-2 mt-4">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Building className="h-3 w-3" />
                {robotData.robot_type}
              </Badge>
              {robotData.brand && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {robotData.brand}
                </Badge>
              )}
              <Badge variant="outline" className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {robotData.price ? 
                  `${robotData.currency} ${robotData.price.toLocaleString()}` : 
                  'Price on request'}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {robotData.location}
              </Badge>
            </div>
          )}
        </DialogHeader>

        <Separator />

        <div className="flex-1 overflow-hidden">
          {generatingReport ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center space-y-4">
                <div className="relative">
                  <Brain className="h-12 w-12 animate-pulse mx-auto text-primary" />
                  <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-spin"></div>
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-medium">Generating AI Analysis Report</p>
                  <p className="text-sm text-muted-foreground">Analyzing robot specifications and market data...</p>
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center space-y-4">
                <div className="p-4 bg-destructive/10 rounded-full">
                  <X className="h-8 w-8 text-destructive mx-auto" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-medium text-destructive">Error Generating Report</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                  <Button onClick={generateReport} variant="outline" size="sm">
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          ) : robotData && reportContent ? (
            <ScrollArea className="h-[70vh]">
              <div className="p-6 space-y-8">
                {/* Robot Details Section */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-primary" />
                      <CardTitle>Robot Specifications</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Name</label>
                        <p className="font-semibold">{robotData.name}</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Model</label>
                        <p className="font-semibold">{robotData.model}</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Type</label>
                        <Badge variant="secondary">{robotData.robot_type}</Badge>
                      </div>
                      {robotData.brand && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-muted-foreground">Brand</label>
                          <p className="font-semibold">{robotData.brand}</p>
                        </div>
                      )}
                      {robotData.condition && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-muted-foreground">Condition</label>
                          <Badge variant="outline">{robotData.condition}</Badge>
                        </div>
                      )}
                      {robotData.year_manufactured && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-muted-foreground">Year</label>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{robotData.year_manufactured}</span>
                          </div>
                        </div>
                      )}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Location</label>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{robotData.location}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Availability</label>
                        <Badge variant="secondary">{robotData.availability}</Badge>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Price</label>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold text-lg">
                            {robotData.price ? 
                              `${robotData.currency} ${robotData.price.toLocaleString()}` : 
                              'Available on Request'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {robotData.description && (
                      <div className="mt-6 pt-6 border-t">
                        <label className="text-sm font-medium text-muted-foreground block mb-3">Description</label>
                        <p className="text-sm leading-relaxed">{robotData.description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* AI Analysis Section */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-primary" />
                      <CardTitle>AI Analysis Report</CardTitle>
                    </div>
                    <CardDescription>
                      Professional evaluation and market insights
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {formatReportForDisplay(reportContent)}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex items-center justify-center h-96">
              <p className="text-muted-foreground">No robot data available</p>
            </div>
          )}
        </div>

        <Separator />

        <DialogFooter className="p-6 pt-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Report generated on {new Date().toLocaleDateString()}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button 
                onClick={downloadAsPDF}
                disabled={downloading || !reportContent || generatingReport}
                className="flex items-center gap-2"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {downloading ? 'Generating PDF...' : 'Download PDF'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RobotReportModal;