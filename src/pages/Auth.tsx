import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, Mail, Lock, User, ArrowLeft, Building, Phone, MapPin, Truck, CreditCard, Package, Settings, ShoppingCart, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

const Auth = () => {
  // Form state
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [location, setLocation] = useState('');
  const [accountType, setAccountType] = useState<'buyer' | 'seller' | 'logistics' | 'finance' | ''>('');
  
  // Seller state
  const [sellerRoles, setSellerRoles] = useState<string[]>([]);
  
  // Logistics state
  const [logisticsType, setLogisticsType] = useState('');
  const [logisticsRegion, setLogisticsRegion] = useState('');
  const [transportModes, setTransportModes] = useState<string[]>([]);
  const [warehouseStorage, setWarehouseStorage] = useState(false);
  
  // Finance state
  const [financeType, setFinanceType] = useState<string[]>([]);
  const [financingFor, setFinancingFor] = useState<string[]>([]);
  const [targetAudience, setTargetAudience] = useState<string[]>([]);
  const [governmentSchemeSupport, setGovernmentSchemeSupport] = useState(false);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [showMouModal, setShowMouModal] = useState(false);
  
  // Hooks
  const { signUp, signIn, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      console.log('✅ User already authenticated, redirecting to home');
      navigate('/');
    }
  }, [user, navigate]);

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Handler functions for multi-select checkboxes
  const handleSellerRoleChange = (role: string, checked: boolean) => {
    console.log(`🔄 Seller role change: ${role} = ${checked}`);
    if (checked) {
      const newRoles = [...sellerRoles, role];
      setSellerRoles(newRoles);
      console.log('✅ Updated seller roles:', newRoles);
    } else {
      const newRoles = sellerRoles.filter(r => r !== role);
      setSellerRoles(newRoles);
      console.log('✅ Updated seller roles:', newRoles);
    }
  };

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

  // ✅ Fixed profile creation - uses user object directly, no session verification
  const createUserProfile = async (user: SupabaseUser) => {
    try {
      console.log('👤 Creating profile for user:', user.id);
      console.log('📧 User email:', user.email);
      
      const profileData: any = {
        user_id: user.id, // Use user from signup directly
        email: user.email || email.trim(),
        full_name: fullName.trim() || null,
        company_name: companyName.trim() || null,
        mobile_number: mobileNumber.trim() || null,
        phone: mobileNumber.trim() || null,
        location: location.trim() || null,
        user_type: accountType || null,
        account_type: accountType || null,
        updated_at: new Date().toISOString(),
      };

      // Add role-specific data
      if (accountType === 'seller') {
        profileData.seller_roles = sellerRoles.length > 0 ? sellerRoles : null;
        profileData.primary_user_type = (sellerRoles[0] as any) || 'robot_seller';
        console.log('🏪 Seller data:', { roles: sellerRoles, primary: profileData.primary_user_type });
      } else if (accountType === 'logistics') {
        profileData.logistics_type = logisticsType || null;
        profileData.logistics_region = logisticsRegion || null;
        profileData.transport_modes = transportModes.length > 0 ? transportModes : null;
        profileData.warehouse_storage = warehouseStorage;
        profileData.primary_user_type = 'logistics_provider';
        console.log('🚚 Logistics data added');
      } else if (accountType === 'finance') {
        profileData.finance_type = financeType.length > 0 ? financeType : null;
        profileData.financing_for = financingFor.length > 0 ? financingFor : null;
        profileData.target_audience = targetAudience.length > 0 ? targetAudience : null;
        profileData.government_scheme_support = governmentSchemeSupport;
        profileData.primary_user_type = 'finance_provider';
        console.log('💰 Finance data added');
      } else if (accountType === 'buyer') {
        profileData.primary_user_type = 'buyer';
        console.log('🛒 Buyer data added');
      }

      console.log('📋 Final profile data:', JSON.stringify(profileData, null, 2));

      // ✅ Insert profile without additional session checks
      const { data, error } = await supabase
        .from('profiles')
        .insert(profileData)
        .select();

      if (error) {
        console.error('❌ Profile creation error:', error);
        throw new Error(`Profile creation failed: ${error.message}`);
      }

      console.log('✅ Profile created successfully:', data[0]);
      return data;

    } catch (error: any) {
      console.error('❌ Profile creation exception:', error);
      throw error;
    }
  };

  // ✅ Fixed form submission - no authentication loss
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.log('🚀 Form submission started');

    try {
      if (isSignUp) {
        console.log('📝 Registration process initiated');
        
        // Validation
        if (!email.trim()) {
          throw new Error('Email is required');
        }
        
        if (!password || password.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }

        if (!accountType) {
          toast({
            variant: "destructive",
            title: "Account Type Required",
            description: "Please select an account type to continue.",
          });
          return;
        }

        if (!fullName.trim()) {
          toast({
            variant: "destructive",
            title: "Full Name Required",
            description: "Please enter your full name.",
          });
          return;
        }

        if (!companyName.trim()) {
          toast({
            variant: "destructive",
            title: "Company Name Required",
            description: "Please enter your company name.",
          });
          return;
        }

        if (!mobileNumber.trim()) {
          toast({
            variant: "destructive",
            title: "Mobile Number Required",
            description: "Please enter your mobile number.",
          });
          return;
        }

        if (!location.trim()) {
          toast({
            variant: "destructive",
            title: "Location Required",
            description: "Please enter your location.",
          });
          return;
        }

        // Role-specific validation
        if (accountType === 'seller' && sellerRoles.length === 0) {
          toast({
            variant: "destructive",
            title: "Seller Role Required",
            description: "Please select at least one seller role.",
          });
          return;
        }

        if (accountType === 'logistics') {
          if (!logisticsType) {
            toast({
              variant: "destructive",
              title: "Logistics Type Required",
              description: "Please select your logistics type.",
            });
            return;
          }
          if (!logisticsRegion.trim()) {
            toast({
              variant: "destructive",
              title: "Service Region Required",
              description: "Please enter your primary service region.",
            });
            return;
          }
        }

        if (accountType === 'finance' && financeType.length === 0) {
          toast({
            variant: "destructive",
            title: "Finance Type Required",
            description: "Please select at least one finance type.",
          });
          return;
        }

        // ✅ Create user account
        console.log('👤 Creating user account...');
        const { user: newUser, error: signUpError } = await signUp(email, password, fullName);
        
        if (signUpError) {
          console.error('❌ User creation failed:', signUpError);
          throw new Error(signUpError.message);
        }

        if (!newUser) {
          console.error('❌ No user returned from signup');
          throw new Error('Failed to create user account');
        }

        console.log('✅ User account created:', newUser.id);

        // ✅ Create profile immediately using the user object (no session verification)
        console.log('📋 Creating user profile...');
        await createUserProfile(newUser);
        
        toast({
          title: "Registration Successful!",
          description: "Your account has been created successfully.",
        });
        
        setShowMouModal(true);

      } else {
        // Sign in process
        console.log('🔐 Sign in process initiated');
        
        if (!email.trim()) {
          throw new Error('Email is required');
        }
        
        if (!password) {
          throw new Error('Password is required');
        }

        const signInError = await signIn(email, password);
        
        if (signInError) {
          console.error('❌ Sign in failed:', signInError);
          throw new Error(signInError.message);
        }

        console.log('✅ Sign in successful');
        toast({
          title: "Welcome back!",
          description: "You have been signed in successfully.",
        });
      }

    } catch (error: any) {
      console.error('❌ Form submission error:', error);
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: error.message || "An unexpected error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
      console.log('🏁 Form submission completed');
    }
  };

  // ✅ Handle MOU agreement
  const handleMouAgreement = async () => {
    try {
      console.log('📜 Processing MOU agreement...');
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }

      console.log('✍️ Updating MOU agreement for user:', currentUser.id);
      const { error } = await supabase
        .from('profiles')
        .update({
          mou_agreed: true,
          mou_agreed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', currentUser.id);

      if (error) {
        console.error('❌ MOU update error:', error);
        throw error;
      }

      console.log('✅ MOU agreement completed');
      toast({
        title: "Welcome to RobotVerse!",
        description: "Your account has been successfully created.",
      });
      
      setShowMouModal(false);
      navigate('/dashboard');
      
    } catch (error: any) {
      console.error('❌ MOU agreement error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to complete registration. Please try again.",
      });
    }
  };

  // MOU Modal Component
  if (showMouModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card/90 backdrop-blur-lg border-border shadow-2xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">MOU Agreement</CardTitle>
            <CardDescription>
              Please review and accept our partnership terms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground leading-relaxed">
                By proceeding, you agree to the RobotVerse MOU terms and partnership agreement. 
                This includes our community guidelines, data usage policies, and marketplace terms.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 hover:bg-muted/50">
                📄 Read Full Agreement
              </Button>
              <Button 
                onClick={handleMouAgreement}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                ✔️ Agree & Proceed
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Authentication Form
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Back to Home Link */}
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
                ? 'Create your account to start your robotics journey' 
                : 'Sign in to access your robot marketplace'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information Section - Only for Sign Up */}
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
              
              {/* Email and Password Fields */}
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
                
                {/* Password Field with Show/Hide Toggle */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-12"
                      placeholder="Enter your password"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {/* Password Strength Indicator */}
                  {password && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Password strength: {password.length >= 8 ? '🟢 Strong' : password.length >= 6 ? '🟡 Medium' : '🔴 Weak'}
                    </div>
                  )}
                </div>
              </div>

              {/* Account Type Selection - Only for Sign Up */}
              {isSignUp && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">Account Type</h3>
                  </div>

                  <div className="space-y-2">
                    <Label>Select Your Account Type *</Label>
                    <Select value={accountType} onValueChange={(value: any) => setAccountType(value)}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Choose your account type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="buyer" className="h-12">
                          <div className="flex items-center gap-3">
                            <ShoppingCart className="w-5 h-5 text-blue-600" />
                            <div>
                              <div className="font-medium">Buyer</div>
                              <div className="text-xs text-muted-foreground">Browse and purchase robots</div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="seller" className="h-12">
                          <div className="flex items-center gap-3">
                            <Building className="w-5 h-5 text-green-600" />
                            <div>
                              <div className="font-medium">Seller</div>
                              <div className="text-xs text-muted-foreground">Sell robots, parts, or services</div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="logistics" className="h-12">
                          <div className="flex items-center gap-3">
                            <Truck className="w-5 h-5 text-orange-600" />
                            <div>
                              <div className="font-medium">Logistics Partner</div>
                              <div className="text-xs text-muted-foreground">Provide shipping services</div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="finance" className="h-12">
                          <div className="flex items-center gap-3">
                            <CreditCard className="w-5 h-5 text-purple-600" />
                            <div>
                              <div className="font-medium">Finance Provider</div>
                              <div className="text-xs text-muted-foreground">Offer financial services</div>
                            </div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Seller Role Selection */}
              {isSignUp && accountType === 'seller' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">Seller Specializations</h3>
                  </div>

                  <div className="space-y-2">
                    <Label>Select Your Seller Roles (Choose all that apply) *</Label>
                    <div className="text-xs text-muted-foreground mb-2">
                      Selected roles ({sellerRoles.length}): {sellerRoles.join(', ') || 'None'}
                    </div>
                    <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
                      <div className="flex items-center space-x-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                        <Checkbox
                          id="robot_seller"
                          checked={sellerRoles.includes('robot_seller')}
                          onCheckedChange={(checked) => handleSellerRoleChange('robot_seller', !!checked)}
                        />
                        <div className="flex items-center gap-3 flex-1">
                          <Bot className="w-5 h-5 text-blue-600" />
                          <div>
                            <Label htmlFor="robot_seller" className="font-medium cursor-pointer">Robot Seller</Label>
                            <p className="text-xs text-muted-foreground">Sell industrial robots and automation equipment</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                        <Checkbox
                          id="spare_parts_seller"
                          checked={sellerRoles.includes('spare_parts_seller')}
                          onCheckedChange={(checked) => handleSellerRoleChange('spare_parts_seller', !!checked)}
                        />
                        <div className="flex items-center gap-3 flex-1">
                          <Package className="w-5 h-5 text-green-600" />
                          <div>
                            <Label htmlFor="spare_parts_seller" className="font-medium cursor-pointer">Spare Parts Seller</Label>
                            <p className="text-xs text-muted-foreground">Sell robot components and spare parts</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                        <Checkbox
                          id="service_provider"
                          checked={sellerRoles.includes('service_provider')}
                          onCheckedChange={(checked) => handleSellerRoleChange('service_provider', !!checked)}
                        />
                        <div className="flex items-center gap-3 flex-1">
                          <Settings className="w-5 h-5 text-purple-600" />
                          <div>
                            <Label htmlFor="service_provider" className="font-medium cursor-pointer">Service Provider</Label>
                            <p className="text-xs text-muted-foreground">Offer maintenance, installation, and repair services</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Logistics Provider Fields */}
              {isSignUp && accountType === 'logistics' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">Logistics Details</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type of Logistics Service *</Label>
                      <Select value={logisticsType} onValueChange={setLogisticsType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select logistics type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="local">🏠 Local Delivery</SelectItem>
                          <SelectItem value="interstate">🛣️ Interstate Transport</SelectItem>
                          <SelectItem value="international">🌍 International Shipping</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="logisticsRegion">Primary Service Region *</Label>
                      <Input
                        id="logisticsRegion"
                        value={logisticsRegion}
                        onChange={(e) => setLogisticsRegion(e.target.value)}
                        placeholder="e.g., North India, Maharashtra, etc."
                        required={accountType === 'logistics'}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Available Transport Modes</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="flex items-center space-x-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                        <Checkbox
                          id="road"
                          checked={transportModes.includes('road')}
                          onCheckedChange={(checked) => handleTransportModeChange('road', !!checked)}
                        />
                        <Label htmlFor="road" className="font-medium cursor-pointer">🚛 Road Transport</Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                        <Checkbox
                          id="sea"
                          checked={transportModes.includes('sea')}
                          onCheckedChange={(checked) => handleTransportModeChange('sea', !!checked)}
                        />
                        <Label htmlFor="sea" className="font-medium cursor-pointer">🚢 Sea Freight</Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                        <Checkbox
                          id="air"
                          checked={transportModes.includes('air')}
                          onCheckedChange={(checked) => handleTransportModeChange('air', !!checked)}
                        />
                        <Label htmlFor="air" className="font-medium cursor-pointer">✈️ Air Cargo</Label>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                    <Checkbox
                      id="warehouse"
                      checked={warehouseStorage}
                      onCheckedChange={(checked) => setWarehouseStorage(!!checked)}
                    />
                    <div className="flex-1">
                      <Label htmlFor="warehouse" className="font-medium cursor-pointer">🏭 Warehouse & Storage Facilities</Label>
                      <p className="text-xs text-muted-foreground">We provide temporary storage and warehousing services</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Finance Provider Fields */}
              {isSignUp && accountType === 'finance' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">Financial Services</h3>
                  </div>

                  <div className="space-y-3">
                    <Label>Types of Financial Services Offered *</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="flex items-center space-x-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                        <Checkbox
                          id="loan"
                          checked={financeType.includes('loan')}
                          onCheckedChange={(checked) => handleFinanceTypeChange('loan', !!checked)}
                        />
                        <Label htmlFor="loan" className="font-medium cursor-pointer">💰 Business Loans</Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                        <Checkbox
                          id="lease"
                          checked={financeType.includes('lease')}
                          onCheckedChange={(checked) => handleFinanceTypeChange('lease', !!checked)}
                        />
                        <Label htmlFor="lease" className="font-medium cursor-pointer">📋 Equipment Leasing</Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                        <Checkbox
                          id="emi"
                          checked={financeType.includes('emi')}
                          onCheckedChange={(checked) => handleFinanceTypeChange('emi', !!checked)}
                        />
                        <Label htmlFor="emi" className="font-medium cursor-pointer">💳 EMI Financing</Label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Financing Available For</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="flex items-center space-x-2 p-2 border rounded bg-background">
                        <Checkbox
                          id="robots"
                          checked={financingFor.includes('robots')}
                          onCheckedChange={(checked) => handleFinancingForChange('robots', !!checked)}
                        />
                        <Label htmlFor="robots" className="text-sm cursor-pointer">🤖 Robots</Label>
                      </div>
                      <div className="flex items-center space-x-2 p-2 border rounded bg-background">
                        <Checkbox
                          id="parts"
                          checked={financingFor.includes('parts')}
                          onCheckedChange={(checked) => handleFinancingForChange('parts', !!checked)}
                        />
                        <Label htmlFor="parts" className="text-sm cursor-pointer">🔧 Parts</Label>
                      </div>
                      <div className="flex items-center space-x-2 p-2 border rounded bg-background">
                        <Checkbox
                          id="setup"
                          checked={financingFor.includes('setup')}
                          onCheckedChange={(checked) => handleFinancingForChange('setup', !!checked)}
                        />
                        <Label htmlFor="setup" className="text-sm cursor-pointer">⚙️ Setup</Label>
                      </div>
                      <div className="flex items-center space-x-2 p-2 border rounded bg-background">
                        <Checkbox
                          id="services"
                          checked={financingFor.includes('services')}
                          onCheckedChange={(checked) => handleFinancingForChange('services', !!checked)}
                        />
                        <Label htmlFor="services" className="text-sm cursor-pointer">🛠️ Services</Label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Target Business Segments</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="flex items-center space-x-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                        <Checkbox
                          id="b2b"
                          checked={targetAudience.includes('b2b')}
                          onCheckedChange={(checked) => handleTargetAudienceChange('b2b', !!checked)}
                        />
                        <Label htmlFor="b2b" className="font-medium cursor-pointer">🏢 Large Enterprises (B2B)</Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                        <Checkbox
                          id="msme"
                          checked={targetAudience.includes('msme')}
                          onCheckedChange={(checked) => handleTargetAudienceChange('msme', !!checked)}
                        />
                        <Label htmlFor="msme" className="font-medium cursor-pointer">🏭 MSME Businesses</Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                        <Checkbox
                          id="startup"
                          checked={targetAudience.includes('startup')}
                          onCheckedChange={(checked) => handleTargetAudienceChange('startup', !!checked)}
                        />
                        <Label htmlFor="startup" className="font-medium cursor-pointer">🚀 Startups & Scale-ups</Label>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                    <Checkbox
                      id="government_scheme"
                      checked={governmentSchemeSupport}
                      onCheckedChange={(checked) => setGovernmentSchemeSupport(!!checked)}
                    />
                    <div className="flex-1">
                      <Label htmlFor="government_scheme" className="font-medium cursor-pointer">🏛️ Government Scheme Support</Label>
                      <p className="text-xs text-muted-foreground">We assist with government subsidies and scheme applications</p>
                    </div>
                  </div>
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
                    <span>{isSignUp ? 'Creating Your Account...' : 'Signing You In...'}</span>
                  </div>
                ) : (
                  <>
                    {isSignUp ? (
                      <>
                        <Bot className="w-5 h-5 mr-2" />
                        Create My RobotVerse Account
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
            
            {/* Toggle between Sign Up and Sign In */}
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
