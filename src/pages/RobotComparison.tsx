import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import EnhancedHeader from "@/components/EnhancedHeader";
import { useRobotComparison, ComparisonRobot } from "@/contexts/RobotComparisonContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Bot,
  Trash2,
  ArrowLeft,
  Loader2,
  Brain,
  CheckCircle,
  XCircle,
  Minus,
  Star,
  Target,
  Zap,
  Award,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";

interface AIComparisonResult {
  comparison_summary: string;
  individual_analysis: {
    robot_id: string;
    strengths: string[];
    weaknesses: string[];
    best_use_cases: string[];
  }[];
  key_differences: string[];
  recommendation: string;
  winner_for_precision?: string;
  winner_for_payload?: string;
  winner_for_value?: string;
}

const RobotComparison = () => {
  const navigate = useNavigate();
  const { selectedRobots, removeRobot, clearComparison } = useRobotComparison();
  const [aiAnalysis, setAiAnalysis] = useState<AIComparisonResult | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Redirect if less than 2 robots
  useEffect(() => {
    if (selectedRobots.length < 2) {
      // Don't redirect immediately, show a message instead
    }
  }, [selectedRobots]);

  const fetchAIComparison = async () => {
    if (selectedRobots.length < 2) return;

    setAnalysisLoading(true);
    setAnalysisError(null);

    try {
      const { data, error } = await supabase.functions.invoke('robot-comparison-ai', {
        body: { robots: selectedRobots }
      });

      if (error) throw error;
      setAiAnalysis(data);
    } catch (err) {
      console.error('AI comparison error:', err);
      setAnalysisError(err instanceof Error ? err.message : 'Failed to generate AI comparison');
    } finally {
      setAnalysisLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRobots.length >= 2) {
      fetchAIComparison();
    }
  }, [selectedRobots.length]);

  const formatPrice = (price?: number, currency = "INR") => {
    if (!price) return "Price on request";
    const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₹";
    return `${symbol}${price.toLocaleString()}`;
  };

  const getSpecValue = (robot: ComparisonRobot, spec: string): string | number | null => {
    switch (spec) {
      case 'payload':
        return robot.payload_capacity ? `${robot.payload_capacity} kg` : null;
      case 'reach':
        return robot.reach ? `${robot.reach} mm` : null;
      case 'repeatability':
        return robot.repeatability ? `±${robot.repeatability} mm` : null;
      case 'price':
        return formatPrice(robot.price, robot.currency);
      case 'condition':
        return robot.condition || null;
      case 'location':
        return robot.location || null;
      default:
        return null;
    }
  };

  const comparisonSpecs = [
    { key: 'payload', label: 'Payload Capacity', icon: Target },
    { key: 'reach', label: 'Reach', icon: Zap },
    { key: 'repeatability', label: 'Repeatability', icon: Award },
    { key: 'price', label: 'Price', icon: Star },
    { key: 'condition', label: 'Condition', icon: CheckCircle },
    { key: 'location', label: 'Location', icon: Target },
  ];

  const getRobotAnalysis = (robotId: string) => {
    return aiAnalysis?.individual_analysis?.find(a => a.robot_id === robotId);
  };

  if (selectedRobots.length < 2) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-16">
          <div className="text-center max-w-md mx-auto">
            <Bot className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-2">Not Enough Robots</h1>
            <p className="text-muted-foreground mb-6">
              You need at least 2 robots to compare. Currently you have {selectedRobots.length} selected.
            </p>
            <Button onClick={() => navigate('/robots')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Browse Robots
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />

      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Robot Comparison
            </h1>
            <p className="text-muted-foreground">
              Compare {selectedRobots.length} robots side by side with AI-powered insights
            </p>
          </div>
          <Button variant="outline" onClick={clearComparison}>
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        </div>

        {/* Robot Cards Header */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {selectedRobots.map((robot) => (
            <Card key={robot.id} className="relative overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => removeRobot(robot.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              
              <div className="h-48 bg-muted">
                {robot.images && robot.images.length > 0 ? (
                  <ResponsiveImage
                    src={robot.images[0]}
                    alt={robot.name}
                    aspectRatio="auto"
                    objectFit="cover"
                    containerClassName="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Bot className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              <CardContent className="p-4">
                <h3 className="font-bold text-lg mb-1 line-clamp-2">{robot.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {robot.brand || "Unknown Brand"} {robot.model && `· ${robot.model}`}
                </p>
                <Badge variant="secondary">{robot.robot_type}</Badge>
                <div className="mt-3 text-lg font-bold text-primary">
                  {formatPrice(robot.price, robot.currency)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Specifications Comparison Table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Specifications Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Specification</th>
                    {selectedRobots.map((robot) => (
                      <th key={robot.id} className="text-center py-3 px-4 font-semibold">
                        {robot.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonSpecs.map((spec) => (
                    <tr key={spec.key} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium flex items-center gap-2">
                        <spec.icon className="w-4 h-4 text-muted-foreground" />
                        {spec.label}
                      </td>
                      {selectedRobots.map((robot) => {
                        const value = getSpecValue(robot, spec.key);
                        return (
                          <td key={robot.id} className="text-center py-3 px-4">
                            {value ? (
                              <span className="font-medium">{value}</span>
                            ) : (
                              <Minus className="w-4 h-4 mx-auto text-muted-foreground" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {/* Applications Row */}
                  <tr className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4 font-medium">Applications</td>
                    {selectedRobots.map((robot) => (
                      <td key={robot.id} className="text-center py-3 px-4">
                        {robot.applications && robot.applications.length > 0 ? (
                          <div className="flex flex-wrap gap-1 justify-center">
                            {robot.applications.slice(0, 3).map((app, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {app}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <Minus className="w-4 h-4 mx-auto text-muted-foreground" />
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* AI Analysis Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              AI-Powered Comparison Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analysisLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Generating AI comparison analysis...</p>
              </div>
            ) : analysisError ? (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
                <p className="text-destructive mb-4">{analysisError}</p>
                <Button onClick={fetchAIComparison}>Retry Analysis</Button>
              </div>
            ) : aiAnalysis ? (
              <div className="space-y-8">
                {/* Summary */}
                <div className="bg-muted/50 rounded-lg p-6">
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-primary" />
                    Comparison Summary
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {aiAnalysis.comparison_summary}
                  </p>
                </div>

                {/* Individual Robot Analysis */}
                <div>
                  <h3 className="font-semibold text-lg mb-4">Individual Robot Analysis</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedRobots.map((robot) => {
                      const analysis = getRobotAnalysis(robot.id);
                      return (
                        <Card key={robot.id} className="border-2">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">{robot.name}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Strengths */}
                            <div>
                              <p className="text-sm font-medium text-green-600 mb-2 flex items-center gap-1">
                                <CheckCircle className="w-4 h-4" />
                                Strengths
                              </p>
                              <ul className="space-y-1">
                                {analysis?.strengths?.map((s, idx) => (
                                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                    <span className="text-green-500 mt-1">•</span>
                                    {s}
                                  </li>
                                )) || (
                                  <li className="text-sm text-muted-foreground">Analysis pending...</li>
                                )}
                              </ul>
                            </div>

                            {/* Weaknesses */}
                            <div>
                              <p className="text-sm font-medium text-red-600 mb-2 flex items-center gap-1">
                                <XCircle className="w-4 h-4" />
                                Weaknesses
                              </p>
                              <ul className="space-y-1">
                                {analysis?.weaknesses?.map((w, idx) => (
                                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                    <span className="text-red-500 mt-1">•</span>
                                    {w}
                                  </li>
                                )) || (
                                  <li className="text-sm text-muted-foreground">Analysis pending...</li>
                                )}
                              </ul>
                            </div>

                            {/* Best Use Cases */}
                            <div>
                              <p className="text-sm font-medium text-blue-600 mb-2 flex items-center gap-1">
                                <Target className="w-4 h-4" />
                                Best For
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {analysis?.best_use_cases?.map((uc, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {uc}
                                  </Badge>
                                )) || (
                                  <span className="text-sm text-muted-foreground">Analysis pending...</span>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Key Differences */}
                {aiAnalysis.key_differences && aiAnalysis.key_differences.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Key Differences</h3>
                    <ul className="space-y-2">
                      {aiAnalysis.key_differences.map((diff, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-muted-foreground">
                          <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm font-medium">
                            {idx + 1}
                          </span>
                          {diff}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendation */}
                <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-lg p-6 border border-primary/20">
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" />
                    AI Recommendation
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {aiAnalysis.recommendation}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Brain className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">AI analysis will appear here</p>
                <Button onClick={fetchAIComparison} className="mt-4">
                  Generate Analysis
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mt-8">
          <Button variant="outline" onClick={() => navigate('/robots')}>
            Add More Robots
          </Button>
          <Button onClick={() => window.print()}>
            Print Comparison
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RobotComparison;
