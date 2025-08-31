import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Download, FileText, X, User, Building, Mail, Phone, MapPin } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Clock, DollarSign, Tag } from 'lucide-react';

interface UserDetails {
  fullName: string;
  email: string;
  company: string;
  phone: string;
  location: string;
  industryType: string;
  applicationArea: string;
  budget: string;
  requirements: string;
}

interface RobotReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: {
    report: string;
    robotData: any;
    timestamp: string;
  } | null;
  loading: boolean;
}

const RobotReportModal = ({ isOpen, onClose, reportData, loading }: RobotReportModalProps) => {
  const [downloading, setDownloading] = useState(false);

  const formatReportForDisplay = (report: string) => {
    // Split the report into sections and format for better readability
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
    if (!reportData) return;
    
    setDownloading(true);
    try {
      // Create a comprehensive formatted HTML version for PDF conversion
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Robot Analysis Report - ${reportData.robotData.name}</title>
          <meta charset="UTF-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              line-height: 1.6; 
              color: #333;
              font-size: 14px;
              background: #fff;
            }
            
            .container {
              max-width: 800px;
              margin: 0 auto;
              padding: 30px;
            }
            
            .header { 
              border-bottom: 3px solid #2563eb; 
              padding: 30px 0;
              margin-bottom: 40px; 
              text-align: center;
              background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
              border-radius: 10px;
              padding: 40px;
            }
            
            .logo {
              font-size: 32px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 10px;
            }
            
            .header h1 { 
              color: #1e40af; 
              margin: 15px 0;
              font-size: 28px;
              font-weight: 700;
            }
            
            .header .subtitle { 
              color: #64748b; 
              font-size: 16px;
              margin: 10px 0;
            }
            
            .meta-info {
              background: #f1f5f9;
              padding: 15px;
              border-radius: 8px;
              margin-top: 20px;
              border-left: 4px solid #2563eb;
            }
            
            .robot-overview { 
              background: linear-gradient(135deg, #fefefe 0%, #f8fafc 100%); 
              padding: 30px; 
              margin: 30px 0; 
              border-radius: 12px;
              border: 1px solid #e2e8f0;
              box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            }
            
            .analysis-section { 
              background: #ffffff;
              padding: 30px; 
              margin: 30px 0; 
              border-radius: 12px;
              border: 1px solid #e2e8f0;
              box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            
            h2 { 
              color: #1e40af; 
              border-bottom: 2px solid #e2e8f0; 
              padding-bottom: 12px; 
              margin: 30px 0 20px 0;
              font-size: 22px;
              font-weight: 600;
              display: flex;
              align-items: center;
              gap: 10px;
            }
            
            h3 { 
              color: #374151; 
              margin: 25px 0 15px 0; 
              font-size: 18px;
              font-weight: 600;
              padding-left: 20px;
              border-left: 4px solid #3b82f6;
              background: #f8fafc;
              padding: 15px 20px;
              border-radius: 8px;
            }
            
            .specs-grid { 
              display: grid; 
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
              gap: 20px; 
              margin: 20px 0; 
            }
            
            .spec-card { 
              padding: 20px; 
              background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
              border-radius: 10px;
              border: 1px solid #e2e8f0;
              box-shadow: 0 2px 4px rgba(0,0,0,0.02);
              transition: transform 0.2s ease;
            }
            
            .spec-card:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }
            
            .spec-label { 
              font-weight: 600; 
              color: #374151;
              display: block;
              margin-bottom: 8px;
              font-size: 13px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            .spec-value { 
              color: #1f2937;
              font-size: 16px;
              font-weight: 500;
            }
            
            .analysis-content {
              margin: 25px 0;
              padding: 25px;
              background: linear-gradient(135deg, #fafbfc 0%, #f1f5f9 100%);
              border-radius: 10px;
              white-space: pre-wrap;
              line-height: 1.8;
              border-left: 4px solid #10b981;
            }
            
            .price-highlight {
              background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
              color: #92400e;
              padding: 15px 20px;
              border-radius: 8px;
              font-weight: 600;
              font-size: 18px;
              text-align: center;
              margin: 20px 0;
              border: 2px solid #f59e0b;
            }
            
            .badge {
              display: inline-block;
              background: #2563eb;
              color: white;
              padding: 5px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 500;
              margin: 5px 5px 5px 0;
            }
            
            .footer { 
              margin-top: 60px; 
              padding: 30px 0; 
              border-top: 2px solid #e2e8f0; 
              text-align: center; 
              color: #6b7280;
              background: #f8fafc;
              border-radius: 10px;
            }
            
            .footer .company-info {
              font-weight: 600;
              color: #2563eb;
              font-size: 16px;
              margin-bottom: 10px;
            }
            
            .footer .disclaimer {
              font-size: 12px;
              margin-top: 15px;
              line-height: 1.5;
            }
            
            .page-break { 
              page-break-before: always; 
            }
            
            @media print {
              body { margin: 0; }
              .container { padding: 20px; }
              .header { page-break-after: avoid; }
              .robot-overview { page-break-inside: avoid; }
              .analysis-section { page-break-inside: avoid; }
            }
            
            .icon {
              width: 20px;
              height: 20px;
              display: inline-block;
              margin-right: 8px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🤖 RoboVerse</div>
              <h1>Comprehensive Robot Analysis Report</h1>
              <div class="subtitle">Professional AI-Powered Robot Evaluation</div>
              <div class="meta-info">
                <strong>Robot:</strong> ${reportData.robotData.name} - ${reportData.robotData.model}<br>
                <strong>Report Generated:</strong> ${new Date(reportData.timestamp).toLocaleString()}<br>
                <strong>Report ID:</strong> ${reportData.robotData.name.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}
              </div>
            </div>
            
            <div class="robot-overview">
              <h2>🤖 Robot Specifications Overview</h2>
              <div class="specs-grid">
                <div class="spec-card">
                  <span class="spec-label">Robot Name</span>
                  <div class="spec-value">${reportData.robotData.name}</div>
                </div>
                <div class="spec-card">
                  <span class="spec-label">Model</span>
                  <div class="spec-value">${reportData.robotData.model}</div>
                </div>
                <div class="spec-card">
                  <span class="spec-label">Type</span>
                  <div class="spec-value">${reportData.robotData.type}</div>
                </div>
                <div class="spec-card">
                  <span class="spec-label">Brand</span>
                  <div class="spec-value">${reportData.robotData.brand || 'Not specified'}</div>
                </div>
                <div class="spec-card">
                  <span class="spec-label">Condition</span>
                  <div class="spec-value">${reportData.robotData.condition || 'Not specified'}</div>
                </div>
                <div class="spec-card">
                  <span class="spec-label">Year</span>
                  <div class="spec-value">${reportData.robotData.year_manufactured || 'Not specified'}</div>
                </div>
                <div class="spec-card">
                  <span class="spec-label">Location</span>
                  <div class="spec-value">${reportData.robotData.location}</div>
                </div>
                <div class="spec-card">
                  <span class="spec-label">Availability</span>
                  <div class="spec-value">${reportData.robotData.availability || 'Available'}</div>
                </div>
              </div>
              
              ${reportData.robotData.price ? `
                <div class="price-highlight">
                  💰 Price: ${reportData.robotData.currency} ${reportData.robotData.price}
                </div>
              ` : `
                <div class="price-highlight">
                  💰 Price: Available on Request
                </div>
              `}
              
              ${reportData.robotData.description ? `
                <div style="margin-top: 25px;">
                  <h3>📝 Description</h3>
                  <div style="padding: 20px; background: white; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 15px;">
                    ${reportData.robotData.description}
                  </div>
                </div>
              ` : ''}
              
              ${reportData.robotData.applications && reportData.robotData.applications.length > 0 ? `
                <div style="margin-top: 25px;">
                  <h3>⚙️ Applications</h3>
                  <div style="margin-top: 15px;">
                    ${reportData.robotData.applications.map(app => `<span class="badge">${app}</span>`).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
            
            <div class="page-break"></div>
            
            <div class="analysis-section">
              <h2>🧠 AI-Powered Analysis Report</h2>
              <div class="analysis-content">
${reportData.report.replace(/\*\*(.*?)\*\*/g, '<h3>$1</h3>').replace(/\n/g, '<br>')}
              </div>
            </div>
            
            <div class="footer">
              <div class="company-info">RoboVerse AI Analysis System</div>
              <p>This comprehensive report was generated using advanced artificial intelligence technology to provide detailed insights into robot specifications, performance capabilities, and market analysis.</p>
              <div class="disclaimer">
                <strong>Disclaimer:</strong> This analysis is based on available data and AI algorithms. For critical decisions, please consult with technical experts and conduct thorough due diligence. RoboVerse provides this information for reference purposes only.
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      // Create a blob and download
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `robot-analysis-report-${reportData.robotData.name.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.html`;
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
                  {reportData?.robotData ? 
                    `Comprehensive analysis for ${reportData.robotData.name} - ${reportData.robotData.model}` : 
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
          
          {reportData?.robotData && (
            <div className="flex items-center gap-2 mt-4">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Building className="h-3 w-3" />
                {reportData.robotData.type}
              </Badge>
              {reportData.robotData.brand && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {reportData.robotData.brand}
                </Badge>
              )}
              <Badge variant="outline" className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {reportData.robotData.price ? 
                  `${reportData.robotData.currency} ${reportData.robotData.price}` : 
                  'Price on request'}
              </Badge>
              {reportData.robotData.location && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {reportData.robotData.location}
                </Badge>
              )}
            </div>
          )}
        </DialogHeader>

        <Separator />

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center space-y-4">
                <div className="relative">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                  <div className="absolute inset-0 rounded-full border-2 border-primary/20"></div>
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-medium">Generating Comprehensive Analysis</p>
                  <p className="text-muted-foreground">Our AI is analyzing robot specifications, market data, and performance metrics...</p>
                  <p className="text-sm text-muted-foreground">This may take a few moments</p>
                </div>
              </div>
            </div>
          ) : reportData ? (
            <>
              {/* Robot Overview Section */}
              <div className="p-6 border-b">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Building className="h-5 w-5 text-primary" />
                      Robot Overview
                    </CardTitle>
                    <CardDescription>
                      Key specifications and details for {reportData.robotData.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm font-medium text-muted-foreground">Name</p>
                        <p className="font-semibold mt-1">{reportData.robotData.name}</p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm font-medium text-muted-foreground">Model</p>
                        <p className="font-semibold mt-1">{reportData.robotData.model}</p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm font-medium text-muted-foreground">Type</p>
                        <p className="font-semibold mt-1">{reportData.robotData.type}</p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm font-medium text-muted-foreground">Condition</p>
                        <p className="font-semibold mt-1 capitalize">{reportData.robotData.condition || 'Not specified'}</p>
                      </div>
                      {reportData.robotData.brand && (
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <p className="text-sm font-medium text-muted-foreground">Brand</p>
                          <p className="font-semibold mt-1">{reportData.robotData.brand}</p>
                        </div>
                      )}
                      {reportData.robotData.year_manufactured && (
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <p className="text-sm font-medium text-muted-foreground">Year</p>
                          <p className="font-semibold mt-1">{reportData.robotData.year_manufactured}</p>
                        </div>
                      )}
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm font-medium text-muted-foreground">Price</p>
                        <p className="font-semibold mt-1">
                          {reportData.robotData.price ? 
                            `${reportData.robotData.currency} ${reportData.robotData.price}` : 
                            'Price on request'}
                        </p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm font-medium text-muted-foreground">Availability</p>
                        <p className="font-semibold mt-1 capitalize">{reportData.robotData.availability || 'Available'}</p>
                      </div>
                    </div>
                    {reportData.robotData.description && (
                      <div className="mt-4 p-4 bg-background border rounded-lg">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
                        <p className="text-sm leading-relaxed">{reportData.robotData.description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* AI Analysis Report Section */}
              <ScrollArea className="h-[50vh] px-6">
                <div className="py-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <Brain className="h-5 w-5 text-primary" />
                        AI Analysis Report
                      </CardTitle>
                      <CardDescription>
                        Comprehensive insights including performance evaluation, use cases, and market analysis
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {formatReportForDisplay(reportData.report)}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center space-y-2">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto" />
                <p className="text-lg font-medium">No Report Available</p>
                <p className="text-muted-foreground">Please generate a new analysis report</p>
              </div>
            </div>
          )}
        </div>

        {!loading && reportData && (
          <>
            <Separator />
            <DialogFooter className="p-6">
              <div className="flex items-center justify-between w-full">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Generated on {new Date(reportData.timestamp).toLocaleString()}
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={downloadAsPDF}
                    disabled={downloading}
                    className="flex items-center gap-2"
                  >
                    {downloading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Download PDF Report
                  </Button>
                  <Button onClick={onClose}>Close</Button>
                </div>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RobotReportModal;