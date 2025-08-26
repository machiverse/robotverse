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

// Use exact types from schema
type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
type UserTypeEnum = Database['public']['Enums']['user_type_enum'];

const Auth = () => {
  // Form state
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
  
  // Hooks
  const { signUp, signIn, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Handle forgot password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        variant: "destructive",
        title: "Email Required",
        description: "Please enter your email address.",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) throw error;

      toast({
        title: "Reset Link Sent",
        description: "Check your email for the password reset link.",
      });
      setIsForgotPassword(false);
    } catch (error: any) {
      console.error('❌ Forgot password error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send reset email.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle password reset
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast({
        variant: "destructive",
        title: "Required Fields",
        description: "Please fill in both password fields.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Password Mismatch",
        description: "The passwords do not match.",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Weak Password",
        description: "Password must be at least 6 characters long.",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Password Updated",
        description: "Your password has been updated successfully. You can now sign in.",
      });
      
      // Reset the form and go back to sign in
      setIsResetPassword(false);
      setNewPassword('');
      setConfirmPassword('');
      navigate('/auth');
    } catch (error: any) {
      console.error('❌ Password reset error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update password.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      console.log('✅ User already authenticated, redirecting to home');
      navigate('/');
    }
  }, [user, navigate]);

  // Check for password reset token and signup parameter in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isReset = urlParams.get('reset');
    const isSignupMode = urlParams.get('signup');
    
    if (isReset === 'true') {
      setIsResetPassword(true);
      setIsForgotPassword(false);
      setIsSignUp(false);
    } else if (isSignupMode === 'true') {
      setIsSignUp(true);
      setIsForgotPassword(false);
      setIsResetPassword(false);
    }
  }, []);

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

  // Save user data to localStorage and sessionStorage for email confirmation flow
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
      timestamp: Date.now()
    };
    
    console.log('💾 Saving user data to storage for user:', userData.id);
    console.log('📋 Data to save:', {
      email: dataToSave.email,
      fullName: dataToSave.fullName,
      companyName: dataToSave.companyName,
      mobileNumber: dataToSave.mobileNumber,
      location: dataToSave.location,
      accountType: dataToSave.accountType,
      hasSellerRoles: dataToSave.sellerRoles?.length > 0,
      hasLogisticsType: !!dataToSave.logisticsType,
      hasFinanceType: dataToSave.financeType?.length > 0
    });
    
    // Validate required fields before saving
    if (!dataToSave.fullName || !dataToSave.companyName || !dataToSave.mobileNumber || !dataToSave.location) {
      console.error('❌ Missing required fields in user data:', {
        fullName: !!dataToSave.fullName,
        companyName: !!dataToSave.companyName,
        mobileNumber: !!dataToSave.mobileNumber,
        location: !!dataToSave.location
      });
    }
    
    // Save to both localStorage and sessionStorage for reliability
    const dataString = JSON.stringify(dataToSave);
    localStorage.setItem('robotverse_pending_profile', dataString);
    sessionStorage.setItem('robotverse_pending_profile', dataString);
    
    // Also save to a backup key with user ID
    localStorage.setItem(`robotverse_profile_${userData.id}`, dataString);
    sessionStorage.setItem(`robotverse_profile_${userData.id}`, dataString);
    
    console.log('✅ User data saved to storage for email confirmation');
  };

  // Load user data from storage after email confirmation (with fallbacks)
  const loadUserDataFromStorage = (userId?: string) => {
    console.log('📥 Loading saved user data from storage...');
    
    // Try multiple storage locations
    let saved = localStorage.getItem('robotverse_pending_profile') || 
                sessionStorage.getItem('robotverse_pending_profile');
    
    // If no general data found, try user-specific key
    if (!saved && userId) {
      saved = localStorage.getItem(`robotverse_profile_${userId}`) ||
              sessionStorage.getItem(`robotverse_profile_${userId}`);
    }
    
    if (saved) {
      try {
        const data = JSON.parse(saved);
        console.log('✅ Found saved data:', data);
        return data;
      } catch (error) {
        console.error('❌ Error parsing saved data:', error);
        return null;
      }
    }
    
    console.log('⚠️ No saved user data found in storage');
    return null;
  };

  // Clear saved user data after successful profile creation
  const clearSavedUserData = (userId?: string) => {
    localStorage.removeItem('robotverse_pending_profile');
    sessionStorage.removeItem('robotverse_pending_profile');
    
    if (userId) {
      localStorage.removeItem(`robotverse_profile_${userId}`);
      sessionStorage.removeItem(`robotverse_profile_${userId}`);
    }
    
    console.log('🗑️ Cleared saved user data from storage');
  };

  // Check for email confirmation on component mount and auth state changes
  useEffect(() => {
    const checkEmailConfirmation = async () => {
      console.log('🔍 Checking email confirmation...');
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (currentUser && currentUser.email_confirmed_at) {
        console.log('📧 Email confirmed for user:', currentUser.id);
        
        // Check if profile already exists
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', currentUser.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('❌ Error checking existing profile:', profileError);
          return;
        }

        const savedData = loadUserDataFromStorage(currentUser.id);
        console.log('💾 Saved data from storage:', savedData);
        console.log('📋 Existing profile:', existingProfile);

        // Always check if profile is incomplete
        const isIncomplete = !existingProfile || 
                           !existingProfile.registration_complete || 
                           !existingProfile.company_name || 
                           !existingProfile.mobile_number ||
                           !existingProfile.location;

        // If we have saved data for this user
        if (savedData && savedData.userId === currentUser.id) {
          try {
            if (existingProfile && isIncomplete) {
              console.log('🔄 Updating incomplete profile with saved data...');
              await updateUserProfileFromSavedData(currentUser, savedData);
              clearSavedUserData(currentUser.id);
              
              toast({
                title: "Welcome to RobotVerse!",
                description: "Your account has been verified and profile updated successfully.",
              });
              
              setTimeout(() => navigate('/dashboard'), 1000);
            } else if (!existingProfile) {
              // Create new profile
              console.log('🆕 Creating new profile from saved data...');
              await createUserProfileFromSavedData(currentUser, savedData);
              clearSavedUserData(currentUser.id);
              
              toast({
                title: "Welcome to RobotVerse!",
                description: "Your account has been verified and profile created successfully.",
              });
              
              setTimeout(() => navigate('/dashboard'), 1000);
            } else {
              console.log('✅ Profile already complete, clearing saved data');
              clearSavedUserData(currentUser.id);
            }
          } catch (error: any) {
            console.error('❌ Error handling profile after email confirmation:', error);
            
            toast({
              variant: "destructive",
              title: "Profile Setup Error", 
              description: `Failed to complete your profile setup: ${error.message}. Please try completing your profile manually.`,
            });
            
            // Don't clear saved data in case of error - user might need to retry
            setTimeout(() => navigate('/dashboard'), 2000);
          }
        } else if (isIncomplete) {
          // No saved data but user needs to complete profile
          console.log('⚠️ No saved data found for confirmed user, redirecting to complete registration');
          
          toast({
            title: "Complete Your Profile",
            description: "Please complete your profile information to continue.",
          });
          
          // Show signup form to complete profile
          setIsSignUp(true);
          setEmail(currentUser.email || '');
        }
      }
    };

    checkEmailConfirmation();

    // Also listen for auth state changes to catch email confirmations
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
        console.log('🔄 Auth state change detected: user signed in with confirmed email');
        await checkEmailConfirmation();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Update existing profile with complete data
  const updateUserProfileFromSavedData = async (user: SupabaseUser, savedData: any) => {
    try {
      console.log('👤 Updating profile from saved data for user:', user.id);
      console.log('📋 Saved data:', JSON.stringify(savedData, null, 2));
      
      // Use the database function to update the complete profile
      const { data: profileId, error: dbError } = await supabase.rpc('complete_user_profile', {
        p_user_id: user.id,
        p_email: savedData.email || user.email,
        p_full_name: savedData.fullName || null,
        p_company_name: savedData.companyName || null,
        p_mobile_number: savedData.mobileNumber || null,
        p_location: savedData.location || null,
        p_user_type: savedData.accountType || 'buyer',
        p_account_type: savedData.accountType || 'buyer',
        p_seller_roles: savedData.sellerRoles?.length > 0 ? savedData.sellerRoles : [],
        p_logistics_type: savedData.logisticsType || null,
        p_logistics_region: savedData.logisticsRegion || null,
        p_transport_modes: savedData.transportModes?.length > 0 ? savedData.transportModes : [],
        p_warehouse_storage: savedData.warehouseStorage || false,
        p_finance_type: savedData.financeType?.length > 0 ? savedData.financeType : [],
        p_financing_for: savedData.financingFor?.length > 0 ? savedData.financingFor : [],
        p_target_audience: savedData.targetAudience?.length > 0 ? savedData.targetAudience : [],
        p_government_scheme_support: savedData.governmentSchemeSupport || false
      });

      if (dbError) {
        console.error('❌ Database function error:', dbError);
        throw new Error(dbError.message);
      }

      console.log('✅ Profile updated successfully with ID:', profileId);
      return profileId;

    } catch (error: any) {
      console.error('❌ Profile update exception:', error);
      throw error;
    }
  };

  // Create new profile using the database function  
  const createUserProfileFromSavedData = async (user: SupabaseUser, savedData: any) => {
    try {
      console.log('👤 Creating complete profile from saved data for user:', user.id);
      console.log('📋 Profile data to save:', {
        email: savedData.email,
        fullName: savedData.fullName,
        companyName: savedData.companyName,
        mobileNumber: savedData.mobileNumber,
        location: savedData.location,
        accountType: savedData.accountType
      });
      
      // Validate required data
      if (!savedData.fullName) {
        throw new Error('Full name is required but missing from saved data');
      }
      if (!savedData.companyName) {
        throw new Error('Company name is required but missing from saved data');
      }
      if (!savedData.mobileNumber) {
        throw new Error('Mobile number is required but missing from saved data');
      }
      if (!savedData.location) {
        throw new Error('Location is required but missing from saved data');
      }
      
      // Use the database function to create/update the complete profile
      const { data: profileId, error: dbError } = await supabase.rpc('complete_user_profile', {
        p_user_id: user.id,
        p_email: savedData.email || user.email,
        p_full_name: savedData.fullName,
        p_company_name: savedData.companyName,
        p_mobile_number: savedData.mobileNumber,
        p_location: savedData.location,
        p_user_type: savedData.accountType || 'buyer',
        p_account_type: savedData.accountType || 'buyer',
        p_seller_roles: savedData.sellerRoles?.length > 0 ? savedData.sellerRoles : [],
        p_logistics_type: savedData.logisticsType || null,
        p_logistics_region: savedData.logisticsRegion || null,
        p_transport_modes: savedData.transportModes?.length > 0 ? savedData.transportModes : [],
        p_warehouse_storage: savedData.warehouseStorage || false,
        p_finance_type: savedData.financeType?.length > 0 ? savedData.financeType : [],
        p_financing_for: savedData.financingFor?.length > 0 ? savedData.financingFor : [],
        p_target_audience: savedData.targetAudience?.length > 0 ? savedData.targetAudience : [],
        p_government_scheme_support: savedData.governmentSchemeSupport || false
      });

      if (dbError) {
        console.error('❌ Database function error:', dbError);
        throw new Error(`Database error: ${dbError.message}`);
      }

      console.log('✅ Profile created successfully with ID:', profileId);
      
      // Verify the profile was created correctly
      const { data: verifyProfile, error: verifyError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (verifyError) {
        console.error('❌ Error verifying created profile:', verifyError);
      } else {
        console.log('✅ Profile verification successful:', {
          hasCompanyName: !!verifyProfile.company_name,
          hasMobileNumber: !!verifyProfile.mobile_number,
          hasLocation: !!verifyProfile.location,
          registrationComplete: verifyProfile.registration_complete
        });
      }
      
      return profileId;
      
    } catch (error: any) {
      console.error('❌ Error creating profile from saved data:', error);
      throw error;
    }
  };

  // Handle agreement acceptance
  const handleAgreementAccept = () => {
    setAgreementAccepted(true);
    setShowAgreementModal(false);
    console.log('✅ Agreement accepted, proceeding with signup');  
  };

  // Handle agreement decline
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

  // Form submission with validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.log('🚀 Form submission started');

    try {
      if (isSignUp) {
        // Show agreement modal first if not accepted
        if (!agreementAccepted) {
          setLoading(false);
          setShowAgreementModal(true);
          return;
        }

        console.log('📝 Registration process initiated');
        console.log('📋 Form data before validation:');
        console.log('  - Email:', email);
        console.log('  - Full Name:', fullName);
        console.log('  - Company Name:', companyName);
        console.log('  - Mobile Number:', mobileNumber);
        console.log('  - Location:', location);
        console.log('  - Account Type:', accountType);
        console.log('  - Seller Roles:', sellerRoles);
        console.log('  - Logistics Type:', logisticsType);
        console.log('  - Logistics Region:', logisticsRegion);
        console.log('  - Transport Modes:', transportModes);
        console.log('  - Warehouse Storage:', warehouseStorage);
        console.log('  - Finance Type:', financeType);
        console.log('  - Financing For:', financingFor);
        console.log('  - Target Audience:', targetAudience);
        console.log('  - Government Scheme Support:', governmentSchemeSupport);
        
        // Comprehensive validation
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
          console.log('🚚 Validating logistics provider data...');
          if (!logisticsType) {
            console.log('❌ Logistics type missing');
            toast({
              variant: "destructive",
              title: "Logistics Type Required",
              description: "Please select your logistics type.",
            });
            return;
          }
          if (!logisticsRegion.trim()) {
            console.log('❌ Logistics region missing');
            toast({
              variant: "destructive",
              title: "Service Region Required",
              description: "Please enter your primary service region.",
            });
            return;
          }
          if (transportModes.length === 0) {
            console.log('❌ Transport modes missing');
            toast({
              variant: "destructive",
              title: "Transport Modes Required",
              description: "Please select at least one transport mode.",
            });
            return;
          }
          console.log('✅ Logistics provider validation passed');
        }

        if (accountType === 'finance') {
          console.log('💰 Validating finance provider data...');
          if (financeType.length === 0) {
            console.log('❌ Finance type missing');
            toast({
              variant: "destructive",
              title: "Finance Type Required",
              description: "Please select at least one finance type.",
            });
            return;
          }
          if (financingFor.length === 0) {
            console.log('❌ Financing for options missing');
            toast({
              variant: "destructive",
              title: "Financing Options Required",
              description: "Please select what you provide financing for.",
            });
            return;
          }
          if (targetAudience.length === 0) {
            console.log('❌ Target audience missing');
            toast({
              variant: "destructive",
              title: "Target Audience Required",
              description: "Please select your target business segments.",
            });
            return;
          }
          console.log('✅ Finance provider validation passed');
        }

        console.log('✅ All validation passed, creating user account...');

        // Create user account with email confirmation
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

        // Save user data for after email confirmation
        saveUserDataToStorage(newUser);

        // Show email confirmation modal
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

  // Agreement Modal Component
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

  // Email Confirmation Modal Component
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
              {/* Basic Information Section - Only for Sign Up */}
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
                {/* Email Field - Show for all modes except reset password */}
                {!isResetPassword && (
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
                )}
                
                {/* Reset Password Fields */}
                {isResetPassword && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="pl-10 pr-12"
                          placeholder="Enter your new password"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showNewPassword ? "Hide password" : "Show password"}
                        >
                          {showNewPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
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
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pl-10 pr-12"
                          placeholder="Confirm your new password"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {confirmPassword && newPassword !== confirmPassword && (
                        <div className="text-xs text-red-500 mt-1">
                          ❌ Passwords do not match
                        </div>
                      )}
                    </div>
                  </>
                )}
                
                {/* Password Field with Show/Hide Toggle - Hidden for Forgot Password and Reset Password */}
                {!isForgotPassword && !isResetPassword && (
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
                )}
              </div>

              {/* Account Type Selection - Only for Sign Up */}
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
                            <p className="text-xs text-muted-foreground">Provide installation, maintenance, and repair services</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Logistics Provider Configuration */}
              {isSignUp && accountType === 'logistics' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">Logistics Services</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Logistics Type *</Label>
                      <Select value={logisticsType} onValueChange={setLogisticsType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select logistics type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3pl">Third-Party Logistics (3PL)</SelectItem>
                          <SelectItem value="freight_forwarder">Freight Forwarder</SelectItem>
                          <SelectItem value="courier">Courier & Express</SelectItem>
                          <SelectItem value="warehouse">Warehousing & Storage</SelectItem>
                          <SelectItem value="integrated">Integrated Logistics</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="logisticsRegion">Primary Service Region *</Label>
                      <Input
                        id="logisticsRegion"
                        value={logisticsRegion}
                        onChange={(e) => setLogisticsRegion(e.target.value)}
                        placeholder="e.g., North India, Maharashtra, Pan India"
                        required={isSignUp && accountType === 'logistics'}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Transport Modes (Select all that apply) *</Label>
                    <div className="text-xs text-muted-foreground mb-2">
                      Selected modes ({transportModes.length}): {transportModes.join(', ') || 'None'}
                    </div>
                    <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg bg-muted/20">
                      {[
                        { id: 'road', label: '🚛 Road Transport', desc: 'Trucks, trailers, local delivery' },
                        { id: 'rail', label: '🚂 Rail Transport', desc: 'Heavy cargo, long distance' },
                        { id: 'air', label: '✈️ Air Freight', desc: 'Express, time-critical shipments' },
                        { id: 'sea', label: '🚢 Sea Freight', desc: 'International, bulk cargo' },
                        { id: 'multimodal', label: '🔄 Multimodal', desc: 'Combined transport solutions' },
                        { id: 'last_mile', label: '📦 Last Mile', desc: 'Final delivery to customer' }
                      ].map((mode) => (
                        <div key={mode.id} className="flex items-start space-x-3 p-2 border rounded bg-background hover:bg-muted/50 transition-colors">
                          <Checkbox
                            id={mode.id}
                            checked={transportModes.includes(mode.id)}
                            onCheckedChange={(checked) => handleTransportModeChange(mode.id, !!checked)}
                          />
                          <div className="flex-1">
                            <Label htmlFor={mode.id} className="font-medium cursor-pointer text-sm">{mode.label}</Label>
                            <p className="text-xs text-muted-foreground">{mode.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                    <Checkbox
                      id="warehouse_storage"
                      checked={warehouseStorage}
                      onCheckedChange={(checked) => setWarehouseStorage(!!checked)}
                    />
                    <div className="flex-1">
                      <Label htmlFor="warehouse_storage" className="font-medium cursor-pointer">🏭 Warehouse & Storage Services</Label>
                      <p className="text-xs text-muted-foreground">We provide warehousing and storage facilities</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Finance Provider Configuration */}
              {isSignUp && accountType === 'finance' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">Financial Services</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Finance Types (Select all that apply) *</Label>
                      <div className="text-xs text-muted-foreground mb-2">
                        Selected types ({financeType.length}): {financeType.join(', ') || 'None'}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border rounded-lg bg-muted/20">
                        {[
                          { id: 'equipment_loans', label: '🏭 Equipment Loans', desc: 'Financing for robot purchases' },
                          { id: 'lease_financing', label: '📄 Lease Financing', desc: 'Equipment leasing solutions' },
                          { id: 'working_capital', label: '💰 Working Capital', desc: 'Business operations funding' },
                          { id: 'trade_finance', label: '🔄 Trade Finance', desc: 'Import/export financing' },
                          { id: 'project_finance', label: '🏗️ Project Finance', desc: 'Large automation projects' },
                          { id: 'sme_loans', label: '🏢 SME Loans', desc: 'Small business financing' }
                        ].map((type) => (
                          <div key={type.id} className="flex items-start space-x-3 p-2 border rounded bg-background hover:bg-muted/50 transition-colors">
                            <Checkbox
                              id={type.id}
                              checked={financeType.includes(type.id)}
                              onCheckedChange={(checked) => handleFinanceTypeChange(type.id, !!checked)}
                            />
                            <div className="flex-1">
                              <Label htmlFor={type.id} className="font-medium cursor-pointer text-sm">{type.label}</Label>
                              <p className="text-xs text-muted-foreground">{type.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Financing For (Select all that apply) *</Label>
                      <div className="text-xs text-muted-foreground mb-2">
                        Selected options ({financingFor.length}): {financingFor.join(', ') || 'None'}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border rounded-lg bg-muted/20">
                        {[
                          { id: 'new_robots', label: '🤖 New Robots', desc: 'Brand new automation equipment' },
                          { id: 'used_robots', label: '♻️ Used Robots', desc: 'Pre-owned robotic systems' },
                          { id: 'spare_parts', label: '🔧 Spare Parts', desc: 'Components and accessories' },
                          { id: 'maintenance', label: '🛠️ Maintenance', desc: 'Service and repair costs' },
                          { id: 'training', label: '📚 Training', desc: 'Employee skill development' },
                          { id: 'installation', label: '⚙️ Installation', desc: 'Setup and commissioning' }
                        ].map((option) => (
                          <div key={option.id} className="flex items-start space-x-3 p-2 border rounded bg-background hover:bg-muted/50 transition-colors">
                            <Checkbox
                              id={option.id}
                              checked={financingFor.includes(option.id)}
                              onCheckedChange={(checked) => handleFinancingForChange(option.id, !!checked)}
                            />
                            <div className="flex-1">
                              <Label htmlFor={option.id} className="font-medium cursor-pointer text-sm">{option.label}</Label>
                              <p className="text-xs text-muted-foreground">{option.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Target Business Segments (Select all that apply) *</Label>
                      <div className="text-xs text-muted-foreground mb-2">
                        Selected segments ({targetAudience.length}): {targetAudience.join(', ') || 'None'}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border rounded-lg bg-muted/20">
                        {[
                          { id: 'sme', label: '🏭 SME Manufacturing', desc: 'Small & medium enterprises' },
                          { id: 'large_enterprise', label: '🏢 Large Enterprises', desc: 'Established corporations' },
                          { id: 'automotive', label: '🚗 Automotive Sector', desc: 'Auto manufacturers & suppliers' },
                          { id: 'electronics', label: '📱 Electronics', desc: 'Consumer & industrial electronics' },
                          { id: 'pharma', label: '💊 Pharmaceutical', desc: 'Healthcare & pharma companies' },
                          { id: 'startup', label: '🚀 Startups', desc: 'Early-stage companies' }
                        ].map((segment) => (
                          <div key={segment.id} className="flex items-start space-x-3 p-2 border rounded bg-background hover:bg-muted/50 transition-colors">
                            <Checkbox
                              id={segment.id}
                              checked={targetAudience.includes(segment.id)}
                              onCheckedChange={(checked) => handleTargetAudienceChange(segment.id, !!checked)}
                            />
                            <div className="flex-1">
                              <Label htmlFor={segment.id} className="font-medium cursor-pointer text-sm">{segment.label}</Label>
                              <p className="text-xs text-muted-foreground">{segment.desc}</p>
                            </div>
                          </div>
                        ))}
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
                    {isResetPassword ? (
                      <>
                        <Lock className="w-5 h-5 mr-2" />
                        Update Password
                      </>
                    ) : isForgotPassword ? (
                      <>
                        <Mail className="w-5 h-5 mr-2" />
                        Send Reset Link
                      </>
                    ) : isSignUp ? (
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
            
            {/* Toggle between Sign Up, Sign In, Forgot Password, and Reset Password */}
            <div className="mt-8 text-center space-y-3">
              {isResetPassword ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsResetPassword(false);
                    setIsForgotPassword(false);
                    setIsSignUp(false);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  Back to Sign In
                </button>
              ) : !isForgotPassword ? (
                <>
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
                  
                  {!isSignUp && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setIsSignUp(false);
                        }}
                        className="text-muted-foreground hover:text-primary transition-colors text-sm underline"
                      >
                        Forgot your password?
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setIsSignUp(false);
                  }}
                  className="text-primary hover:text-primary/80 transition-colors font-medium"
                >
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