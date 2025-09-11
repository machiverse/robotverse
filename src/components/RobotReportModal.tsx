import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, X, MapPin, Building, Clock, DollarSign, Settings, Brain, Tag, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
      
      setReportContent(res.data?.report || "No report content available.");
    } catch (e: any) {
      console.error('Error fetching report:', e);
      setError(e.message || "Failed to fetch report. Please try again.");
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
    if (!robotData) return;
    setDownloading(true);
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html><head><title>Robot Report</title><meta charset="UTF-8" />
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1,h2,h3 { color: #2c3e50; }
          .section { margin-bottom: 30px; }
          .label { font-weight: bold; }
          .meta { margin-bottom: 20px; }
          img { max-width: 400px; border-radius: 12px; margin-top: 20px; }
          .footer { font-size: 12px; color: #888; margin-top: 60px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
          th { background: #ecf0f1; }
        </style></head><body>
        <h1>${robotData.name} - ${robotData.model} Robot Analysis Report</h1>
        <div class="meta">
          <p><span class="label">Robot Type:</span> ${robotData.robot_type}</p>
          <p><span class="label">Brand:</span> ${robotData.brand || "N/A"}</p>
          <p><span class="label">Price:</span> ${formatPrice(robotData.price, robotData.currency)}</p>
          <p><span class="label">Location:</span> ${robotData.location}</p>
          <p><span class="label">Availability:</span> ${robotData.availability}</p>
          ${robotData.images && robotData.images.length ? `<img src="${robotData.images[0]}" alt="Robot Image" />` : ''}
        </div>
        <div class="section">
          <h2>Description</h2>
          <p>${robotData.description || 'N/A'}</p>
        </div>
        <div class="section">
          <h2>Specifications</h2>
          <table>
            <tbody>
              <tr><th>Field</th><th>Value</th></tr>
              <tr><td>Model</td><td>${robotData.model}</td></tr>
              <tr><td>Year</td><td>${robotData.year_manufactured || 'N/A'}</td></tr>
              <tr><td>Condition</td><td>${robotData.condition || 'N/A'}</td></tr>
              <tr><td>Payload Capacity</td><td>${robotData.payload_capacity ? robotData.payload_capacity + ' kg' : 'N/A'}</td></tr>
              <tr><td>Reach</td><td>${robotData.reach ? robotData.reach + ' mm' : 'N/A'}</td></tr>
              <tr><td>Repeatability</td><td>${robotData.repeatability ? robotData.repeatability + ' mm' : 'N/A'}</td></tr>
              <tr><td>Power Consumption</td><td>${robotData.power_consumption ? robotData.power_consumption + ' kW' : 'N/A'}</td></tr>
              <tr><td>Operating Environment</td><td>${robotData.operating_environment || 'N/A'}</td></tr>
              <tr><td>Warranty</td><td>${robotData.warranty_info || 'N/A'}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="section">
          <h2>AI Analysis</h2>
          <p>${reportContent || 'No AI Analysis available.'}</p>
        </div>
        <div class="footer">Report generated automatically by RoboVerse platform</div>
        </body></html>
      `;
      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${robotData.name.replace(/\s/g, '_')}_robot_report.html`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="flex justify-between items-center p-6 pb-4 border-b shrink-0">
          <div>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <FileText className="w-6 h-6 text-primary" /> 
              Robot Analysis Report
            </DialogTitle>
            <p className="text-sm text-muted-foreground">{robotData?.name} - {robotData?.model}</p>
          </div>
          <Button variant="ghost" onClick={onClose} size="sm">
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
            {loading ? (
              <div className="flex justify-center items-center h-[400px]">
                <div className="text-center">
                  <Loader2 className="animate-spin w-10 h-10 text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Generating comprehensive robot report...</p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-destructive mb-4 font-medium">{error}</div>
                <Button onClick={fetchReport} variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  Retry Report Generation
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Robot Overview Card */}
                <Card className="border-2">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5 text-primary" />
                      Robot Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="font-medium text-muted-foreground">Name:</span>
                        <span className="font-semibold">{robotData.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-muted-foreground">Model:</span>
                        <span className="font-semibold">{robotData.model}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-muted-foreground">Brand:</span>
                        <span className="font-semibold">{robotData.brand || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-muted-foreground">Type:</span>
                        <Badge variant="secondary">{robotData.robot_type}</Badge>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="font-medium text-muted-foreground">Price:</span>
                        <span className="font-bold text-primary text-lg">{formatPrice(robotData.price, robotData.currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-muted-foreground">Location:</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          {robotData.location}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-muted-foreground">Availability:</span>
                        <Badge variant={robotData.availability === 'Available' ? 'default' : 'secondary'}>
                          {robotData.availability}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-muted-foreground">Condition:</span>
                        <span className="font-semibold">{robotData.condition || 'N/A'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Technical Specifications Card */}
                {(robotData.payload_capacity || robotData.reach || robotData.repeatability || 
                  robotData.power_consumption || robotData.operating_environment || robotData.warranty_info) && (
                  <Card className="border-2">
                    <CardHeader className="bg-gradient-to-r from-orange-500/5 to-orange-500/10">
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-orange-600" />
                        Technical Specifications
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {robotData.payload_capacity && (
                          <div className="flex justify-between py-2 border-b">
                            <span className="font-medium">Payload Capacity:</span>
                            <span className="font-semibold">{robotData.payload_capacity} kg</span>
                          </div>
                        )}
                        {robotData.reach && (
                          <div className="flex justify-between py-2 border-b">
                            <span className="font-medium">Reach:</span>
                            <span className="font-semibold">{robotData.reach} mm</span>
                          </div>
                        )}
                        {robotData.repeatability && (
                          <div className="flex justify-between py-2 border-b">
                            <span className="font-medium">Repeatability:</span>
                            <span className="font-semibold">{robotData.repeatability} mm</span>
                          </div>
                        )}
                        {robotData.power_consumption && (
                          <div className="flex justify-between py-2 border-b">
                            <span className="font-medium">Power Consumption:</span>
                            <span className="font-semibold">{robotData.power_consumption} kW</span>
                          </div>
                        )}
                        {robotData.operating_environment && (
                          <div className="flex justify-between py-2 border-b">
                            <span className="font-medium">Operating Environment:</span>
                            <span className="font-semibold">{robotData.operating_environment}</span>
                          </div>
                        )}
                        {robotData.warranty_info && (
                          <div className="flex justify-between py-2 border-b">
                            <span className="font-medium">Warranty:</span>
                            <span className="font-semibold">{robotData.warranty_info}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Description Card */}
                {robotData.description && (
                  <Card className="border-2">
                    <CardHeader className="bg-gradient-to-r from-blue-500/5 to-blue-500/10">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        Description
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                        {robotData.description}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* AI Analysis Report Card */}
                <Card className="border-2 border-primary/20">
                  <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-primary" />
                      AI Analysis Report
                      <Badge variant="secondary" className="ml-auto">
                        Scroll to view full report
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[60vh] border-t">
                      <div className="p-6 bg-gradient-to-b from-background to-muted/20">
                        <div className="prose prose-sm max-w-none text-foreground">
                          {reportContent ? (
                            <div className="whitespace-pre-wrap text-sm leading-relaxed space-y-4 font-mono">
                              {formatReportForDisplay(reportContent)}
                            </div>
                          ) : (
                            <div className="text-center py-12">
                              <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                              <p className="text-muted-foreground italic text-lg">No AI analysis available for this robot.</p>
                              <p className="text-muted-foreground text-sm mt-2">Report generation may still be in progress.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
               </div>
             )}
             </div>
           </ScrollArea>
         </div>

        <Separator className="shrink-0" />

        <DialogFooter className="flex justify-between items-center p-6 pt-4 shrink-0 bg-muted/30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>Generated on {new Date().toLocaleDateString()}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={downloadReport} disabled={downloading || loading} className="gap-2">
              {downloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Download Report
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