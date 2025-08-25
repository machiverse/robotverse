import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminDashboardLayout from "@/components/AdminDashboardLayout";

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  account_type: string;
  user_type?: string;
  user_roles?: string[];
  primary_user_type?: string;
  registration_complete?: boolean;
  created_at: string;
  [key: string]: any; // Allow additional properties from Supabase
}

interface Equipment {
  id: string;
  price?: number | string;
  availability?: string;
  quantity?: number;
  created_at: string;
  [key: string]: any; // Allow additional properties from Supabase
}

interface Service {
  id: string;
  name: string;
  service_type: string;
  description?: string;
  price_range?: string;
  created_at: string;
  [key: string]: any; // Allow additional properties from Supabase
}

interface DashboardStats {
  users: {
    total: number;
    active: number;
    buyers: number;
    sellers: number;
    serviceProviders: number;
    logistics: number;
    finance: number;
    admins: number;
    newThisMonth: number;
  };
  equipment: {
    totalRobots: number;
    totalSpareParts: number;
    totalServices: number;
    totalValue: number;
    activeListings: number;
    soldThisMonth: number;
  };
}

interface AdminDashboardProps {
  userProfile: UserProfile;
}

const ADMIN_EMAILS = [
  'mark.it@keyleerkorb.com',
  'mynameisrajan@gmail.com',
] as const;

const AdminDashboardFixed = React.memo(({ userProfile }: AdminDashboardProps) => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [robots, setRobots] = useState<Equipment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [spareParts, setSpareParts] = useState<Equipment[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = useMemo((): boolean => {
    if (!userProfile) return false;
    return (userProfile.email && ADMIN_EMAILS.includes(userProfile.email as any)) ||
      userProfile.account_type === 'admin';
  }, [userProfile?.email, userProfile?.account_type]);

  // --- Stats Calculations Memoized ---
  const dashboardStats = useMemo((): DashboardStats => {
    if (!users.length) {
      return {
        users: {
          total: 0, active: 0, buyers: 0, sellers: 0,
          serviceProviders: 0, logistics: 0, finance: 0, admins: 0, newThisMonth: 0
        },
        equipment: {
          totalRobots: 0, totalSpareParts: 0, totalServices: 0,
          totalValue: 0, activeListings: 0, soldThisMonth: 0
        }
      };
    }
    const totalUsers = users.length;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // --- Categorize Users
    const userCounts = users.reduce((acc, u) => {
      // Buyer
      if (
        u.user_type === 'buyer' ||
        u.account_type === 'buyer' ||
        u.primary_user_type === 'buyer' ||
        (u.user_roles && u.user_roles.includes('buyer'))
      ) acc.buyers++;

      // Seller
      if (
        ['robot_seller', 'parts_seller', 'seller', 'spare_parts_seller'].includes(u.user_type || '') ||
        u.account_type === 'seller' ||
        ['robot_seller', 'spare_parts_seller'].includes(u.primary_user_type as string) ||
        (u.user_roles && (u.user_roles.includes('robot_seller') || u.user_roles.includes('spare_parts_seller')))
      ) acc.sellers++;

      // Service Providers
      if (
        u.user_type === 'service_provider' ||
        u.account_type === 'service' ||
        u.primary_user_type === 'service_provider' ||
        (u.user_roles && u.user_roles.includes('service_provider'))
      ) acc.serviceProviders++;

      // Logistics
      if (
        u.user_type === 'logistics_provider' ||
        u.account_type === 'logistics' ||
        u.primary_user_type === 'logistics_provider' ||
        (u.user_roles && u.user_roles.includes('logistics_provider'))
      ) acc.logistics++;

      // Finance
      if (
        u.user_type === 'finance_provider' ||
        u.account_type === 'finance' ||
        u.primary_user_type === 'finance_provider' ||
        (u.user_roles && u.user_roles.includes('finance_provider'))
      ) acc.finance++;

      // Admins
      if (
        u.account_type === 'admin' ||
        (u.user_roles && u.user_roles.includes('admin'))
      ) acc.admins++;

      if (u.registration_complete)
        acc.active++;

      // New this month
      const createdDate = new Date(u.created_at);
      if (
        createdDate.getMonth() === currentMonth &&
        createdDate.getFullYear() === currentYear
      ) acc.newThisMonth++;

      return acc;
    }, {
      buyers: 0, sellers: 0, serviceProviders: 0, logistics: 0,
      finance: 0, admins: 0, active: 0, newThisMonth: 0
    });

    // Equipment stats
    const robotValue = robots.reduce((sum, r) => sum + (Number(r.price) || 0), 0);
    const partsValue = spareParts.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
    const activeRobots = robots.filter(r => r.availability === 'available').length;
    const activeParts = spareParts.filter(p => (p.quantity || 0) > 0).length;
    const soldRobots = robots.filter(r => r.availability === 'sold').length;
    const soldParts = spareParts.filter(p => (p.quantity || 0) === 0).length;

    return {
      users: {
        total: totalUsers,
        ...userCounts
      },
      equipment: {
        totalRobots: robots.length,
        totalSpareParts: spareParts.length,
        totalServices: services.length,
        totalValue: robotValue + partsValue,
        activeListings: activeRobots + activeParts + services.length,
        soldThisMonth: soldRobots + soldParts
      }
    };
  }, [users, robots, services, spareParts]);

  // --- Data fetching logic, memoized ---
  const fetchAllData = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      setError(null);
      const [
        usersResult,
        robotsResult, 
        servicesResult,
        sparePartsResult,
        documentsResult
      ] = await Promise.allSettled([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('robots').select('*').order('created_at', { ascending: false }),
        supabase.from('services').select('*').order('created_at', { ascending: false }),
        supabase.from('spare_parts').select('*').order('created_at', { ascending: false }),
        supabase.from('document_uploads').select('*').order('uploaded_at', { ascending: false })
      ]);
      // Users
      if (usersResult.status === 'fulfilled' && usersResult.value.data) setUsers(usersResult.value.data);
      if (robotsResult.status === 'fulfilled' && robotsResult.value.data) setRobots(robotsResult.value.data);
      if (servicesResult.status === 'fulfilled' && servicesResult.value.data) setServices(servicesResult.value.data);
      if (sparePartsResult.status === 'fulfilled' && sparePartsResult.value.data) setSpareParts(sparePartsResult.value.data);
      if (documentsResult.status === 'fulfilled' && documentsResult.value.data) setDocuments(documentsResult.value.data);

      // If any failed, show error
      if (
        usersResult.status === 'rejected' ||
        robotsResult.status === 'rejected' ||
        servicesResult.status === 'rejected' ||
        sparePartsResult.status === 'rejected' ||
        documentsResult.status === 'rejected'
      ) {
        setError('One or more data fetches failed');
      }

    } catch (error) {
      console.error('Error fetching admin data:', error);
      setError('Failed to load admin data');
      toast({
        title: "Error",
        description: "Failed to load admin data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [isAdmin, toast]);

  useEffect(() => {
    if (isAdmin) fetchAllData();
    // eslint-disable-next-line
  }, [isAdmin, fetchAllData]);

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Admin Access Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">You need administrator privileges to access this dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading admin dashboard...</p>
          </div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Error Loading Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchAllData}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AdminDashboardLayout
      userProfile={userProfile}
      dashboardStats={dashboardStats}
      users={users}
      robots={robots}
      services={services}
      spareParts={spareParts}
      onRefresh={fetchAllData}
    />
  );
});
AdminDashboardFixed.displayName = 'AdminDashboardFixed';
export default AdminDashboardFixed;
