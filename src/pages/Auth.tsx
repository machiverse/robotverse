import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Eye, EyeOff, ArrowLeft, Building2, User, Wrench, Truck, CreditCard, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [userType, setUserType] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [isResendingConfirmation, setIsResendingConfirmation] = useState(false);
  const [showConfirmationMessage, setShowConfirmationMessage] = useState(false);
  const [pendingUserEmail, setPendingUserEmail] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (user && !authLoading) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, location]);

  const validateForm = () => {
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Email and password are required",
        variant: "destructive",
      });
      return false;
    }

    if (isSignUp) {
      if (!firstName || !lastName || !phoneNumber || !userType) {
        toast({
          title: "Error",
          description: "All fields are required for registration",
          variant: "destructive",
        });
        return false;
      }

      if (password !== confirmPassword) {
        toast({
          title: "Error",
          description: "Passwords do not match",
          variant: "destructive",
        });
        return false;
      }

      if (password.length < 6) {
        toast({
          title: "Error",
          description: "Password must be at least 6 characters long",
          variant: "destructive",
        });
        return false;
      }

      if (!agreementAccepted) {
        toast({
          title: "Error",
          description: "You must accept the terms and conditions to proceed",
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              phone_number: phoneNumber,
              company_name: companyName,
              user_type: userType,
            },
          },
        });

        if (error) throw error;

        if (data.user && !data.user.email_confirmed_at) {
          setShowConfirmationMessage(true);
          setPendingUserEmail(email);
          toast({
            title: "Check your email",
            description: "We've sent you a confirmation link. Please check your email to complete registration.",
          });
        }
      } else {
        await handleSignIn(e);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Signed in successfully!",
      });

      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!pendingUserEmail) return;
    
    setIsResendingConfirmation(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: pendingUserEmail,
      });

      if (error) throw error;

      toast({
        title: "Email sent",
        description: "Confirmation email has been resent. Please check your inbox.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsResendingConfirmation(false);
    }
  };

  const getUserTypeIcon = (type: string) => {
    switch (type) {
      case 'robot_seller':
        return <Building2 className="w-4 h-4" />;
      case 'robot_buyer':
        return <User className="w-4 h-4" />;
      case 'service_provider':
        return <Wrench className="w-4 h-4" />;
      case 'logistics_provider':
        return <Truck className="w-4 h-4" />;
      case 'finance_provider':
        return <CreditCard className="w-4 h-4" />;
      case 'admin':
        return <Shield className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getUserTypeLabel = (type: string) => {
    switch (type) {
      case 'robot_seller':
        return 'Robot Seller';
      case 'robot_buyer':
        return 'Robot Buyer';
      case 'service_provider':
        return 'Service Provider';
      case 'logistics_provider':
        return 'Logistics Provider';
      case 'finance_provider':
        return 'Finance Provider';
      case 'admin':
        return 'Administrator';
      default:
        return 'Select Role';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (showConfirmationMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">
              Check Your Email
            </CardTitle>
            <CardDescription>
              We've sent a confirmation link to <strong>{pendingUserEmail}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-gray-600">
              <p>Click the link in your email to complete your registration.</p>
              <p className="mt-2">Didn't receive the email? Check your spam folder or request a new one.</p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleResendConfirmation}
              disabled={isResendingConfirmation}
              className="w-full"
            >
              {isResendingConfirmation ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                'Resend Confirmation Email'
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowConfirmationMessage(false);
                setPendingUserEmail('');
              }}
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sign In
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </CardTitle>
          <CardDescription>
            {isSignUp 
              ? 'Join RoboVerse and connect with the robotics community'
              : 'Sign in to your RoboVerse account'
            }
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
              />
            </div>

            {isSignUp && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name (Optional)</Label>
                  <Input
                    id="companyName"
                    type="text"
                    placeholder="Enter your company name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userType">Role</Label>
                  <Select value={userType} onValueChange={setUserType} required>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select your role">
                        {userType && (
                          <div className="flex items-center gap-2">
                            {getUserTypeIcon(userType)}
                            <span>{getUserTypeLabel(userType)}</span>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="robot_seller">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          <span>Robot Seller</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="robot_buyer">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>Robot Buyer</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="service_provider">
                        <div className="flex items-center gap-2">
                          <Wrench className="w-4 h-4" />
                          <span>Service Provider</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="logistics_provider">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4" />
                          <span>Logistics Provider</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="finance_provider">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          <span>Finance Provider</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {isSignUp && (
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="agreement"
                  checked={agreementAccepted}
                  onCheckedChange={(checked) => setAgreementAccepted(checked as boolean)}
                />
                <Label htmlFor="agreement" className="text-sm leading-5">
                  I agree to the{' '}
                  <a href="#" className="text-primary hover:underline">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-primary hover:underline">
                    Privacy Policy
                  </a>
                </Label>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {isSignUp ? 'Creating Account...' : 'Signing In...'}
                </>
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </Button>
            <div className="text-center text-sm text-gray-600">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setAgreementAccepted(false);
                }}
                className="text-primary hover:text-primary/80 transition-colors font-medium"
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Auth;
