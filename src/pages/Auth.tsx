import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, Mail, Lock, User, ArrowLeft, Building, Phone, MapPin, ShoppingCart, Package, Settings, Truck, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// FIXED: Complete role configuration for multi-selection
const AVAILABLE_ROLES = [
  {
    key: 'buyer',
    label: 'Buyer',
    icon: ShoppingCart,
    description: 'Browse and purchase robots, parts, and services',
    category: 'marketplace',
    color: 'bg-blue-100 text-blue-800'
  },
  {
    key: 'robot_seller',
    label: 'Robot Seller',
    icon: Bot,
    description: 'Sell industrial robots and automation equipment',
    category: 'seller',
    color: 'bg-green-100 text-green-800'
  },
  {
    key: 'spare_parts_seller',
    label: 'Spare Parts Seller',
    icon: Package,
    description: 'Sell robot components and spare parts',
    category: 'seller',
    color: 'bg-purple-100 text-purple-800'
  },
  {
    key: 'service_provider',
    label: 'Service Provider',
    icon: Settings,
    description: 'Offer maintenance, installation, and repair services',
    category: 'service',
    color: 'bg-orange-100 text-orange-800'
  },
  {
    key: 'logistics_provider',
    label: 'Logistics Provider',
    icon: Truck,
    description: 'Provide shipping and delivery services for robotics',
    category: 'provider',
    color: 'bg-indigo-100 text-indigo-800'
  },
  {
    key: 'finance_provider',
    label: 'Finance Provider',
    icon: CreditCard,
    description: 'Offer loans, leasing, and financial services',
    category: 'provider',
    color: 'bg-pink-100 text-pink-800'
  }
];

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [location, setLocation] = useState('');
  
  // FIXED: Multi-role selection state
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [primaryRole, setPrimaryRole] = useState<string>('');
  
  // Role-specific fields (only show when relevant roles are selected)
  const [logisticsType, setLogisticsType] = useState('');
  const [logisticsRegion, setLogisticsRegion] = useState('');
  const [transportModes, setTransportModes] = useState<string[]>([]);
  const [warehouseStorage, setWarehouseStorage] = useState(false);
  const [financeType, setFinanceType] = useState<string[]>([]);
  const [financingFor, setFinancingFor] = useState<string[]>([]);
  const [targetAudience, setTargetAudience] = useState<string[]>([]);
  const [governmentSchemeSupport, setGovernmentSchemeSupport] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [showMouModal, setShowMouModal] = useState(false);
  const { signUp, signIn, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // FIXED: Multi-role selection handler
  const handleRoleChange = (roleKey: string, checked: boolean) => {
    if (checked) {
      setSelectedRoles([...selectedRoles, roleKey]);
      // Auto-set primary role if it's the first selection
      if (selectedRoles.length === 0) {
        setPrimaryRole(roleKey);
      }
    } else {
      const newRoles = selectedRoles.filter(r => r !== roleKey);
      setSelectedRoles(newRoles);
      // If removing the primary role, set a new one
      if (primaryRole === roleKey && newRoles.length > 0) {
        setPrimaryRole(newRoles[0]);
      } else if (newRoles.length === 0) {
        setPrimaryRole('');
      }
    }
  };

  // Helper functions for role-specific fields
  const handleTransportModeChange = (mode: string, checked: boolean) => {
    if (checked) {
      setTransportModes([...transportModes, mode]);
    } else {
      setTransportModes(transportModes.filter(m => m !== mode));
    }
  };

  const handleFinanceTypeChange = (type: string, checked: boolean) => {
    if (checked) {
      setFinanceType([...financeType, type]);
    } else {
      setFinanceType(financeType.filter(t => t !== type));
    }
  };

  const handleFinancingForChange = (type: string, checked: boolean) => {
    if (checked) {
      setFinancingFor([...financingFor, type]);
    } else {
      setFinancingFor(financingFor.filter(t => t !== type));
    }
  };

  const handleTargetAudienceChange = (audience: string, checked: boolean) => {
    if (checked) {
      setTargetAudience([...targetAudience, audience]);
    } else {
      setTargetAudience(targetAudience.filter(a => a !== audience));
    }
  };

  // FIXED: Profile creation with multi-role support
  const createUserProfile = async (userId: string) => {
    try {
      // Determine seller roles and all user roles
      const sellerRoles = selectedRoles.filter(role => 
        ['robot_seller', 'spare_parts_seller', 'service_provider'].includes(role)
      );
      
      const profileData: any = {
        id: userId,
        full_name: fullName,
        company_name: companyName,
        mobile_number: mobileNumber,
        location: location,
        user_roles: selectedRoles, // All selected roles
        primary_role: primaryRole, // Main role for dashboard
        seller_roles: sellerRoles, // Only selling-related roles
        user_type: primaryRole, // For compatibility
        account_type: primaryRole, // For compatibility
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Add role-specific data based on selected roles
      if (selectedRoles.includes('logistics_provider')) {
        profileData.logistics_type = logisticsType;
        profileData.logistics_region = logisticsRegion;
        profileData.transport_modes = transportModes;
        profileData.warehouse_storage = warehouseStorage;
      }

      if (selectedRoles.includes('finance_provider')) {
        profileData.finance_type = financeType;
        profileData.financing_for = financingFor;
        profileData.target_audience = targetAudience;
        profileData.government_scheme_support = governmentSchemeSupport;
      }

      console.log('Creating multi-role profile:', profileData);

      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select();

      if (error) throw error;

      console.log('✅ Multi-role profile created successfully:', data);
      return data;

    } catch (error) {
      console.error('❌ Failed to create profile:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // FIXED: Multi-role validation
        if (selectedRoles.length === 0) {
          toast({
            variant: "destructive",
            title: "Role Selection Required",
            description: "Please select at least one role to continue.",
          });
          setLoading(false);
          return;
        }

        if (!primaryRole) {
          toast({
            variant: "destructive", 
            title: "Primary Role Required",
            description: "Please select a primary role.",
          });
          setLoading(false);
          return;
        }

        // Role-specific validation
        if (selectedRoles.includes('logistics_provider') && !logisticsType) {
          toast({
            variant: "destructive",
            title: "Logistics Type Required",
            description: "Please select your logistics service type.",
          });
          setLoading(false);
          return;
        }

        if (selectedRoles.includes('finance_provider') && financeType.length === 0) {
          toast({
            variant: "destructive",
            title: "Finance Type Required", 
            description: "Please select at least one finance service type.",
          });
          setLoading(false);
          return;
        }

        // Proceed with signup
        const result = await signUp(email, password, fullName);
        
        if (result.error) {
          throw new Error(result.error.message);
        }

        const newUser = result.data?.user;
        
        if (newUser?.id) {
          await createUserProfile(newUser.id);
          
          toast({
            title: "✅ Multi-Role Registration Successful!",
            description: `Account created with ${selectedRoles.length} role(s): ${selectedRoles.join(', ')}`,
          });
          
          setShowMouModal(true);
        }
      } else {
        // Sign in
        const result = await signIn(email, password);
        if (result.error) {
          throw new Error(result.error.message);
        }
      }

    } catch (error: any) {
      console.error('Authentication error:', error);
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMouAgreement = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (currentUser) {
        const { error } = await supabase
          .from('profiles')
          .update({
            mou_agreed: true,
            mou_agreed_at: new Date().toISOString(),
            registration_complete: true
          })
          .eq('id', currentUser.id);

        if (error) throw error;

        toast({
          title: "🎉 Welcome to RobotVerse!",
          description: `Your multi-role account is ready with ${selectedRoles.length} roles.`,
        });
        
        setShowMouModal(false);
        navigate('/dashboard');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to complete registration. Please try again.",
      });
    }
  };

  // Group roles by category for better organization
  const rolesByCategory = AVAILABLE_ROLES.reduce((acc, role) => {
    if (!acc[role.category]) {
      acc[role.category] = [];
    }
    acc[role.category].push(role);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_ROLES>);

  if (showMouModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card/90 backdrop-blur-lg border-border shadow-2xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">🎉 Multi-Role Account Ready!</CardTitle>
            <CardDescription>
              Your account has been created with {selectedRoles.length} role(s)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg border">
              <h4 className="font-semibold mb-2">Your Selected Roles:</h4>
              <div className="flex flex-wrap gap-2">
                {selectedRoles.map(roleKey => {
                  const role = AVAILABLE_ROLES.find(r => r.key === roleKey);
                  return (
                    <div key={roleKey} className={`px-2 py-1 rounded text-xs font-medium ${role?.color}`}>
                      {role?.label}
                      {primaryRole === roleKey && <span className="ml-1">👑</span>}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Primary Role: <strong>{AVAILABLE_ROLES.find(r => r.key === primaryRole)?.label}</strong>
              </p>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground">
                By proceeding, you agree to the RobotVerse terms and partnership agreement.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1">
                📄 Read Agreement
              </Button>
              <Button 
                onClick={handleMouAgreement}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600"
              >
                ✔️ Agree & Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <Link 
          to="/" 
          className="inline-flex items-center space-x-2 text-primary hover:text-primary/80 transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to RobotVerse</span>
        </Link>

        <Card className="bg-card/90 backdrop-blur-lg border-border shadow-2xl">
          <CardHeader className="text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Bot className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {isSignUp ? 'Join RobotVerse' : 'Welcome Back'}
            </CardTitle>
            <CardDescription className="text-lg mt-2">
              {isSignUp 
                ? 'Create your multi-role account for the robotics marketplace' 
                : 'Sign in to access your robot marketplace'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              {isSignUp && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">Basic Information</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="fullName"
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="pl-10"
                          placeholder="Enter your full name"
                          required={isSignUp}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name *</Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="companyName"
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          className="pl-10"
                          placeholder="Enter your company name"
                          required={isSignUp}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="mobileNumber">Mobile Number *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="mobileNumber"
                          type="tel"
                          value={mobileNumber}
                          onChange={(e) => setMobileNumber(e.target.value)}
                          className="pl-10"
                          placeholder="Enter your mobile number"
                          required={isSignUp}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">Location *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="location"
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          className="pl-10"
                          placeholder="Enter your location"
                          required={isSignUp}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Login Fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      placeholder="Enter your password"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
              </div>

              {/* FIXED: Multi-Role Selection Section */}
              {isSignUp && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">Select Your Roles</h3>
                    <div className="text-sm text-muted-foreground">
                      (Choose all that apply - you can have multiple roles)
                    </div>
                  </div>

                  {/* Selected Roles Summary */}
                  {selectedRoles.length > 0 && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="font-semibold text-green-800 mb-2">
                        ✅ Selected Roles ({selectedRoles.length}):
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedRoles.map(roleKey => {
                          const role = AVAILABLE_ROLES.find(r => r.key === roleKey);
                          return (
                            <div key={roleKey} className={`px-3 py-1 rounded-full text-sm font-medium ${role?.color}`}>
                              {role?.label}
                              {primaryRole === roleKey && <span className="ml-1">👑 Primary</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Role Selection by Category */}
                  {Object.entries(rolesByCategory).map(([category, roles]) => (
                    <div key={category} className="space-y-3">
                      <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                        {category} Roles
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {roles.map((role) => {
                          const Icon = role.icon;
                          const isSelected = selectedRoles.includes(role.key);
                          return (
                            <div 
                              key={role.key} 
                              className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                                isSelected 
                                  ? 'border-primary bg-primary/5 shadow-sm' 
                                  : 'border-border hover:border-primary/50'
                              }`}
                              onClick={() => handleRoleChange(role.key, !isSelected)}
                            >
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => handleRoleChange(role.key, !!checked)}
                                  className="mt-1"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Icon className="w-5 h-5 text-primary" />
                                    <span className="font-semibold">{role.label}</span>
                                    {isSelected && primaryRole === role.key && (
                                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                                        👑 Primary
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {role.description}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Primary Role Selection */}
                  {selectedRoles.length > 1 && (
                    <div className="space-y-3">
                      <Label>Primary Role (Main dashboard focus) *</Label>
                      <Select value={primaryRole} onValueChange={setPrimaryRole}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose your primary role" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedRoles.map(roleKey => {
                            const role = AVAILABLE_ROLES.find(r => r.key === roleKey);
                            return (
                              <SelectItem key={roleKey} value={roleKey}>
                                <div className="flex items-center gap-2">
                                  <role.icon className="w-4 h-4" />
                                  {role?.label}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground">
                        Your primary role determines your default dashboard view. You can switch between roles anytime.
                      </p>
                    </div>
                  )}

                  {/* Role-specific fields (show only when relevant roles are selected) */}
                  {selectedRoles.includes('logistics_provider') && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Truck className="w-4 h-4" />
                        Logistics Provider Details
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Logistics Service Type *</Label>
                          <Select value={logisticsType} onValueChange={setLogisticsType}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select service type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="local">🏠 Local Delivery</SelectItem>
                              <SelectItem value="interstate">🛣️ Interstate Transport</SelectItem>
                              <SelectItem value="international">🌍 International Shipping</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Primary Service Region</Label>
                          <Input
                            value={logisticsRegion}
                            onChange={(e) => setLogisticsRegion(e.target.value)}
                            placeholder="e.g., North India, Maharashtra"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Available Transport Modes</Label>
                        <div className="flex gap-4">
                          <label className="flex items-center space-x-2">
                            <Checkbox
                              checked={transportModes.includes('road')}
                              onCheckedChange={(checked) => handleTransportModeChange('road', !!checked)}
                            />
                            <span className="text-sm">🚛 Road</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <Checkbox
                              checked={transportModes.includes('sea')}
                              onCheckedChange={(checked) => handleTransportModeChange('sea', !!checked)}
                            />
                            <span className="text-sm">🚢 Sea</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <Checkbox
                              checked={transportModes.includes('air')}
                              onCheckedChange={(checked) => handleTransportModeChange('air', !!checked)}
                            />
                            <span className="text-sm">✈️ Air</span>
                          </label>
                        </div>
                      </div>

                      <label className="flex items-center space-x-2">
                        <Checkbox
                          checked={warehouseStorage}
                          onCheckedChange={(checked) => setWarehouseStorage(!!checked)}
                        />
                        <span className="text-sm">🏭 Warehouse & Storage Facilities Available</span>
                      </label>
                    </div>
                  )}

                  {selectedRoles.includes('finance_provider') && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                      <h4 className="font-semibold flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Finance Provider Details
                      </h4>

                      <div className="space-y-3">
                        <Label>Financial Services Offered *</Label>
                        <div className="flex gap-4">
                          <label className="flex items-center space-x-2">
                            <Checkbox
                              checked={financeType.includes('loan')}
                              onCheckedChange={(checked) => handleFinanceTypeChange('loan', !!checked)}
                            />
                            <span className="text-sm">💰 Loans</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <Checkbox
                              checked={financeType.includes('lease')}
                              onCheckedChange={(checked) => handleFinanceTypeChange('lease', !!checked)}
                            />
                            <span className="text-sm">📋 Leasing</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <Checkbox
                              checked={financeType.includes('emi')}
                              onCheckedChange={(checked) => handleFinanceTypeChange('emi', !!checked)}
                            />
                            <span className="text-sm">💳 EMI</span>
                          </label>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label>Financing Available For</Label>
                        <div className="flex gap-4">
                          <label className="flex items-center space-x-2">
                            <Checkbox
                              checked={financingFor.includes('robots')}
                              onCheckedChange={(checked) => handleFinancingForChange('robots', !!checked)}
                            />
                            <span className="text-sm">🤖 Robots</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <Checkbox
                              checked={financingFor.includes('parts')}
                              onCheckedChange={(checked) => handleFinancingForChange('parts', !!checked)}
                            />
                            <span className="text-sm">🔧 Parts</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <Checkbox
                              checked={financingFor.includes('services')}
                              onCheckedChange={(checked) => handleFinancingForChange('services', !!checked)}
                            />
                            <span className="text-sm">🛠️ Services</span>
                          </label>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label>Target Business Segments</Label>
                        <div className="flex gap-4">
                          <label className="flex items-center space-x-2">
                            <Checkbox
                              checked={targetAudience.includes('b2b')}
                              onCheckedChange={(checked) => handleTargetAudienceChange('b2b', !!checked)}
                            />
                            <span className="text-sm">🏢 B2B</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <Checkbox
                              checked={targetAudience.includes('msme')}
                              onCheckedChange={(checked) => handleTargetAudienceChange('msme', !!checked)}
                            />
                            <span className="text-sm">🏭 MSME</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <Checkbox
                              checked={targetAudience.includes('startup')}
                              onCheckedChange={(checked) => handleTargetAudienceChange('startup', !!checked)}
                            />
                            <span className="text-sm">🚀 Startups</span>
                          </label>
                        </div>
                      </div>

                      <label className="flex items-center space-x-2">
                        <Checkbox
                          checked={governmentSchemeSupport}
                          onCheckedChange={(checked) => setGovernmentSchemeSupport(!!checked)}
                        />
                        <span className="text-sm">🏛️ Government Scheme Support Available</span>
                      </label>
                    </div>
                  )}
                </div>
              )}
              
              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg font-semibold shadow-lg" 
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>{isSignUp ? 'Creating Multi-Role Account...' : 'Signing You In...'}</span>
                  </div>
                ) : (
                  <>
                    {isSignUp ? (
                      <>
                        <Bot className="w-5 h-5 mr-2" />
                        Create Multi-Role Account
                        {selectedRoles.length > 0 && (
                          <span className="ml-2 px-2 py-1 bg-white/20 rounded-full text-sm">
                            {selectedRoles.length} roles
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <User className="w-5 h-5 mr-2" />
                        Sign In to RobotVerse
                      </>
                    )}
                  </>
                )}
              </Button>
            </form>
            
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary hover:text-primary/80 transition-colors font-medium"
              >
                {isSignUp 
                  ? 'Already have an account? Sign in here' 
                  : "Don't have an account? Join RobotVerse"
                }
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
