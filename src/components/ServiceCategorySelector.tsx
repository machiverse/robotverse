import { useState, useEffect } from 'react';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Wrench, Settings, Headphones, GraduationCap, Users, AlertTriangle,
  Shield, Download, Target, RefreshCw, Search, Filter, CheckCircle,
  Zap, Brain, TrendingUp, Star
} from 'lucide-react';

interface ServiceCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  difficulty: string;
  avgPrice: string;
  demand: string;
  features: string[];
}

interface ServiceCategorySelectorProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (categories: string[]) => void;
  selectedCategories: string[];
  recommendedCategories?: string[];
}

// Sample categories (expand or adjust as required)
const serviceCategories: ServiceCategory[] = [
  {
    id: 'installation',
    title: 'Robot Installation',
    description: 'Complete robot setup and deployment',
    icon: Settings,
    gradient: 'from-blue-500 to-cyan-600',
    difficulty: 'Advanced',
    avgPrice: '₹50,000 - ₹2,00,000',
    demand: 'High',
    features: [
      'Site preparation',
      'Equipment setup',
      'System integration',
      'Initial testing',
      'Documentation',
      'Training included'
    ]
  },
  {
    id: 'maintenance',
    title: 'Maintenance & Repair',
    description: 'Ongoing maintenance and repair',
    icon: Wrench,
    gradient: 'from-green-500 to-emerald-600',
    difficulty: 'Intermediate',
    avgPrice: '₹10,000 - ₹50,000',
    demand: 'Very High',
    features: [
      'Scheduled maintenance',
      'Emergency repairs',
      'Component replacement',
      'Diagnostics',
      'Performance optimization',
      'Warranty support'
    ]
  },
  // Add other categories similarly...
];

const difficultyColors: Record<string, string> = {
  'Beginner': 'text-green-600 bg-green-50',
  'Intermediate': 'text-yellow-600 bg-yellow-50',
  'Advanced': 'text-orange-600 bg-orange-50',
  'Expert': 'text-red-600 bg-red-50'
};

const demandColors: Record<string, string> = {
  'Very High': 'text-red-600 bg-red-50',
  'High': 'text-orange-600 bg-orange-50',
  'Medium': 'text-yellow-600 bg-yellow-50',
  'Growing': 'text-green-600 bg-green-50'
};

const ServiceCategorySelector = ({
  open,
  onClose,
  onConfirm,
  selectedCategories,
  recommendedCategories = []
}: ServiceCategorySelectorProps) => {
  const [tempSelected, setTempSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [showRecommended, setShowRecommended] = useState(false);
  const [completion, setCompletion] = useState(0);

  // Sync selected categories on open
  useEffect(() => {
    if (open) {
      setTempSelected(selectedCategories);
      setSearch('');
      setFilterDifficulty('all');
      setShowRecommended(false);
    }
  }, [open, selectedCategories]);

  // Calculate completion score (max 100)
  useEffect(() => {
    setCompletion(Math.min((tempSelected.length / 3) * 100, 100));
  }, [tempSelected]);

  const toggleCategory = (id: string) => {
    setTempSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const filteredCategories = serviceCategories.filter(cat => {
    const matchSearch =
      search === '' || 
      cat.title.toLowerCase().includes(search.toLowerCase()) ||
      cat.description.toLowerCase().includes(search.toLowerCase()) ||
      cat.features.some(f => f.toLowerCase().includes(search.toLowerCase()));
    const matchDifficulty = filterDifficulty === 'all' || cat.difficulty === filterDifficulty;
    const matchRecommended = !showRecommended || recommendedCategories.includes(cat.id);
    return matchSearch && matchDifficulty && matchRecommended;
  });

  const selectAll = () => {
    setTempSelected(filteredCategories.map(c => c.id));
  };

  const clearAll = () => {
    setTempSelected([]);
  };

  const applyRecommended = () => {
    setTempSelected(recommendedCategories);
  };

  const handleConfirm = () => {
    onConfirm(tempSelected);
    onClose();
  };

  const handleCancel = () => {
    setTempSelected(selectedCategories);
    setSearch('');
    setFilterDifficulty('all');
    setShowRecommended(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Select Your Service Categories
          </DialogTitle>
          <CardDescription>
            Choose categories you provide — multiple selections allowed.
          </CardDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto px-4 py-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-blue-50 border border-blue-200">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-700 font-semibold">Selected</p>
                    <p className="text-3xl font-extrabold text-blue-900">{tempSelected.length}</p>
                  </div>
                  <CheckCircle className="text-blue-600 w-10 h-10" />
                </div>
                <Progress value={completion} className="mt-3" />
                <p className="text-xs mt-1 text-blue-700">
                  {completion === 100 ? 'Excellent coverage!' : 'Select 3 or more for better success'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border border-green-200">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-700 font-semibold">Revenue Potential</p>
                    <p className="text-3xl font-extrabold text-green-900">
                      ₹{(tempSelected.length * 25000).toLocaleString()}
                    </p>
                  </div>
                  <TrendingUp className="text-green-600 w-10 h-10" />
                </div>
                <p className="text-xs mt-1 text-green-700">Estimated monthly income</p>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border border-purple-200">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-700 font-semibold">Market Reach</p>
                    <p className="text-3xl font-extrabold text-purple-900">{tempSelected.length * 1200}+</p>
                  </div>
                  <Star className="text-purple-600 w-10 h-10" />
                </div>
                <p className="text-xs mt-1 text-purple-700">Potential customers</p>
              </CardContent>
            </Card>
          </div>

          {/* Recommended Alert */}
          {recommendedCategories.length > 0 && (
            <Alert className="border-blue-300 bg-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="text-blue-700 w-5 h-5" />
                <AlertDescription>
                  We recommend <b>{recommendedCategories.length}</b> categories tailored for you.
                </AlertDescription>
              </div>
              <Button variant="outline" size="sm" onClick={applyRecommended}>
                Apply Recommended
              </Button>
            </Alert>
          )}

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="flex-grow relative">
              <Input 
                placeholder="Search categories..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                className="pl-10" 
              />
              <Search className="absolute top-1/2 left-3 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            </div>
            <select 
              value={filterDifficulty} 
              onChange={e => setFilterDifficulty(e.target.value)} 
              className="rounded border px-3 py-2 text-sm"
            >
              <option value="all">All Difficulty Levels</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
              <option value="Expert">Expert</option>
            </select>
            <Button
              variant={showRecommended ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowRecommended(!showRecommended)}
              disabled={recommendedCategories.length === 0}
            >
              Show Recommended
            </Button>
          </div>

          {/* Quick action buttons */}
          <div className="flex justify-between items-center">
            <Button variant="outline" size="sm" onClick={selectAll}>
              Select All ({filteredCategories.length})
            </Button>
            <Button variant="outline" size="sm" onClick={clearAll}>
              Clear All
            </Button>
            <div className="text-sm text-muted-foreground">
              Showing {filteredCategories.length} of {serviceCategories.length}
            </div>
          </div>

          {/* Categories grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCategories.map(category => {
              const Icon = category.icon;
              const isSelected = tempSelected.includes(category.id);
              const isRecommended = recommendedCategories.includes(category.id);
              return (
                <Card
                  key={category.id}
                  className={`cursor-pointer relative ${isSelected ? 'ring ring-primary shadow-lg scale-105' : 'hover:shadow-lg'}`}
                  onClick={() => toggleCategory(category.id)}
                  tabIndex={0}
                  role="checkbox"
                  aria-checked={isSelected}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleCategory(category.id);
                    }
                  }}
                >
                  {isRecommended && (
                    <Badge className="absolute top-2 right-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white px-2 py-0.5 rounded-full text-xs flex items-center gap-1 z-20">
                      <Zap className="w-3 h-3" /> Recommended
                    </Badge>
                  )}
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center shadow-md bg-gradient-to-r ${category.gradient}`}>
                        <Icon className="text-white w-6 h-6" />
                      </div>
                      <Checkbox 
                        checked={isSelected} 
                        onCheckedChange={() => toggleCategory(category.id)} 
                        className="scale-125"
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                    <CardTitle className="text-lg">{category.title}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between mb-2">
                      <Badge className={difficultyColors[category.difficulty]} variant="secondary">
                        {category.difficulty}
                      </Badge>
                      <Badge className={demandColors[category.demand]} variant="secondary">
                        {category.demand} Demand
                      </Badge>
                    </div>
                    <div className="text-sm font-semibold mb-2">{category.avgPrice}</div>
                    <ul className="list-disc list-inside text-sm text-muted-foreground">
                      {category.features.slice(0, 4).map((feat, idx) => <li key={idx}>{feat}</li>)}
                      {category.features.length > 4 && <li>and more...</li>}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
            {filteredCategories.length === 0 && (
              <div className="col-span-full text-center py-20 text-muted-foreground">
                <Filter className="mx-auto mb-4 w-12 h-12" />
                <p>No categories found for current filters.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t pt-4 flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {tempSelected.length === 0 && 'Please select at least one category'}
            {tempSelected.length > 0 && tempSelected.length < 3 && 'Consider adding a few more for better coverage'}
            {tempSelected.length >= 3 && 'Great selection!'}
          </div>
          <div className="space-x-2">
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button disabled={tempSelected.length === 0} onClick={handleConfirm} className="bg-primary text-white hover:brightness-90">
              <CheckCircle className="w-4 h-4 mr-1" /> Continue ({tempSelected.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ServiceCategorySelector;
