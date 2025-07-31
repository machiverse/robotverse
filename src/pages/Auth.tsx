import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Bot,
  Mail,
  Lock,
  User,
  ArrowLeft,
  Building,
  Phone,
  MapPin,
  Truck,
  CreditCard,
  Package,
  Settings,
  ShoppingCart,
  Eye,
  EyeOff,
  FileText,
  CheckCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Use exact types from your Supabase schema
type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
type UserTypeEnum = Database['public']['Enums']['user_type_enum'];

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
  const [agreementAccepted, setAgreementAccepted] = useState(false);

  // Hooks
  const { signUp, signIn, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Handlers for multi-select checkboxes
  const handleSellerRoleChange = (role: string, checked: boolean) => {
    if (checked) {
      setSellerRoles(prev => [...prev, role]);
    } else {
      setSellerRoles(prev => prev.filter(r => r !== role));
    }
  };

  const handleTransportModeChange = (mode: string, checked: boolean) => {
    if (checked) {
      setTransportModes(prev => [...prev, mode]);
    } else {
      setTransportModes(prev => prev.filter(m => m !== mode));
    }
  };

  const handleFinanceTypeChange = (type: string, checked: boolean) => {
    if (checked) {
      setFinanceType(prev => [...prev, type]);
    } else {
      setFinanceType(prev => prev.filter(t => t !== type));
    }
  };

  const handleFinancingForChange = (type: string, checked: boolean) => {
    if (checked) {
      setFinancingFor(prev => [...prev, type]);
    } else {
      setFinancingFor(prev => prev.filter(t => t !== type));
    }
  };

  const handleTargetAudienceChange = (audience: string, checked: boolean) => {
    if (checked) {
      setTargetAudience(prev => [...prev, audience]);
    } else {
      setTargetAudience(prev => prev.filter(a => a !== audience));
    }
  };

  // Save profile data to localStorage to handle email confirmation flow
  const saveUserDataToStorage = (userData: SupabaseUser) => {
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
      timestamp: Date.now(),
    };
    localStorage.setItem('robotverse_pending_profile', JSON.stringify(dataToSave));
  };

  const loadUserDataFromStorage = () => {
    const saved = localStorage.getItem('robotverse_pending_profile');
    if (saved) {
      return JSON.parse(saved);
    }
    return null;
  };

  const clearSavedUserData = () => {
    localStorage.removeItem('robotverse_pending_profile');
  };

  // Check email confirmation and create/update profile accordingly
  useEffect(() => {
    const checkEmailConfirmation = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser && currentUser.email_confirmed_at) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('registration_complete, company_name, mobile_number')
          .eq('user_id', currentUser.id)
          .single();

        const savedData = loadUserDataFromStorage();

        if (savedData && savedData.userId === currentUser.id) {
          if (existingProfile) {
            if (!existingProfile.registration_complete || !existingProfile.company_name || !existingProfile.mobile_number) {
              try {
                await updateUserProfileFromSavedData(currentUser, savedData);
                clearSavedUserData();
                toast({
                  title: "Welcome to RobotVerse!",
                  description: "Your account has been verified and profile updated successfully.",
                });
                navigate('/dashboard');
              } catch (error) {
                toast({
                  variant: "destructive",
                  title: "Profile Update Error",
                  description: "Failed to update your profile. Please try again.",
                });
              }
            } else {
              clearSavedUserData();
            }
          } else {
            try {
              await createUserProfile(currentUser);
              clearSavedUserData();
              toast({
                title: "Welcome to RobotVerse!",
                description: "Your account has been verified and profile created successfully.",
              });
              navigate('/dashboard');
            } catch (error) {
              toast({
                variant: "destructive",
                title: "Profile Creation Error",
                description: "Failed to create your profile. Please try again.",
              });
            }
          }
        }
      }
    };

    checkEmailConfirmation();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
        await checkEmailConfirmation();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  // Update existing profile
  const updateUserProfileFromSavedData = async (user: SupabaseUser, savedData: any) => {
    const profileData: Partial<ProfileInsert> = {
      company_name: savedData.companyName || null,
      mobile_number: savedData.mobileNumber || null,
      phone: savedData.mobileNumber || null,
      location: savedData.location || null,
      user_type: savedData.accountType || null,
      account_type: savedData.accountType || null,
      updated_at: new Date().toISOString(),
      registration_complete: true,
      mou_agreed: true,
      mou_agreed_at: new Date().toISOString(),
    };

    if (savedData.accountType === 'seller') {
      profileData.seller_roles = savedData.sellerRoles?.length > 0 ? savedData.sellerRoles : null;
      profileData.user_roles = savedData.sellerRoles?.length > 0 ? savedData.sellerRoles : ['robot_seller'];
      profileData.primary_user_type = savedData.sellerRoles?.[0] as UserTypeEnum || 'robot_seller';
      profileData.primary_role = savedData.sellerRoles?.[0] || 'robot_seller';

      if (savedData.sellerRoles?.includes('service_provider')) {
        profileData.service_categories = ['maintenance', 'repair', 'installation'];
      }
    } else if (savedData.accountType === 'logistics') {
      profileData.logistics_type = savedData.logisticsType || null;
      profileData.logistics_region = savedData.logisticsRegion || null;
      profileData.transport_modes = savedData.transportModes?.length > 0 ? savedData.transportModes : null;
      profileData.warehouse_storage = savedData.warehouseStorage || null;
      profileData.primary_user_type = 'logistics_provider';
      profileData.primary_role = 'logistics_provider';
      profileData.user_roles = ['logistics_provider'];
      profileData.target_audience = savedData.targetAudience?.length > 0 ? savedData.targetAudience : null;
    } else if (savedData.accountType === 'finance') {
      profileData.finance_type = savedData.financeType?.length > 0 ? savedData.financeType : null;
      profileData.financing_for = savedData.financingFor?.length > 0 ? savedData.financingFor : null;
      profileData.target_audience = savedData.targetAudience?.length > 0 ? savedData.targetAudience : null;
      profileData.government_scheme_support = savedData.governmentSchemeSupport || null;
      profileData.primary_user_type = 'finance_provider';
      profileData.primary_role = 'finance_provider';
      profileData.user_roles = ['finance_provider'];
    } else if (savedData.accountType === 'buyer') {
      profileData.primary_user_type = 'buyer';
      profileData.primary_role = 'buyer';
      profileData.user_roles = ['buyer'];
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('user_id', user.id)
      .select();

    if (error) {
      throw new Error(error.message);
    }
    return data;
  };

  // Create profile on signup
  const createUserProfile = async (user: SupabaseUser) => {
    const profileData: ProfileInsert = {
      user_id: user.id,
      email: user.email || email,
      full_name: fullName || null,
      company_name: companyName || null,
      mobile_number: mobileNumber || null,
      phone: mobileNumber || null,
      location: location || null,
      user_type: accountType || null,
      account_type: accountType || null,
      updated_at: new Date().toISOString(),
      registration_complete: true,
      mou_agreed: true,
      mou_agreed_at: new Date().toISOString(),
      avatar_url: null,
    };

    if (accountType === 'seller') {
      profileData.seller_roles = sellerRoles.length > 0 ? sellerRoles : null;
      profileData.user_roles = sellerRoles.length > 0 ? sellerRoles : ['robot_seller'];
      profileData.primary_user_type = (sellerRoles[0] as UserTypeEnum) || 'robot_seller';
      profileData.primary_role = sellerRoles[0] || 'robot_seller';

      if (sellerRoles.includes('service_provider')) {
        profileData.service_categories = ['maintenance', 'repair', 'installation'];
      }
    } else if (accountType === 'logistics') {
      profileData.logistics_type = logisticsType || null;
      profileData.logistics_region = logisticsRegion || null;
      profileData.transport_modes = transportModes.length > 0 ? transportModes : null;
      profileData.warehouse_storage = warehouseStorage || null;
      profileData.primary_user_type = 'logistics_provider';
      profileData.primary_role = 'logistics_provider';
      profileData.user_roles = ['logistics_provider'];
      profileData.target_audience = targetAudience.length > 0 ? targetAudience : null;
    } else if (accountType === 'finance') {
      profileData.finance_type = financeType.length > 0 ? financeType : null;
      profileData.financing_for = financingFor.length > 0 ? financingFor : null;
      profileData.target_audience = targetAudience.length > 0 ? targetAudience : null;
      profileData.government_scheme_support = governmentSchemeSupport || null;
      profileData.primary_user_type = 'finance_provider';
      profileData.primary_role = 'finance_provider';
      profileData.user_roles = ['finance_provider'];
    } else if (accountType === 'buyer') {
      profileData.primary_user_type = 'buyer';
      profileData.primary_role = 'buyer';
      profileData.user_roles = ['buyer'];
    }

    const { data, error } = await supabase
      .from('profiles')
      .insert(profileData)
      .select();

    if (error) {
      throw error;
    }
    return data;
  };

  const handleAgreementAccept = () => {
    setAgreementAccepted(true);
    setShowAgreementModal(false);
  };

  const handleAgreementDecline = () => {
    setShowAgreementModal(false);
    setAgreementAccepted(false);
    toast({
      variant: 'destructive',
      title: 'Agreement Required',
      description: 'You must accept the agreement to create an account.',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        if (!agreementAccepted) {
          setShowAgreementModal(true);
          setLoading(false);
          return;
        }

        if (!email.trim()) throw new Error('Email is required');
        if (!password || password.length < 6) throw new Error('Password must be at least 6 characters');
        if (!accountType) {
          toast({
            variant: 'destructive',
            title: 'Account Type Required',
            description: 'Please select an account type to continue.',
          });
          setLoading(false);
          return;
        }
        if (!fullName.trim()) {
          toast({
            variant: 'destructive',
            title: 'Full Name Required',
            description: 'Please enter your full name.',
          });
          setLoading(false);
          return;
        }
        if (!companyName.trim()) {
          toast({
            variant: 'destructive',
            title: 'Company Name Required',
            description: 'Please enter your company name.',
          });
          setLoading(false);
          return;
        }
        if (!mobileNumber.trim()) {
          toast({
            variant: 'destructive',
            title: 'Mobile Number Required',
            description: 'Please enter your mobile number.',
          });
          setLoading(false);
          return;
        }
        if (!location.trim()) {
          toast({
            variant: 'destructive',
            title: 'Location Required',
            description: 'Please enter your location.',
          });
          setLoading(false);
          return;
        }
        if (accountType === 'seller' && sellerRoles.length === 0) {
          toast({
            variant: 'destructive',
            title: 'Seller Role Required',
            description: 'Please select at least one seller role.',
          });
          setLoading(false);
          return;
        }
        if (accountType === 'logistics') {
          if (!logisticsType) {
            toast({
              variant: 'destructive',
              title: 'Logistics Type Required',
              description: 'Please select your logistics type.',
            });
            setLoading(false);
            return;
          }
          if (!logisticsRegion.trim()) {
            toast({
              variant: 'destructive',
              title: 'Service Region Required',
              description: 'Please enter your primary service region.',
            });
            setLoading(false);
            return;
          }
        }
        if (accountType === 'finance' && financeType.length === 0) {
          toast({
            variant: 'destructive',
            title: 'Finance Type Required',
            description: 'Please select at least one finance type.',
          });
          setLoading(false);
          return;
        }

        const { user: newUser, error: signUpError } = await signUp(email, password, fullName);

        if (signUpError) {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (currentUser) {
            await createUserProfile(currentUser);
            toast({
              title: 'Account Created Successfully!',
              description: 'Your profile has been saved. You can start using RobotVerse immediately.',
            });
            navigate('/dashboard');
            return;
          } else {
            throw new Error('Failed to create account. Please try again.');
          }
        }

        if (!newUser) {
          throw new Error('Failed to create user account');
        }

        await createUserProfile(newUser);
        saveUserDataToStorage(newUser);

        toast({
          title: 'Account Created Successfully!',
          description: 'Your account registration is complete.',
        });

        navigate('/dashboard');
      } else {
        // Sign In flow
        if (!email.trim()) throw new Error('Email is required');
        if (!password) throw new Error('Password is required');
        const signInError = await signIn(email, password);
        if (signInError) {
          throw new Error(signInError.message);
        }
        toast({
          title: 'Welcome back!',
          description: 'You have been signed in successfully.',
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: error.message || 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
      {/* Agreement Modal */}
      {showAgreementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <Card className="max-w-xl w-full p-4">
            <CardHeader>
              <CardTitle>Terms & Conditions Agreement</CardTitle>
              <CardDescription>Please review and accept our terms to create your RobotVerse account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-h-72 overflow-auto">
              {/* Put your Terms content here */}
              <p>By creating an account, you agree to our terms...</p>
            </CardContent>
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" onClick={handleAgreementDecline}>Decline</Button>
              <Button onClick={handleAgreementAccept}>Accept & Continue</Button>
            </div>
          </Card>
        </div>
      )}

      <div className="w-full max-w-2xl">
        <Link to="/" className="inline-flex items-center space-x-2 text-primary hover:text-primary/80 transition-colors mb-6 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform"/>
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
              {isSignUp ? 'Create your account to start your robotics journey' : 'Sign in to access your robot marketplace'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {isSignUp && (
                <>
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                    </div>
                    <div>
                      <Label htmlFor="companyName">Company Name *</Label>
                      <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                    </div>
                    <div>
                      <Label htmlFor="mobileNumber">Mobile Number *</Label>
                      <Input id="mobileNumber" type="tel" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} required />
                    </div>
                    <div>
                      <Label htmlFor="location">Location *</Label>
                      <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} required />
                    </div>
                  </div>

                  {/* Account Type */}
                  <div>
                    <Label>Select Your Account Type *</Label>
                    <Select value={accountType} onValueChange={(value) => setAccountType(value as any)}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Choose your account type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="buyer">Buyer</SelectItem>
                        <SelectItem value="seller">Seller</SelectItem>
                        <SelectItem value="logistics">Logistics Partner</SelectItem>
                        <SelectItem value="finance">Finance Provider</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Seller Roles */}
                  {accountType === 'seller' && (
                    <div>
                      <Label>Seller Roles *</Label>
                      <div className="flex flex-wrap gap-3 mt-2">
                        {['robot_seller', 'spare_parts_seller', 'service_provider'].map(role => (
                          <div key={role} className="flex items-center space-x-2">
                            <Checkbox
                              id={role}
                              checked={sellerRoles.includes(role)}
                              onCheckedChange={checked => handleSellerRoleChange(role, !!checked)}
                            />
                            <Label htmlFor={role}>{role.replace(/_/g, ' ')}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Logistics Fields */}
                  {accountType === 'logistics' && (
                    <>
                      <div>
                        <Label>Type of Logistics Service *</Label>
                        <Select value={logisticsType} onValueChange={setLogisticsType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select logistics type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="local">Local Delivery</SelectItem>
                            <SelectItem value="interstate">Interstate Transport</SelectItem>
                            <SelectItem value="international">International Shipping</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Primary Service Region *</Label>
                        <Input
                          id="logisticsRegion"
                          value={logisticsRegion}
                          onChange={(e) => setLogisticsRegion(e.target.value)}
                          required={accountType === 'logistics'}
                        />
                      </div>

                      <div>
                        <Label>Available Transport Modes</Label>
                        <div className="flex flex-wrap gap-3 mt-2">
                          {['road', 'sea', 'air'].map(mode => (
                            <div key={mode} className="flex items-center space-x-2">
                              <Checkbox
                                id={mode}
                                checked={transportModes.includes(mode)}
                                onCheckedChange={checked => handleTransportModeChange(mode, !!checked)}
                              />
                              <Label htmlFor={mode}>{mode.charAt(0).toUpperCase() + mode.slice(1)}</Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="warehouseStorage"
                          checked={warehouseStorage}
                          onCheckedChange={setWarehouseStorage}
                        />
                        <Label htmlFor="warehouseStorage">Warehouse & Storage Facilities</Label>
                      </div>
                    </>
                  )}

                  {/* Finance Fields */}
                  {accountType === 'finance' && (
                    <>
                      <div>
                        <Label>Types of Financial Services Offered *</Label>
                        <div className="flex flex-wrap gap-3 mt-2">
                          {['loan', 'lease', 'emi'].map(finType => (
                            <div key={finType} className="flex items-center space-x-2">
                              <Checkbox
                                id={finType}
                                checked={financeType.includes(finType)}
                                onCheckedChange={checked => handleFinanceTypeChange(finType, !!checked)}
                              />
                              <Label htmlFor={finType}>{finType.toUpperCase()}</Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label>Financing Available For</Label>
                        <div className="flex flex-wrap gap-3 mt-2">
                          {['robots', 'parts', 'setup', 'services'].map(finFor => (
                            <div key={finFor} className="flex items-center space-x-2">
                              <Checkbox
                                id={finFor}
                                checked={financingFor.includes(finFor)}
                                onCheckedChange={checked => handleFinancingForChange(finFor, !!checked)}
                              />
                              <Label htmlFor={finFor}>{finFor.charAt(0).toUpperCase() + finFor.slice(1)}</Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label>Target Business Segments</Label>
                        <div className="flex flex-wrap gap-3 mt-2">
                          {['b2b', 'msme', 'startup'].map(aud => (
                            <div key={aud} className="flex items-center space-x-2">
                              <Checkbox
                                id={aud}
                                checked={targetAudience.includes(aud)}
                                onCheckedChange={checked => handleTargetAudienceChange(aud, !!checked)}
                              />
                              <Label htmlFor={aud}>{aud.toUpperCase()}</Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="governmentSchemeSupport"
                          checked={governmentSchemeSupport}
                          onCheckedChange={setGovernmentSchemeSupport}
                        />
                        <Label htmlFor="governmentSchemeSupport">Government Scheme Support</Label>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Email/Password */}
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <div>
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <Button type="submit" className="w-full h-12 text-lg font-semibold" disabled={loading}>
                {loading ? (
                  <span>Loading...</span>
                ) : (
                  <>
                    {isSignUp ? <><Bot className="inline-block mr-2" />Create My RobotVerse Account</> : <><User className="inline-block mr-2" />Sign In to RobotVerse</>}
                  </>
                )}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setAgreementAccepted(false);
                }}
                className="text-primary hover:text-primary/80 transition-colors font-medium"
              >
                {isSignUp ? 'Already have an account? Sign in here' : "Don't have an account? Join RobotVerse"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
