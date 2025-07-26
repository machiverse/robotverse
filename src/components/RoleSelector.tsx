import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, 
  Bot, 
  Package, 
  Wrench, 
  Truck, 
  CreditCard,
  CheckCircle
} from 'lucide-react';

interface RoleSelectorProps {
  onRoleSelect: (roles: UserRole[]) => void;
  selectedRoles: UserRole[];
}

export interface UserRole {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  category: 'buyer' | 'seller' | 'provider';
  features: string[];
}

const availableRoles: UserRole[] = [
  {
    id: 'buyer',
    title: 'Buyer',
    description: 'Purchase robots, parts, and services',
    icon: ShoppingCart,
    category: 'buyer',
    features: ['Browse robot catalog', 'Find spare parts', 'Book services', 'Get financing', 'Track orders']
  },
  {
    id: 'robot_seller',
    title: 'Robot Seller',
    description: 'Sell industrial robots and equipment',
    icon: Bot,
    category: 'seller',
    features: ['List robots', 'Manage inventory', 'Bulk upload', 'Analytics dashboard', 'Customer inquiries']
  },
  {
    id: 'parts_seller',
    title: 'Spare Parts Seller',
    description: 'Sell robot parts and components',
    icon: Package,
    category: 'seller',
    features: ['Parts catalog', 'Compatibility matching', 'Stock management', 'Bulk pricing', 'Auto-reorder alerts']
  },
  {
    id: 'service_provider',
    title: 'Service Provider',
    description: 'Provide maintenance and repair services',
    icon: Wrench,
    category: 'seller',
    features: ['Service listings', 'Job scheduling', 'Technician management', 'Service area mapping', 'Performance metrics']
  },
  {
    id: 'logistics_provider',
    title: 'Logistics Provider',
    description: 'Handle shipping and transportation',
    icon: Truck,
    category: 'provider',
    features: ['Coverage areas', 'Rate management', 'Fleet tracking', 'Delivery proof', 'Route optimization']
  },
  {
    id: 'finance_provider',
    title: 'Finance Provider',
    description: 'Provide loans and financing options',
    icon: CreditCard,
    category: 'provider',
    features: ['Loan products', 'Application processing', 'Risk assessment', 'Portfolio management', 'Eligibility calculator']
  }
];

const RoleSelector = ({ onRoleSelect, selectedRoles }: RoleSelectorProps) => {
  const [tempSelectedRoles, setTempSelectedRoles] = useState<UserRole[]>(selectedRoles);

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

  const isRoleSelected = (roleId: string) => {
    return tempSelectedRoles.some(r => r.id === roleId);
  };

  const categoryRoles = {
    buyer: availableRoles.filter(role => role.category === 'buyer'),
    seller: availableRoles.filter(role => role.category === 'seller'),
    provider: availableRoles.filter(role => role.category === 'provider')
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Choose Your Role</h2>
        <p className="text-muted-foreground">Select one or more roles that best describe your business needs</p>
      </div>

      {/* Buyer Section */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-primary">Buyer</h3>
        <div className="grid grid-cols-1 gap-4">
          {categoryRoles.buyer.map((role) => {
            const Icon = role.icon;
            const selected = isRoleSelected(role.id);
            
            return (
              <Card 
                key={role.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
                onClick={() => handleRoleToggle(role)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-4">
                    <div className="flex items-center space-x-3 flex-1">
                      <Checkbox 
                        checked={selected}
                        onChange={() => {}} // Handled by card click
                        className="mt-1"
                      />
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        selected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{role.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{role.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {role.features.slice(0, 3).map((feature) => (
                            <Badge key={feature} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    {selected && (
                      <CheckCircle className="w-5 h-5 text-primary mt-1" />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Seller Section */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-primary">Seller (Select Multiple)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryRoles.seller.map((role) => {
            const Icon = role.icon;
            const selected = isRoleSelected(role.id);
            
            return (
              <Card 
                key={role.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
                onClick={() => handleRoleToggle(role)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      selected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {selected && <CheckCircle className="w-5 h-5 text-primary" />}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      checked={selected}
                      onChange={() => {}} // Handled by card click
                    />
                    <CardTitle className="text-sm">{role.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-xs mb-2">{role.description}</CardDescription>
                  <div className="space-y-1">
                    {role.features.slice(0, 3).map((feature) => (
                      <div key={feature} className="text-xs text-muted-foreground">
                        • {feature}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Provider Section */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-primary">Service Providers</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categoryRoles.provider.map((role) => {
            const Icon = role.icon;
            const selected = isRoleSelected(role.id);
            
            return (
              <Card 
                key={role.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
                onClick={() => handleRoleToggle(role)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-4">
                    <div className="flex items-center space-x-3 flex-1">
                      <Checkbox 
                        checked={selected}
                        onChange={() => {}} // Handled by card click
                        className="mt-1"
                      />
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        selected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{role.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{role.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {role.features.slice(0, 3).map((feature) => (
                            <Badge key={feature} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    {selected && (
                      <CheckCircle className="w-5 h-5 text-primary mt-1" />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-center pt-4">
        <Button 
          onClick={handleConfirm}
          disabled={tempSelectedRoles.length === 0}
          size="lg"
          className="w-full max-w-md"
        >
          Continue with {tempSelectedRoles.length} role{tempSelectedRoles.length !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
};

export default RoleSelector;