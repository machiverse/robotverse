import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Shield, CheckCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import EnhancedHeader from '@/components/EnhancedHeader';

const ResetPassword = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check if user has a valid recovery session for password reset
  useEffect(() => {
    const checkRecoverySession = async () => {
      try {
        console.log('🔍 Starting password reset session validation...');
        
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const type = urlParams.get('type');
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');
        const tokenHash = urlParams.get('token_hash');
        
        console.log('🔍 URL Parameters:', { 
          type, 
          hasAccessToken: !!accessToken, 
          hasRefreshToken: !!refreshToken,
          hasTokenHash: !!tokenHash,
          fullURL: window.location.href
        });
        
        // Must be a recovery flow
        if (type !== 'recovery') {
          console.log('❌ Not a recovery flow, redirecting to auth');
          toast({
            variant: "destructive", 
            title: "Invalid Reset Link",
            description: "This page can only be accessed through a password reset email link.",
          });
          navigate('/auth');
          return;
        }
        
        // Handle token hash (for newer Supabase versions)
        if (tokenHash && !accessToken) {
          console.log('🔐 Using token hash for verification...');
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery'
          });
          
          if (error) {
            console.error('❌ Token hash verification failed:', error);
            toast({
              variant: "destructive",
              title: "Invalid Reset Link",
              description: "The password reset link is invalid or has expired. Please request a new one.",
            });
            navigate('/auth');
            return;
          }
          
          console.log('✅ Token hash verification successful');
          return;
        }
        
        // Handle access token (for older Supabase versions)
        if (accessToken && refreshToken) {
          console.log('🔐 Setting session with access token...');
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (error) {
            console.error('❌ Error setting recovery session:', error);
            toast({
              variant: "destructive",
              title: "Invalid Reset Link",
              description: "The password reset link is invalid or has expired. Please request a new one.",
            });
            navigate('/auth');
            return;
          }
          
          console.log('✅ Recovery session set successfully');
          return;
        }
        
        // Check if we already have a valid recovery session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          console.log('❌ No valid session found for recovery');
          toast({
            variant: "destructive",
            title: "Invalid Reset Link", 
            description: "The password reset link is invalid or has expired. Please request a new one.",
          });
          navigate('/auth');
          return;
        }
        
        console.log('✅ Valid recovery session found');
        
      } catch (error) {
        console.error('❌ Recovery session check failed:', error);
        toast({
          variant: "destructive",
          title: "Invalid Reset Link",
          description: "The password reset link is invalid or has expired. Please request a new one.",
        });
        navigate('/auth');
      }
    };
    
    checkRecoverySession();
  }, [navigate, toast]);

  const validatePasswords = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters long';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePasswords()) return;
    
    setLoading(true);
    try {
      console.log('🔐 Updating user password...');
      
      const { data, error } = await supabase.auth.updateUser({
        password: formData.newPassword
      });
      
      if (error) {
        console.error('❌ Password update error:', error);
        throw error;
      }
      
      console.log('✅ Password updated successfully');
      
      setSuccess(true);
      toast({
        title: "Password Updated Successfully",
        description: "Your password has been updated. You can now sign in with your new password.",
      });
      
      // Clear form
      setFormData({
        newPassword: '',
        confirmPassword: ''
      });
      
      // Clear any saved session data
      localStorage.clear();
      sessionStorage.clear();
      
      // Sign out the user after password reset to force fresh login
      await supabase.auth.signOut({ scope: 'global' });
      
      // Redirect to sign in after a delay
      setTimeout(() => {
        console.log('🔄 Redirecting to auth page...');
        navigate('/auth');
      }, 3000);
      
    } catch (error: any) {
      console.error('❌ Password reset error:', error);
      
      let errorMessage = "Failed to update password. Please try again.";
      
      if (error.message?.includes('session')) {
        errorMessage = "Your reset session has expired. Please request a new password reset link.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    if (strength <= 2) return { level: 'weak', color: 'bg-red-500', text: 'Weak' };
    if (strength <= 4) return { level: 'medium', color: 'bg-yellow-500', text: 'Medium' };
    return { level: 'strong', color: 'bg-green-500', text: 'Strong' };
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);

  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle className="text-2xl text-green-600">Password Updated!</CardTitle>
                <CardDescription>
                  Your password has been successfully updated. You will be redirected to the sign-in page shortly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => navigate('/auth')} 
                  className="w-full"
                >
                  Sign In Now
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">Set New Password</CardTitle>
              <CardDescription>
                Enter your new password below. Make sure it's strong and secure.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordReset} className="space-y-4">
                {/* New Password */}
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={formData.newPassword}
                      onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                      className={errors.newPassword ? 'border-red-500' : ''}
                      placeholder="Enter your new password"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {formData.newPassword && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                            style={{ width: `${(passwordStrength.level === 'weak' ? 33 : passwordStrength.level === 'medium' ? 66 : 100)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${
                          passwordStrength.level === 'weak' ? 'text-red-500' : 
                          passwordStrength.level === 'medium' ? 'text-yellow-500' : 'text-green-500'
                        }`}>
                          {passwordStrength.text}
                        </span>
                      </div>
                    </div>
                  )}
                  {errors.newPassword && (
                    <p className="text-sm text-red-500">{errors.newPassword}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className={errors.confirmPassword ? 'border-red-500' : ''}
                      placeholder="Confirm your new password"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-500">{errors.confirmPassword}</p>
                  )}
                </div>

                {/* Security Tips */}
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Password Requirements:</strong>
                    <ul className="mt-1 text-sm list-disc list-inside space-y-1">
                      <li>At least 6 characters (8+ recommended)</li>
                      <li>Mix of uppercase and lowercase letters</li>
                      <li>Include numbers and special characters</li>
                      <li>Avoid common passwords and personal information</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button 
                    type="submit"
                    className="w-full"
                    disabled={loading || !formData.newPassword || !formData.confirmPassword}
                  >
                    {loading ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    ) : null}
                    {loading ? 'Updating Password...' : 'Update Password'}
                  </Button>
                  
                  <Button 
                    type="button"
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate('/auth')}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Sign In
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;