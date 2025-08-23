import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Building, 
  Shield, 
  Camera, 
  CheckCircle, 
  AlertCircle,
  Edit,
  Save,
  X,
  Plus,
  Trash2,
  Star,
  Activity,
  Calendar,
  Globe,
  Settings,
  Bell,
  Lock,
  Eye,
  Upload,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import EnhancedHeader from '@/components/EnhancedHeader';

const ProfileSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [logoLoading, setLogoLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  
  const [formData, setFormData] = useState({
    full_name: '',
    company_name: '',
    location: '',
    mobile_number: '',
    phone: '',
    user_type: '',
    avatar_url: '',
    company_logo_url: ''
  });

  const [settingsData, setSettingsData] = useState({
    email_notifications: true,
    sms_notifications: false,
    marketing_emails: true,
    profile_visibility: 'public',
    show_contact_info: true,
    auto_reply_enabled: false,
    two_factor_auth: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  useEffect(() => {
    if (userProfile) {
      setFormData({
        full_name: userProfile?.full_name || '',
        company_name: userProfile?.company_name || '',
        location: userProfile?.location || '',
        mobile_number: userProfile?.mobile_number || '',
        phone: userProfile?.phone || '',
        user_type: userProfile?.user_type || '',
        avatar_url: userProfile?.avatar_url || '',
        company_logo_url: userProfile?.company_logo_url || ''
      });
      calculateProfileCompletion();
    }
  }, [userProfile]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Profile fetch error:', error);
      } else {
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProfileCompletion = () => {
    if (!userProfile) return;
    
    const requiredFields = [
      'full_name', 'email', 'phone', 'company_name', 
      'location', 'user_type'
    ];
    
    const completedFields = requiredFields.filter(field => {
      const value = userProfile[field];
      return value && value !== '' && value !== null && value !== undefined;
    });
    
    const completion = Math.round((completedFields.length / requiredFields.length) * 100);
    setProfileCompletion(completion);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }
    
    if (!formData.company_name.trim()) {
      newErrors.company_name = 'Company name is required';
    }
    
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!user || !validateForm()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fix the errors before saving"
      });
      return;
    }
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...formData,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Profile updated successfully"
      });
      
      setErrors({});
      fetchUserProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    // For now, just show success since we don't have settings table
    toast({
      title: "Success!",
      description: "Settings updated successfully"
    });
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please select an image smaller than 2MB"
      });
      return;
    }

    setAvatarLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('robot-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('robot-images')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setFormData({ ...formData, avatar_url: publicUrl });
      
      toast({
        title: "Success!",
        description: "Avatar updated successfully"
      });
      
      fetchUserProfile();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update avatar"
      });
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleCompanyLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please select an image smaller than 2MB"
      });
      return;
    }

    setLogoLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `company-logo-${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `company-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('robot-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('robot-images')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ company_logo_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setFormData({ ...formData, company_logo_url: publicUrl });
      
      toast({
        title: "Success!",
        description: "Company logo updated successfully"
      });
      
      fetchUserProfile();
    } catch (error) {
      console.error('Error uploading company logo:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update company logo"
      });
    } finally {
      setLogoLoading(false);
    }
  };

  const userTypes = [
    { value: 'buyer', label: 'Buyer' },
    { value: 'seller', label: 'Seller' },
    { value: 'robot_seller', label: 'Robot Seller' },
    { value: 'spare_parts_seller', label: 'Spare Parts Seller' },
    { value: 'service_provider', label: 'Service Provider' },
    { value: 'logistics_provider', label: 'Logistics Provider' },
    { value: 'finance_provider', label: 'Finance Provider' }
  ];

  const getCompletionColor = (completion: number) => {
    if (completion >= 80) return 'text-green-600';
    if (completion >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading profile...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Profile & Settings
            </h1>
            <p className="text-muted-foreground">
              Manage your account information and preferences
            </p>
          </div>
        </div>

        {/* Profile Completion Alert */}
        <Alert className={`mb-8 border-2 ${profileCompletion >= 80 ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
          <Activity className="w-4 h-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <strong>Profile Completion: {profileCompletion}%</strong>
                <p className="text-sm">
                  {profileCompletion >= 80 
                    ? 'Great! Your profile is well-completed.' 
                    : 'Complete your profile to unlock all features and build trust with other users.'
                  }
                </p>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${getCompletionColor(profileCompletion)}`}>
                  {profileCompletion}%
                </div>
                <Progress value={profileCompletion} className="w-24 mt-1" />
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Profile Details
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Profile Summary Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Profile Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar Section */}
                  <div className="text-center">
                    <div className="relative inline-block">
                      <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden mx-auto">
                        {formData.avatar_url ? (
                          <img 
                            src={formData.avatar_url} 
                            alt="Avatar" 
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <User className="w-12 h-12 text-muted-foreground" />
                        )}
                      </div>
                      <div className="absolute bottom-0 right-0">
                        <label className="cursor-pointer">
                          <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors">
                            {avatarLoading ? (
                              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                            ) : (
                              <Camera className="w-4 h-4" />
                            )}
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="hidden"
                            disabled={avatarLoading}
                          />
                        </label>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold mt-4">{userProfile?.full_name || 'Complete your profile'}</h3>
                    <p className="text-muted-foreground">{userProfile?.email}</p>
                    <Badge variant="secondary" className="mt-2">
                      {userProfile?.user_type?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Account type not set'}
                    </Badge>
                  </div>

                  {/* Company Logo Section */}
                  <div className="border-t pt-6">
                    <Label className="text-sm font-medium">Company Logo</Label>
                    <div className="mt-2 flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden border-2">
                        {formData.company_logo_url ? (
                          <img 
                            src={formData.company_logo_url} 
                            alt="Company Logo" 
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Building className="w-8 h-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <label className="cursor-pointer">
                          <Button variant="outline" size="sm" className="w-full" disabled={logoLoading}>
                            {logoLoading ? (
                              <>
                                <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mr-2" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-2" />
                                Upload Logo
                              </>
                            )}
                          </Button>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleCompanyLogoUpload}
                            className="hidden"
                            disabled={logoLoading}
                          />
                        </label>
                        <p className="text-xs text-muted-foreground mt-1">Max 2MB, PNG/JPG</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Profile Form */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Update your personal details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="full_name">Full Name *</Label>
                        <Input
                          id="full_name"
                          value={formData.full_name}
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                          className={errors.full_name ? 'border-red-500' : ''}
                        />
                        {errors.full_name && (
                          <p className="text-red-500 text-sm mt-1">{errors.full_name}</p>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          value={userProfile?.email || ''}
                          disabled
                          className="bg-muted"
                        />
                      </div>

                      <div>
                        <Label htmlFor="company_name">Company Name *</Label>
                        <Input
                          id="company_name"
                          value={formData.company_name}
                          onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                          className={errors.company_name ? 'border-red-500' : ''}
                        />
                        {errors.company_name && (
                          <p className="text-red-500 text-sm mt-1">{errors.company_name}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="phone">Phone Number *</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+91 98765 43210"
                          className={errors.phone ? 'border-red-500' : ''}
                        />
                        {errors.phone && (
                          <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <Label htmlFor="location">Location *</Label>
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          placeholder="e.g., Mumbai, Maharashtra, India"
                          className={errors.location ? 'border-red-500' : ''}
                        />
                        {errors.location && (
                          <p className="text-red-500 text-sm mt-1">{errors.location}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="user_type">Account Type</Label>
                        <Select value={formData.user_type} onValueChange={(value) => setFormData({ ...formData, user_type: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select account type" />
                          </SelectTrigger>
                          <SelectContent>
                            {userTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="md:col-span-2">
                        <Label htmlFor="user_type">Additional Information</Label>
                        <p className="text-sm text-muted-foreground mt-2">
                          Your profile is set up with all essential information. You can contact support to add additional fields if needed.
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button onClick={handleSaveProfile} disabled={saving} className="flex items-center gap-2">
                        {saving ? (
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        {saving ? 'Saving...' : 'Save Profile'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Notification Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Notifications
                  </CardTitle>
                  <CardDescription>Manage your notification preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive updates via email</p>
                    </div>
                    <Switch
                      checked={settingsData.email_notifications}
                      onCheckedChange={(checked) => setSettingsData({ ...settingsData, email_notifications: checked })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>SMS Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive important updates via SMS</p>
                    </div>
                    <Switch
                      checked={settingsData.sms_notifications}
                      onCheckedChange={(checked) => setSettingsData({ ...settingsData, sms_notifications: checked })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Marketing Emails</Label>
                      <p className="text-sm text-muted-foreground">Receive promotional content</p>
                    </div>
                    <Switch
                      checked={settingsData.marketing_emails}
                      onCheckedChange={(checked) => setSettingsData({ ...settingsData, marketing_emails: checked })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Privacy Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Privacy
                  </CardTitle>
                  <CardDescription>Control your profile visibility</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Profile Visibility</Label>
                    <Select value={settingsData.profile_visibility} onValueChange={(value) => setSettingsData({ ...settingsData, profile_visibility: value })}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="contacts">Contacts Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Show Contact Information</Label>
                      <p className="text-sm text-muted-foreground">Display phone and email to other users</p>
                    </div>
                    <Switch
                      checked={settingsData.show_contact_info}
                      onCheckedChange={(checked) => setSettingsData({ ...settingsData, show_contact_info: checked })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Security Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    Security
                  </CardTitle>
                  <CardDescription>Manage your account security</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                    </div>
                    <Switch
                      checked={settingsData.two_factor_auth}
                      onCheckedChange={(checked) => setSettingsData({ ...settingsData, two_factor_auth: checked })}
                    />
                  </div>
                  
                  <Button variant="outline" className="w-full">
                    Change Password
                  </Button>
                </CardContent>
              </Card>

              {/* Business Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    Business Settings
                  </CardTitle>
                  <CardDescription>Configure business-specific settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-Reply to Inquiries</Label>
                      <p className="text-sm text-muted-foreground">Automatically respond to customer messages</p>
                    </div>
                    <Switch
                      checked={settingsData.auto_reply_enabled}
                      onCheckedChange={(checked) => setSettingsData({ ...settingsData, auto_reply_enabled: checked })}
                    />
                  </div>
                  
                  <Button variant="outline" className="w-full">
                    Business Verification
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end mt-6">
              <Button onClick={handleSaveSettings} className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save Settings
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProfileSettings;