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
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError("Please sign in to view the robot analysis report.");
        return;
      }

      const res = await supabase.functions.invoke('roboverse-robot-report', { 
        body: { robotId: robotData.id },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
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
            <div className="text-center py-8">
              <div className="text-red-600 mb-4">{error}</div>
              <Button onClick={fetchReport} variant="outline">
                Retry
              </Button>
            </div>
          ) : (
            <>
              {/* You can add more detailed render here if needed */}
              <Card>
                <CardHeader>
                  <CardTitle>Robot Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <p><strong>Name:</strong> {robotData.name}</p>
                  <p><strong>Model:</strong> {robotData.model}</p>
                  <p><strong>Brand:</strong> {robotData.brand || 'N/A'}</p>
                  <p><strong>Price:</strong> {formatPrice(robotData.price, robotData.currency)}</p>
                  <p><strong>Location:</strong> {robotData.location}</p>
                  <p><strong>Availability:</strong> {robotData.availability}</p>
                </CardContent>
              </Card>
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>AI Report</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap">{reportContent}</pre>
                </CardContent>
              </Card>
            </>
          )}
        </ScrollArea>

        <Separator />

        <DialogFooter className="flex justify-between">
          <p className="text-xs text-gray-500">Generated on {new Date().toLocaleDateString()}</p>
          <div className="space-x-2">
            <Button onClick={onClose}>Close</Button>
            <Button onClick={downloadReport} disabled={downloading || loading}>
              {downloading ? 'Generating...' : 'Download Report'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RobotReportModal;