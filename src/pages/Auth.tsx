import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, Mail, Lock, User, ArrowLeft, Building, Phone, MapPin, Truck, CreditCard, Package, Settings, ShoppingCart, Eye, EyeOff, FileText, CheckCircle } from 'lucide-react';
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
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [showEmailConfirmationModal, setShowEmailConfirmationModal] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [pendingUserData, setPendingUserData] = useState<any>(null);
  
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

  // ✅ Save user data to localStorage for email confirmation flow
  const saveUserDataToStorage = (userData: any) => {
    const dataToSave = {
      email,
      fullName,
      companyName,
      mobileNumber,
      location,
      accountType,
      sellerRoles,
      logisticsType,
      logisticsRegion,
      transportModes,
      warehouseStorage,
      financeType,
      financingFor,
      targetAudience,
      governmentSchemeSupport,
      userId: userData.id,
      timestamp: Date.now()
    };
    localStorage.setItem('robotverse_pending_profile', JSON.stringify(dataToSave));
    console.log('💾 User data saved to localStorage for email confirmation');
  };

  // ✅ Load user data from localStorage after email confirmation
  const loadUserDataFromStorage = () => {
    const saved = localStorage.getItem('robotverse_pending_profile');
    if (saved) {
      const data = JSON.parse(saved);
      console.log('📥 Loading saved user data from localStorage');
      
      // Restore form state
      setEmail(data.email || '');
      setFullName(data.fullName || '');
      setCompanyName(data.companyName || '');
      setMobileNumber(data.mobileNumber || '');
      setLocation(data.location || '');
      setAccountType(data.accountType || '');
      setSellerRoles(data.sellerRoles || []);
      setLogisticsType(data.logisticsType || '');
      setLogisticsRegion(data.logisticsRegion || '');
      setTransportModes(data.transportModes || []);
      setWarehouseStorage(data.warehouseStorage || false);
      setFinanceType(data.financeType || []);
      setFinancingFor(data.financingFor || []);
      setTargetAudience(data.targetAudience || []);
      setGovernmentSchemeSupport(data.governmentSchemeSupport || false);
      
      return data;
    }
    return null;
  };

  // ✅ Clear saved user data after successful profile creation
  const clearSavedUserData = () => {
    localStorage.removeItem('robotverse_pending_profile');
    console.log('🗑️ Cleared saved user data from localStorage');
  };

  // ✅ Check for email confirmation on component mount
  useEffect(() => {
    const checkEmailConfirmation = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (currentUser && currentUser.email_confirmed_at) {
        const savedData = loadUserDataFromStorage();
        
        if (savedData && savedData.userId === currentUser.id) {
          console.log('✅ Email confirmed and user data found, creating profile...');
          try {
            await createUserProfileFromSavedData(currentUser, savedData);
            clearSavedUserData();
            
            toast({
              title: "Welcome to RobotVerse!",
              description: "Your account has been verified and profile created successfully.",
            });
            
            navigate('/dashboard');
          } catch (error: any) {
            console.error('❌ Error creating profile after email confirmation:', error);
            toast({
              variant: "destructive",
              title: "Profile Creation Error",
              description: "Failed to create your profile. Please try again.",
            });
          }
        }
      }
    };

    checkEmailConfirmation();
  }, []);

  // ✅ Create profile from saved data after email confirmation
  const createUserProfileFromSavedData = async (user: SupabaseUser, savedData: any) => {
    try {
      console.log('👤 Creating profile from saved data for user:', user.id);
      
      const profileData: any = {
        user_id: user.id,
        email: user.email || savedData.email,
        full_name: savedData.fullName || null,
        company_name: savedData.companyName || null,
        mobile_number: savedData.mobileNumber || null,
        phone: savedData.mobileNumber || null,
        location: savedData.location || null,
        user_type: savedData.accountType || null,
        account_type: savedData.accountType || null,
        updated_at: new Date().toISOString(),
      };

      // Add role-specific data
      if (savedData.accountType === 'seller') {
        profileData.seller_roles = savedData.sellerRoles?.length > 0 ? savedData.sellerRoles : null;
        profileData.primary_user_type = savedData.sellerRoles?.[0] || 'robot_seller';
      } else if (savedData.accountType === 'logistics') {
        profileData.logistics_type = savedData.logisticsType || null;
        profileData.logistics_region = savedData.logisticsRegion || null;
        profileData.transport_modes = savedData.transportModes?.length > 0 ? savedData.transportModes : null;
        profileData.warehouse_storage = savedData.warehouseStorage;
        profileData.primary_user_type = 'logistics_provider';
      } else if (savedData.accountType === 'finance') {
        profileData.finance_type = savedData.financeType?.length > 0 ? savedData.financeType : null;
        profileData.financing_for = savedData.financingFor?.length > 0 ? savedData.financingFor : null;
        profileData.target_audience = savedData.targetAudience?.length > 0 ? savedData.targetAudience : null;
        profileData.government_scheme_support = savedData.governmentSchemeSupport;
        profileData.primary_user_type = 'finance_provider';
      } else if (savedData.accountType === 'buyer') {
        profileData.primary_user_type = 'buyer';
      }

      console.log('📋 Profile data from saved data:', JSON.stringify(profileData, null, 2));

      const { data, error } = await supabase
        .from('profiles')
        .insert(profileData)
        .select();

      if (error) {
        console.error('❌ Profile creation error:', error);
        throw new Error(`Profile creation failed: ${error.message}`);
      }

      console.log('✅ Profile created successfully from saved data:', data[0]);
      return data;

    } catch (error: any) {
      console.error('❌ Profile creation exception:', error);
      throw error;
    }
  };

  // ✅ Handle agreement acceptance
  const handleAgreementAccept = () => {
    setAgreementAccepted(true);
    setShowAgreementModal(false);
    console.log('✅ Agreement accepted, proceeding with signup');
  };

  // ✅ Handle agreement decline
  const handleAgreementDecline = () => {
    setShowAgreementModal(false);
    setAgreementAccepted(false);
    console.log('❌ Agreement declined');
    toast({
      variant: "destructive",
      title: "Agreement Required",
      description: "You must accept the agreement to create an account.",
    });
  };

  // ✅ Modified form submission with agreement first
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.log('🚀 Form submission started');

    try {
      if (isSignUp) {
        // ✅ Show agreement modal first if not accepted
        if (!agreementAccepted) {
          setLoading(false);
          setShowAgreementModal(true);
          return;
        }

        console.log('📝 Registration process initiated');
        
        // Validation (existing validation code)
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

        // ✅ Create user account with email confirmation
        console.log('👤 Creating user account with email confirmation...');
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

        // ✅ Save user data for after email confirmation
        saveUserDataToStorage(newUser);

        // ✅ Show email confirmation modal
        setShowEmailConfirmationModal(true);

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

  // ✅ Agreement Modal Component
  if (showAgreementModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl bg-card/90 backdrop-blur-lg border-border shadow-2xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">Terms & Conditions Agreement</CardTitle>
            <CardDescription>
              Please review and accept our terms to create your RobotVerse account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 p-6 rounded-lg border max-h-96 overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">RobotVerse Partnership Agreement</h3>
              <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                <p>
                  <strong>1. Account Creation & Verification:</strong> By creating an account, you agree to provide accurate information and verify your email address. Your account will be activated only after email confirmation.
                </p>
                <p>
                  <strong>2. User Responsibilities:</strong> You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
                </p>
                <p>
                  <strong>3. Platform Usage:</strong> You agree to use RobotVerse marketplace in accordance with our community guidelines and applicable laws. Prohibited activities include fraud, spam, or misrepresentation.
                </p>
                <p>
                  <strong>4. Data Privacy:</strong> We collect and process your personal information in accordance with our Privacy Policy. Your data will be used to provide marketplace services and improve user experience.
                </p>
                <p>
                  <strong>5. Marketplace Terms:</strong> For sellers, you agree to provide accurate product/service descriptions. For buyers, you agree to our purchase and return policies.
                </p>
                <p>
                  <strong>6. Email Communication:</strong> By signing up, you consent to receive important account-related emails including verification, security alerts, and service updates.
                </p>
                <p>
                  <strong>7. Account Termination:</strong> We reserve the right to suspend or terminate accounts that violate our terms of service.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 hover:bg-muted/50"
                onClick={handleAgreementDecline}
              >
                ❌ Decline
              </Button>
              <Button 
                onClick={handleAgreementAccept}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                ✅ Accept & Continue
              </Button>
            </div>
            
            <p className="text-xs text-center text-muted-foreground">
              By accepting, you agree to receive a verification email to complete your registration.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ✅ Email Confirmation Modal Component
  if (showEmailConfirmationModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card/90 backdrop-blur-lg border-border shadow-2xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
            <CardDescription>
              We've sent a verification link to your email address
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg border text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <p className="text-sm font-medium mb-2">Verification Email Sent!</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                We've sent a verification email to <strong>{email}</strong>. 
                Please check your inbox and click the verification link to activate your account.
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  After verifying your email, you can sign in to complete your profile setup.
                </p>
              </div>
              
              <Button 
                onClick={() => {
                  setShowEmailConfirmationModal(false);
                  setIsSignUp(false); // Switch to sign in mode
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                ✉️ I've Verified - Let me Sign In
              </Button>
              
              <div className="text-center">
                <button
                  onClick={() => setShowEmailConfirmationModal(false)}
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  Close & Continue Later
                </button>
              </div>
            </div>
            
            <div className="text-xs text-center text-muted-foreground space-y-1">
              <p>• Check your spam folder if you don't see the email</p>
              <p>• The verification link expires in 24 hours</p>
              <p>• Your profile data is saved and will be created after verification</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Authentication Form (rest of your existing form code remains the same)
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

              {/* Include all your existing logistics and finance fields here */}
              {/* [Previous logistics and finance sections remain unchanged] */}
              
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
                        {agreementAccepted ? 'Create My RobotVerse Account' : 'Review Agreement & Create Account'}
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
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setAgreementAccepted(false); // Reset agreement when switching
                }}
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
