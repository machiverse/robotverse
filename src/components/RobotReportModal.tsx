import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, X, MapPin, Building, Clock, DollarSign, Settings, Brain, Tag, Loader2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import robotverseLogo from "@/assets/robotverse-logo.png";

interface RobotReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  robotData: any;
}

export function RobotReportModal({ isOpen, onClose, robotData }: RobotReportModalProps) {
  const [reportContent, setReportContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && robotData) {
      fetchReport();
    }
  }, [isOpen, robotData]);

  async function fetchReport() {
    setLoading(true);
    setError(null);
    console.log('Fetching report for robot:', robotData?.id);
    
    try {
      const res = await supabase.functions.invoke('roboverse-robot-report', { 
        body: { robotId: robotData.id } 
      });
      
      console.log('Report response:', res);
      
      if (res.error) {
        console.error('Report error:', res.error);
        throw new Error(res.error.message || 'Failed to generate report');
      }
      
      if (res.data?.report) {
        setReportContent(res.data.report);
        toast({
          title: "Report Generated",
          description: "AI analysis report has been successfully generated.",
        });
      } else {
        setReportContent("No report content available.");
        toast({
          title: "Report Generated",
          description: "Report generated but no content available.",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      console.error('Fetch report error:', e);
      const errorMessage = e?.message || "Failed to fetch report.";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function formatPrice(price:number, currency:string) {
    const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₹";
    return `${symbol}${price.toLocaleString()}`;
  }

  const formatReportForDisplay = (text:string) => {
    return text.split(/\n{2,}/g).map((block, i) => (
      <p key={i} style={{ whiteSpace: 'pre-line', marginBottom: '1rem' }}>
        {block}
      </p>
    ));
  }

  async function downloadReport() {
    if (!robotData || !reportContent) {
      toast({
        title: "Error",
        description: "No report content available to download.",
        variant: "destructive",
      });
      return;
    }
    
    setDownloading(true);
    try {
      // Create professional HTML report with RobotVerse branding
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Robot Analysis Report - ${robotData.name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              background: #fff;
              padding: 40px;
            }
            .header { 
              border-bottom: 3px solid #3b82f6; 
              margin-bottom: 30px; 
              padding-bottom: 20px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .logo { 
              width: 120px; 
              height: auto; 
            }
            .company-info {
              text-align: right;
            }
            .company-name {
              font-size: 24px;
              font-weight: bold;
              color: #3b82f6;
              margin-bottom: 5px;
            }
            .tagline {
              font-size: 14px;
              color: #6b7280;
            }
            h1 { 
              color: #1f2937; 
              font-size: 28px; 
              margin-bottom: 10px;
              border-left: 4px solid #3b82f6;
              padding-left: 20px;
            }
            h2 { 
              color: #374151; 
              font-size: 20px; 
              margin: 25px 0 15px; 
              padding-bottom: 5px;
              border-bottom: 2px solid #e5e7eb;
            }
            h3 { 
              color: #4b5563; 
              font-size: 16px; 
              margin: 20px 0 10px; 
            }
            .robot-overview {
              background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
              padding: 25px;
              border-radius: 10px;
              margin: 20px 0;
              border-left: 5px solid #3b82f6;
            }
            .specs-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
              gap: 15px;
              margin: 20px 0;
            }
            .spec-item {
              background: #f9fafb;
              padding: 15px;
              border-radius: 8px;
              border: 1px solid #e5e7eb;
            }
            .spec-label { 
              font-weight: 600; 
              color: #374151;
              font-size: 14px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .spec-value { 
              font-size: 16px; 
              color: #1f2937;
              margin-top: 5px;
            }
            .price-highlight {
              background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
              color: white;
              padding: 15px 25px;
              border-radius: 10px;
              font-size: 20px;
              font-weight: bold;
              text-align: center;
              margin: 20px 0;
            }
            .report-content {
              background: #ffffff;
              padding: 30px;
              border-radius: 10px;
              border: 1px solid #e5e7eb;
              margin: 25px 0;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .report-text {
              white-space: pre-wrap;
              line-height: 1.8;
              font-size: 15px;
            }
            .footer { 
              margin-top: 50px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
            }
            .footer .generated-date {
              font-weight: 600;
              color: #374151;
            }
            .robot-image {
              max-width: 300px;
              height: auto;
              border-radius: 10px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              margin: 20px 0;
            }
            .section {
              margin-bottom: 35px;
            }
            @media print {
              body { padding: 20px; }
              .header { page-break-after: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <img src="${robotverseLogo}" alt="RobotVerse Logo" class="logo" />
            </div>
            <div class="company-info">
              <div class="company-name">RobotVerse</div>
              <div class="tagline">Industrial Robotics Marketplace</div>
            </div>
          </div>
          
          <h1>Robot Analysis Report</h1>
          
          <div class="robot-overview">
            <h2>${robotData.name} - ${robotData.model}</h2>
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
                <div class="spec-label">Location</div>
                <div class="spec-value">${robotData.location || 'N/A'}</div>
              </div>
              <div class="spec-item">
                <div class="spec-label">Availability</div>
                <div class="spec-value">${robotData.availability || 'N/A'}</div>
              </div>
            </div>
            
            <div class="price-highlight">
              Price: ${formatPrice(robotData.price, robotData.currency)}
            </div>
            
            ${robotData.images && robotData.images.length ? 
              `<img src="${robotData.images[0]}" alt="Robot Image" class="robot-image" />` : ''
            }
          </div>

          <div class="section">
            <h2>Description</h2>
            <p>${robotData.description || 'No description available.'}</p>
          </div>

          <div class="section">
            <h2>Technical Specifications</h2>
            <div class="specs-grid">
              <div class="spec-item">
                <div class="spec-label">Model</div>
                <div class="spec-value">${robotData.model || 'N/A'}</div>
              </div>
              <div class="spec-item">
                <div class="spec-label">Year Manufactured</div>
                <div class="spec-value">${robotData.year_manufactured || 'N/A'}</div>
              </div>
              <div class="spec-item">
                <div class="spec-label">Condition</div>
                <div class="spec-value">${robotData.condition || 'N/A'}</div>
              </div>
              <div class="spec-item">
                <div class="spec-label">Payload Capacity</div>
                <div class="spec-value">${robotData.payload_capacity ? robotData.payload_capacity + ' kg' : 'N/A'}</div>
              </div>
              <div class="spec-item">
                <div class="spec-label">Reach</div>
                <div class="spec-value">${robotData.reach ? robotData.reach + ' mm' : 'N/A'}</div>
              </div>
              <div class="spec-item">
                <div class="spec-label">Repeatability</div>
                <div class="spec-value">${robotData.repeatability ? robotData.repeatability + ' mm' : 'N/A'}</div>
              </div>
              <div class="spec-item">
                <div class="spec-label">Power Consumption</div>
                <div class="spec-value">${robotData.power_consumption ? robotData.power_consumption + ' kW' : 'N/A'}</div>
              </div>
              <div class="spec-item">
                <div class="spec-label">Operating Environment</div>
                <div class="spec-value">${robotData.operating_environment || 'N/A'}</div>
              </div>
              <div class="spec-item">
                <div class="spec-label">Warranty</div>
                <div class="spec-value">${robotData.warranty_info || 'N/A'}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>AI Analysis Report</h2>
            <div class="report-content">
              <div class="report-text">${reportContent}</div>
            </div>
          </div>

          <div class="footer">
            <div class="generated-date">Report Generated: ${new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</div>
            <div>Powered by RobotVerse AI Analytics Platform</div>
            <div>© ${new Date().getFullYear()} RobotVerse. All rights reserved.</div>
          </div>
        </body>
        </html>
      `;
      
      const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `RobotVerse_${robotData.name.replace(/[^a-zA-Z0-9]/g, '_')}_Analysis_Report.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Report Downloaded",
        description: "Professional robot analysis report has been downloaded successfully.",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download the report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-6 overflow-hidden">
        <DialogHeader className="flex justify-between items-center mb-4">
          <div>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <FileText /> Robot Analysis Report
            </DialogTitle>
            <p className="text-sm text-gray-600">{robotData?.name} - {robotData?.model}</p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            <X />
          </Button>
        </DialogHeader>
        <ScrollArea className="h-[70vh]">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="animate-spin w-10 h-10 text-gray-500" />
            </div>
          ) : error ? (
            <div className="text-center text-red-600 p-8">
              <X className="w-12 h-12 mx-auto mb-4 text-red-500" />
              <h3 className="text-lg font-semibold mb-2">Report Generation Failed</h3>
              <p className="text-sm">{error}</p>
              <Button 
                onClick={fetchReport} 
                variant="outline" 
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Robot Overview */}
              <Card className="border-l-4 border-l-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Robot Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-semibold">{robotData?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Model</p>
                    <p className="font-semibold">{robotData?.model}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Brand</p>
                    <p className="font-semibold">{robotData?.brand || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Price</p>
                    <p className="font-semibold text-primary">{formatPrice(robotData?.price, robotData?.currency)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-semibold flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {robotData?.location}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Availability</p>
                    <Badge variant={robotData?.availability === 'available' ? 'default' : 'secondary'}>
                      {robotData?.availability}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* AI Analysis Report */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    AI Analysis Report
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {reportContent ? (
                    <div className="prose prose-sm max-w-none">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed bg-slate-50 p-4 rounded-lg border">
                        {formatReportForDisplay(reportContent)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No analysis content available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </ScrollArea>

        <Separator />

        <DialogFooter className="flex justify-between">
          <p className="text-xs text-gray-500">Generated on {new Date().toLocaleDateString()}</p>
          <div className="space-x-2">
            <Button onClick={onClose} variant="outline">Close</Button>
            <Button 
              onClick={downloadReport} 
              disabled={downloading || loading || !reportContent}
              className="flex items-center gap-2"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download Professional Report
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RobotReportModal;