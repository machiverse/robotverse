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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [activeTab, setActiveTab] = useState<'details' | 'report'>('details');
  const [userDetails, setUserDetails] = useState<UserDetails>({
    fullName: '',
    email: '',
    company: '',
    phone: '',
    location: '',
    industryType: '',
    applicationArea: '',
    budget: '',
    requirements: ''
  });

  const handleInputChange = (field: keyof UserDetails, value: string) => {
    setUserDetails(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = () => {
    return userDetails.fullName && userDetails.email && userDetails.company && userDetails.phone;
  };

  const formatReportForDisplay = (report: string) => {
    // Split the report into sections and format for better readability
    const sections = report.split(/(?=\*\*[A-Z\s]+\*\*)/g).filter(section => section.trim());
    
    return sections.map((section, index) => {
      const lines = section.split('\n').filter(line => line.trim());
      const title = lines[0]?.replace(/\*\*/g, '') || '';
      const content = lines.slice(1).join('\n');
      
      return (
        <div key={index} className="mb-6">
          {title && (
            <h3 className="text-lg font-semibold text-foreground mb-3 border-b border-border pb-2">
              {title.replace(/^\d+\.\s*/, '')}
            </h3>
          )}
          <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {content}
          </div>
        </div>
      );
    });
  };

  const downloadAsPDF = async () => {
    if (!reportData || !isFormValid()) return;
    
    setDownloading(true);
    try {
      // Create a comprehensive formatted HTML version for PDF conversion
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Robot Analysis Report - ${reportData.robotData.name}</title>
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              margin: 30px; 
              line-height: 1.6; 
              color: #333;
              font-size: 14px;
            }
            .header { 
              border-bottom: 3px solid #2563eb; 
              padding-bottom: 25px; 
              margin-bottom: 35px; 
              text-align: center;
            }
            .header h1 { 
              color: #2563eb; 
              margin-bottom: 10px; 
              font-size: 28px;
              font-weight: bold;
            }
            .header p { 
              color: #666; 
              margin: 5px 0;
              font-size: 16px;
            }
            
            .user-details { 
              background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); 
              padding: 25px; 
              margin: 25px 0; 
              border-radius: 12px; 
              border-left: 5px solid #2563eb;
            }
            .robot-info { 
              background: linear-gradient(135deg, #fefefe 0%, #f1f5f9 100%); 
              padding: 25px; 
              margin: 25px 0; 
              border-radius: 12px;
              border-left: 5px solid #10b981;
            }
            .analysis-section { 
              background: #ffffff;
              padding: 25px; 
              margin: 25px 0; 
              border-radius: 12px;
              border: 1px solid #e2e8f0;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            h1 { color: #2563eb; margin-bottom: 15px; font-size: 24px; }
            h2 { 
              color: #1e40af; 
              border-bottom: 2px solid #e2e8f0; 
              padding-bottom: 10px; 
              margin: 25px 0 15px 0;
              font-size: 20px;
            }
            h3 { 
              color: #374151; 
              margin: 20px 0 10px 0; 
              font-size: 16px;
              font-weight: 600;
            }
            
            .details-grid { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 15px; 
              margin: 15px 0; 
            }
            .detail-item { 
              padding: 10px 15px; 
              background: white;
              border-radius: 8px;
              border-left: 3px solid #3b82f6;
            }
            .detail-label { 
              font-weight: 600; 
              color: #374151;
              display: block;
              margin-bottom: 5px;
            }
            .detail-value { 
              color: #6b7280;
              word-wrap: break-word;
            }
            
            .spec-grid { 
              display: grid; 
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
              gap: 15px; 
              margin: 15px 0; 
            }
            .spec-item { 
              padding: 12px; 
              background: #f8fafc;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
            }
            
            .analysis-content {
              margin: 20px 0;
              padding: 20px;
              background: #fafbfc;
              border-radius: 8px;
              white-space: pre-wrap;
              line-height: 1.8;
            }
            
            .footer { 
              margin-top: 50px; 
              padding-top: 25px; 
              border-top: 2px solid #e2e8f0; 
              text-align: center; 
              color: #6b7280;
              font-size: 12px;
            }
            
            .page-break { page-break-before: always; }
            
            @media print {
              body { margin: 20px; }
              .header { page-break-after: avoid; }
              .user-details { page-break-inside: avoid; }
              .robot-info { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🤖 Comprehensive Robot Analysis Report</h1>
            <p><strong>Robot:</strong> ${reportData.robotData.name} - ${reportData.robotData.model}</p>
            <p><strong>Report Generated:</strong> ${new Date(reportData.timestamp).toLocaleString()}</p>
          </div>
          
          <div class="user-details">
            <h2>📋 Customer Information</h2>
            <div class="details-grid">
              <div class="detail-item">
                <span class="detail-label">👤 Full Name:</span>
                <div class="detail-value">${userDetails.fullName}</div>
              </div>
              <div class="detail-item">
                <span class="detail-label">📧 Email:</span>
                <div class="detail-value">${userDetails.email}</div>
              </div>
              <div class="detail-item">
                <span class="detail-label">🏢 Company:</span>
                <div class="detail-value">${userDetails.company}</div>
              </div>
              <div class="detail-item">
                <span class="detail-label">📞 Phone:</span>
                <div class="detail-value">${userDetails.phone}</div>
              </div>
              <div class="detail-item">
                <span class="detail-label">📍 Location:</span>
                <div class="detail-value">${userDetails.location || 'Not specified'}</div>
              </div>
              <div class="detail-item">
                <span class="detail-label">🏭 Industry Type:</span>
                <div class="detail-value">${userDetails.industryType || 'Not specified'}</div>
              </div>
              <div class="detail-item">
                <span class="detail-label">⚙️ Application Area:</span>
                <div class="detail-value">${userDetails.applicationArea || 'Not specified'}</div>
              </div>
              <div class="detail-item">
                <span class="detail-label">💰 Budget Range:</span>
                <div class="detail-value">${userDetails.budget || 'Not specified'}</div>
              </div>
            </div>
            ${userDetails.requirements ? `
              <div style="margin-top: 20px;">
                <span class="detail-label">📝 Special Requirements:</span>
                <div class="detail-value" style="margin-top: 10px; padding: 15px; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
                  ${userDetails.requirements}
                </div>
              </div>
            ` : ''}
          </div>
          
          <div class="robot-info">
            <h2>🤖 Robot Overview</h2>
            <div class="spec-grid">
              <div class="spec-item"><strong>Name:</strong> ${reportData.robotData.name}</div>
              <div class="spec-item"><strong>Model:</strong> ${reportData.robotData.model}</div>
              <div class="spec-item"><strong>Type:</strong> ${reportData.robotData.type}</div>
              <div class="spec-item"><strong>Brand:</strong> ${reportData.robotData.brand || 'Not specified'}</div>
              <div class="spec-item"><strong>Price:</strong> ${reportData.robotData.price ? `${reportData.robotData.currency} ${reportData.robotData.price}` : 'Price on request'}</div>
              <div class="spec-item"><strong>Location:</strong> ${reportData.robotData.location}</div>
              <div class="spec-item"><strong>Condition:</strong> ${reportData.robotData.condition || 'Not specified'}</div>
              <div class="spec-item"><strong>Availability:</strong> ${reportData.robotData.availability || 'Available'}</div>
            </div>
            ${reportData.robotData.description ? `
              <div style="margin-top: 20px;">
                <strong>Description:</strong>
                <div style="margin-top: 10px; padding: 15px; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
                  ${reportData.robotData.description}
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
            <p><strong>RoboVerse AI Analysis System</strong></p>
            <p>This report was generated using advanced AI technology to provide comprehensive insights.</p>
            <p>For questions about this report, please contact our support team.</p>
            <p style="margin-top: 10px; font-size: 10px;">
              Report ID: ${reportData.robotData.name.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}
            </p>
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
      <DialogContent className="max-w-6xl max-h-[95vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">Robot Analysis Report</DialogTitle>
                <DialogDescription>
                  {reportData?.robotData ? 
                    `${reportData.robotData.name} - ${reportData.robotData.model}` : 
                    'Comprehensive robot analysis with user details'}
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
              <Badge variant="secondary">{reportData.robotData.type}</Badge>
              {reportData.robotData.brand && (
                <Badge variant="outline">{reportData.robotData.brand}</Badge>
              )}
              <Badge variant="outline">
                {reportData.robotData.price ? 
                  `${reportData.robotData.currency} ${reportData.robotData.price}` : 
                  'Price on request'}
              </Badge>
            </div>
          )}
        </DialogHeader>

        <Separator />

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Generating comprehensive analysis report...</p>
                <p className="text-sm text-muted-foreground mt-2">This may take a few moments</p>
              </div>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="h-full">
              <TabsList className="w-full justify-start px-6 bg-muted/50">
                <TabsTrigger value="details" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Your Details
                </TabsTrigger>
                <TabsTrigger value="report" disabled={!reportData} className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  AI Analysis Report
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="m-0 h-[calc(100%-60px)]">
                <ScrollArea className="h-full px-6">
                  <div className="py-6 space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <User className="h-5 w-5" />
                          Contact Information
                        </CardTitle>
                        <CardDescription>
                          Please provide your details to personalize the robot analysis report
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="fullName">Full Name *</Label>
                            <Input
                              id="fullName"
                              value={userDetails.fullName}
                              onChange={(e) => handleInputChange('fullName', e.target.value)}
                              placeholder="Enter your full name"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email">Email Address *</Label>
                            <Input
                              id="email"
                              type="email"
                              value={userDetails.email}
                              onChange={(e) => handleInputChange('email', e.target.value)}
                              placeholder="Enter your email address"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="company">Company Name *</Label>
                            <Input
                              id="company"
                              value={userDetails.company}
                              onChange={(e) => handleInputChange('company', e.target.value)}
                              placeholder="Enter your company name"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number *</Label>
                            <Input
                              id="phone"
                              value={userDetails.phone}
                              onChange={(e) => handleInputChange('phone', e.target.value)}
                              placeholder="Enter your phone number"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="location">Location</Label>
                            <Input
                              id="location"
                              value={userDetails.location}
                              onChange={(e) => handleInputChange('location', e.target.value)}
                              placeholder="City, State, Country"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="industryType">Industry Type</Label>
                            <Input
                              id="industryType"
                              value={userDetails.industryType}
                              onChange={(e) => handleInputChange('industryType', e.target.value)}
                              placeholder="e.g., Manufacturing, Automotive"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="applicationArea">Application Area</Label>
                            <Input
                              id="applicationArea"
                              value={userDetails.applicationArea}
                              onChange={(e) => handleInputChange('applicationArea', e.target.value)}
                              placeholder="e.g., Welding, Assembly, Painting"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="budget">Budget Range</Label>
                            <Input
                              id="budget"
                              value={userDetails.budget}
                              onChange={(e) => handleInputChange('budget', e.target.value)}
                              placeholder="e.g., $50,000 - $100,000"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="requirements">Special Requirements</Label>
                          <Textarea
                            id="requirements"
                            value={userDetails.requirements}
                            onChange={(e) => handleInputChange('requirements', e.target.value)}
                            placeholder="Describe any specific requirements, features, or considerations for your robot selection..."
                            rows={4}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {reportData && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Report Preview
                          </CardTitle>
                          <CardDescription>
                            Your personalized report is ready! Switch to the "AI Analysis Report" tab to view the full analysis.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-primary/10 rounded-lg">
                                <FileText className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">Comprehensive Analysis Ready</p>
                                <p className="text-sm text-muted-foreground">
                                  Generated on {new Date(reportData.timestamp).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <Button
                              onClick={() => setActiveTab('report')}
                              variant="outline"
                              className="flex items-center gap-2"
                            >
                              View Report
                              <FileText className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="report" className="m-0 h-[calc(100%-60px)]">
                {reportData ? (
                  <ScrollArea className="h-full px-6">
                    <div className="py-6">
                      {formatReportForDisplay(reportData.report)}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <p className="text-muted-foreground">No report data available</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>

        {!loading && (
          <>
            <Separator />
            <DialogFooter className="p-6">
              <div className="flex items-center justify-between w-full">
                <div className="text-sm text-muted-foreground">
                  {reportData ? (
                    `Generated on ${new Date(reportData.timestamp).toLocaleString()}`
                  ) : (
                    "Complete your details to enable PDF download"
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {reportData && (
                    <Button
                      variant="outline"
                      onClick={downloadAsPDF}
                      disabled={downloading || !isFormValid()}
                      className="flex items-center gap-2"
                    >
                      {downloading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Download PDF Report
                    </Button>
                  )}
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