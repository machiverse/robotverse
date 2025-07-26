import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Users, Package, Settings, BarChart3, Trash2, Edit, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdminDashboardProps {
  userProfile: any;
}

const AdminDashboard = ({ userProfile }: AdminDashboardProps) => {
  const [users, setUsers] = useState<any[]>([]);
  const [robots, setRobots] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [spareParts, setSpareParts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch all robots
      const { data: robotsData, error: robotsError } = await supabase
        .from('robots')
        .select('*, profiles(full_name, email)')
        .order('created_at', { ascending: false });

      // Fetch all services
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*, profiles(full_name, email)')
        .order('created_at', { ascending: false });

      // Fetch all spare parts
      const { data: sparePartsData, error: sparePartsError } = await supabase
        .from('spare_parts')
        .select('*, profiles(full_name, email)')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      if (robotsError) throw robotsError;
      if (servicesError) throw servicesError;
      if (sparePartsError) throw sparePartsError;

      setUsers(usersData || []);
      setRobots(robotsData || []);
      setServices(servicesData || []);
      setSpareParts(sparePartsData || []);

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        title: "Error",
        description: "Failed to load admin data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRobot = async (robotId: string) => {
    try {
      const { error } = await supabase
        .from('robots')
        .delete()
        .eq('id', robotId);

      if (error) throw error;

      setRobots(robots.filter(robot => robot.id !== robotId));
      toast({
        title: "Success",
        description: "Robot listing deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting robot:', error);
      toast({
        title: "Error",
        description: "Failed to delete robot listing",
        variant: "destructive",
      });
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;

      setServices(services.filter(service => service.id !== serviceId));
      toast({
        title: "Success",
        description: "Service listing deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting service:', error);
      toast({
        title: "Error",
        description: "Failed to delete service listing",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSparePart = async (partId: string) => {
    try {
      const { error } = await supabase
        .from('spare_parts')
        .delete()
        .eq('id', partId);

      if (error) throw error;

      setSpareParts(spareParts.filter(part => part.id !== partId));
      toast({
        title: "Success",
        description: "Spare part listing deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting spare part:', error);
      toast({
        title: "Error",
        description: "Failed to delete spare part listing",
        variant: "destructive",
      });
    }
  };

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage all platform data and users</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Robot Listings</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{robots.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Services</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{services.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spare Parts</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{spareParts.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="robots">Robots</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="spare-parts">Spare Parts</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>User Type</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.full_name || 'N/A'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.user_type ? "default" : "secondary"}>
                          {user.user_type || 'Not Set'}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.company_name || 'N/A'}</TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="robots" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Robot Listings</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {robots.map((robot) => (
                    <TableRow key={robot.id}>
                      <TableCell>{robot.name}</TableCell>
                      <TableCell>{robot.profiles?.full_name || robot.profiles?.email || 'Unknown'}</TableCell>
                      <TableCell>{robot.currency} {robot.price}</TableCell>
                      <TableCell>{robot.robot_type}</TableCell>
                      <TableCell>{new Date(robot.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteRobot(robot.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Listings</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Price Range</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell>{service.name}</TableCell>
                      <TableCell>{service.profiles?.full_name || service.profiles?.email || 'Unknown'}</TableCell>
                      <TableCell>{service.service_type}</TableCell>
                      <TableCell>{service.price_range || 'N/A'}</TableCell>
                      <TableCell>{new Date(service.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteService(service.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="spare-parts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Spare Parts Listings</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Part Number</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {spareParts.map((part) => (
                    <TableRow key={part.id}>
                      <TableCell>{part.name}</TableCell>
                      <TableCell>{part.profiles?.full_name || part.profiles?.email || 'Unknown'}</TableCell>
                      <TableCell>{part.currency} {part.price}</TableCell>
                      <TableCell>{part.part_number || 'N/A'}</TableCell>
                      <TableCell>{new Date(part.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteSparePart(part.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;