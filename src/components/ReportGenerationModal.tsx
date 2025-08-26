import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, FileText, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ReportGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  robotData: any;
  insights: any;
}

const ReportGenerationModal = ({ isOpen, onClose, robotData, insights }: ReportGenerationModalProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const { toast } = useToast();

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`https://cmahwgetrqczytnijbuk.supabase.co/functions/v1/robot-market-intelligence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generateReport',
          robotData,
          insights
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const data = await response.json();
      setReport(data.report);
      
      toast({
        title: "Report Generated",
        description: "Your market intelligence report is ready!",
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadReport = () => {
    if (!report) return;

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${robotData.name}_Market_Intelligence_Report.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download Started",
      description: "Your report is being downloaded.",
    });
  };

  const handleClose = () => {
    setReport(null);
    setIsGenerating(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Market Intelligence Report
          </DialogTitle>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-4">
          {!report && !isGenerating && (
            <Card>
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                    <FileText className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Generate AI Market Report</h3>
                    <p className="text-muted-foreground mt-2">
                      Get comprehensive market intelligence for {robotData.name} including demand analysis, 
                      competitive positioning, and investment recommendations.
                    </p>
                  </div>
                  <Button onClick={generateReport} size="lg" className="w-full">
                    Generate Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isGenerating && (
            <Card>
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
                  <div>
                    <h3 className="text-lg font-semibold">Generating Report...</h3>
                    <p className="text-muted-foreground">
                      Our AI is analyzing market data and generating your comprehensive report.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {report && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Generated Report</h3>
                <Button onClick={downloadReport} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>
              
              <Card>
                <CardContent className="p-6">
                  <div className="prose prose-sm max-w-none h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">
                      {report}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportGenerationModal;