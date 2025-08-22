import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { User, LogOut, Home, Package, Wrench, CreditCard, Users } from "lucide-react";
import EnhancedHeader from "@/components/EnhancedHeader";

const UnifiedDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"overview" | "robots" | "services" | "financing" | "profile">("overview");
  
  // Example counts — replace with real API calls if needed
  const [robotCount, setRobotCount] = useState(0);
  const [serviceCount, setServiceCount] = useState(0);
  const [financingCount, setFinancingCount] = useState(0);

  useEffect(() => {
    // Placeholder: load counts from backend
    setRobotCount(150);
    setServiceCount(34);
    setFinancingCount(12);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      toast({ title: "Logged out", description: "You have successfully logged out." });
      navigate("/auth");
    } catch {
      toast({ title: "Logout failed", description: "Try again later.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      <header className="flex justify-between items-center p-4 border-b bg-card sticky top-0 z-10">
        <div className="flex items-center cursor-pointer space-x-2" onClick={() => navigate("/")}>
          <Home className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-primary">Unified Dashboard</h1>
        </div>

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2">
                <User />
                <span className="truncate max-w-xs">{user.email || "User"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <Users className="mr-2 w-4 h-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 w-4 h-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      <main className="p-6 container mx-auto space-y-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="robots">Robots</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="financing">Financing</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>
        </Tabs>

        {activeTab === "overview" && (
          <>
            <h2 className="text-xl font-semibold mb-6">Dashboard Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Package />
                    <span>Robots</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{robotCount}</p>
                  <Button variant="link" onClick={() => setActiveTab("robots")}>View Robots</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Wrench />
                    <span>Services</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{serviceCount}</p>
                  <Button variant="link" onClick={() => setActiveTab("services")}>View Services</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CreditCard />
                    <span>Financing</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{financingCount}</p>
                  <Button variant="link" onClick={() => setActiveTab("financing")}>View Financing</Button>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {activeTab === "robots" && (
          <section>
            <h2 className="text-xl font-semibold mb-4">Robots Management</h2>
            <Button onClick={() => navigate("/robots")} variant="primary">Manage Robots</Button>
            {/* Add robots list or management UI here */}
          </section>
        )}

        {activeTab === "services" && (
          <section>
            <h2 className="text-xl font-semibold mb-4">Services Management</h2>
            <Button onClick={() => navigate("/services")} variant="primary">Manage Services</Button>
            {/* Add services list or management UI here */}
          </section>
        )}

        {activeTab === "financing" && (
          <section>
            <h2 className="text-xl font-semibold mb-4">Financing Options</h2>
            <Button onClick={() => navigate("/financing")} variant="primary">Manage Financing</Button>
            {/* Financing options UI */}
          </section>
        )}

        {activeTab === "profile" && (
          <section>
            <h2 className="text-xl font-semibold mb-4">User Profile</h2>
            <p>Email: {user?.email}</p>
            <Button onClick={() => navigate("/profile")} variant="outline">Edit Profile</Button>
          </section>
        )}
      </main>
    </div>
  );
};

export default UnifiedDashboard;
