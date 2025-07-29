import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ShoppingCart, Store, Wrench, Settings, Truck, CreditCard } from "lucide-react";
import { Label } from "@/components/ui/label";

export type UserRole = 'buyer' | 'robot_seller' | 'spare_parts_seller' | 'service_provider' | 'logistics_provider' | 'finance_provider';

interface MultiRoleSelectorProps {
  selectedRoles: UserRole[];
  onRolesChange: (roles: UserRole[]) => void;
  className?: string;
}

const MultiRoleSelector = ({ selectedRoles, onRolesChange, className }: MultiRoleSelectorProps) => {
  const userRoles = [
    {
      id: 'buyer' as const,
      title: 'Robot Buyer',
      description: 'Browse and purchase robots from verified sellers',
      icon: ShoppingCart,
      features: ['Access to marketplace', 'Verified sellers', 'Secure payments', 'Product reviews']
    },
    {
      id: 'robot_seller' as const,
      title: 'Robot Seller',
      description: 'Sell robots to a global marketplace',
      icon: Store,
      features: ['List robots', 'Global reach', 'Analytics dashboard', 'Seller protection']
    },
    {
      id: 'spare_parts_seller' as const,
      title: 'Spare Parts Seller',
      description: 'Supply robot parts and components',
      icon: Settings,
      features: ['Parts catalog', 'Inventory management', 'Compatibility guide', 'Bulk orders']
    },
    {
      id: 'service_provider' as const,
      title: 'Service Provider',
      description: 'Offer robotics services and maintenance',
      icon: Wrench,
      features: ['Service listings', 'Client management', 'Scheduling tools', 'Rating system']
    },
    {
      id: 'logistics_provider' as const,
      title: 'Logistics Provider',
      description: 'Handle shipping and transportation',
      icon: Truck,
      features: ['Fleet management', 'Route optimization', 'Real-time tracking', 'Coverage areas']
    },
    {
      id: 'finance_provider' as const,
      title: 'Finance Provider',
      description: 'Provide loans and financing solutions',
      icon: CreditCard,
      features: ['Loan programs', 'Credit assessment', 'Payment plans', 'Risk management']
    }
  ];

  const handleRoleToggle = (roleId: UserRole, checked: boolean) => {
    if (checked) {
      onRolesChange([...selectedRoles, roleId]);
    } else {
      onRolesChange(selectedRoles.filter(role => role !== roleId));
    }
  };

  return (
    <div className={className}>
      <div className="space-y-4">
        <div>
          <Label className="text-lg font-semibold">Select Your Roles (Choose all that apply)</Label>
          <p className="text-sm text-muted-foreground mt-1">
            You can select multiple roles to access different features and dashboards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {userRoles.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRoles.includes(role.id);
            
            return (
              <Card 
                key={role.id} 
                className={`cursor-pointer transition-all duration-300 ${
                  isSelected 
                    ? 'border-primary bg-primary/5 shadow-glow' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => handleRoleToggle(role.id, !isSelected)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleRoleToggle(role.id, !!checked)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isSelected ? 'bg-primary text-primary-foreground' : 'bg-primary/20 text-primary'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <CardTitle className="text-lg">{role.title}</CardTitle>
                      </div>
                      <CardDescription className="text-sm">
                        {role.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-1">
                    {role.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-xs text-muted-foreground">
                        <div className="w-1 h-1 bg-primary rounded-full mr-2"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {selectedRoles.length === 0 && (
          <p className="text-sm text-destructive">Please select at least one role to continue.</p>
        )}
      </div>
    </div>
  );
};

export default MultiRoleSelector;