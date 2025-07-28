import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  ShoppingCart, 
  Bot, 
  Package, 
  Wrench, 
  Truck, 
  CreditCard,
  CheckCircle,
  Search,
  Filter,
  Star,
  TrendingUp,
  Users,
  DollarSign,
  Brain,
  Lightbulb,
  Activity,
  Award,
  Clock,
  Globe,
  Zap,
  Shield,
  Target,
  BarChart3
} from 'lucide-react';

interface RoleSelectorProps {
  onRoleSelect: (roles: UserRole[]) => void;
  selectedRoles: UserRole[];
  userProfile?: any;
  showRecommendations?: boolean;
}

export interface UserRole {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  category: 'buyer' | 'seller' | 'provider';
  features: string[];
  gradient: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  marketDemand: 'High' | 'Medium' | 'Growing';
  avgRevenue: string;
  userCount: string;
  advantages: string[];
  requirements: string[];
}

const availableRoles: UserRole[] = [
  {
    id: 'buyer',
    title: 'Robot Buyer',
    description: 'Purchase robots, parts, and services from verified sellers',
    icon: ShoppingCart,
    category: 'buyer',
    gradient: 'from-blue-500 to-cyan-600',
    difficulty: 'Beginner',
    marketDemand: 'High',
    avgRevenue: 'Cost Savings',
    userCount: '15K+',
    features: ['Browse robot catalog', 'Compare prices', 'Secure payments', 'Financing options', 'Warranty protection'],
    advantages: ['Access to verified sellers', 'Competitive pricing', 'Quality assurance', 'Expert support'],
    requirements: ['Valid business registration', 'Basic technical knowledge', 'Budget planning']
  },
  {
    id: 'robot_seller',
    title: 'Robot Seller',
    description: 'Sell industrial robots and automation equipment',
    icon: Bot,
    category: 'seller',
    gradient: 'from-green-500 to-emerald-600',
    difficulty: 'Intermediate',
    marketDemand: 'High',
    avgRevenue: '₹2-5L/month',
    userCount: '2.5K+',
    features: ['List robots', 'Inventory management', 'Bulk upload tools', 'Analytics dashboard', 'Customer inquiries'],
    advantages: ['Large customer base', 'Marketing support', 'Secure transactions', 'Growth opportunities'],
    requirements: ['Robot inventory', 'Technical expertise', 'Business license', 'Quality certifications']
  },
  {
    id: 'parts_seller',
    title: 'Spare Parts Seller',
    description: 'Supply robot parts and components to the market',
    icon: Package,
    category: 'seller',
    gradient: 'from-purple-500 to-violet-600',
    difficulty: 'Intermediate',
    marketDemand: 'High',
    avgRevenue: '₹1-3L/month',
    userCount: '1.8K+',
    features: ['Parts catalog', 'Compatibility matching', 'Stock management', 'Bulk pricing', 'Auto-reorder alerts'],
    advantages: ['Steady demand', 'Lower investment', 'Repeat customers', 'Technical support'],
    requirements: ['Parts inventory', 'Compatibility knowledge', 'Supplier network', 'Quality control']
  },
  {
    id: 'service_provider',
    title: 'Service Provider',
    description: 'Provide maintenance, repair, and technical services',
    icon: Wrench,
    category: 'seller',
    gradient: 'from-orange-500 to-red-600',
    difficulty: 'Advanced',
    marketDemand: 'Growing',
    avgRevenue: '₹80K-2L/month',
    userCount: '900+',
    features: ['Service listings', 'Job scheduling', 'Technician management', 'Service area mapping', 'Performance metrics'],
    advantages: ['High-value services', 'Recurring revenue', 'Skill-based pricing', 'Client relationships'],
    requirements: ['Technical expertise', 'Certified technicians', 'Service equipment', 'Insurance coverage']
  },
  {
    id: 'logistics_provider',
    title: 'Logistics Provider',
    description: 'Handle transportation and shipping of robots',
    icon: Truck,
    category: 'provider',
    gradient: 'from-indigo-500 to-blue-600',
    difficulty: 'Advanced',
    marketDemand: 'High',
    avgRevenue: '₹50K-1.5L/month',
    userCount: '150+',
    features: ['Coverage areas', 'Rate management', 'Fleet tracking', 'Delivery proof', 'Route optimization'],
    advantages: ['Essential service', 'Scalable business', 'Technology integration', 'Network effects'],
    requirements: ['Fleet vehicles', 'Driver network', 'Insurance coverage', 'Tracking systems']
  },
  {
    id: 'finance_provider',
    title: 'Finance Provider',
    description: 'Offer financing solutions for robot purchases',
    icon: CreditCard,
    category: 'provider',
    gradient: 'from-pink-500 to-rose-600',
    difficulty: 'Advanced',
    marketDemand: 'Growing',
    avgRevenue: '₹1-5L/month',
    userCount: '25+',
    features: ['Loan products', 'Application processing', 'Risk assessment', 'Portfolio management', 'Eligibility calculator'],
    advantages: ['High-margin business', 'Scalable income', 'Strategic partnerships', 'Market leadership'],
    requirements: ['Financial license', 'Capital reserves', 'Risk management', 'Compliance expertise']
  }
];

const difficultyColors = {
  'Beginner': 'bg-green-100 text-green-800',
  'Intermediate': 'bg-yellow-100 text-yellow-800',
  'Advanced': 'bg-red-100 text-red-800'
};

const demandColors = {
  'High': 'bg-red-100 text-red-800',
  'Medium': 'bg-yellow-100 text-yellow-800',
  'Growing': 'bg-green-100 text-green-800'
};

const RoleSelector = ({ onRoleSelect, selectedRoles, userProfile, showRecommendations = true }: RoleSelectorProps) => {
  const [tempSelectedRoles, setTempSelectedRoles] = useState<UserRole[]>(selectedRoles);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [showRecommendedOnly, setShowRecommendedOnly] = useState(false);
  const [completionScore, setCompletionScore] = useState(0);

  // AI-powered recommendations (mock logic)
  const getRecommendedRoles = (): string[] => {
    if (!userProfile) return ['buyer', 'robot_seller'];
    
    const recommendations: string[] = [];
    
    // Add buyer as default recommendation
    recommendations.push('buyer');
    
    // Business type based recommendations
    if (userProfile.company_name) {
      recommendations.push('robot_seller');
    }
    
    // Experience based recommendations
    if (userProfile.experience_years > 5) {
      recommendations.push('service_provider');
    }
    
    // Location based recommendations (mock)
    if (['Mumbai', 'Delhi', 'Bangalore'].some(city => 
      userProfile.location?.includes(city))) {
      recommendations.push('logistics_provider');
    }
    
    return recommendations;
  };

  const recommendedRoles = getRecommendedRoles();

  useEffect(() => {
    // Calculate completion score based on role diversity
    const categories = new Set(tempSelectedRoles.map(role => role.category));
    const score = Math.min((categories.size / 3) * 100, 100);
    setCompletionScore(score);
  }, [tempSelectedRoles]);

  const handleRoleToggle = (role: UserRole) => {
    setTempSelectedRoles(prev => {
      const isSelected = prev.some(r => r.id === role.id);
      if (isSelected) {
        return prev.filter(r => r.id !== role.id);
      } else {
        return [...prev, role];
      }
    });
  };

  const handleConfirm = () => {
    onRoleSelect(tempSelectedRoles);
  };

  const handleSelectRecommended = () => {
    const recommended = availableRoles.filter(role => recommendedRoles.includes(role.id));
    setTempSelectedRoles(recommended);
  };

  const isRoleSelected = (roleId: string) => {
    return tempSelectedRoles.some(r => r.id === roleId);
  };

  const getFilteredRoles = () => {
    let filtered = availableRoles;

    if (searchQuery) {
      filtered = filtered.filter(role =>
        role.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        role.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        role.features.some(feature => feature.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(role => role.category === categoryFilter);
    }

    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(role => role.difficulty === difficultyFilter);
    }

    if (showRecommendedOnly) {
      filtered = filtered.filter(role => recommendedRoles.includes(role.id));
    }

    return filtered;
  };

  const filteredRoles = getFilteredRoles();
  const categoryRoles = {
    buyer: filteredRoles.filter(role => role.category === 'buyer'),
    seller: filteredRoles.filter(role => role.category === 'seller'),
    provider: filteredRoles.filter(role => role.category === 'provider')
  };

  const totalRevenuePotential = tempSelectedRoles.reduce((sum, role) => {
    const revenue = role.avgRevenue.includes('₹') ? 
      parseInt(role.avgRevenue.split('-')[1]?.replace(/[^\d]/g, '') || '100000') : 0;
    return sum + revenue;
  }, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Enhanced Header */}
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Choose Your RobotVerse Role
        </h2>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Select one or more roles that best describe your business needs and unlock tailored features
        </p>
        
        {/* Progress & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="w-6 h-6 text-blue-600 mr-2" />
                <span className="text-2xl font-bold text-blue-800">{tempSelectedRoles.length}</span>
              </div>
              <p className="text-sm text-blue-700 font-medium">Selected Roles</p>
              <Progress value={completionScore} className="mt-2 h-2" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <DollarSign className="w-6 h-6 text-green-600 mr-2" />
                <span className="text-2xl font-bold text-green-800">
                  {totalRevenuePotential > 0 ? `₹${(totalRevenuePotential/100000).toFixed(1)}L` : '₹0'}
                </span>
              </div>
              <p className="text-sm text-green-700 font-medium">Revenue Potential</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Users className="w-6 h-6 text-purple-600 mr-2" />
                <span className="text-2xl font-bold text-purple-800">20K+</span>
              </div>
              <p className="text-sm text-purple-700 font-medium">Community Members</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Recommendations */}
      {showRecommendations && recommendedRoles.length > 0 && (
        <Alert className="border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50">
          <Brain className="w-4 h-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <strong className="text-blue-700">🤖 AI Recommendations:</strong>
                <span className="text-blue-600 ml-2">
                  Based on your profile, we recommend {recommendedRoles.length} roles for optimal success.
                </span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleSelectRecommended}>
                  Apply Recommendations
                </Button>
                <Button 
                  size="sm" 
                  variant={showRecommendedOnly ? "default" : "outline"}
                  onClick={() => setShowRecommendedOnly(!showRecommendedOnly)}
                >
                  <Star className="w-4 h-4 mr-1" />
                  Recommended Only
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Enhanced Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search roles by name, features, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="all">All Categories</option>
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
            <option value="provider">Provider</option>
          </select>

          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="all">All Levels</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
        </div>
      </div>

      {/* Enhanced Role Categories */}
      {categoryRoles.buyer.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h3 className="text-2xl font-bold text-blue-600">🛒 Buyer Roles</h3>
            <Badge variant="secondary">{categoryRoles.buyer.length} available</Badge>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {categoryRoles.buyer.map((role) => (
              <RoleCard 
                key={role.id} 
                role={role} 
                isSelected={isRoleSelected(role.id)}
                isRecommended={recommendedRoles.includes(role.id)}
                onToggle={handleRoleToggle}
              />
            ))}
          </div>
        </div>
      )}

      {categoryRoles.seller.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h3 className="text-2xl font-bold text-green-600">💼 Seller Roles</h3>
            <Badge variant="secondary">{categoryRoles.seller.length} available</Badge>
            <Badge variant="outline" className="text-xs">Select Multiple</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {categoryRoles.seller.map((role) => (
              <RoleCard 
                key={role.id} 
                role={role} 
                isSelected={isRoleSelected(role.id)}
                isRecommended={recommendedRoles.includes(role.id)}
                onToggle={handleRoleToggle}
                compact
              />
            ))}
          </div>
        </div>
      )}

      {categoryRoles.provider.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h3 className="text-2xl font-bold text-purple-600">🔧 Service Providers</h3>
            <Badge variant="secondary">{categoryRoles.provider.length} available</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryRoles.provider.map((role) => (
              <RoleCard 
                key={role.id} 
                role={role} 
                isSelected={isRoleSelected(role.id)}
                isRecommended={recommendedRoles.includes(role.id)}
                onToggle={handleRoleToggle}
              />
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {filteredRoles.length === 0 && (
        <div className="text-center py-12">
          <Filter className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No roles match your criteria</h3>
          <p className="text-muted-foreground mb-4">Try adjusting your search or filter settings</p>
          <Button variant="outline" onClick={() => {
            setSearchQuery('');
            setCategoryFilter('all');
            setDifficultyFilter('all');
            setShowRecommendedOnly(false);
          }}>
            Clear All Filters
          </Button>
        </div>
      )}

      {/* Selected Roles Summary */}
      {tempSelectedRoles.length > 0 && (
        <Card className="bg-gradient-to-r from-muted/30 to-muted/10 border-2 border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Selected Roles ({tempSelectedRoles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {tempSelectedRoles.map((role) => {
                const Icon = role.icon;
                return (
                  <Badge 
                    key={role.id} 
                    variant="secondary" 
                    className="flex items-center gap-1 py-2 px-3"
                  >
                    <Icon className="w-4 h-4" />
                    {role.title}
                  </Badge>
                );
              })}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                <span>Coverage: {new Set(tempSelectedRoles.map(r => r.category)).size}/3 categories</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span>Revenue Potential: ₹{(totalRevenuePotential/100000).toFixed(1)}L/month</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span>Market Access: Multi-segment</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Action Button */}
      <div className="flex justify-center pt-6">
        <div className="text-center space-y-4">
          <Button 
            onClick={handleConfirm}
            disabled={tempSelectedRoles.length === 0}
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-12 py-3 text-lg"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Continue with {tempSelectedRoles.length} role{tempSelectedRoles.length !== 1 ? 's' : ''}
          </Button>
          
          <p className="text-sm text-muted-foreground max-w-md">
            {tempSelectedRoles.length === 0 ? (
              "Select at least one role to continue your RobotVerse journey"
            ) : tempSelectedRoles.length === 1 ? (
              "Great choice! You can always add more roles later from your dashboard"
            ) : (
              "Excellent! You've selected a diverse set of roles for maximum market opportunities"
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

// Enhanced Role Card Component
interface RoleCardProps {
  role: UserRole;
  isSelected: boolean;
  isRecommended: boolean;
  onToggle: (role: UserRole) => void;
  compact?: boolean;
}

const RoleCard = ({ role, isSelected, isRecommended, onToggle, compact = false }: RoleCardProps) => {
  const Icon = role.icon;
  
  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-xl relative ${
        isSelected 
          ? 'ring-2 ring-primary shadow-lg scale-[1.02] bg-gradient-to-br from-primary/5 to-primary/10' 
          : 'hover:bg-muted/30'
      }`}
      onClick={() => onToggle(role)}
    >
      {/* Recommended Badge */}
      {isRecommended && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs px-2 py-1">
            <Star className="w-3 h-3 mr-1" />
            Recommended
          </Badge>
        </div>
      )}

      {compact ? (
        // Compact Layout for Sellers
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${role.gradient} flex items-center justify-center shadow-lg`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex items-center gap-2">
              {isSelected && <CheckCircle className="w-5 h-5 text-primary" />}
              <Checkbox 
                checked={isSelected}
                onChange={() => {}}
                className="scale-110"
              />
            </div>
          </div>
          <CardTitle className="text-lg">{role.title}</CardTitle>
          <CardDescription className="text-sm">{role.description}</CardDescription>
        </CardHeader>
      ) : (
        // Full Layout for Buyers and Providers
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="flex items-center space-x-4 flex-1">
              <Checkbox 
                checked={isSelected}
                onChange={() => {}}
                className="mt-1 scale-110"
              />
              <div className={`w-16 h-16 rounded-xl bg-gradient-to-r ${role.gradient} flex items-center justify-center shadow-lg`}>
                <Icon className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1 space-y-2">
                <h4 className="text-xl font-bold">{role.title}</h4>
                <p className="text-muted-foreground">{role.description}</p>
              </div>
            </div>
            {isSelected && (
              <CheckCircle className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
            )}
          </div>
        </CardContent>
      )}

      <CardContent className={compact ? "pt-0" : "pt-0 px-6 pb-6"}>
        {/* Metadata */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-2">
            <Badge className={difficultyColors[role.difficulty]} variant="secondary">
              {role.difficulty}
            </Badge>
            <Badge className={demandColors[role.marketDemand]} variant="secondary">
              {role.marketDemand}
            </Badge>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-green-600">{role.avgRevenue}</p>
            <p className="text-xs text-muted-foreground">{role.userCount} users</p>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-2 mb-3">
          <h5 className="text-sm font-semibold text-muted-foreground">KEY FEATURES</h5>
          <div className="flex flex-wrap gap-1">
            {role.features.slice(0, compact ? 3 : 5).map((feature) => (
              <Badge key={feature} variant="outline" className="text-xs">
                {feature}
              </Badge>
            ))}
            {role.features.length > (compact ? 3 : 5) && (
              <Badge variant="outline" className="text-xs">
                +{role.features.length - (compact ? 3 : 5)} more
              </Badge>
            )}
          </div>
        </div>

        {/* Advantages (only for non-compact) */}
        {!compact && (
          <div className="space-y-2">
            <h5 className="text-sm font-semibold text-muted-foreground">ADVANTAGES</h5>
            <div className="space-y-1">
              {role.advantages.slice(0, 3).map((advantage, index) => (
                <div key={index} className="text-xs text-muted-foreground flex items-center">
                  <div className="w-1 h-1 bg-green-500 rounded-full mr-2" />
                  {advantage}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RoleSelector;
