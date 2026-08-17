import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Wrench, 
  Settings, 
  Headphones, 
  GraduationCap, 
  Users, 
  AlertTriangle,
  Shield,
  Download,
  Target,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  Info,
  TrendingUp,
  Clock,
  Star,
  Zap,
  Award,
  Brain,
  Phone,
  Code,
  Globe,
  Truck,
  Microscope
} from 'lucide-react';

interface ServiceCategorySelectorProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (categories: string[]) => void;
  selectedCategories: string[];
  userProfile?: any;
  recommendedCategories?: string[];
}

const serviceCategories = [
  {
    id: 'installation',
    title: 'Robot Installation',
    description: 'Complete robot setup and deployment services',
    icon: Settings,
    gradient: 'from-primary to-primary',
    difficulty: 'Advanced',
    avgPrice: '₹50,000 - ₹2,00,000',
    demand: 'High',
    features: ['Site preparation', 'Equipment setup', 'System integration', 'Initial testing', 'Documentation', 'Training included']
  },
  {
    id: 'maintenance_repair',
    title: 'Maintenance & Repair',
    description: 'Ongoing maintenance and repair services',
    icon: Wrench,
    gradient: 'from-success to-success',
    difficulty: 'Intermediate',
    avgPrice: '₹10,000 - ₹50,000',
    demand: 'Very High',
    features: ['Scheduled maintenance', 'Emergency repairs', 'Component replacement', 'Diagnostics', 'Performance optimization', 'Warranty support']
  },
  {
    id: 'technical_support',
    title: 'Technical Support',
    description: '24/7 technical assistance and troubleshooting',
    icon: Headphones,
    gradient: 'from-primary to-primary',
    difficulty: 'Intermediate',
    avgPrice: '₹2,000 - ₹10,000/hour',
    demand: 'High',
    features: ['Remote support', 'On-site assistance', 'Troubleshooting', 'Documentation', 'Multi-language support', 'Video assistance']
  },
  {
    id: 'training_services',
    title: 'Training Services',
    description: 'Operator training and certification programs',
    icon: GraduationCap,
    gradient: 'from-orange-500 to-red-600',
    difficulty: 'Beginner',
    avgPrice: '₹5,000 - ₹25,000',
    demand: 'Medium',
    features: ['Operator training', 'Safety certification', 'Best practices', 'Custom programs', 'Certification issued', 'Ongoing support']
  },
  {
    id: 'consulting',
    title: 'Consulting Services',
    description: 'Strategic consulting and optimization services',
    icon: Users,
    gradient: 'from-primary to-primary',
    difficulty: 'Expert',
    avgPrice: '₹25,000 - ₹1,00,000',
    demand: 'Medium',
    features: ['Process optimization', 'ROI analysis', 'Implementation strategy', 'Custom solutions', 'Industry expertise', 'Long-term partnership']
  },
  {
    id: 'emergency_services',
    title: 'Emergency Services',
    description: 'Urgent repair and recovery services',
    icon: AlertTriangle,
    gradient: 'from-red-500 to-pink-600',
    difficulty: 'Expert',
    avgPrice: '₹15,000 - ₹75,000',
    demand: 'High',
    features: ['24/7 emergency response', 'Critical repairs', 'System recovery', 'Backup solutions', 'Priority support', 'Guaranteed response time']
  },
  {
    id: 'preventive_maintenance',
    title: 'Preventive Maintenance',
    description: 'Proactive maintenance to prevent breakdowns',
    icon: Shield,
    gradient: 'from-success to-success',
    difficulty: 'Intermediate',
    avgPrice: '₹8,000 - ₹30,000',
    demand: 'High',
    features: ['Scheduled inspections', 'Predictive analytics', 'Part replacement', 'Performance monitoring', 'Cost optimization', 'Detailed reporting']
  },
  {
    id: 'software_updates',
    title: 'Software & Firmware',
    description: 'Software maintenance and update services',
    icon: Download,
    gradient: 'from-primary to-primary',
    difficulty: 'Advanced',
    avgPrice: '₹5,000 - ₹20,000',
    demand: 'Medium',
    features: ['Firmware updates', 'Software patches', 'Version management', 'Compatibility checks', 'Backup & recovery', 'Security updates']
  },
  {
    id: 'calibration_services',
    title: 'Calibration & Testing',
    description: 'Precision calibration and quality assurance',
    icon: Target,
    gradient: 'from-yellow-500 to-orange-600',
    difficulty: 'Advanced',
    avgPrice: '₹10,000 - ₹40,000',
    demand: 'Medium',
    features: ['Precision calibration', 'Sensor alignment', 'Performance tuning', 'Quality assurance', 'Certification compliance', 'Detailed reports']
  },
  {
    id: 'parts_replacement',
    title: 'Parts & Components',
    description: 'Component replacement and upgrade services',
    icon: RefreshCw,
    gradient: 'from-pink-500 to-rose-600',
    difficulty: 'Intermediate',
    avgPrice: '₹3,000 - ₹50,000',
    demand: 'High',
    features: ['Genuine parts sourcing', 'Quick replacement', 'Upgrade services', 'Compatibility verification', 'Warranty included', 'Inventory management']
  },
  {
    id: 'programming_automation',
    title: 'Programming & Automation',
    description: 'Custom programming and automation solutions',
    icon: Code,
    gradient: 'from-primary to-primary',
    difficulty: 'Expert',
    avgPrice: '₹20,000 - ₹1,50,000',
    demand: 'Medium',
    features: ['Custom programming', 'Process automation', 'Integration solutions', 'Performance optimization', 'Testing & validation', 'Documentation']
  },
  {
    id: 'remote_monitoring',
    title: 'Remote Monitoring',
    description: 'Real-time monitoring and diagnostics',
    icon: Globe,
    gradient: 'from-success to-success',
    difficulty: 'Advanced',
    avgPrice: '₹5,000 - ₹25,000/month',
    demand: 'Growing',
    features: ['Real-time monitoring', 'Predictive analytics', 'Alert systems', 'Performance dashboards', 'Historical data', 'Custom reports']
  },
  {
    id: 'robotverse_platform',
    title: 'RoboVerse Platform',
    description: 'Comprehensive platform services and marketplace management',
    icon: Award,
    gradient: 'from-primary to-primary',
    difficulty: 'Expert',
    avgPrice: '₹15,000 - ₹75,000',
    demand: 'High',
    features: ['Platform integration', 'Marketplace management', 'Digital services', 'Multi-vendor support', 'Analytics dashboard', 'Customer support']
  }
];

const difficultyColors = {
  'Beginner': 'text-success bg-success/10',
  'Intermediate': 'text-yellow-600 bg-yellow-50', 
  'Advanced': 'text-orange-600 bg-orange-50',
  'Expert': 'text-red-600 bg-red-50'
};

const demandColors = {
  'Very High': 'text-red-600 bg-red-50',
  'High': 'text-orange-600 bg-orange-50',
  'Medium': 'text-yellow-600 bg-yellow-50',
  'Growing': 'text-success bg-success/10'
};

const ServiceCategorySelector = ({ 
  open, 
  onClose, 
  onConfirm, 
  selectedCategories,
  userProfile,
  recommendedCategories = []
}: ServiceCategorySelectorProps) => {
  const [tempSelectedCategories, setTempSelectedCategories] = useState<string[]>(selectedCategories);
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [showRecommended, setShowRecommended] = useState(false);
  const [completionScore, setCompletionScore] = useState(0);

  useEffect(() => {
    setTempSelectedCategories(selectedCategories);
  }, [selectedCategories]);

  useEffect(() => {
    // Calculate completion score based on selected categories
    const score = Math.min((tempSelectedCategories.length / 3) * 100, 100);
    setCompletionScore(score);
  }, [tempSelectedCategories]);

  const handleCategoryToggle = (categoryId: string) => {
    setTempSelectedCategories(prev => {
      const isSelected = prev.includes(categoryId);
      if (isSelected) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const handleSelectAll = () => {
    const filteredCategories = getFilteredCategories();
    setTempSelectedCategories(filteredCategories.map(c => c.id));
  };

  const handleClearAll = () => {
    setTempSelectedCategories([]);
  };

  const handleSelectRecommended = () => {
    setTempSelectedCategories(recommendedCategories);
  };

  const getFilteredCategories = () => {
    let filtered = serviceCategories;

    if (searchQuery) {
      filtered = filtered.filter(category =>
        category.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.features.some(feature => feature.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(category => category.difficulty === difficultyFilter);
    }

    if (showRecommended && recommendedCategories.length > 0) {
      filtered = filtered.filter(category => recommendedCategories.includes(category.id));
    }

    return filtered;
  };

  const handleConfirm = () => {
    onConfirm(tempSelectedCategories);
    onClose();
  };

  const handleCancel = () => {
    setTempSelectedCategories(selectedCategories);
    setSearchQuery('');
    setDifficultyFilter('all');
    setShowRecommended(false);
    onClose();
  };

  const filteredCategories = getFilteredCategories();
  const selectedCount = tempSelectedCategories.length;
  const totalRevenuePotential = tempSelectedCategories.reduce((sum, categoryId) => {
    const category = serviceCategories.find(c => c.id === categoryId);
    return sum + (category ? 25000 : 0); // Average potential per category
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-2xl bg-gradient-to-r from-primary to-primary bg-clip-text text-transparent">
            Select Your Service Categories
          </DialogTitle>
          <CardDescription className="text-base">
            Choose the service categories you provide. Select multiple categories to maximize your business potential.
          </CardDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* Progress & Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-primary/5 border-primary/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-primary">Selected Categories</p>
                    <p className="text-2xl font-bold text-primary">{selectedCount}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-primary" />
                </div>
                <Progress value={completionScore} className="mt-2 h-2" />
                <p className="text-xs text-primary mt-1">
                  {completionScore >= 100 ? 'Excellent coverage!' : 'Select 3+ for optimal visibility'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-success/5 border-success/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-success">Revenue Potential</p>
                    <p className="text-2xl font-bold text-success">₹{totalRevenuePotential.toLocaleString()}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-success" />
                </div>
                <p className="text-xs text-success mt-1">Average monthly potential</p>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-primary">Market Reach</p>
                    <p className="text-2xl font-bold text-primary">{selectedCount * 1200}+</p>
                  </div>
                  <Star className="w-8 h-8 text-primary" />
                </div>
                <p className="text-xs text-primary mt-1">Potential customers</p>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations Alert */}
          {recommendedCategories.length > 0 && (
            <Alert className="border-primary/30 bg-primary/10">
              <Brain className="w-4 h-4" />
              <AlertDescription className="text-primary">
                <div className="flex items-center justify-between">
                  <div>
                    <strong>AI Recommendations:</strong> Based on your profile, we recommend {recommendedCategories.length} categories for maximum success.
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleSelectRecommended}
                    className="ml-4"
                  >
                    Apply Recommendations
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search service categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Levels</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Expert">Expert</option>
              </select>

              {recommendedCategories.length > 0 && (
                <Button
                  variant={showRecommended ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowRecommended(!showRecommended)}
                >
                  <Brain className="w-4 h-4 mr-1" />
                  Recommended
                </Button>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                Select All ({filteredCategories.length})
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearAll}>
                Clear All
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {filteredCategories.length} of {serviceCategories.length} categories shown
            </p>
          </div>

          {/* Service Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCategories.map((category) => {
              const Icon = category.icon;
              const isSelected = tempSelectedCategories.includes(category.id);
              const isRecommended = recommendedCategories.includes(category.id);
              
              return (
                <Card 
                  key={category.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg relative ${
                    isSelected 
                      ? 'ring-2 ring-primary shadow-lg scale-105' 
                      : 'hover:bg-muted/30'
                  }`}
                  onClick={() => handleCategoryToggle(category.id)}
                >
                  {/* Recommended Badge */}
                  {isRecommended && (
                    <div className="absolute -top-2 -right-2 z-10">
                      <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-primary-foreground text-xs">
                        <Zap className="w-3 h-3 mr-1" />
                        Recommended
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${category.gradient} flex items-center justify-center shadow-lg`}>
                        <Icon className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <Checkbox 
                        checked={isSelected}
                        onChange={() => {}}
                        className="scale-125"
                      />
                    </div>
                    <CardTitle className="text-base leading-tight">{category.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {category.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pt-0 space-y-3">
                    {/* Metadata */}
                    <div className="flex items-center justify-between text-xs">
                      <Badge className={difficultyColors[category.difficulty]} variant="secondary">
                        {category.difficulty}
                      </Badge>
                      <Badge className={demandColors[category.demand]} variant="secondary">
                        {category.demand} Demand
                      </Badge>
                    </div>

                    <div className="text-xs font-medium text-success">
                      {category.avgPrice}
                    </div>

                    {/* Features */}
                    <div className="space-y-1">
                      {category.features.slice(0, 3).map((feature, index) => (
                        <div key={index} className="text-xs text-muted-foreground flex items-center">
                          <div className="w-1 h-1 bg-primary rounded-full mr-2" />
                          {feature}
                        </div>
                      ))}
                      {category.features.length > 3 && (
                        <div className="text-xs text-primary font-medium">
                          +{category.features.length - 3} more features
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredCategories.length === 0 && (
            <div className="text-center py-12">
              <Filter className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No categories match your filters</h3>
              <p className="text-muted-foreground mb-4">Try adjusting your search or filter criteria</p>
              <Button variant="outline" onClick={() => {
                setSearchQuery('');
                setDifficultyFilter('all');
                setShowRecommended(false);
              }}>
                Clear Filters
              </Button>
            </div>
          )}

          {/* Selected Categories Summary */}
          {tempSelectedCategories.length > 0 && (
            <Card className="bg-muted/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Selected Categories ({tempSelectedCategories.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {tempSelectedCategories.map((categoryId) => {
                    const category = serviceCategories.find(c => c.id === categoryId);
                    if (!category) return null;
                    
                    const Icon = category.icon;
                    return (
                      <Badge 
                        key={categoryId} 
                        variant="secondary" 
                        className="flex items-center gap-1 py-1 px-2"
                      >
                        <Icon className="w-3 h-3" />
                        {category.title}
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedCount === 0 ? (
              "Select at least one category to continue"
            ) : selectedCount === 1 ? (
              "Good start! Consider adding more categories to increase visibility"
            ) : selectedCount <= 3 ? (
              "Great selection! You're covering key service areas"
            ) : (
              "Excellent! You're offering comprehensive services"
            )}
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={tempSelectedCategories.length === 0}
              className="bg-gradient-to-r from-primary to-primary hover:from-primary hover:to-primary"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Continue with {selectedCount} categor{selectedCount !== 1 ? 'ies' : 'y'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceCategorySelector;
