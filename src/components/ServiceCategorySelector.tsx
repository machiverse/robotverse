import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  RefreshCw
} from 'lucide-react';

interface ServiceCategorySelectorProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (categories: string[]) => void;
  selectedCategories: string[];
}

const serviceCategories = [
  {
    id: 'installation',
    title: 'Robot Installation',
    description: 'Complete robot setup and deployment services',
    icon: Settings,
    features: ['Site preparation', 'Equipment setup', 'System integration', 'Initial testing']
  },
  {
    id: 'maintenance_repair',
    title: 'Maintenance & Repair',
    description: 'Ongoing maintenance and repair services',
    icon: Wrench,
    features: ['Scheduled maintenance', 'Emergency repairs', 'Component replacement', 'Diagnostics']
  },
  {
    id: 'technical_support',
    title: 'Technical Support',
    description: '24/7 technical assistance and troubleshooting',
    icon: Headphones,
    features: ['Remote support', 'On-site assistance', 'Troubleshooting', 'Documentation']
  },
  {
    id: 'training_services',
    title: 'Training Services',
    description: 'Operator training and certification programs',
    icon: GraduationCap,
    features: ['Operator training', 'Safety certification', 'Best practices', 'Custom programs']
  },
  {
    id: 'consulting',
    title: 'Consulting',
    description: 'Strategic consulting and optimization services',
    icon: Users,
    features: ['Process optimization', 'ROI analysis', 'Implementation strategy', 'Custom solutions']
  },
  {
    id: 'emergency_services',
    title: 'Emergency Services',
    description: 'Urgent repair and recovery services',
    icon: AlertTriangle,
    features: ['24/7 emergency response', 'Critical repairs', 'System recovery', 'Backup solutions']
  },
  {
    id: 'preventive_maintenance',
    title: 'Preventive Maintenance',
    description: 'Proactive maintenance to prevent breakdowns',
    icon: Shield,
    features: ['Scheduled inspections', 'Predictive analytics', 'Part replacement', 'Performance monitoring']
  },
  {
    id: 'software_updates',
    title: 'Software Updates',
    description: 'Firmware and software maintenance services',
    icon: Download,
    features: ['Firmware updates', 'Software patches', 'Version management', 'Compatibility checks']
  },
  {
    id: 'calibration_services',
    title: 'Calibration Services',
    description: 'Precision calibration and alignment services',
    icon: Target,
    features: ['Precision calibration', 'Sensor alignment', 'Performance tuning', 'Quality assurance']
  },
  {
    id: 'parts_replacement',
    title: 'Parts Replacement',
    description: 'Component replacement and upgrade services',
    icon: RefreshCw,
    features: ['Genuine parts', 'Quick replacement', 'Upgrade services', 'Compatibility verification']
  }
];

const ServiceCategorySelector = ({ 
  open, 
  onClose, 
  onConfirm, 
  selectedCategories 
}: ServiceCategorySelectorProps) => {
  const [tempSelectedCategories, setTempSelectedCategories] = useState<string[]>(selectedCategories);

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

  const handleConfirm = () => {
    onConfirm(tempSelectedCategories);
    onClose();
  };

  const handleCancel = () => {
    setTempSelectedCategories(selectedCategories);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Select Service Categories</DialogTitle>
          <CardDescription>
            Choose the service categories you provide. You can select multiple categories.
          </CardDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {serviceCategories.map((category) => {
              const Icon = category.icon;
              const isSelected = tempSelectedCategories.includes(category.id);
              
              return (
                <Card 
                  key={category.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => handleCategoryToggle(category.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <Checkbox 
                        checked={isSelected}
                        onChange={() => {}} // Handled by card click
                      />
                    </div>
                    <CardTitle className="text-sm">{category.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription className="text-xs mb-2">
                      {category.description}
                    </CardDescription>
                    <div className="space-y-1">
                      {category.features.slice(0, 2).map((feature) => (
                        <div key={feature} className="text-xs text-muted-foreground">
                          • {feature}
                        </div>
                      ))}
                      {category.features.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{category.features.length - 2} more...
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {tempSelectedCategories.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Selected Categories ({tempSelectedCategories.length})</h4>
              <div className="flex flex-wrap gap-2">
                {tempSelectedCategories.map((categoryId) => {
                  const category = serviceCategories.find(c => c.id === categoryId);
                  return category ? (
                    <Badge key={categoryId} variant="secondary">
                      {category.title}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={tempSelectedCategories.length === 0}
            >
              Continue with {tempSelectedCategories.length} categor{tempSelectedCategories.length !== 1 ? 'ies' : 'y'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceCategorySelector;