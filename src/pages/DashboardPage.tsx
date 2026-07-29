import { useAuth } from "@/hooks/useAuth";
import UnifiedDashboard from "@/components/UnifiedDashboard";
import EnhancedHeader from "@/components/EnhancedHeader";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@/lib/router-compat";

const DashboardPage = () => {
  // Force refresh to clear cached UserTypeSelector references
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (error) {
          console.error('Profile fetch error:', error);
          // If profile doesn't exist, create a basic one with default buyer type
          if (error.code === 'PGRST116') {
            const { data: newProfile } = await supabase
              .from('profiles')
              .insert({
                user_id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || '',
                user_type: 'buyer' // Default to buyer
              })
              .select()
              .single();
            setUserProfile(newProfile);
          }
        } else {
          setUserProfile(profile);
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Always use unified dashboard for consistent layout
  const renderDashboard = () => {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <DashboardSidebar userProfile={userProfile} />
          
          <div className="flex-1 flex flex-col">
            {/* Top Header with Menu Toggle */}
            <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
              <div className="flex items-center justify-between h-full px-4">
                <div className="flex items-center gap-4">
                  <SidebarTrigger className="p-2">
                    <Menu className="h-4 w-4" />
                  </SidebarTrigger>
                  <h1 className="text-xl font-semibold">
                    Dashboard
                  </h1>
                </div>
                
                {/* Quick access to main site */}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/')}
                >
                  Back to RobotVerse
                </Button>
              </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
              <div className="container mx-auto p-6">
                <UnifiedDashboard userProfile={userProfile} />
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  };

  return renderDashboard();
};

export default DashboardPage;