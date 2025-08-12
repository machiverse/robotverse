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
import type { Database } from '@/integrations/supabase/types';

// Types from Supabase schema
type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
type UserTypeEnum = Database['public']['Enums']['user_type_enum'];

const Auth = () => {
  // --- State ---
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [location, setLocation] = useState('');
  const [accountType, setAccountType] = useState<'buyer' | 'seller' | 'logistics' | 'finance' | ''>('');

  // Seller/Logistics/Finance state
  const [sellerRoles, setSellerRoles] = useState<string[]>([]);
  const [logisticsType, setLogisticsType] = useState('');
  const [logisticsRegion, setLogisticsRegion] = useState('');
  const [transportModes, setTransportModes] = useState<string[]>([]);
  const [warehouseStorage, setWarehouseStorage] = useState(false);
  const [financeType, setFinanceType] = useState<string[]>([]);
  const [financingFor, setFinancingFor] = useState<string[]>([]);
  const [targetAudience, setTargetAudience] = useState<string[]>([]);
  const [governmentSchemeSupport, setGovernmentSchemeSupport] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [showEmailConfirmationModal, setShowEmailConfirmationModal] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);

  // Hooks
  const { signUp, signIn, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // --- Password/Forgot/Reset handlers ---
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ variant: "destructive", title: "Email Required", description: "Please enter your email address." });
      return;
    }
    setLoading(true);
    try {
      const currentHost = window.location.hostname;
      let redirectUrl = `${window.location.origin}/auth?reset=true`;
      if (currentHost === 'www.robotverse.in' || currentHost === 'robotverse.in') {
        redirectUrl = 'https://www.robotverse.in/auth?reset=true';
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
      if (error) throw error;
      toast({ title: "Reset Link Sent", description: "Check your email for the password reset link." });
      setIsForgotPassword(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to send reset email." });
    } finally { setLoading(false); }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      toast({ variant: "destructive", title: "Required Fields", description: "Please fill in both password fields." });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Password Mismatch", description: "The passwords do not match." });
      return;
    }
    if (newPassword.length < 6) {
      toast({ variant: "destructive", title: "Weak Password", description: "Password must be at least 6 characters long." });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Password Updated", description: "Your password has been updated successfully. You can now sign in." });
      setIsResetPassword(false);
      setNewPassword('');
      setConfirmPassword('');
      navigate('/auth');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to update password." });
    } finally { setLoading(false); }
  };

  // --- Auth redirect logic ---
  useEffect(() => { if (user) navigate('/'); }, [user, navigate]);
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isReset = urlParams.get('reset');
    const isSignupMode = urlParams.get('signup');
    if (isReset === 'true') {
      setIsResetPassword(true); setIsForgotPassword(false); setIsSignUp(false);
    } else if (isSignupMode === 'true') {
      setIsSignUp(true); setIsForgotPassword(false); setIsResetPassword(false);
    }
  }, []);

  const togglePasswordVisibility = () => { setShowPassword(!showPassword); };
  
  // --- Handlers for checkboxes ---
  const handleSellerRoleChange = (role: string, checked: boolean) => {
    setSellerRoles(checked ? [...sellerRoles, role] : sellerRoles.filter(r => r !== role));
  };
  const handleTransportModeChange = (mode: string, checked: boolean) => {
    setTransportModes(checked ? [...transportModes, mode] : transportModes.filter(t => t !== mode));
  };
  const handleFinanceTypeChange = (type: string, checked: boolean) => {
    setFinanceType(checked ? [...financeType, type] : financeType.filter(t => t !== type));
  };
  const handleFinancingForChange = (type: string, checked: boolean) => {
    setFinancingFor(checked ? [...financingFor, type] : financingFor.filter(t => t !== type));
  };
  const handleTargetAudienceChange = (item: string, checked: boolean) => {
    setTargetAudience(checked ? [...targetAudience, item] : targetAudience.filter(a => a !== item));
  };

  // --- LocalStorage helpers ---
  const saveUserDataToStorage = (userData: SupabaseUser) => {
    const dataToSave = {
      email, fullName, companyName, mobileNumber, location, accountType,
      sellerRoles: Array.isArray(sellerRoles) && sellerRoles.length > 0 ? sellerRoles : [],
      logisticsType, logisticsRegion,
      transportModes: Array.isArray(transportModes) && transportModes.length > 0 ? transportModes : [],
      warehouseStorage: Boolean(warehouseStorage),
      financeType: Array.isArray(financeType) && financeType.length > 0 ? financeType : [],
      financingFor: Array.isArray(financingFor) && financingFor.length > 0 ? financingFor : [],
      targetAudience: Array.isArray(targetAudience) && targetAudience.length > 0 ? targetAudience : [],
      governmentSchemeSupport: Boolean(governmentSchemeSupport),
      userId: userData.id,
      timestamp: Date.now()
    };
    localStorage.setItem('robotverse_user_registration_data', JSON.stringify(dataToSave));
  };
  const loadUserDataFromStorage = () => {
    const saved = localStorage.getItem('robotverse_user_registration_data');
    return saved ? JSON.parse(saved) : null;
  };
  const clearSavedUserData = () => {
    localStorage.removeItem('robotverse_user_registration_data');
  };

  // --- Email confirmation / profile creation ---
  useEffect(() => {
    const checkEmailConfirmation = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser && currentUser.email_confirmed_at) {
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles').select('*').eq('user_id', currentUser.id).single();

        const savedData = loadUserDataFromStorage();
        if (!profileError && existingProfile) {
          await supabase.from('profiles').update({
            registration_complete: true, updated_at: new Date().toISOString()
          }).eq('user_id', currentUser.id);
          toast({ title: "Welcome to RobotVerse!", description: "Your account has been verified successfully." });
          setTimeout(() => navigate('/dashboard'), 1000);
        } else if (savedData && savedData.userId === currentUser.id) {
          try {
            await createUserProfileFromSavedData(currentUser, savedData);
            clearSavedUserData();
            toast({ title: "Welcome to RobotVerse!", description: "Your account has been verified and profile created successfully." });
            setTimeout(() => navigate('/dashboard'), 1000);
          } catch (error: any) {
            clearSavedUserData();
            toast({
              variant: "destructive", title: "Profile Setup Error",
              description: `Failed to complete your profile setup: ${error.message}. Please sign in and try completing your profile again.`,
            });
          }
        }
      }
    };
    checkEmailConfirmation();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) await checkEmailConfirmation();
    });
    return () => subscription.unsubscribe();
  }, []);

  // --- Profile creation after email verification ---
  const createUserProfileFromSavedData = async (user: SupabaseUser, savedData: any) => {
    const profileData: any = {
      user_id: user.id,
      email: user.email || savedData.email,
      full_name: savedData.fullName || '',
      company_name: savedData.companyName || '',
      mobile_number: savedData.mobileNumber || '',
      location: savedData.location || '',
      user_type: savedData.accountType || 'buyer',
      account_type: savedData.accountType || 'buyer',
      registration_complete: true,
      mou_agreed: true,
      mou_agreed_at: new Date().toISOString(),
      user_roles: ['buyer'], primary_role: 'buyer',
    };
    if (savedData.accountType === 'seller' && savedData.sellerRoles?.length > 0) {
      profileData.seller_roles = savedData.sellerRoles;
      profileData.user_roles = savedData.sellerRoles;
      profileData.primary_role = savedData.sellerRoles[0];
      profileData.service_categories = savedData.sellerRoles.includes('service_provider') ? ['maintenance', 'repair'] : [];
    } else if (savedData.accountType === 'logistics') {
      profileData.logistics_type = savedData.logisticsType || null;
      profileData.logistics_region = savedData.logisticsRegion || null;
      profileData.transport_modes = savedData.transportModes || [];
      profileData.warehouse_storage = Boolean(savedData.warehouseStorage);
      profileData.primary_role = 'logistics_provider';
      profileData.user_roles = ['logistics_provider'];
    } else if (savedData.accountType === 'finance') {
      profileData.finance_type = savedData.financeType || [];
      profileData.financing_for = savedData.financingFor || [];
      profileData.government_scheme_support = Boolean(savedData.governmentSchemeSupport);
      profileData.primary_role = 'finance_provider';
      profileData.user_roles = ['finance_provider'];
    }
    const { data, error } = await supabase.from('profiles').insert([profileData]).select();
    if (error || !data || data.length === 0) throw new Error(error ? error.message : 'Profile creation failed');
    return data;
  };

  // --- Agreement modal handlers ---
  const handleAgreementAccept = () => {
    setAgreementAccepted(true);
    setShowAgreementModal(false);
  };
  const handleAgreementDecline = () => {
    setShowAgreementModal(false);
    setAgreementAccepted(false);
    toast({ variant: "destructive", title: "Agreement Required", description: "You must accept the agreement to create an account." });
  };

  // --- Main form submission, validation, and signup/signin ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      if (isSignUp) {
        if (!agreementAccepted) { setLoading(false); setShowAgreementModal(true); return; }
        // Validate fields
        if (!email.trim()) throw new Error('Email is required');
        if (!password || password.length < 6) throw new Error('Password must be at least 6 characters');
        if (!accountType) { toast({ variant: "destructive", title: "Account Type Required", description: "Please select an account type to continue." }); return; }
        if (!fullName.trim()) { toast({ variant: "destructive", title: "Full Name Required", description: "Please enter your full name." }); return; }
        if (!companyName.trim()) { toast({ variant: "destructive", title: "Company Name Required", description: "Please enter your company name." }); return; }
        if (!mobileNumber.trim()) { toast({ variant: "destructive", title: "Mobile Number Required", description: "Please enter your mobile number." }); return; }
        if (!location.trim()) { toast({ variant: "destructive", title: "Location Required", description: "Please enter your location." }); return; }
        if (accountType === 'seller' && sellerRoles.length === 0) { toast({ variant: "destructive", title: "Seller Role Required", description: "Please select at least one seller role." }); return; }
        if (accountType === 'logistics') {
          if (!logisticsType) { toast({ variant: "destructive", title: "Logistics Type Required", description: "Please select your logistics type." }); return; }
          if (!logisticsRegion.trim()) { toast({ variant: "destructive", title: "Service Region Required", description: "Please enter your primary service region." }); return; }
          if (transportModes.length === 0) { toast({ variant: "destructive", title: "Transport Modes Required", description: "Please select at least one transport mode." }); return; }
        }
        if (accountType === 'finance') {
          if (financeType.length === 0) { toast({ variant: 'destructive', title: "Finance Type Required", description: "Please select at least one finance type." }); return; }
          if (financingFor.length === 0) { toast({ variant: 'destructive', title: "Financing Options Required", description: "Please select what you provide financing for." }); return; }
          if (targetAudience.length === 0) { toast({ variant: 'destructive', title: "Target Audience Required", description: "Please select your target business segments." }); return; }
        }
        const { user: newUser, error: signUpError } = await signUp(email, password, fullName);
        if (signUpError) throw new Error(signUpError.message);
        if (!newUser) throw new Error('Failed to create user account');
        saveUserDataToStorage(newUser);
        setShowEmailConfirmationModal(true);
      } else {
        if (!email.trim()) throw new Error('Email is required');
        if (!password) throw new Error('Password is required');
        const signInError = await signIn(email, password);
        if (signInError) throw new Error(signInError.message);
        toast({ title: "Welcome back!", description: "You have been signed in successfully." });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Authentication Error", description: error.message || "An unexpected error occurred. Please try again." });
    } finally { setLoading(false); }
  };

  // --- UI: Agreement Modal ---
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
              {/* ...terms text... */}
              <h3 className="text-lg font-semibold mb-4">RobotVerse Partnership Agreement</h3>
              <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                <p><strong>1. Account Creation & Verification:</strong> By creating an account, you agree to provide accurate information and verify your email address. Your account will be activated only after email confirmation.</p>
                <p><strong>2. User Responsibilities:</strong> You are responsible for maintaining confidentiality and activities under your account.</p>
                <p><strong>3. Platform Usage:</strong> You agree to use RobotVerse marketplace in accordance with our community guidelines and applicable laws.</p>
                <p><strong>4. Data Privacy:</strong> We collect and process your personal information in accordance with our Privacy Policy.</p>
                <p><strong>5. Marketplace Terms:</strong> For sellers, you agree to provide accurate product/service descriptions.</p>
                <p><strong>6. Email Communication:</strong> By signing up, you consent to receive important account-related emails.</p>
                <p><strong>7. Account Termination:</strong> We reserve the right to suspend or terminate accounts that violate our terms of service.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 hover:bg-muted/50" onClick={handleAgreementDecline}>
                ❌ Decline
              </Button>
              <Button onClick={handleAgreementAccept} className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
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
  // --- UI: Email Confirmation Modal ---
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
              <Button onClick={() => {
                setShowEmailConfirmationModal(false);
                setIsSignUp(false);
              }}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                ✉️ I've Verified - Let me Sign In
              </Button>
              <div className="text-center">
                <button onClick={() => setShowEmailConfirmationModal(false)} className="text-sm text-primary hover:text-primary/80 transition-colors">
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
  // --- UI: Main Auth Form ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Back to Home */}
        <Link to="/" className="inline-flex items-center space-x-2 text-primary hover:text-primary/80 transition-colors mb-6 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to RobotVerse</span>
        </Link>
        <Card className="bg-card/90 backdrop-blur-lg border-border shadow-2xl">
          <CardHeader className="text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Bot className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {isResetPassword
                ? 'Set New Password'
                : isForgotPassword 
                  ? 'Reset Password' 
                  : isSignUp 
                    ? 'Join RobotVerse' 
                    : 'Welcome Back'
              }
            </CardTitle>
            <CardDescription className="text-lg mt-2">
              {isResetPassword
                ? 'Enter your new password below'
                : isForgotPassword 
                  ? 'Enter your email to receive a password reset link'
                  : isSignUp 
                    ? 'Create your account to start your robotics journey' 
                    : 'Sign in to access your robot marketplace'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={
                isResetPassword 
                  ? handlePasswordReset 
                  : isForgotPassword 
                    ? handleForgotPassword 
                    : handleSubmit
              } className="space-y-6">
              {/* Basic Info for Signup */}
              {isSignUp && !isForgotPassword && (
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
                        <Input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10" placeholder="Enter your full name" required={isSignUp} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name *</Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="companyName" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="pl-10" placeholder="Enter your company name" required={isSignUp} />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="mobileNumber">Mobile Number *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="mobileNumber" type="tel" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} className="pl-10" placeholder="Enter your mobile number" required={isSignUp}/>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="location" type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="pl-10" placeholder="Enter your location" required={isSignUp}/>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Email/Password */}
              <div className="space-y-4">
                {!isResetPassword && (
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" placeholder="Enter your email" required />
                    </div>
                  </div>
                )}
                {isResetPassword && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="newPassword" type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="pl-10 pr-12" placeholder="Enter your new password" required minLength={6}/>
                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground hover:text-foreground transition-colors">
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {newPassword && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Password strength: {newPassword.length >= 8 ? '🟢 Strong' : newPassword.length >= 6 ? '🟡 Medium' : '🔴 Weak'}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 pr-12" placeholder="Confirm your new password" required minLength={6}/>
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground hover:text-foreground transition-colors">
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {confirmPassword && newPassword !== confirmPassword && (
                        <div className="text-xs text-red-500 mt-1">❌ Passwords do not match</div>
                      )}
                    </div>
                  </>
                )}
                {!isForgotPassword && !isResetPassword && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-12" placeholder="Enter your password" required minLength={6}/>
                      <button type="button" onClick={togglePasswordVisibility} className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground hover:text-foreground transition-colors">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {password && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Password strength: {password.length >= 8 ? '🟢 Strong' : password.length >= 6 ? '🟡 Medium' : '🔴 Weak'}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* Account Type Selection */}
              {isSignUp && !isForgotPassword && (
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
              {/* Seller Field */}
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
                        <Checkbox id="robot_seller" checked={sellerRoles.includes('robot_seller')} onCheckedChange={(checked) => handleSellerRoleChange('robot_seller', !!checked)}/>
                        <div className="flex items-center gap-3 flex-1">
                          <Bot className="w-5 h-5 text-blue-600" />
                          <div>
                            <Label htmlFor="robot_seller" className="font-medium cursor-pointer">Robot Seller</Label>
                            <p className="text-xs text-muted-foreground">Sell industrial robots and automation equipment</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                        <Checkbox id="spare_parts_seller" checked={sellerRoles.includes('spare_parts_seller')} onCheckedChange={(checked) => handleSellerRoleChange('spare_parts_seller', !!checked)}/>
                        <div className="flex items-center gap-3 flex-1">
                          <Package className="w-5 h-5 text-green-600" />
                          <div>
                            <Label htmlFor="spare_parts_seller" className="font-medium cursor-pointer">Spare Parts Seller</Label>
                            <p className="text-xs text-muted-foreground">Sell robot components and spare parts</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                        <Checkbox id="service_provider" checked={sellerRoles.includes('service_provider')} onCheckedChange={(checked) => handleSellerRoleChange('service_provider', !!checked)}/>
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
              {/* Logistics Role Fields */}
              {isSignUp && accountType === 'logistics' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">Logistics Details</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type of Logistics Service *</Label>
                      <div className="border rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                        <div className="grid grid-cols-1 gap-2">
                          {[
                            'Local Delivery', 'Inter-city Transport', 'International Shipping', 'Heavy Equipment Transport',
                            'Fragile Item Handling', 'Bulk Transport', 'Express Delivery', 'Warehousing & Storage',
                            'Supply Chain Management', 'Last Mile Delivery', 'Industrial Machinery Transport',
                            'Temperature Controlled Transport', 'Hazardous Material Transport', 'White Glove Service',
                            'Installation & Setup Service', 'Port Handling', 'Duties Clearance'
                          ].map((type) => (
                            <div key={type} className="flex items-center space-x-2">
                              <Checkbox id={type} checked={logisticsType.includes(type)}
                                onCheckedChange={(checked) => {
                                  if (checked) setLogisticsType(prev => prev ? `${prev}, ${type}` : type);
                                  else setLogisticsType(prev => prev.split(', ').filter(t => t !== type).join(', '));
                                }}
                              />
                              <Label htmlFor={type} className="text-sm cursor-pointer flex-1">{type}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="logisticsRegion">Primary Service Region *</Label>
                      <Input id="logisticsRegion" value={logisticsRegion} onChange={(e) => setLogisticsRegion(e.target.value)} placeholder="e.g., North India, Maharashtra, etc." required={accountType === 'logistics'} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label>Available Transport Modes</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="flex items-center space-x-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                        <Checkbox id="road" checked={transportModes.includes('road')} onCheckedChange={(checked) => handleTransportModeChange('road', !!checked)} />
                        <Label htmlFor="road" className="font-medium cursor-pointer">🚛 Road Transport</Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                        <Checkbox id="sea" checked={transportModes.includes('sea')} onCheckedChange={(checked) => handleTransportModeChange('sea', !!checked)} />
                        <Label htmlFor="sea" className="font-medium cursor-pointer">🚢 Sea Freight</Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                        <Checkbox id="air" checked={transportModes.includes('air')} onCheckedChange={(checked) => handleTransportModeChange('air', !!checked)} />
                        <Label htmlFor="air" className="font-medium cursor-pointer">✈️ Air Cargo</Label>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                    <Checkbox id="warehouse" checked={warehouseStorage} onCheckedChange={(checked) => setWarehouseStorage(!!checked)} />
                    <div className="flex-1">
                      <Label htmlFor="warehouse" className="font-medium cursor-pointer">🏭 Warehouse & Storage Facilities</Label>
                      <p className="text-xs text-muted-foreground">We provide temporary storage and warehousing services</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label>Target Customer Segments</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-center space-x-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                        <Checkbox id="logistics_small_business" checked={targetAudience.includes('small_business')} onCheckedChange={(checked) => handleTargetAudienceChange('small_business', !!checked)} />
                        <Label htmlFor="logistics_small_business" className="font-medium cursor-pointer">🏪 Small Manufacturing Units</Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                        <Checkbox id="logistics_medium_business" checked={targetAudience.includes('medium_business')} onCheckedChange={(checked) => handleTargetAudienceChange('medium_business', !!checked)} />
                        <Label htmlFor="logistics_medium_business" className="font-medium cursor-pointer">🏭 Medium Scale Industries</Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                        <Checkbox id="logistics_large_enterprise" checked={targetAudience.includes('large_enterprise')} onCheckedChange={(checked) => handleTargetAudienceChange('large_enterprise', !!checked)} />
                        <Label htmlFor="logistics_large_enterprise" className="font-medium cursor-pointer">🏢 Large Enterprises</Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                        <Checkbox id="logistics_research" checked={targetAudience.includes('research_institutions')} onCheckedChange={(checked) => handleTargetAudienceChange('research_institutions', !!checked)} />
                        <Label htmlFor="logistics_research" className="font-medium cursor-pointer">🔬 Research Institutions</Label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Finance Fields */}
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
                        <Checkbox id="loan" checked={financeType.includes('loan')} onCheckedChange={(checked) => handleFinanceTypeChange('loan', !!checked)}/>
                        <Label htmlFor="loan" className="font-medium cursor-pointer">💰 Business Loans</Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                        <Checkbox id="lease" checked={financeType.includes('lease')} onCheckedChange={(checked) => handleFinanceTypeChange('lease', !!checked)}/>
                        <Label htmlFor="lease" className="font-medium cursor-pointer">📋 Equipment Leasing</Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                        <Checkbox id="emi" checked={financeType.includes('emi')} onCheckedChange={(checked) => handleFinanceTypeChange('emi', !!checked)}/>
                        <Label htmlFor="emi" className="font-medium cursor-pointer">💳 EMI Financing</Label>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label>Financing Available For</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="flex items-center space-x-2 p-2 border rounded bg-background">
                        <Checkbox id="robots" checked={financingFor.includes('robots')} onCheckedChange={(checked) => handleFinancingForChange('robots', !!checked)}/>
                        <Label htmlFor="robots" className="text-sm cursor-pointer">🤖 Robots</Label>
                      </div>
                      <div className="flex items-center space-x-2 p-2 border rounded bg-background">
                        <Checkbox id="parts" checked={financingFor.includes('parts')} onCheckedChange={(checked) => handleFinancingForChange('parts', !!checked)}/>
                        <Label htmlFor="parts" className="text-sm cursor-pointer">🔧 Parts</Label>
                      </div>
                      <div className="flex items-center space-x-2 p-2 border rounded bg-background">
                        <Checkbox id="setup" checked={financingFor.includes('setup')} onCheckedChange={(checked) => handleFinancingForChange('setup', !!checked)}/>
                        <Label htmlFor="setup" className="text-sm cursor-pointer">⚙️ Setup</Label>
                      </div>
                      <div className="flex items-center space-x-2 p-2 border rounded bg-background">
                        <Checkbox id="services" checked={financingFor.includes('services')} onCheckedChange={(checked) => handleFinancingForChange('services', !!checked)}/>
                        <Label htmlFor="services" className="text-sm cursor-pointer">🛠️ Services</Label>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label>Target Business Segments</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="flex items-center space-x-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                        <Checkbox id="b2b" checked={targetAudience.includes('b2b')} onCheckedChange={(checked) => handleTargetAudienceChange('b2b', !!checked)}/>
                        <Label htmlFor="b2b" className="font-medium cursor-pointer">🏢 Large Enterprises (B2B)</Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                        <Checkbox id="msme" checked={targetAudience.includes('msme')} onCheckedChange={(checked) => handleTargetAudienceChange('msme', !!checked)}/>
                        <Label htmlFor="msme" className="font-medium cursor-pointer">🏭 MSME Businesses</Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                        <Checkbox id="startup" checked={targetAudience.includes('startup')} onCheckedChange={(checked) => handleTargetAudienceChange('startup', !!checked)}/>
                        <Label htmlFor="startup" className="font-medium cursor-pointer">🚀 Startups & Scale-ups</Label>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                    <Checkbox id="government_scheme" checked={governmentSchemeSupport} onCheckedChange={(checked) => setGovernmentSchemeSupport(!!checked)} />
                    <div className="flex-1">
                      <Label htmlFor="government_scheme" className="font-medium cursor-pointer">🏛️ Government Scheme Support</Label>
                      <p className="text-xs text-muted-foreground">We assist with government subsidies and scheme applications</p>
                    </div>
                  </div>
                </div>
              )}
              {/* Submit Button */}
              <Button type="submit" className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg font-semibold shadow-lg" disabled={loading}>
                {loading ? (
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>
                      {isResetPassword
                        ? 'Updating Password...'
                        : isForgotPassword 
                          ? 'Sending Reset Link...' 
                          : isSignUp 
                            ? 'Creating Your Account...' 
                            : 'Signing You In...'
                      }
                    </span>
                  </div>
                ) : (
                  <>
                    {isResetPassword ? (<><Lock className="w-5 h-5 mr-2" />Update Password</>) 
                      : isForgotPassword ? (<><Mail className="w-5 h-5 mr-2" />Send Reset Link</>)
                      : isSignUp ? (<><Bot className="w-5 h-5 mr-2" />{agreementAccepted ? 'Create My RobotVerse Account' : 'Review Agreement & Create Account'}</>)
                      : (<><User className="w-5 h-5 mr-2" />Sign In to RobotVerse</>)
                    }
                  </>
                )}
              </Button>
            </form>
            {/* Toggle between modes */}
            <div className="mt-8 text-center space-y-3">
              {isResetPassword ? (
                <button type="button" onClick={() => {
                  setIsResetPassword(false); setIsForgotPassword(false); setIsSignUp(false); setNewPassword(''); setConfirmPassword('');
                }} className="text-primary hover:text-primary/80 transition-colors font-medium">
                  Back to Sign In
                </button>
              ) : !isForgotPassword ? (
                <>
                  <button type="button" onClick={() => {
                    setIsSignUp(!isSignUp); setAgreementAccepted(false);
                  }} className="text-primary hover:text-primary/80 transition-colors font-medium">
                    {isSignUp ? 'Already have an account? Sign in here' : "Don't have an account? Join RobotVerse"}
                  </button>
                  {!isSignUp && (
                    <div className="mt-2">
                      <button type="button" onClick={() => { setIsForgotPassword(true); setIsSignUp(false); }} className="text-muted-foreground hover:text-primary transition-colors text-sm underline">
                        Forgot your password?
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <button type="button" onClick={() => {
                  setIsForgotPassword(false); setIsSignUp(false);
                }} className="text-primary hover:text-primary/80 transition-colors font-medium">
                  Back to Sign In
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
