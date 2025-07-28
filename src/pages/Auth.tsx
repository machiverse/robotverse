import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Mail, Lock, User, ArrowLeft, Building, Phone, MapPin, Truck, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import ServiceCategorySelector from '@/components/ServiceCategorySelector';

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [location, setLocation] = useState('');
  const [accountType, setAccountType] = useState<'buyer' | 'seller' | 'logistics' | 'finance' | ''>('');
  const [sellerRoles, setSellerRoles] = useState<string[]>([]);
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);
  const [showServiceCategorySelector, setShowServiceCategorySelector] = useState(false);
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

  const handleSellerRoleChange = (role: string, checked: boolean) => {
    if (checked) {
      const newRoles = [...sellerRoles, role];
      setSellerRoles(newRoles);
      
      // If service provider is selected, show service category selector
      if (role === 'service_provider') {
        setShowServiceCategorySelector(true);
      }
    } else {
      setSellerRoles(sellerRoles.filter(r => r !== role));
      
      // If service provider is deselected, clear service categories
      if (role === 'service_provider') {
        setServiceCategories([]);
      }
    }
  };

  const handleServiceCategoriesSelect = (categories: string[]) => {
    setServiceCategories(categories);
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

  const updateUserProfile = async (userId: string) => {
    const profileData: any = {
      user_id: userId,
      full_name: fullName,
      company_name: companyName,
      mobile_number: mobileNumber,
      location: location,
      account_type: accountType,
    };

    if (accountType === 'seller') {
      profileData.seller_roles = sellerRoles;
      if (sellerRoles.includes('service_provider')) {
        profileData.service_categories = serviceCategories;
      }
    } else if (accountType === 'logistics') {
      profileData.logistics_type = logisticsType;
      profileData.logistics_region = logisticsRegion;
      profileData.transport_modes = transportModes;
      profileData.warehouse_storage = warehouseStorage;
    } else if (accountType === 'finance') {
      profileData.finance_type = financeType;
      profileData.financing_for = financingFor;
      profileData.target_audience = targetAudience;
      profileData.government_scheme_support = governmentSchemeSupport;
    }

    const { error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let result;
      if (isSignUp) {
        if (!accountType) {
          toast({
            variant: "destructive",
            title: "Account Type Required",
            description: "Please select an account type to continue.",
          });
          setLoading(false);
          return;
        }

        result = await signUp(email, password, fullName);
        
        if (!result.error) {
          // Get the user from the auth result
          const { data: { user: newUser } } = await supabase.auth.getUser();
          
          if (newUser) {
            await updateUserProfile(newUser.id);
            setShowMouModal(true);
          }
        }
      } else {
        result = await signIn(email, password);
      }

      if (result.error) {
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: result.error.message || "An error occurred during authentication.",
        });
      } else if (isSignUp && !showMouModal) {
        toast({
          title: "Account Created!",
          description: "Please check your email to verify your account.",
        });
      }
    } catch (error: any) {
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
            mou_agreed_at: new Date().toISOString()
          })
          .eq('user_id', currentUser.id);

        if (error) throw error;

        toast({
          title: "Welcome to RobotVerse!",
          description: "Your account has been successfully created.",
        });
        
        setShowMouModal(false);
        navigate('/');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to complete registration. Please try again.",
      });
    }
  };

  if (showMouModal) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card/80 backdrop-blur-lg border-border">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Bot className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">MOU Agreement</CardTitle>
            <CardDescription>
              Please review and accept our partnership terms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                By proceeding, you agree to the RobotVerse MOU terms and partnership agreement. 
                This includes our community guidelines, data usage policies, and marketplace terms.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1">
                📄 Read Agreement
              </Button>
              <Button 
                onClick={handleMouAgreement}
                className="flex-1"
              >
                ✔️ Agree & Proceed
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Back to Home */}
        <Link 
          to="/" 
          className="inline-flex items-center space-x-2 text-primary hover:text-primary-glow transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to RobotVerse</span>
        </Link>

        <Card className="bg-card/80 backdrop-blur-lg border-border">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Bot className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">
              {isSignUp ? 'Join RobotVerse' : 'Welcome Back'}
            </CardTitle>
            <CardDescription>
              {isSignUp 
                ? 'Create your account to start trading robots' 
                : 'Sign in to access your robot marketplace'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Common Fields */}
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
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
              )}

              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
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
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
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
                <Label htmlFor="password">Password</Label>
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

              {isSignUp && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="mobileNumber">Mobile Number</Label>
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
                    <Label htmlFor="location">Location</Label>
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

                  <div className="space-y-2">
                    <Label>Account Type</Label>
                    <Select value={accountType} onValueChange={(value: any) => setAccountType(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose account type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="buyer">👥 Buyer</SelectItem>
                        <SelectItem value="seller">🏭 Seller</SelectItem>
                        <SelectItem value="logistics">🚚 Logistics Partner</SelectItem>
                        <SelectItem value="finance">💰 Loan/Finance Provider</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Seller Role Logic */}
                  {accountType === 'seller' && (
                    <div className="space-y-2">
                      <Label>Seller Roles (Select all that apply)</Label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="robot_seller"
                            checked={sellerRoles.includes('robot_seller')}
                            onCheckedChange={(checked) => handleSellerRoleChange('robot_seller', !!checked)}
                          />
                          <Label htmlFor="robot_seller">Robot Seller</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="spare_parts_seller"
                            checked={sellerRoles.includes('spare_parts_seller')}
                            onCheckedChange={(checked) => handleSellerRoleChange('spare_parts_seller', !!checked)}
                          />
                          <Label htmlFor="spare_parts_seller">Spare Parts Seller</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="service_provider"
                            checked={sellerRoles.includes('service_provider')}
                            onCheckedChange={(checked) => handleSellerRoleChange('service_provider', !!checked)}
                          />
                          <Label htmlFor="service_provider">Service/Installation Provider</Label>
                         </div>
                       </div>
                     </div>
                   )}

                   {/* Service Category Selector Modal */}
                   <ServiceCategorySelector
                     open={showServiceCategorySelector}
                     onClose={() => setShowServiceCategorySelector(false)}
                     onConfirm={handleServiceCategoriesSelect}
                     selectedCategories={serviceCategories}
                   />

                   {/* Show selected service categories */}
                   {sellerRoles.includes('service_provider') && serviceCategories.length > 0 && (
                     <div className="space-y-2">
                       <Label>Selected Service Categories</Label>
                       <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/50">
                         {serviceCategories.map((category) => (
                           <span 
                             key={category} 
                             className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md"
                           >
                             {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                           </span>
                         ))}
                       </div>
                       <Button 
                         type="button"
                         variant="outline" 
                         size="sm" 
                         onClick={() => setShowServiceCategorySelector(true)}
                       >
                         Modify Categories
                       </Button>
                     </div>
                   )}

                   {/* Logistics Partner Fields */}
                  {accountType === 'logistics' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Type of Logistics</Label>
                        <Select value={logisticsType} onValueChange={setLogisticsType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select logistics type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="local">Local</SelectItem>
                            <SelectItem value="interstate">Interstate</SelectItem>
                            <SelectItem value="international">International</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="logisticsRegion">Region of Service</Label>
                        <Input
                          id="logisticsRegion"
                          value={logisticsRegion}
                          onChange={(e) => setLogisticsRegion(e.target.value)}
                          placeholder="Enter service region"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Transport Modes</Label>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="road"
                              checked={transportModes.includes('road')}
                              onCheckedChange={(checked) => handleTransportModeChange('road', !!checked)}
                            />
                            <Label htmlFor="road">Road</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="sea"
                              checked={transportModes.includes('sea')}
                              onCheckedChange={(checked) => handleTransportModeChange('sea', !!checked)}
                            />
                            <Label htmlFor="sea">Sea</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="air"
                              checked={transportModes.includes('air')}
                              onCheckedChange={(checked) => handleTransportModeChange('air', !!checked)}
                            />
                            <Label htmlFor="air">Air</Label>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="warehouse"
                          checked={warehouseStorage}
                          onCheckedChange={(checked) => setWarehouseStorage(!!checked)}
                        />
                        <Label htmlFor="warehouse">Warehouse or Storage Options Available</Label>
                      </div>
                    </div>
                  )}

                  {/* Finance Provider Fields */}
                  {accountType === 'finance' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Type of Service</Label>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="loan"
                              checked={financeType.includes('loan')}
                              onCheckedChange={(checked) => handleFinanceTypeChange('loan', !!checked)}
                            />
                            <Label htmlFor="loan">Loan</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="lease"
                              checked={financeType.includes('lease')}
                              onCheckedChange={(checked) => handleFinanceTypeChange('lease', !!checked)}
                            />
                            <Label htmlFor="lease">Lease</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="emi"
                              checked={financeType.includes('emi')}
                              onCheckedChange={(checked) => handleFinanceTypeChange('emi', !!checked)}
                            />
                            <Label htmlFor="emi">EMI</Label>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Financing For</Label>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="robots"
                              checked={financingFor.includes('robots')}
                              onCheckedChange={(checked) => handleFinancingForChange('robots', !!checked)}
                            />
                            <Label htmlFor="robots">Robots</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="parts"
                              checked={financingFor.includes('parts')}
                              onCheckedChange={(checked) => handleFinancingForChange('parts', !!checked)}
                            />
                            <Label htmlFor="parts">Parts</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="setup"
                              checked={financingFor.includes('setup')}
                              onCheckedChange={(checked) => handleFinancingForChange('setup', !!checked)}
                            />
                            <Label htmlFor="setup">Setup</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="services"
                              checked={financingFor.includes('services')}
                              onCheckedChange={(checked) => handleFinancingForChange('services', !!checked)}
                            />
                            <Label htmlFor="services">Services</Label>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Target Audience</Label>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="b2b"
                              checked={targetAudience.includes('b2b')}
                              onCheckedChange={(checked) => handleTargetAudienceChange('b2b', !!checked)}
                            />
                            <Label htmlFor="b2b">B2B</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="msme"
                              checked={targetAudience.includes('msme')}
                              onCheckedChange={(checked) => handleTargetAudienceChange('msme', !!checked)}
                            />
                            <Label htmlFor="msme">MSME</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="startup"
                              checked={targetAudience.includes('startup')}
                              onCheckedChange={(checked) => handleTargetAudienceChange('startup', !!checked)}
                            />
                            <Label htmlFor="startup">Startup</Label>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="government_scheme"
                          checked={governmentSchemeSupport}
                          onCheckedChange={(checked) => setGovernmentSchemeSupport(!!checked)}
                        />
                        <Label htmlFor="government_scheme">Government Scheme Support Available</Label>
                      </div>
                    </div>
                  )}
                </>
              )}
              
              <Button 
                type="submit" 
                variant="hero" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                    <span>{isSignUp ? 'Creating Account...' : 'Signing In...'}</span>
                  </div>
                ) : (
                  isSignUp ? 'Create Account' : 'Sign In'
                )}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary hover:text-primary-glow transition-colors text-sm"
              >
                {isSignUp 
                  ? 'Already have an account? Sign in' 
                  : "Don't have an account? Sign up"
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