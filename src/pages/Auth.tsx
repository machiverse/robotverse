import {
  useState,
  useEffect,
  useCallback
} from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bot,
  User,
  Mail,
  Lock,
  Building,
  Phone,
  MapPin,
  ArrowLeft,
  Package,
  Truck,
  CreditCard,
  ShoppingCart,
  Eye,
  EyeOff,
  FileText,
  CheckCircle,
  Settings,
  Plus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
type UserTypeEnum = Database['public']['Enums']['user_type_enum'];

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand',
  'Karnataka','Kerala','Madhya Pradesh','Maharashtra','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli',
  'Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'
];

const SERVICE_TYPE_OPTIONS = [
  'Installation',
  'Maintenance',
  'Repair',
  'Inspection',
  'Calibration',
  'Training',
  'Upgrades',
  'Consulting'
];

const Auth = () => {
  // Form states
  const [isSignUp, setIsSignUp] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [location, setLocation] = useState('');

  const [accountType, setAccountType] = useState<'buyer' | 'seller' | 'logistics' | 'finance' | ''>('');
  const [sellerRoles, setSellerRoles] = useState<string[]>([]);

  // Logistics fields
  const [logisticsType, setLogisticsType] = useState('');
  const [logisticsRegion, setLogisticsRegion] = useState('');
  const [transportModes, setTransportModes] = useState<string[]>([]);
  const [warehouseStorage, setWarehouseStorage] = useState(false);

  // Finance fields
  const [financeType, setFinanceType] = useState<string[]>([]);
  const [financingFor, setFinancingFor] = useState<string[]>([]);
  const [targetAudience, setTargetAudience] = useState<string[]>([]);
  const [governmentSchemeSupport, setGovernmentSchemeSupport] = useState(false);

  // UI states
  const [loading, setLoading] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [showEmailConfirmationModal, setShowEmailConfirmationModal] = useState(false);

  const { user, signUp, signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if logged in
  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  // Toggle password visibility
  const togglePasswordVisibility = () => setShowPassword(prev => !prev);

  // Handler functions for checkbox toggles
  const toggleArrayValue = (arr: string[], val: string) =>
    arr.includes(val)
      ? arr.filter(v => v !== val)
      : [...arr, val];

  const handleSellerRoleChange = (role: string, checked: boolean) => {
    setSellerRoles(prev => checked ? [...prev, role] : prev.filter(r => r !== role));
  };
  const handleTransportModeChange = (mode: string, checked: boolean) => {
    setTransportModes(prev => checked ? [...prev, mode] : prev.filter(m => m !== mode));
  };
  const handleFinanceTypeChange = (type: string, checked: boolean) => {
    setFinanceType(prev => checked ? [...prev, type] : prev.filter(t => t !== type));
  };
  const handleFinancingForChange = (val: string, checked: boolean) => {
    setFinancingFor(prev => checked ? [...prev, val] : prev.filter(f => f !== val));
  };
  const handleTargetAudienceChange = (val: string, checked: boolean) => {
    setTargetAudience(prev => checked ? [...prev, val] : prev.filter(a => a !== val));
  };

  // Save form data temporarily to localStorage before email confirmation
  const saveUserDataToStorage = (savedUser: SupabaseUser) => {
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
      userId: savedUser.id,
      timestamp: Date.now()
    };
    localStorage.setItem('robotverse_pending_profile', JSON.stringify(dataToSave));
    console.log('User data saved to localStorage for post-confirmation processing.');
  };

  // Load saved user data from localStorage after confirmation
  const loadUserDataFromStorage = () => {
    const saved = localStorage.getItem('robotverse_pending_profile');
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  };

  // Clear saved data
  const clearSavedUserData = () => localStorage.removeItem('robotverse_pending_profile');

  // Signup / Signin form submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        if (!agreementAccepted) {
          setLoading(false);
          setShowAgreementModal(true);
          return;
        }

        // Basic validation
        if (!email.trim()) throw new Error('Email is required');
        if (!password || password.length < 6) throw new Error('Password must be at least 6 characters');
        if (!accountType) throw new Error('Please select an account type');
        if (!fullName.trim()) throw new Error('Full name is required');
        if (!companyName.trim()) throw new Error('Company name is required');
        if (!mobileNumber.trim()) throw new Error('Mobile number is required');
        if (!location.trim()) throw new Error('Location is required');
        if (accountType === 'seller' && sellerRoles.length === 0) throw new Error('Select at least one seller role');
        if (accountType === 'logistics' && (!logisticsType || !logisticsRegion.trim())) throw new Error('Logistics details are required');
        if (accountType === 'finance' && financeType.length === 0) throw new Error('Select at least one finance type');

        // Call signUp function provided by auth context
        const { user: newUser, error } = await signUp(email, password, fullName);
        if (error) throw error;
        if (!newUser) throw new Error('Failed to create user');

        // Save data to localStorage pending email confirmation
        saveUserDataToStorage(newUser);
        setShowEmailConfirmationModal(true);

      } else {
        // Signin flow
        if (!email.trim()) throw new Error('Email is required');
        if (!password) throw new Error('Password is required');

        const error = await signIn(email, password);
        if (error) throw error;

        toast({ title: "Welcome back!", description: "Successfully signed in" });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Authentication failed',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Agreement modal acceptance and decline handlers
  const handleAgreementAccept = () => {
    setAgreementAccepted(true);
    setShowAgreementModal(false);
  };
  const handleAgreementDecline = () => {
    setShowAgreementModal(false);
    toast({
      title: 'Agreement Required',
      description: 'You must accept the terms and conditions to proceed',
      variant: 'destructive'
    });
  };

  // Toggle password visibility
  const togglePassword = () => setShowPassword(v => !v);

  // Switch between Sign Up + Login modes
  const switchMode = () => {
    setIsSignUp(v => !v);
    // Reset agreement when switching
    setAgreementAccepted(false);
  };

  // Agreement Modal JSX
  if (showAgreementModal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
        <Card className="w-full max-w-xl backdrop-blur-lg bg-card/90 rounded-lg border border-border shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto my-4 w-16 h-16 flex items-center justify-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-lg">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">Terms and Conditions</CardTitle>
            <CardDescription>Please accept our terms and conditions to create your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto border rounded p-4 bg-muted/50 mb-4">
              <p><strong>1. Account Creation:</strong> Provide accurate data and check your email.</p>
              <p><strong>2. Responsibilities:</strong> Keep your account credentials safe.</p>
              <p><strong>3. Usage:</strong> Follow laws and guidelines; no fraudulent activity.</p>
              <p><strong>4. Privacy:</strong> We respect your data privacy as per policy.</p>
              <p><strong>5. Marketplace Terms:</strong> Products/services and purchasing rules apply.</p>
              <p><strong>6. Email:</strong> You consent to receiving notification emails.</p>
              <p><strong>7. Termination:</strong> Accounts may be suspended for violations.</p>
            </div>
            <div className="flex gap-4">
              <Button variant="outline" className="flex-1" onClick={handleAgreementDecline}>Decline</Button>
              <Button className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" onClick={handleAgreementAccept}>Accept & Continue</Button>
            </div>
            <p className="text-center text-xs pt-4 text-muted-foreground">Acceptance triggers a verification email.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Email Confirmation Modal JSX
  if (showEmailConfirmationModal) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
        <Card className="max-w-md w-full bg-card/90 backdrop-blur-lg border border-border rounded-lg shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto my-6 w-20 h-20 flex items-center justify-center bg-gradient-to-r from-green-600 to-blue-600 rounded-full shadow-lg">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold">Confirm Your Email</CardTitle>
            <CardDescription className="mb-6">A verification link was sent to <strong>{email}</strong>.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-6 text-center text-sm text-muted-foreground">Please check your inbox and click the link to activate your account.</p>
            <Button onClick={() => {
              setShowEmailConfirmationModal(false);
              setIsSignUp(false); // Switch to login
            }} className="w-full">
              I've Verified - Sign In
            </Button>
            <button onClick={() => setShowEmailConfirmationModal(false)} className="mt-4 w-full text-center text-sm text-primary hover:text-primary/80">
              Close & Continue Later
            </button>
            <p className="mt-6 text-center text-xs space-y-1 text-muted-foreground">
              <span>• Check spam if email not found</span>
              <span>• Link expires in 24hrs</span>
              <span>• Profile info saved until confirmation</span>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Auth Form JSX
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <Link to="/" className="inline-flex items-center mb-6 text-primary hover:text-primary/80 group transition-colors">
          <ArrowLeft className="mr-2 w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span>Back to RobotVerse</span>
        </Link>

        <Card className="p-8 bg-card/90 backdrop-blur-lg border border-border rounded-lg shadow-lg">
          <CardHeader className="text-center mb-6">
            <div className="mx-auto w-20 h-20 p-4 rounded-full flex items-center justify-center bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg">
              <Bot className="w-12 h-12 text-white" />
            </div>
            <CardTitle className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              {isSignUp ? 'Join RobotVerse' : 'Welcome Back'}
            </CardTitle>
            <CardDescription className="mt-2 text-lg">
              {isSignUp ? 'Create your RobotVerse account' : 'Sign in to your RobotVerse account'}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {isSignUp && (
              <>
                <div>
                  <Label htmlFor="fullName" className="mb-1 block font-semibold">Full Name *</Label>
                  <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="companyName" className="mb-1 block font-semibold">Company Name *</Label>
                  <Input id="companyName" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="mobileNumber" className="mb-1 block font-semibold">Mobile Number *</Label>
                  <Input id="mobileNumber" type="tel" value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="location" className="mb-1 block font-semibold">Location *</Label>
                  <Input id="location" value={location} onChange={e => setLocation(e.target.value)} required />
                </div>
              </>
            )}

            <div>
              <Label htmlFor="email" className="mb-1 block font-semibold">Email Address *</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>

            <div>
              <Label htmlFor="password" className="mb-1 block font-semibold">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={togglePassword}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>

            {isSignUp && (
              <div>
                <Label htmlFor="accountType" className="mb-1 block font-semibold">Account Type *</Label>
                <Select id="accountType" value={accountType} onValueChange={value => setAccountType(value as any)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Account Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buyer">Buyer</SelectItem>
                    <SelectItem value="seller">Seller</SelectItem>
                    <SelectItem value="logistics">Logistics</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Seller roles selection if seller */}
            {isSignUp && accountType === 'seller' && (
              <div>
                <Label className="mb-1 block font-semibold">Seller Roles</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'robot_seller', label: 'Robot Seller' },
                    { id: 'spare_parts_seller', label: 'Spare Parts Seller' },
                    { id: 'service_provider', label: 'Service Provider' }
                  ].map(({ id, label }) => (
                    <Checkbox
                      key={id}
                      id={id}
                      checked={sellerRoles.includes(id)}
                      onCheckedChange={(checked) => {
                        if (checked) setSellerRoles([...sellerRoles, id]);
                        else setSellerRoles(sellerRoles.filter(r => r !== id));
                      }}
                      label={label}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Logistics inputs */}
            {isSignUp && accountType === 'logistics' && (
              <div>
                <Label className="mb-1 block font-semibold">Logistics Info</Label>
                <Select
                  value={logisticsType}
                  onValueChange={v => setLogisticsType(v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select Logistics Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Local Delivery</SelectItem>
                    <SelectItem value="interstate">Interstate Transport</SelectItem>
                    <SelectItem value="international">International Shipping</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Service Region"
                  value={logisticsRegion}
                  onChange={e => setLogisticsRegion(e.target.value)}
                  className="mt-2"
                />
                <Label className="block mt-4 font-semibold">Transport Modes</Label>
                <div className="grid grid-cols-3 gap-2">
                  {['road', 'sea', 'air'].map(mode => (
                    <Checkbox
                      key={mode}
                      id={mode}
                      checked={transportModes.includes(mode)}
                      onCheckedChange={checked =>
                        checked
                          ? setTransportModes([...transportModes, mode])
                          : setTransportModes(transportModes.filter(m => m !== mode))
                      }
                      label={mode.charAt(0).toUpperCase() + mode.slice(1)}
                    />
                  ))}
                </div>
                <Checkbox
                  checked={warehouseStorage}
                  onCheckedChange={setWarehouseStorage}
                  label="Warehouse & Storage"
                  className="mt-4"
                />
              </div>
            )}

            {/* Finance inputs */}
            {isSignUp && accountType === 'finance' && (
              <div>
                <Label className="mb-1 block font-semibold">Finance Services</Label>
                <Label>Finance Types</Label>
                <div className="grid grid-cols-3 gap-2">
                  {['loan', 'lease', 'emi'].map(type => (
                    <Checkbox
                      key={type}
                      id={type}
                      checked={financeType.includes(type)}
                      onCheckedChange={checked =>
                        checked
                          ? setFinanceType([...financeType, type])
                          : setFinanceType(financeType.filter(t => t !== type))
                      }
                      label={type.toUpperCase()}
                    />
                  ))}
                </div>
                <Label className="mt-4">Financing For</Label>
                <div className="grid grid-cols-2 gap-2">
                  {['robots', 'parts', 'setup', 'services'].map(finance => (
                    <Checkbox
                      key={finance}
                      id={finance}
                      checked={financingFor.includes(finance)}
                      onCheckedChange={checked =>
                        checked
                          ? setFinancingFor([...financingFor, finance])
                          : setFinancingFor(financingFor.filter(f => f !== finance))
                      }
                      label={finance.charAt(0).toUpperCase() + finance.slice(1)}
                    />
                  ))}
                </div>
                <Label className="mt-4">Target Audience</Label>
                <div className="grid grid-cols-3 gap-2">
                  {['b2b', 'msme', 'startup'].map(audience => (
                    <Checkbox
                      key={audience}
                      id={audience}
                      checked={targetAudience.includes(audience)}
                      onCheckedChange={checked =>
                        checked
                          ? setTargetAudience([...targetAudience, audience])
                          : setTargetAudience(targetAudience.filter(t => t !== audience))
                      }
                      label={audience.toUpperCase()}
                    />
                  ))}
                </div>
                <Checkbox
                  checked={governmentSchemeSupport}
                  onCheckedChange={setGovernmentSchemeSupport}
                  label="Government Scheme Support"
                  className="mt-4"
                />
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full mt-8 h-12 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              {loading
                ? (isSignUp ? 'Creating Account...' : 'Signing In...')
                : (isSignUp ? 'Create RobotVerse Account' : 'Sign In')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={switchMode}
              className="text-primary hover:text-primary/80 transition-colors font-medium"
              aria-label="Switch authentication mode"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Join RobotVerse"}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
