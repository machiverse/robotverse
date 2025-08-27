import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
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
  Globe
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DashboardProfileProps {
  userProfile: any;
  onProfileUpdate: () => void;
}

export function DashboardProfile({ userProfile, onProfileUpdate }: DashboardProfileProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [logoLoading, setLogoLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: userProfile?.full_name || '',
    company_name: userProfile?.company_name || '',
    location: userProfile?.location || '',
    mobile_number: userProfile?.mobile_number || '',
    phone: userProfile?.phone || '',
    bio: userProfile?.bio || '',
    website: userProfile?.website || '',
    linkedin_url: userProfile?.linkedin_url || '',
    user_type: userProfile?.user_type || '',
    avatar_url: userProfile?.avatar_url || '',
    company_logo_url: userProfile?.company_logo_url || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    calculateProfileCompletion();
  }, [userProfile]);

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
    
    if (formData.website && !formData.website.startsWith('http')) {
      newErrors.website = 'Website must start with http:// or https://';
    }
    
    if (formData.linkedin_url && !formData.linkedin_url.includes('linkedin.com')) {
      newErrors.linkedin_url = 'Please enter a valid LinkedIn URL';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!user) return;
    
    if (!validateForm()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fix the errors before saving"
      });
      return;
    }
    
    setLoading(true);
    try {
      // Fixed: Use 'id' instead of 'user_id' for the profiles table
      const { error } = await supabase
        .from('profiles')
        .update({
          ...formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id); // Fixed: Use 'id' not 'user_id'

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Profile updated successfully"
      });
      
      setIsEditing(false);
      setErrors({});
      onProfileUpdate();
      calculateProfileCompletion();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      full_name: userProfile?.full_name || '',
      company_name: userProfile?.company_name || '',
      location: userProfile?.location || '',
      mobile_number: userProfile?.mobile_number || '',
      phone: userProfile?.phone || '',
      bio: userProfile?.bio || '',
      website: userProfile?.website || '',
      linkedin_url: userProfile?.linkedin_url || '',
      user_type: userProfile?.user_type || '',
      avatar_url: userProfile?.avatar_url || '',
      company_logo_url: userProfile?.company_logo_url || ''
    });
    setIsEditing(false);
    setErrors({});
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Check file size (max 2MB)
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

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setFormData({ ...formData, avatar_url: publicUrl });
      
      toast({
        title: "Success!",
        description: "Avatar updated successfully"
      });
      
      onProfileUpdate();
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

    // Check file size (max 2MB)
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

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('robot-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('robot-images')
        .getPublicUrl(filePath);

      // Update profile with new company logo URL
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
      
      onProfileUpdate();
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

  const sellerRoles = userProfile?.seller_roles || [];
  const serviceCategories = userProfile?.service_categories || [];
  const userType = userProfile?.user_type || userProfile?.account_type;

  const userTypes = [
    { value: 'buyer', label: 'Buyer' },
    { value: 'seller', label: 'Seller' },
    { value: 'robot_seller', label: 'Robot Seller' },
    { value: 'parts_seller', label: 'Parts Seller' },
    { value: 'service_provider', label: 'Service Provider' },
    { value: 'logistics_provider', label: 'Logistics Provider' },
    { value: 'finance_provider', label: 'Finance Provider' }
  ];

  const getCompletionColor = (completion: number) => {
    if (completion >= 80) return 'text-green-600';
    if (completion >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Profile Management
          </h1>
          <p className="text-muted-foreground">
            Manage your account information and preferences
          </p>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2">
            <Edit className="w-4 h-4" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} className="flex items-center gap-2">
              <X className="w-4 h-4" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading} className="flex items-center gap-2">
              {loading ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>

      {/* Profile Completion Alert */}
      <Alert className={`border-2 ${profileCompletion >= 80 ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
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

      {/* Avatar & Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Personal Information
          </CardTitle>
          <CardDescription>Your personal details and avatar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden">
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
              {isEditing && (
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
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold">{userProfile?.full_name || 'Complete your profile'}</h3>
              <p className="text-muted-foreground">{userProfile?.email}</p>
              <Badge variant="secondary" className="mt-1">
                {userType || 'Account type not set'}
              </Badge>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="full_name">Full Name *</Label>
              {isEditing ? (
                <div>
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
              ) : (
                <p className="text-sm py-2 px-3 bg-muted rounded-md">
                  {userProfile?.full_name || 'Not set'}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="email">Email Address</Label>
              <p className="text-sm py-2 px-3 bg-muted rounded-md flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {userProfile?.email || 'Not set'}
              </p>
            </div>

            <div>
              <Label htmlFor="company_name">Company Name *</Label>
              {isEditing ? (
                <div>
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
              ) : (
                <p className="text-sm py-2 px-3 bg-muted rounded-md flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  {userProfile?.company_name || 'Not set'}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="location">Location *</Label>
              {isEditing ? (
                <div>
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
              ) : (
                <p className="text-sm py-2 px-3 bg-muted rounded-md flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {userProfile?.location || 'Not set'}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              {isEditing ? (
                <div>
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
              ) : (
                <p className="text-sm py-2 px-3 bg-muted rounded-md flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {userProfile?.phone || 'Not set'}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="mobile_number">Mobile Number</Label>
              {isEditing ? (
                <Input
                  id="mobile_number"
                  value={formData.mobile_number}
                  onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                  placeholder="Alternative mobile number"
                />
              ) : (
                <p className="text-sm py-2 px-3 bg-muted rounded-md">
                  {userProfile?.mobile_number || 'Not set'}
                </p>
              )}
            </div>
          </div>

          {/* Bio Section */}
          <div>
            <Label htmlFor="bio">Bio / About</Label>
            {isEditing ? (
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell others about yourself and your business..."
                rows={3}
              />
            ) : (
              <p className="text-sm py-2 px-3 bg-muted rounded-md min-h-[80px]">
                {userProfile?.bio || 'Not set'}
              </p>
            )}
          </div>

          {/* Company Logo Section */}
          <div>
            <Label htmlFor="company_logo">Company Logo</Label>
            <div className="flex items-center gap-6 mt-2">
              <div className="relative">
                <div className="w-20 h-20 border-2 border-dashed border-muted-foreground/30 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
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
                {isEditing && (
                  <div className="absolute bottom-0 right-0">
                    <label className="cursor-pointer">
                      <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors">
                        {logoLoading ? (
                          <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                          <Camera className="w-3 h-3" />
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCompanyLogoUpload}
                        className="hidden"
                        disabled={logoLoading}
                      />
                    </label>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  Upload your company logo to display on your profile and listings.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended size: 200x200px. Max file size: 2MB.
                </p>
              </div>
            </div>
          </div>

          {/* Website & Social Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="website">Website</Label>
              {isEditing ? (
                <div>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://yourcompany.com"
                    className={errors.website ? 'border-red-500' : ''}
                  />
                  {errors.website && (
                    <p className="text-red-500 text-sm mt-1">{errors.website}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm py-2 px-3 bg-muted rounded-md flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  {userProfile?.website ? (
                    <a href={userProfile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {userProfile.website}
                    </a>
                  ) : (
                    'Not set'
                  )}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="linkedin_url">LinkedIn Profile</Label>
              {isEditing ? (
                <div>
                  <Input
                    id="linkedin_url"
                    value={formData.linkedin_url}
                    onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                    placeholder="https://linkedin.com/in/yourprofile"
                    className={errors.linkedin_url ? 'border-red-500' : ''}
                  />
                  {errors.linkedin_url && (
                    <p className="text-red-500 text-sm mt-1">{errors.linkedin_url}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm py-2 px-3 bg-muted rounded-md">
                  {userProfile?.linkedin_url ? (
                    <a href={userProfile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      LinkedIn Profile
                    </a>
                  ) : (
                    'Not set'
                  )}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Type & User Type */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Account Type & Permissions
          </CardTitle>
          <CardDescription>Your account configuration and access permissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="user_type">Primary User Type</Label>
            {isEditing ? (
              <Select 
                value={formData.user_type} 
                onValueChange={(value) => setFormData({ ...formData, user_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your primary role" />
                </SelectTrigger>
                <SelectContent>
                  {userTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="mt-2">
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {userTypes.find(t => t.value === userType)?.label || userType || 'Not set'}
                </Badge>
              </div>
            )}
          </div>

          {sellerRoles.length > 0 && (
            <div>
              <Label>Additional Seller Roles</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {sellerRoles.map((role) => (
                  <Badge key={role} variant="outline" className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {serviceCategories.length > 0 && (
            <div>
              <Label>Service Categories</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {serviceCategories.map((category) => (
                  <Badge key={category} variant="outline" className="flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Account Statistics
          </CardTitle>
          <CardDescription>Your account activity and status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Calendar className="w-8 h-8 text-blue-600" />
              <div>
                <p className="font-semibold">Member Since</p>
                <p className="text-sm text-muted-foreground">
                  {userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="font-semibold">Profile Status</p>
                <p className="text-sm text-muted-foreground">
                  {profileCompletion >= 80 ? 'Complete' : 'Needs completion'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Shield className="w-8 h-8 text-purple-600" />
              <div>
                <p className="font-semibold">Verification</p>
                <p className="text-sm text-muted-foreground">
                  {userProfile?.email ? 'Email verified' : 'Pending verification'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
