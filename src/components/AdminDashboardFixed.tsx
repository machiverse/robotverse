// src/components/AdminDashboardFixed.tsx

import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminDashboardLayout from "@/components/AdminDashboardLayout";

// TypeScript interfaces for props and data states
interface AdminDashboardProps {
  userProfile: any;
}

// List of admin emails authorized to view
const ADMIN_EMAILS = [
  'mark.it@keyleerkorb.com',
  'mynameisrajan@gmail.com'
];

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

const AdminDashboardFixed = ({ userProfile }: AdminDashboardProps) => {
  // Initialize toast for notifications
  const { toast } = useToast();

  // State variables for data arrays
  const [users, setUsers] = useState<any[]>([]);
  const [robots, setRobots] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [spareParts, setSpareParts] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  // Loading state for async fetch
  const [loading, setLoading] = useState(true);

  // State for dashboard statistics
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    users: {
      total: 0,
      active: 0,
      buyers: 0,
      sellers: 0,
      serviceProviders: 0,
      logistics: 0,
      finance: 0,
      admins: 0,
      newThisMonth: 0
    },
    equipment: {
      totalRobots: 0,
      totalSpareParts: 0,
      totalServices: 0,
      totalValue: 0,
      activeListings: 0,
      soldThisMonth: 0
    }
  });

  // Function to check if user has admin access
  const checkAdminAccess = () => {
    if (userProfile?.email && ADMIN_EMAILS.includes(userProfile.email)) {
      return true;
    }
    if (userProfile?.account_type === 'admin') {
      return true;
    }
    return false;
  };

  const isAdmin = checkAdminAccess();

  // Fetch data when isAdmin changes
  useEffect(() => {
    if (isAdmin) {
      fetchAllData();
    }
  }, [isAdmin]);

  // Function to fetch all relevant data
  const fetchAllData = async () => {
    try {
      setLoading(true);
      // Fetch various datasets in parallel
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

      // Handle results and update state
      if (usersResult.status === 'fulfilled' && usersResult.value.data) {
        setUsers(usersResult.value.data);
      }
      if (robotsResult.status === 'fulfilled' && robotsResult.value.data) {
        setRobots(robotsResult.value.data);
      }
      if (servicesResult.status === 'fulfilled' && servicesResult.value.data) {
        setServices(servicesResult.value.data);
      }
      if (sparePartsResult.status === 'fulfilled' && sparePartsResult.value.data) {
        setSpareParts(sparePartsResult.value.data);
      }
      if (documentsResult.status === 'fulfilled' && documentsResult.value.data) {
        setDocuments(documentsResult.value.data);
      }

      // Calculate stats after load
      setTimeout(() => calculateStats(), 100);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        title: "Error",
        description: "Failed to load admin data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to compute dashboard stats
  const calculateStats = () => {
    const totalUsers = users.length;

    // Categorizing users by type
    const buyers = users.filter(u =>
      u.user_type === 'buyer' ||
      u.account_type === 'buyer' ||
      u.primary_user_type === 'buyer' ||
      (u.user_roles && u.user_roles.includes('buyer'))
    ).length;

    const sellers = users.filter(u =>
      ['robot_seller', 'parts_seller', 'seller', 'spare_parts_seller'].includes(u.user_type || '') ||
      u.account_type === 'seller' ||
      ['robot_seller', 'spare_parts_seller'].includes(u.primary_user_type as string) ||
      (u.user_roles && (u.user_roles.includes('robot_seller') || u.user_roles.includes('spare_parts_seller')))
    ).length;

    const serviceProviders = users.filter(u =>
      u.user_type === 'service_provider' ||
      u.account_type === 'service' ||
      u.primary_user_type === 'service_provider' ||
      (u.user_roles && u.user_roles.includes('service_provider'))
    ).length;

    const logisticsProviders = users.filter(u =>
      u.user_type === 'logistics_provider' ||
      u.account_type === 'logistics' ||
      u.primary_user_type === 'logistics_provider' ||
      (u.user_roles && u.user_roles.includes('logistics_provider'))
    ).length;

    const financeProviders = users.filter(u =>
      u.user_type === 'finance_provider' ||
      u.account_type === 'finance' ||
      u.primary_user_type === 'finance_provider' ||
      (u.user_roles && u.user_roles.includes('finance_provider'))
    ).length;

    const admins = users.filter(u =>
      u.account_type === 'admin' ||
      (u.user_roles && u.user_roles.includes('admin'))
    ).length;

    // For current month stats
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const newThisMonth = users.filter(u => {
      const createdDate = new Date(u.created_at);
      return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear;
    }).length;

    // Equipment stats
    const totalRobots = robots.length;
    const totalSpareParts = spareParts.length;
    const totalServices = services.length;
    const robotValue = robots.reduce((sum, r) => sum + (Number(r.price) || 0), 0);
    const partsValue = spareParts.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
    const totalValue = robotValue + partsValue;
    const activeRobots = robots.filter(r => r.availability === 'available').length;
    const activeParts = spareParts.filter(p => (p.quantity || 0) > 0).length;
    const activeListings = activeRobots + activeParts + totalServices;

    // Sold items this month
    const soldRobots = robots.filter(r => r.availability === 'sold').length;
    const soldParts = spareParts.filter(p => (p.quantity || 0) === 0).length;
    const soldThisMonth = soldRobots + soldParts;

    // Set stats state
    setDashboardStats({
      users: {
        total: totalUsers,
        active: users.filter(u => u.registration_complete).length,
        buyers,
        sellers,
        serviceProviders,
        newThisMonth,
        logistics: logisticsProviders,
        finance: financeProviders,
        admins
      },
      equipment: {
        totalRobots,
        totalSpareParts,
        totalServices,
        totalValue,
        activeListings,
        soldThisMonth
      }
    });
  };

  // If user isn't admin, show access denied
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

  // Show loader if data is loading
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

  // Render main dashboard layout with props
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
};

export default AdminDashboardFixed;
