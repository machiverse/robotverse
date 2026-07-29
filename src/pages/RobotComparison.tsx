import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Target,
  Zap,
  Award,
  AlertTriangle,
  Lightbulb,
  Trophy,
  Scale,
  DollarSign,
  MapPin,
  Factory,
  Settings,
  RefreshCw,
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

  const fetchAIComparison = async () => {
    if (selectedRobots.length < 2) return;

    setAnalysisLoading(true);
    setAnalysisError(null);

    try {
      const { data, error } = await supabase.functions.invoke('robot-comparison-ai', {
        body: { robots: selectedRobots }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
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

  const getRobotAnalysis = (robotId: string) => {
    return aiAnalysis?.individual_analysis?.find(a => a.robot_id === robotId);
  };

  // Get best value for comparison highlighting
  const getBestPayload = () => {
    const withPayload = selectedRobots.filter(r => r.payload_capacity);
    if (withPayload.length === 0) return null;
    return withPayload.reduce((max, r) => (r.payload_capacity || 0) > (max.payload_capacity || 0) ? r : max);
  };

  const getBestReach = () => {
    const withReach = selectedRobots.filter(r => r.reach);
    if (withReach.length === 0) return null;
    return withReach.reduce((max, r) => (r.reach || 0) > (max.reach || 0) ? r : max);
  };

  const getBestPrecision = () => {
    const withRepeatability = selectedRobots.filter(r => r.repeatability);
    if (withRepeatability.length === 0) return null;
    return withRepeatability.reduce((min, r) => (r.repeatability || Infinity) < (min.repeatability || Infinity) ? r : min);
  };

  const getLowestPrice = () => {
    const withPrice = selectedRobots.filter(r => r.price);
    if (withPrice.length === 0) return null;
    return withPrice.reduce((min, r) => (r.price || Infinity) < (min.price || Infinity) ? r : min);
  };

  const bestPayload = getBestPayload();
  const bestReach = getBestReach();
  const bestPrecision = getBestPrecision();
  const lowestPrice = getLowestPrice();

  if (selectedRobots.length < 2) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-16">
          <div className="text-center max-w-md mx-auto">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
              <Bot className="w-10 h-10 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Not Enough Robots</h1>
            <p className="text-muted-foreground mb-6">
              You need at least 2 robots to compare. Currently you have {selectedRobots.length} selected.
            </p>
            <Button onClick={() => navigate('/robots')} size="lg">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Browse Robots
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <EnhancedHeader />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl md:text-4xl font-bold">
              Robot Comparison
            </h1>
            <p className="text-muted-foreground mt-1">
              Comparing {selectedRobots.length} industrial robots with AI-powered insights
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/robots')}>
              Add More
            </Button>
            <Button variant="outline" onClick={clearComparison} className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          </div>
        </div>

        {/* Professional Comparison Table */}
        <Card className="mb-8 overflow-hidden border-2">
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Robot Images & Names Header */}
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left p-4 font-semibold text-sm uppercase tracking-wider text-muted-foreground min-w-[180px]">
                    Specification
                  </th>
                  {selectedRobots.map((robot) => (
                    <th key={robot.id} className="p-4 min-w-[220px] relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeRobot(robot.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      
                      <div className="flex flex-col items-center">
                        <div className="w-32 h-32 rounded-xl bg-background border-2 border-border overflow-hidden mb-3 shadow-md">
                          {robot.images && robot.images[0] ? (
                            <img
                              src={robot.images[0]}
                              alt={robot.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted">
                              <Bot className="w-10 h-10 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <h3 className="font-bold text-base text-center line-clamp-2 mb-1">{robot.name}</h3>
                        <p className="text-xs text-muted-foreground text-center">
                          {robot.brand || "Unknown Brand"}
                        </p>
                        <Badge variant="secondary" className="mt-2 text-xs">
                          {robot.robot_type}
                        </Badge>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              
              <tbody className="divide-y divide-border">
                {/* Price Row */}
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-medium">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      Price
                    </div>
                  </td>
                  {selectedRobots.map((robot) => (
                    <td key={robot.id} className="p-4 text-center">
                      <div className={`text-lg font-bold ${lowestPrice?.id === robot.id ? 'text-green-500' : ''}`}>
                        {formatPrice(robot.price, robot.currency)}
                      </div>
                      {lowestPrice?.id === robot.id && robot.price && (
                        <Badge variant="outline" className="mt-1 text-green-600 border-green-600 text-xs">
                          Best Value
                        </Badge>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Payload Row */}
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-medium">
                    <div className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-blue-500" />
                      Payload Capacity
                    </div>
                  </td>
                  {selectedRobots.map((robot) => (
                    <td key={robot.id} className="p-4 text-center">
                      {robot.payload_capacity ? (
                        <div className={`font-semibold ${bestPayload?.id === robot.id ? 'text-blue-500' : ''}`}>
                          {robot.payload_capacity} kg
                          {bestPayload?.id === robot.id && (
                            <Badge variant="outline" className="ml-2 text-blue-600 border-blue-600 text-xs">
                              Highest
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <Minus className="w-4 h-4 mx-auto text-muted-foreground" />
                      )}
                    </td>
                  ))}
                </tr>

                {/* Reach Row */}
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-medium">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-orange-500" />
                      Reach
                    </div>
                  </td>
                  {selectedRobots.map((robot) => (
                    <td key={robot.id} className="p-4 text-center">
                      {robot.reach ? (
                        <div className={`font-semibold ${bestReach?.id === robot.id ? 'text-orange-500' : ''}`}>
                          {robot.reach} mm
                          {bestReach?.id === robot.id && (
                            <Badge variant="outline" className="ml-2 text-orange-600 border-orange-600 text-xs">
                              Longest
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <Minus className="w-4 h-4 mx-auto text-muted-foreground" />
                      )}
                    </td>
                  ))}
                </tr>

                {/* Repeatability Row */}
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-medium">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-purple-500" />
                      Repeatability
                    </div>
                  </td>
                  {selectedRobots.map((robot) => (
                    <td key={robot.id} className="p-4 text-center">
                      {robot.repeatability ? (
                        <div className={`font-semibold ${bestPrecision?.id === robot.id ? 'text-purple-500' : ''}`}>
                          ±{robot.repeatability} mm
                          {bestPrecision?.id === robot.id && (
                            <Badge variant="outline" className="ml-2 text-purple-600 border-purple-600 text-xs">
                              Most Precise
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <Minus className="w-4 h-4 mx-auto text-muted-foreground" />
                      )}
                    </td>
                  ))}
                </tr>

                {/* Condition Row */}
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-medium">
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      Condition
                    </div>
                  </td>
                  {selectedRobots.map((robot) => (
                    <td key={robot.id} className="p-4 text-center">
                      {robot.condition ? (
                        <Badge variant={robot.condition === 'New' ? 'default' : 'secondary'}>
                          {robot.condition}
                        </Badge>
                      ) : (
                        <Minus className="w-4 h-4 mx-auto text-muted-foreground" />
                      )}
                    </td>
                  ))}
                </tr>

                {/* Location Row */}
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-medium">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      Location
                    </div>
                  </td>
                  {selectedRobots.map((robot) => (
                    <td key={robot.id} className="p-4 text-center text-sm text-muted-foreground">
                      {robot.location || <Minus className="w-4 h-4 mx-auto" />}
                    </td>
                  ))}
                </tr>

                {/* Applications Row */}
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-medium">
                    <div className="flex items-center gap-2">
                      <Factory className="w-4 h-4 text-muted-foreground" />
                      Applications
                    </div>
                  </td>
                  {selectedRobots.map((robot) => (
                    <td key={robot.id} className="p-4">
                      {robot.applications && robot.applications.length > 0 ? (
                        <div className="flex flex-wrap gap-1 justify-center">
                          {robot.applications.slice(0, 4).map((app, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {app}
                            </Badge>
                          ))}
                          {robot.applications.length > 4 && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              +{robot.applications.length - 4}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <div className="flex justify-center">
                          <Minus className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* AI Analysis Section */}
        <Card className="overflow-hidden border-2">
          <div className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-blue-500/10 p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">AI-Powered Analysis</h2>
                  <p className="text-sm text-muted-foreground">Expert comparison insights powered by advanced AI</p>
                </div>
              </div>
              {!analysisLoading && (
                <Button variant="outline" size="sm" onClick={fetchAIComparison}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              )}
            </div>
          </div>

          <CardContent className="p-6">
            {analysisLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-muted animate-pulse" />
                  <Loader2 className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-primary" />
                </div>
                <p className="text-muted-foreground mt-4 font-medium">Analyzing robots...</p>
                <p className="text-xs text-muted-foreground mt-1">This may take a few seconds</p>
              </div>
            ) : analysisError ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-destructive" />
                </div>
                <p className="text-destructive font-medium mb-2">Analysis Failed</p>
                <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">{analysisError}</p>
                <Button onClick={fetchAIComparison}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            ) : aiAnalysis ? (
              <div className="space-y-8">
                {/* Summary */}
                <div className="bg-muted/50 rounded-xl p-6 border">
                  <div className="flex items-start gap-3 mb-3">
                    <Lightbulb className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <h3 className="font-semibold text-lg">Executive Summary</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed pl-8">
                    {aiAnalysis.comparison_summary}
                  </p>
                </div>

                {/* Winners Section */}
                {(aiAnalysis.winner_for_precision || aiAnalysis.winner_for_payload || aiAnalysis.winner_for_value) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {aiAnalysis.winner_for_precision && (
                      <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Trophy className="w-5 h-5 text-purple-500" />
                          <span className="text-sm font-medium text-purple-600">Best Precision</span>
                        </div>
                        <p className="font-semibold">{aiAnalysis.winner_for_precision}</p>
                      </div>
                    )}
                    {aiAnalysis.winner_for_payload && (
                      <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Trophy className="w-5 h-5 text-blue-500" />
                          <span className="text-sm font-medium text-blue-600">Best Payload</span>
                        </div>
                        <p className="font-semibold">{aiAnalysis.winner_for_payload}</p>
                      </div>
                    )}
                    {aiAnalysis.winner_for_value && (
                      <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Trophy className="w-5 h-5 text-green-500" />
                          <span className="text-sm font-medium text-green-600">Best Value</span>
                        </div>
                        <p className="font-semibold">{aiAnalysis.winner_for_value}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Individual Robot Analysis */}
                <div>
                  <h3 className="font-semibold text-lg mb-4">Detailed Robot Analysis</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {selectedRobots.map((robot) => {
                      const analysis = getRobotAnalysis(robot.id);
                      return (
                        <div key={robot.id} className="bg-card rounded-xl border-2 p-5">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                              {robot.images && robot.images[0] ? (
                                <img src={robot.images[0]} alt={robot.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Bot className="w-6 h-6 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-semibold truncate">{robot.name}</h4>
                              <p className="text-xs text-muted-foreground">{robot.brand}</p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            {/* Strengths */}
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span className="text-sm font-medium text-green-600">Strengths</span>
                              </div>
                              <ul className="space-y-1.5 pl-6">
                                {analysis?.strengths?.map((s, idx) => (
                                  <li key={idx} className="text-sm text-muted-foreground list-disc">
                                    {s}
                                  </li>
                                )) || (
                                  <li className="text-sm text-muted-foreground italic">Pending analysis...</li>
                                )}
                              </ul>
                            </div>

                            {/* Weaknesses */}
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <XCircle className="w-4 h-4 text-red-500" />
                                <span className="text-sm font-medium text-red-600">Weaknesses</span>
                              </div>
                              <ul className="space-y-1.5 pl-6">
                                {analysis?.weaknesses?.map((w, idx) => (
                                  <li key={idx} className="text-sm text-muted-foreground list-disc">
                                    {w}
                                  </li>
                                )) || (
                                  <li className="text-sm text-muted-foreground italic">Pending analysis...</li>
                                )}
                              </ul>
                            </div>

                            {/* Best Use Cases */}
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Target className="w-4 h-4 text-blue-500" />
                                <span className="text-sm font-medium text-blue-600">Ideal For</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5 pl-6">
                                {analysis?.best_use_cases?.map((uc, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {uc}
                                  </Badge>
                                )) || (
                                  <span className="text-sm text-muted-foreground italic">Pending analysis...</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Key Differences */}
                {aiAnalysis.key_differences && aiAnalysis.key_differences.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-4">Key Differences</h3>
                    <div className="bg-muted/30 rounded-xl p-5 border">
                      <ul className="space-y-3">
                        {aiAnalysis.key_differences.map((diff, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="text-muted-foreground">{diff}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Recommendation */}
                <div className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-blue-500/10 rounded-xl p-6 border-2 border-primary/20">
                  <div className="flex items-start gap-3 mb-3">
                    <Award className="w-6 h-6 text-primary flex-shrink-0" />
                    <h3 className="font-semibold text-lg">Expert Recommendation</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed pl-9">
                    {aiAnalysis.recommendation}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <Brain className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">AI analysis will appear here</p>
                <Button onClick={fetchAIComparison}>
                  Generate Analysis
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mt-8 pb-8">
          <Button variant="outline" size="lg" onClick={() => navigate('/robots')}>
            Browse More Robots
          </Button>
          <Button size="lg" onClick={() => window.print()}>
            Print Comparison
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RobotComparison;
