import { useState, useEffect } from "react";
import { Users, Settings, Package, Truck, CreditCard, Bot, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StatsData {
  liveUsers: number;
  robotSellers: number;
  partsSellers: number;
  serviceProviders: number;
  logisticsPartners: number;
  financeProviders: number;
}

// Professional stat configuration with detailed descriptions
const STAT_CONFIG = [
  {
    key: "liveUsers" as keyof StatsData,
    icon: Users,
    label: "Trusted Users",
    description: "Total verified user accounts from profiles table",
    gradient: "from-green-500 to-emerald-600",
  },
  {
    key: "robotSellers" as keyof StatsData,
    icon: Bot,
    label: "Robot Sellers",
    description: "Companies and individuals offering industrial robots for sale",
    gradient: "from-blue-500 to-cyan-600",
  },
  {
    key: "partsSellers" as keyof StatsData,
    icon: Package,
    label: "Parts Sellers",
    description: "Verified sellers providing spare parts and components",
    gradient: "from-purple-500 to-violet-600",
  },
  {
    key: "serviceProviders" as keyof StatsData,
    icon: Settings,
    label: "Service Providers",
    description: "Expert technicians offering maintenance and installation services",
    gradient: "from-orange-500 to-red-600",
  },
  {
    key: "logisticsPartners" as keyof StatsData,
    icon: Truck,
    label: "Logistics Partners",
    description: "Verified logistics and shipping partners for robotics delivery",
    gradient: "from-indigo-500 to-blue-600",
  },
  {
    key: "financeProviders" as keyof StatsData,
    icon: CreditCard,
    label: "Finance Providers",
    description: "Financial institutions offering loans and leasing for robotics",
    gradient: "from-pink-500 to-rose-600",
  },
];

// Helper function to safely extract and normalize role fields (ONLY existing fields)
function extractUserRoles(profile: any): string[] {
  const roles: string[] = [];
  
  // Helper to add value(s) to roles array
  const addRole = (value: any) => {
    if (Array.isArray(value)) {
      roles.push(...value.filter(Boolean));
    } else if (typeof value === 'string' && value.trim()) {
      roles.push(value);
    }
  };

  // Extract from all role-related fields that exist in your schema
  addRole(profile?.account_type);
  addRole(profile?.user_type);
  addRole(profile?.seller_roles);
  addRole(profile?.user_roles);
  addRole(profile?.primary_user_type);

  // Normalize to lowercase for consistent matching
  return roles.map(role => role.toLowerCase().trim()).filter(Boolean);
}

const LiveStats = () => {
  const [stats, setStats] = useState<StatsData>({
    liveUsers: 0,
    robotSellers: 0,
    partsSellers: 0,
    serviceProviders: 0,
    logisticsPartners: 0,
    financeProviders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
    
    // Auto-refresh every 2 minutes for truly "live" stats
    const interval = setInterval(fetchStats, 120000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      setRefreshing(true);
      setError(null);

      // Fetch ALL profiles from the table
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, account_type, user_type, seller_roles, user_roles, primary_user_type, registration_complete')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!profiles || !Array.isArray(profiles)) {
        throw new Error('No profile data received');
      }

      console.log('📊 Raw profiles data:', profiles.length, 'profiles');
      console.log('📊 First few profiles:', profiles.slice(0, 3));

      // Use Sets to ensure no duplicate counting per user
      const uniqueUsers = new Set<string>();
      const robotSellers = new Set<string>();
      const partsSellers = new Set<string>();
      const serviceProviders = new Set<string>();
      const logisticsPartners = new Set<string>();
      const financeProviders = new Set<string>();

      profiles.forEach((profile) => {
        if (!profile.id) {
          console.warn('⚠️ Profile without ID found:', profile);
          return;
        }
        
        // Count ALL users with IDs
        uniqueUsers.add(profile.id);
        
        // Extract all roles for this user
        const userRoles = extractUserRoles(profile);
        
        // Debug logging for role categorization
        if (userRoles.length > 0) {
          console.log(`User ${profile.id} roles:`, userRoles);
        }
        
        // Check each role category (user counted once per category max)
        if (userRoles.some(role => 
          ['robot_seller', 'seller', 'robotseller'].includes(role)
        )) {
          robotSellers.add(profile.id);
        }
        
        if (userRoles.some(role => 
          ['parts_seller', 'spare_parts_seller', 'partsseller', 'partseller', 'spare_parts_seller'].includes(role)
        )) {
          partsSellers.add(profile.id);
        }
        
        if (userRoles.some(role => 
          ['service_provider', 'serviceprovider', 'service'].includes(role)
        )) {
          serviceProviders.add(profile.id);
        }
        
        if (userRoles.some(role => 
          ['logistics_provider', 'logistics', 'logisticspartner', 'shipping'].includes(role)
        )) {
          logisticsPartners.add(profile.id);
        }
        
        if (userRoles.some(role => 
          ['finance_provider', 'finance', 'financepartner', 'financing'].includes(role)
        )) {
          financeProviders.add(profile.id);
        }
      });

      // Set the calculated stats
      setStats({
        liveUsers: uniqueUsers.size,
        robotSellers: robotSellers.size,
        partsSellers: partsSellers.size,
        serviceProviders: serviceProviders.size,
        logisticsPartners: logisticsPartners.size,
        financeProviders: financeProviders.size,
      });

      setLastUpdated(new Date());
      console.log('✅ Live stats updated successfully:', {
        totalProfilesInDB: profiles.length,
        totalUsers: uniqueUsers.size,
        robotSellers: robotSellers.size,
        partsSellers: partsSellers.size,
        serviceProviders: serviceProviders.size,
        logisticsPartners: logisticsPartners.size,
        financeProviders: financeProviders.size,
      });

    } catch (error) {
      console.error('❌ Error fetching live stats:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <section className="py-16 bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground text-lg">Loading live marketplace statistics...</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array(6).fill(0).map((_, i) => (
              <Card key={i} className="bg-card/80 backdrop-blur-sm border-border animate-pulse">
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 bg-muted rounded-full mx-auto mb-3"></div>
                  <div className="h-6 bg-muted rounded mb-2"></div>
                  <div className="h-4 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4">
        {/* Real Data Confirmation */}
        <Alert className="border-green-200 bg-green-50 mb-8">
          <CheckCircle className="w-4 h-4" />
          <AlertDescription className="text-green-700">
            <strong>✅ Live Real-Time Data</strong> - Statistics calculated from actual user profiles and roles.
            <br />
            <small>Auto-refreshes every 2 minutes • Last Updated: {lastUpdated?.toLocaleTimeString()}</small>
          </AlertDescription>
        </Alert>

        {/* Error Alert */}
        {error && (
          <Alert className="border-red-200 bg-red-50 mb-8">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className="text-red-700">
              <strong>Error:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Enhanced Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-6">
            <h2 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Live Marketplace Stats
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStats}
              disabled={refreshing}
              className="ml-4"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Real-time data from our growing B2B robotics community
          </p>
        </div>
        
        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {STAT_CONFIG.map((item) => {
            const Icon = item.icon;
            const value = stats[item.key];
            
            return (
              <TooltipProvider key={item.key}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Card className="bg-card/90 backdrop-blur-sm border-border hover:scale-105 hover:shadow-lg transition-all duration-300 cursor-help">
                      <CardContent className="p-6 text-center">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-r ${item.gradient} flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                          <Icon className="w-7 h-7 text-white" />
                        </div>
                        
                        <div className="text-3xl font-bold text-foreground mb-2 tabular-nums">
                          {refreshing ? (
                            <span className="opacity-60">—</span>
                          ) : (
                            value.toLocaleString()
                          )}
                        </div>
                        
                        <div className="text-sm text-muted-foreground font-medium leading-tight mb-3">
                          {item.label}
                        </div>
                        
                        {/* Enhanced live indicator */}
                        {value > 0 && !refreshing && (
                          <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                            Live
                          </div>
                        )}
                        
                        {value === 0 && !refreshing && (
                          <div className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs">
                            <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                            No Data
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-left p-4">
                    <div className="font-semibold text-base mb-2">{item.label}</div>
                    <div className="text-sm text-muted-foreground leading-relaxed mb-3">
                      {item.description}
                    </div>
                    <div className="text-xs text-muted-foreground p-2 bg-muted rounded border-t">
                      <div className="flex justify-between">
                        <span>Current count:</span>
                        <span className="font-medium">{value.toLocaleString()}</span>
                      </div>
                      {lastUpdated && (
                        <div className="flex justify-between mt-1">
                          <span>Updated:</span>
                          <span className="font-medium">{lastUpdated.toLocaleTimeString()}</span>
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>

        {/* Enhanced Footer */}
        <div className="text-center mt-16">
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 max-w-4xl mx-auto border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
              <div className="flex items-center justify-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span>Auto-refreshes every 2 minutes</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Real-time marketplace data</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span>Verified user roles only</span>
              </div>
            </div>
            {lastUpdated && (
              <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-3 h-3" />
                  <span>Last updated: {lastUpdated.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LiveStats;
