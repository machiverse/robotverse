import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Briefcase,
  Users,
  GraduationCap,
  PlusCircle,
  UserPlus,
  LayoutDashboard,
  ArrowLeft,
  Search,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const TalentHeader = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const navItems = [
    { label: "Jobs", href: "/robot-talent", icon: Briefcase, exact: true },
    { label: "Talent Profiles", href: "/robot-talent/talent", icon: Users },
    { label: "Training", href: "/robot-talent/training", icon: GraduationCap },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return location.pathname === href;
    return location.pathname.startsWith(href);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/robot-talent?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      {/* Top bar */}
      <div className="border-b border-border/50 bg-muted/30">
        <div className="container mx-auto px-4 flex items-center justify-between h-12">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back to RobotVerse</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <>
                <Button size="sm" variant="outline" onClick={() => navigate('/robot-talent/post-job')} className="hidden sm:flex gap-1.5 text-xs">
                  <PlusCircle className="h-3.5 w-3.5" /> Post Job
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate('/robot-talent/post-training')} className="hidden sm:flex gap-1.5 text-xs">
                  <GraduationCap className="h-3.5 w-3.5" /> Add Training
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate('/robot-talent/employer-dashboard')} className="hidden md:flex gap-1.5 text-xs">
                  <LayoutDashboard className="h-3.5 w-3.5" /> Employer Dashboard
                </Button>
              </>
            )}
            {!user && (
              <Button size="sm" onClick={() => navigate('/auth')} className="text-xs">
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14 gap-4">
          {/* Brand */}
          <Link to="/robot-talent" className="flex items-center gap-2.5 shrink-0">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shadow-sm">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base font-bold text-foreground leading-tight">Robot Talent</h1>
              <p className="text-[10px] text-muted-foreground leading-tight">Industrial Robotics Careers</p>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive(item.href, item.exact)
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Search */}
          <form onSubmit={handleSearch} className="hidden md:flex relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search jobs, skills..."
              className="w-full rounded-lg border border-border bg-muted/50 py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </form>

          {/* Seeker Profile CTA */}
          {user && (
            <Button
              size="sm"
              onClick={() => navigate('/robot-talent/seeker-profile')}
              className="shrink-0 gap-1.5"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">My Profile</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default TalentHeader;
