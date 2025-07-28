import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { User, MapPin, Phone, Mail, Building } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DashboardProfileProps {
  userProfile: any;
  onProfileUpdate: () => void;
}

export function DashboardProfile({ userProfile, onProfileUpdate }: DashboardProfileProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: userProfile?.full_name || '',
    company_name: userProfile?.company_name || '',
    location: userProfile?.location || '',
    mobile_number: userProfile?.mobile_number || '',
    phone: userProfile?.phone || '',
  });

  const handleSave = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Profile updated successfully');
      setIsEditing(false);
      onProfileUpdate();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
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
    });
    setIsEditing(false);
  };

  const sellerRoles = userProfile?.seller_roles || [];
  const serviceCategories = userProfile?.service_categories || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-muted-foreground">Manage your account information</p>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Basic Information
          </CardTitle>
          <CardDescription>Your personal and business details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="full_name">Full Name</Label>
              {isEditing ? (
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{userProfile?.full_name || 'Not set'}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <p className="text-sm text-muted-foreground">{userProfile?.email}</p>
            </div>

            <div>
              <Label htmlFor="company_name">Company Name</Label>
              {isEditing ? (
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{userProfile?.company_name || 'Not set'}</p>
              )}
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              {isEditing ? (
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{userProfile?.location || 'Not set'}</p>
              )}
            </div>

            <div>
              <Label htmlFor="mobile_number">Mobile Number</Label>
              {isEditing ? (
                <Input
                  id="mobile_number"
                  value={formData.mobile_number}
                  onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{userProfile?.mobile_number || 'Not set'}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              {isEditing ? (
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{userProfile?.phone || 'Not set'}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Type & Roles */}
      <Card>
        <CardHeader>
          <CardTitle>Account Type & Roles</CardTitle>
          <CardDescription>Your account configuration and seller roles</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Account Type</Label>
            <div className="mt-2">
              <Badge variant="secondary">
                {userProfile?.user_type || userProfile?.account_type || 'Not set'}
              </Badge>
            </div>
          </div>

          {sellerRoles.length > 0 && (
            <div>
              <Label>Seller Roles</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {sellerRoles.map((role) => (
                  <Badge key={role} variant="outline">
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
                  <Badge key={category} variant="outline">
                    {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}