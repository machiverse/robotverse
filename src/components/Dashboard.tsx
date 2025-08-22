import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from "@/components/ui/card";
import {
  Bot,
  ShoppingCart,
  TrendingUp,
  Package,
  Users,
  Star,
  Plus,
  Activity,
  DollarSign,
  Settings,
  BarChart,
} from "lucide-react";

const menuItems = [
  { key: "dashboard", label: "Dashboard", icon: Bot },
  { key: "profile", label: "Profile", icon: Users },
  { key: "settings", label: "Settings", icon: Settings },
  { key: "wishlist", label: "Wishlist", icon: Star },
];

const Dashboard = () => {
  const [activeMenu, setActiveMenu] = useState("dashboard");

  // Based on active menu, return corresponding content
  const renderContent = () => {
    switch (activeMenu) {
      case "dashboard":
        return <DashboardContent />;
      case "profile":
        return <ProfileContent />;
      case "settings":
        return <SettingsContent />;
      case "wishlist":
        return <WishlistContent />;
      default:
        return <DashboardContent />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-60 bg-sidebar border-r border-border p-4 flex flex-col">
        <h2 className="text-2xl font-semibold mb-6">RobotVerse</h2>
        <nav className="flex flex-col space-y-1">
          {menuItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveMenu(key)}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg font-medium hover:bg-primary/10 ${
                activeMenu === key ? "bg-primary/20 text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          ))}
        </nav>
        <div className="mt-auto pt-6 border-t border-border text-xs text-muted-foreground">
          &copy; 2025 RobotVerse, Inc.
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">
        {renderContent()}
      </main>
    </div>
  );
};

const DashboardContent = () => {
  const data = {
    title: "Buyer Dashboard",
    subtitle: "Manage your robot purchases and wishlist",
    stats: [
      { label: "Total Orders", value: "12", icon: ShoppingCart, trend: "+15%" },
      { label: "Saved Robots", value: "28", icon: Bot, trend: "+8%" },
      { label: "Active Bids", value: "5", icon: TrendingUp, trend: "+25%" },
      { label: "Reviews Given", value: "9", icon: Star, trend: "+12%" },
    ],
    quickActions: [
      { label: "Browse Marketplace", icon: Bot },
      { label: "My Orders", icon: Package },
      { label: "Wishlist", icon: Star },
      { label: "Messages", icon: Users },
    ],
  };

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{data.title}</h1>
        <p className="text-muted-foreground">{data.subtitle}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {data.stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="bg-gradient-card border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {stat.trend}
                    </Badge>
                  </div>
                  <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card className="bg-gradient-card border-border mb-8">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Frequently used features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Button
                  key={index}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center space-y-2"
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-sm">{action.label}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest actions and updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="flex items-start space-x-3 p-3 rounded-lg bg-background/50"
              >
                <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Sample activity item</p>
                  <p className="text-xs text-muted-foreground">2 hours ago</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
};

const ProfileContent = () => (
  <div>
    <h2 className="text-2xl font-semibold mb-4">Your Profile</h2>
    <p>Profile management features here.</p>
  </div>
);

const SettingsContent = () => (
  <div>
    <h2 className="text-2xl font-semibold mb-4">Settings</h2>
    <p>Configure your account settings.</p>
  </div>
);

const WishlistContent = () => (
  <div>
    <h2 className="text-2xl font-semibold mb-4">Wishlist</h2>
    <p>Items you have saved to your wishlist.</p>
  </div>
);

export default Dashboard;
