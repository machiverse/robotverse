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

        {/* THIS CONTAINER IS UPDATED TO ENABLE SCROLL */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full flex flex-col">
            <div className="p-6 min-w-full">
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
                <>
                  {/* Place existing content here as needed, for brevity showing only report content */}
                  <div style={{ whiteSpace: 'pre-wrap' }}>
                    {formatReportForDisplay(reportContent)}
                  </div>
                </>
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
