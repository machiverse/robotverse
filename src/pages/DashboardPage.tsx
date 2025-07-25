import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/components/Dashboard";
import EnhancedHeader from "@/components/EnhancedHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const DashboardPage = () => {
  const { user } = useAuth();
  const [userType, setUserType] = useState<'buyer' | 'seller' | 'service' | 'parts'>('buyer');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('user_id', user.id)
          .single();
        
        if (profile?.user_type) {
          // Map profile user_type to dashboard userType
          const typeMapping: Record<string, 'buyer' | 'seller' | 'service' | 'parts'> = {
            'buyer': 'buyer',
            'seller': 'seller',
            'service_provider': 'service',
            'parts_provider': 'parts'
          };
          setUserType(typeMapping[profile.user_type] || 'buyer');
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      <Dashboard userType={userType} />
    </div>
  );
};

export default DashboardPage;