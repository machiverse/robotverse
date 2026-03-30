import { useState, useRef, useEffect } from "react";
import { useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Bot,
  Menu,
  Search,
  User,
  LogOut,
  ChevronDown,
  Settings,
  Truck,
  CreditCard,
  BookOpen,
  Cpu,
  Monitor,
  Wrench,
  Code,
  Package,
  X,
  Heart,
  Scale,
  Bell,
  LayoutGrid,
  Crown,
  Shield,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useChatNotifications } from "@/hooks/useChatNotifications";
import { useRobotComparison } from "@/contexts/RobotComparisonContext";
import robotverseLogo from "@/assets/robotverse-r-logo.png";
import { NotificationCenter } from "@/components/NotificationCenter";
import { NAVIGATION_CONFIG } from "@/constants/navigationMenus";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import UserProductRequestModal from "@/components/UserProductRequestModal";

const menuIcons: Record<string, React.ElementType> = {
  "Robot Parts": Cpu,
  Devices: Monitor,
  Tools: Wrench,
  Software: Code,
};

const navIcons = {
  robots: Bot,
  spares: Package,
  services: Settings,
  logistics: Truck,
  financing: CreditCard,
  robobook: BookOpen,
};

interface DropdownMenuProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

const DropdownMenu = ({ isOpen, onClose, children, className }: DropdownMenuProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      onMouseEnter={(e) => e.stopPropagation()}
      className={cn(
        "absolute top-full left-0 pt-2 dropdown-professional min-w-[240px] animate-in fade-in-0 zoom-in-95 duration-150",
        className,
      )}
    >
      <div className="bg-popover border border-border rounded-xl shadow-xl ring-1 ring-border/50 backdrop-blur-sm">
        {children}
      </div>
    </div>
  );
};

const EnhancedHeader = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { selectedRobots, maxRobots, removeRobot, clearComparison } = useRobotComparison();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);
  const [activeComponentMenu, setActiveComponentMenu] = useState<string | null>(null);
  const [mobileExpandedMenu, setMobileExpandedMenu] = useState<string | null>(null);
  const [mobileExpandedSubMenu, setMobileExpandedSubMenu] = useState<string | null>(null);
  const [mobileExpandedComponentMenu, setMobileExpandedComponentMenu] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [compareDropdownOpen, setCompareDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [userProfile, setUserProfile] = useState<{ full_name?: string; avatar_url?: string } | null>(null);
  const compareDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const componentMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const comparisonCount = selectedRobots.length;

  // Fetch user profile for name and avatar
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        setUserProfile(null);
        return;
      }
      
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setUserProfile(data);
      }
    };
    
    fetchUserProfile();
  }, [user]);

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    return email?.substring(0, 2).toUpperCase() || 'U';
  };

  const getDisplayName = () => {
    if (userProfile?.full_name) {
      return userProfile.full_name;
    }
    return user?.email?.split('@')[0] || 'User';
  };

  const profileMenuItems = [
    { label: 'Account', icon: User, href: '/profile-settings' },
    { label: 'Dashboard', icon: LayoutGrid, href: '/dashboard' },
    { label: 'Subscription & Credits', icon: Crown, href: '/dashboard/credits' },
    { label: 'Privacy & Security', icon: Shield, href: '/dashboard/privacy' },
    { label: 'Settings', icon: Settings, href: '/dashboard/settings' },
  ];

  const handleProfileMenuClick = (href: string) => {
    navigate(href);
    setProfileDropdownOpen(false);
    setMenuOpen(false);
  };

  const handleSignOut = async () => {
    setProfileDropdownOpen(false);
    setMenuOpen(false);
    await signOut();
  };

  // Close compare dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (compareDropdownRef.current && !compareDropdownRef.current.contains(event.target as Node)) {
        setCompareDropdownOpen(false);
      }
    };
    if (compareDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [compareDropdownOpen]);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    if (profileDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileDropdownOpen]);

  const handleCompareClick = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setCompareDropdownOpen(!compareDropdownOpen);
  };

  useChatNotifications();

  // Clear all timeouts on unmount
  useEffect(() => {
    return () => {
      if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
      if (subMenuTimeoutRef.current) clearTimeout(subMenuTimeoutRef.current);
      if (componentMenuTimeoutRef.current) clearTimeout(componentMenuTimeoutRef.current);
    };
  }, []);

  const handleDropdownEnter = useCallback((menu: string) => {
    // Clear any pending close timeout
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
      dropdownTimeoutRef.current = null;
    }
    // Immediately open new dropdown
    setActiveDropdown(menu);
    // Only reset submenus if switching to a different dropdown
    if (activeDropdown !== menu) {
      setActiveSubMenu(null);
      setActiveComponentMenu(null);
    }
  }, [activeDropdown]);

  const handleDropdownLeave = useCallback(() => {
    // Add delay before closing to allow cursor to move to submenu
    dropdownTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
      setActiveSubMenu(null);
      setActiveComponentMenu(null);
    }, 150);
  }, []);

  const handleSubMenuEnter = useCallback((category: string) => {
    // Clear any pending close timeout
    if (subMenuTimeoutRef.current) {
      clearTimeout(subMenuTimeoutRef.current);
      subMenuTimeoutRef.current = null;
    }
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
      dropdownTimeoutRef.current = null;
    }
    setActiveSubMenu(category);
    // Reset component menu when switching categories
    setActiveComponentMenu(null);
  }, []);

  const handleSubMenuLeave = useCallback(() => {
    // Add delay before closing to allow cursor to move to component menu
    subMenuTimeoutRef.current = setTimeout(() => {
      setActiveSubMenu(null);
      setActiveComponentMenu(null);
    }, 150);
  }, []);

  const handleComponentMenuEnter = useCallback((sub: string) => {
    // Clear any pending close timeouts
    if (componentMenuTimeoutRef.current) {
      clearTimeout(componentMenuTimeoutRef.current);
      componentMenuTimeoutRef.current = null;
    }
    if (subMenuTimeoutRef.current) {
      clearTimeout(subMenuTimeoutRef.current);
      subMenuTimeoutRef.current = null;
    }
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
      dropdownTimeoutRef.current = null;
    }
    setActiveComponentMenu(sub);
  }, []);

  const handleComponentMenuLeave = useCallback(() => {
    componentMenuTimeoutRef.current = setTimeout(() => {
      setActiveComponentMenu(null);
    }, 150);
  }, []);

  // Keep dropdown open when hovering over the dropdown content
  const handleDropdownContentEnter = useCallback(() => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
      dropdownTimeoutRef.current = null;
    }
  }, []);

  const handleNavigation = (href: string) => {
    navigate(href);
    setActiveDropdown(null);
    setActiveSubMenu(null);
    setMenuOpen(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/robots?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <>
    <header className="sticky top-0 z-50 bg-[hsl(var(--header-bg))] shadow-[var(--shadow-header)] backdrop-blur-md">
      {/* Top Header - Logo, Search, Icons */}
      <div className="container mx-auto flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-3 flex-shrink-0 group">
          <div className="relative">
            <img
              src={robotverseLogo}
              alt="RobotVerse Logo"
              className="h-11 w-11 object-cover rounded-xl border-2 border-primary/20 shadow-md transition-transform duration-200 group-hover:scale-105"
            />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="hidden sm:block">
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent tracking-tight">
              RobotVerse
            </span>
            <p className="text-[10px] text-muted-foreground font-medium -mt-0.5 tracking-wide">
              INDUSTRIAL ROBOTICS MARKETPLACE
            </p>
          </div>
        </Link>

        {/* Centered Search Bar */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl mx-8">
          <div className="relative w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5 transition-colors group-focus-within:text-primary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search robots, spare parts, services..."
              className="w-full rounded-xl border-2 border-border bg-muted/30 py-3 pl-12 pr-5 text-sm focus:outline-none focus:border-primary focus:bg-background focus:shadow-[var(--shadow-md)] transition-all placeholder:text-muted-foreground/70"
            />
            <kbd className="absolute right-4 top-1/2 -translate-y-1/2 hidden lg:inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 bg-muted px-2 py-1 rounded-md border border-border">
              ⌘K
            </kbd>
          </div>
        </form>

        {/* Right Actions - Icons */}
        <div className="flex items-center space-x-1">
          {/* Submit Request */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRequestModal(true)}
            className="hidden sm:flex items-center gap-1 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors text-xs font-medium"
          >
            <Search className="h-4 w-4" />
            <span className="hidden lg:inline">Submit Request</span>
          </Button>

          {/* RobotVerse AI */}
          <Link to="/ai-assistant" className="hidden sm:flex">
            <Button
              variant="ghost"
              size="sm"
              className="items-center gap-1 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors text-xs font-medium"
            >
              <Bot className="h-4 w-4" />
              <span className="hidden lg:inline">RobotVerse AI</span>
            </Button>
          </Link>

          <Link to="/watchlist" className="hidden sm:flex">
            <Button
              variant="ghost"
              size="icon"
              className="relative h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <Heart className="h-5 w-5" />
              <span className="sr-only">Wishlist</span>
            </Button>
          </Link>

          {/* Compare */}
          <div className="relative hidden sm:block" ref={compareDropdownRef}>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCompareClick}
              className={cn(
                "relative h-10 w-10 rounded-xl transition-colors hover:bg-primary/10 hover:text-primary",
                compareDropdownOpen && "bg-primary/10 text-primary"
              )}
              title={!user ? "Sign in to compare robots" : `Compare robots (${comparisonCount}/${maxRobots})`}
            >
              <Scale className="h-5 w-5" />
              {comparisonCount > 0 && user && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {comparisonCount}
                </span>
              )}
              <span className="sr-only">Compare ({comparisonCount}/{maxRobots})</span>
            </Button>

            {/* Compare Dropdown */}
            {compareDropdownOpen && user && (
              <div className="absolute right-0 top-full mt-2 w-80 dropdown-professional animate-in fade-in-0 zoom-in-95 duration-150 z-50">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">Robot Comparison</h3>
                    <span className="text-xs text-muted-foreground">{comparisonCount}/{maxRobots} selected</span>
                  </div>

                  {comparisonCount === 0 ? (
                    <div className="text-center py-6">
                      <Scale className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No robots selected</p>
                      <p className="text-xs text-muted-foreground mt-1">Browse robots and click "Compare" to add</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3"
                        onClick={() => {
                          setCompareDropdownOpen(false);
                          navigate('/robots');
                        }}
                      >
                        Browse Robots
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {selectedRobots.map((robot) => (
                          <div
                            key={robot.id}
                            className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                          >
                            <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                              {robot.images && robot.images[0] ? (
                                <img src={robot.images[0]} alt={robot.name} className="w-full h-full object-cover" />
                              ) : (
                                <Bot className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{robot.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{robot.brand || robot.robot_type}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                              onClick={() => removeRobot(robot.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-border mt-3 pt-3 space-y-2">
                        <Button
                          className="w-full"
                          disabled={comparisonCount < 2}
                          onClick={() => {
                            setCompareDropdownOpen(false);
                            navigate('/robots/compare');
                          }}
                        >
                          Compare {comparisonCount} Robots
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            clearComparison();
                            setCompareDropdownOpen(false);
                          }}
                        >
                          Clear All
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Notification Center */}
          <NotificationCenter />

          {/* Dashboard / Auth */}
          {user ? (
            <div className="relative hidden sm:block" ref={profileDropdownRef}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-accent transition-colors"
              >
                <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                  <AvatarImage src={userProfile?.avatar_url || ''} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {getInitials(userProfile?.full_name, user.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground hidden lg:block max-w-[120px] truncate">
                  {getDisplayName()}
                </span>
                <ChevronDown className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform hidden lg:block",
                  profileDropdownOpen && "rotate-180"
                )} />
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in-0 zoom-in-95">
                  {/* User Info Header */}
                  <div className="px-4 py-3 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                        <AvatarImage src={userProfile?.avatar_url || ''} />
                        <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                          {getInitials(userProfile?.full_name, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {getDisplayName()}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    {profileMenuItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.href}
                          onClick={() => handleProfileMenuClick(item.href)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                        >
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Sign Out */}
                  <div className="border-t border-border py-2">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link to="/auth">
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-xl px-4 font-medium hover:bg-primary/10 hover:text-primary"
                >
                  Sign In
                </Button>
              </Link>
              <Link to="/auth?signup=true">
                <Button size="sm" className="rounded-xl px-5 font-medium shadow-md hover:shadow-lg transition-shadow">
                  Join Free
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            aria-label="Toggle menu"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            className="lg:hidden p-2.5 rounded-xl hover:bg-muted transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Secondary Navigation - Category Listings */}
      <nav className="hidden lg:block border-t border-[hsl(var(--header-border))] bg-[hsl(var(--nav-bg))]">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between">
            {/* Robots Menu - Professional Mega Menu */}
            <div
              className="relative flex-1 group"
              onMouseEnter={() => handleDropdownEnter("robots")}
              onMouseLeave={handleDropdownLeave}
            >
              <button
                onClick={() => handleNavigation("/robots")}
                className={cn(
                  "nav-item flex items-center justify-center gap-2 w-full",
                  activeDropdown === "robots" && "text-primary"
                )}
              >
                <Bot className="h-4 w-4" />
                <span>Robots</span>
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform duration-200",
                    activeDropdown === "robots" && "rotate-180",
                  )}
                />
              </button>
              
              {/* Professional Mega Menu Dropdown */}
              {activeDropdown === "robots" && (
                <div 
                  className="fixed left-1/2 -translate-x-1/2 top-[120px] w-[95vw] max-w-[900px] z-[100] animate-in fade-in-0 slide-in-from-top-2 duration-200"
                  onMouseEnter={handleDropdownContentEnter}
                  onMouseLeave={handleDropdownLeave}
                >
                  <div className="bg-popover border border-border rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-border/50 bg-gradient-to-r from-primary/5 via-transparent to-accent/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 rounded-xl bg-primary/10 ring-1 ring-primary/20">
                            <Bot className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-foreground">Industrial Robots</h3>
                            <p className="text-xs text-muted-foreground">Browse all robot categories</p>
                          </div>
                        </div>
                        <Link
                          to="/robots"
                          className="group/link flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary hover:text-primary-foreground rounded-lg transition-all duration-200"
                          onClick={() => setActiveDropdown(null)}
                        >
                          View All Robots
                          <ChevronDown className="h-4 w-4 -rotate-90 group-hover/link:translate-x-0.5 transition-transform" />
                        </Link>
                      </div>
                    </div>
                    
                    {/* Robot Types Grid */}
                    <div className="p-6 grid grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto scrollbar-thin">
                      {NAVIGATION_CONFIG.robots.subItems.map((item, index) => (
                        <Link
                          key={item.label}
                          to={item.href}
                          className="group/item flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-primary/30 hover:shadow-md transition-all duration-200"
                          onClick={() => setActiveDropdown(null)}
                        >
                          <div className="p-2 rounded-lg bg-primary/10 group-hover/item:bg-primary/20 transition-colors">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium text-sm text-foreground group-hover/item:text-primary transition-colors">
                            {item.label}
                          </span>
                        </Link>
                      ))}
                    </div>
                    
                    {/* Footer */}
                    <div className="px-6 py-3 border-t border-border/50 bg-muted/20 flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Bot className="h-3.5 w-3.5" />
                          {NAVIGATION_CONFIG.robots.subItems.length} Robot Types
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Link
                          to="/robots"
                          className="text-xs text-muted-foreground hover:text-primary transition-colors"
                          onClick={() => setActiveDropdown(null)}
                        >
                          Browse by Brand
                        </Link>
                        <Link
                          to="/robots"
                          className="text-xs text-muted-foreground hover:text-primary transition-colors"
                          onClick={() => setActiveDropdown(null)}
                        >
                          New Arrivals
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Spare Parts Menu - Professional Mega Menu */}
            <div
              className="relative flex-1 group"
              onMouseEnter={() => handleDropdownEnter("spares")}
              onMouseLeave={handleDropdownLeave}
            >
              <button
                onClick={() => handleNavigation("/parts")}
                className={cn(
                  "nav-item flex items-center justify-center gap-2 w-full",
                  activeDropdown === "spares" && "text-primary"
                )}
              >
                <Package className="h-4 w-4" />
                <span>Spare Parts</span>
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform duration-200",
                    activeDropdown === "spares" && "rotate-180",
                  )}
                />
              </button>
              
              {/* Professional Mega Menu Dropdown */}
              {activeDropdown === "spares" && (
                <div 
                  className="fixed left-1/2 -translate-x-1/2 top-[120px] w-[95vw] max-w-[1400px] z-[100] animate-in fade-in-0 slide-in-from-top-2 duration-200"
                  onMouseEnter={handleDropdownContentEnter}
                  onMouseLeave={handleDropdownLeave}
                >
                  <div className="bg-popover border border-border rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
                    {/* Professional Header */}
                    <div className="px-6 py-4 border-b border-border/50 bg-gradient-to-r from-primary/5 via-transparent to-accent/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 rounded-xl bg-primary/10 ring-1 ring-primary/20">
                            <Package className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-foreground">Spare Parts Catalog</h3>
                            <p className="text-xs text-muted-foreground">Browse all categories and components</p>
                          </div>
                        </div>
                        <Link
                          to="/parts"
                          className="group/link flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary hover:text-primary-foreground rounded-lg transition-all duration-200"
                          onClick={() => setActiveDropdown(null)}
                        >
                          View All Parts
                          <ChevronDown className="h-4 w-4 -rotate-90 group-hover/link:translate-x-0.5 transition-transform" />
                        </Link>
                      </div>
                    </div>
                    
                    {/* Categories Grid - Professional Card Layout */}
                    <div className="p-6 grid grid-cols-4 gap-5 max-h-[65vh] overflow-y-auto scrollbar-thin">
                      {NAVIGATION_CONFIG.spares.categories.map((category) => {
                        const IconComponent = menuIcons[category.label] || Package;
                        return (
                          <div 
                            key={category.label} 
                            className="group/card rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-200"
                          >
                            {/* Category Card Header */}
                            <Link
                              to={category.href}
                              className="flex items-center gap-3 p-4 border-b border-border/30 hover:bg-primary/5 transition-colors rounded-t-xl"
                              onClick={() => setActiveDropdown(null)}
                            >
                              <div className="p-2 rounded-lg bg-primary/10 group-hover/card:bg-primary/20 transition-colors">
                                <IconComponent className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm text-foreground group-hover/card:text-primary transition-colors truncate">
                                  {category.label}
                                </h4>
                                <p className="text-[10px] text-muted-foreground">
                                  {category.subcategories.length} subcategories
                                </p>
                              </div>
                              <ChevronDown className="h-4 w-4 text-muted-foreground -rotate-90 opacity-0 group-hover/card:opacity-100 transition-all" />
                            </Link>
                            
                            {/* Subcategories List */}
                            <div className="p-3 space-y-1 max-h-[280px] overflow-y-auto scrollbar-thin">
                              {category.subcategories.map((sub) => (
                                <div key={sub.label} className="group/sub">
                                  <Link
                                    to={sub.href}
                                    className="flex items-center justify-between px-3 py-2 text-sm text-foreground/90 hover:text-primary hover:bg-primary/5 rounded-lg transition-all duration-150"
                                    onClick={() => setActiveDropdown(null)}
                                  >
                                    <span className="font-medium truncate">{sub.label}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0 ml-2">
                                      {sub.componentTypes.length}
                                    </span>
                                  </Link>
                                  
                                  {/* Component Types - Compact Grid */}
                                  <div className="mt-1 ml-3 pl-3 border-l border-border/40 space-y-0.5">
                                    {sub.componentTypes.slice(0, 4).map((ct) => (
                                      <Link
                                        key={ct.label}
                                        to={ct.href}
                                        className="block px-2 py-1 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 rounded transition-colors truncate"
                                        onClick={() => setActiveDropdown(null)}
                                      >
                                        {ct.label}
                                      </Link>
                                    ))}
                                    {sub.componentTypes.length > 4 && (
                                      <Link
                                        to={sub.href}
                                        className="block px-2 py-1 text-xs text-primary/70 hover:text-primary font-medium rounded transition-colors"
                                        onClick={() => setActiveDropdown(null)}
                                      >
                                        +{sub.componentTypes.length - 4} more items
                                      </Link>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Footer Quick Links */}
                    <div className="px-6 py-3 border-t border-border/50 bg-muted/20 flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Package className="h-3.5 w-3.5" />
                          {NAVIGATION_CONFIG.spares.categories.reduce((acc, cat) => 
                            acc + cat.subcategories.reduce((subAcc, sub) => subAcc + sub.componentTypes.length, 0), 0
                          )}+ Components
                        </span>
                        <span className="w-px h-4 bg-border" />
                        <span>{NAVIGATION_CONFIG.spares.categories.length} Categories</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Link
                          to="/parts"
                          className="text-xs text-muted-foreground hover:text-primary transition-colors"
                          onClick={() => setActiveDropdown(null)}
                        >
                          Browse by Brand
                        </Link>
                        <Link
                          to="/parts"
                          className="text-xs text-muted-foreground hover:text-primary transition-colors"
                          onClick={() => setActiveDropdown(null)}
                        >
                          New Arrivals
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Services Menu - Professional Mega Menu */}
            <div
              className="relative flex-1 group"
              onMouseEnter={() => handleDropdownEnter("services")}
              onMouseLeave={handleDropdownLeave}
            >
              <button
                onClick={() => handleNavigation("/services")}
                className={cn(
                  "nav-item flex items-center justify-center gap-2 w-full",
                  activeDropdown === "services" && "text-primary"
                )}
              >
                <Settings className="h-4 w-4" />
                <span>Services</span>
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform duration-200",
                    activeDropdown === "services" && "rotate-180",
                  )}
                />
              </button>
              
              {/* Professional Mega Menu Dropdown */}
              {activeDropdown === "services" && (
                <div 
                  className="fixed left-1/2 -translate-x-1/2 top-[120px] w-[95vw] max-w-[800px] z-[100] animate-in fade-in-0 slide-in-from-top-2 duration-200"
                  onMouseEnter={handleDropdownContentEnter}
                  onMouseLeave={handleDropdownLeave}
                >
                  <div className="bg-popover border border-border rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-border/50 bg-gradient-to-r from-primary/5 via-transparent to-accent/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 rounded-xl bg-primary/10 ring-1 ring-primary/20">
                            <Settings className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-foreground">Robot Services</h3>
                            <p className="text-xs text-muted-foreground">Professional robot services and support</p>
                          </div>
                        </div>
                        <Link
                          to="/services"
                          className="group/link flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary hover:text-primary-foreground rounded-lg transition-all duration-200"
                          onClick={() => setActiveDropdown(null)}
                        >
                          View All Services
                          <ChevronDown className="h-4 w-4 -rotate-90 group-hover/link:translate-x-0.5 transition-transform" />
                        </Link>
                      </div>
                    </div>
                    
                    {/* Services Grid */}
                    <div className="p-6 grid grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto scrollbar-thin">
                      {NAVIGATION_CONFIG.services.subItems.map((item) => (
                        <Link
                          key={item.label}
                          to={item.href}
                          className="group/item flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-primary/30 hover:shadow-md transition-all duration-200"
                          onClick={() => setActiveDropdown(null)}
                        >
                          <div className="p-2 rounded-lg bg-primary/10 group-hover/item:bg-primary/20 transition-colors">
                            <Wrench className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <span className="font-medium text-sm text-foreground group-hover/item:text-primary transition-colors block">
                              {item.label}
                            </span>
                            <span className="text-xs text-muted-foreground">Professional service</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                    
                    {/* Footer */}
                    <div className="px-6 py-3 border-t border-border/50 bg-muted/20 flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Settings className="h-3.5 w-3.5" />
                          {NAVIGATION_CONFIG.services.subItems.length} Service Types
                        </span>
                      </div>
                      <Link
                        to="/services"
                        className="text-xs text-muted-foreground hover:text-primary transition-colors"
                        onClick={() => setActiveDropdown(null)}
                      >
                        Request Custom Service
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Logistics Menu - Professional Mega Menu */}
            <div
              className="relative flex-1 group"
              onMouseEnter={() => handleDropdownEnter("logistics")}
              onMouseLeave={handleDropdownLeave}
            >
              <button
                onClick={() => handleNavigation("/logistics")}
                className={cn(
                  "nav-item flex items-center justify-center gap-2 w-full",
                  activeDropdown === "logistics" && "text-primary"
                )}
              >
                <Truck className="h-4 w-4" />
                <span>Logistics</span>
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform duration-200",
                    activeDropdown === "logistics" && "rotate-180",
                  )}
                />
              </button>
              
              {/* Professional Mega Menu Dropdown */}
              {activeDropdown === "logistics" && (
                <div 
                  className="fixed left-1/2 -translate-x-1/2 top-[120px] w-[95vw] max-w-[800px] z-[100] animate-in fade-in-0 slide-in-from-top-2 duration-200"
                  onMouseEnter={handleDropdownContentEnter}
                  onMouseLeave={handleDropdownLeave}
                >
                  <div className="bg-popover border border-border rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-border/50 bg-gradient-to-r from-primary/5 via-transparent to-accent/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 rounded-xl bg-primary/10 ring-1 ring-primary/20">
                            <Truck className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-foreground">Logistics & Shipping</h3>
                            <p className="text-xs text-muted-foreground">Transport solutions for industrial equipment</p>
                          </div>
                        </div>
                        <Link
                          to="/logistics"
                          className="group/link flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary hover:text-primary-foreground rounded-lg transition-all duration-200"
                          onClick={() => setActiveDropdown(null)}
                        >
                          View All Logistics
                          <ChevronDown className="h-4 w-4 -rotate-90 group-hover/link:translate-x-0.5 transition-transform" />
                        </Link>
                      </div>
                    </div>
                    
                    {/* Logistics Grid */}
                    <div className="p-6 grid grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto scrollbar-thin">
                      {NAVIGATION_CONFIG.logistics.subItems.map((item) => (
                        <Link
                          key={item.label}
                          to={item.href}
                          className="group/item flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-primary/30 hover:shadow-md transition-all duration-200"
                          onClick={() => setActiveDropdown(null)}
                        >
                          <div className="p-2 rounded-lg bg-primary/10 group-hover/item:bg-primary/20 transition-colors">
                            <Truck className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <span className="font-medium text-sm text-foreground group-hover/item:text-primary transition-colors block">
                              {item.label}
                            </span>
                            <span className="text-xs text-muted-foreground">Reliable delivery</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                    
                    {/* Footer */}
                    <div className="px-6 py-3 border-t border-border/50 bg-muted/20 flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Truck className="h-3.5 w-3.5" />
                          {NAVIGATION_CONFIG.logistics.subItems.length} Shipping Options
                        </span>
                      </div>
                      <Link
                        to="/logistics"
                        className="text-xs text-muted-foreground hover:text-primary transition-colors"
                        onClick={() => setActiveDropdown(null)}
                      >
                        Get Shipping Quote
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Financing Menu - Professional Mega Menu */}
            <div
              className="relative flex-1 group"
              onMouseEnter={() => handleDropdownEnter("financing")}
              onMouseLeave={handleDropdownLeave}
            >
              <button
                onClick={() => handleNavigation("/financing")}
                className={cn(
                  "nav-item flex items-center justify-center gap-2 w-full",
                  activeDropdown === "financing" && "text-primary"
                )}
              >
                <CreditCard className="h-4 w-4" />
                <span>Financing</span>
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform duration-200",
                    activeDropdown === "financing" && "rotate-180",
                  )}
                />
              </button>
              
              {/* Professional Mega Menu Dropdown */}
              {activeDropdown === "financing" && (
                <div 
                  className="fixed left-1/2 -translate-x-1/2 top-[120px] w-[95vw] max-w-[800px] z-[100] animate-in fade-in-0 slide-in-from-top-2 duration-200"
                  onMouseEnter={handleDropdownContentEnter}
                  onMouseLeave={handleDropdownLeave}
                >
                  <div className="bg-popover border border-border rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-border/50 bg-gradient-to-r from-primary/5 via-transparent to-accent/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 rounded-xl bg-primary/10 ring-1 ring-primary/20">
                            <CreditCard className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-foreground">Financing Options</h3>
                            <p className="text-xs text-muted-foreground">Flexible funding for your equipment needs</p>
                          </div>
                        </div>
                        <Link
                          to="/financing"
                          className="group/link flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary hover:text-primary-foreground rounded-lg transition-all duration-200"
                          onClick={() => setActiveDropdown(null)}
                        >
                          View All Options
                          <ChevronDown className="h-4 w-4 -rotate-90 group-hover/link:translate-x-0.5 transition-transform" />
                        </Link>
                      </div>
                    </div>
                    
                    {/* Financing Grid */}
                    <div className="p-6 grid grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto scrollbar-thin">
                      {NAVIGATION_CONFIG.financing.subItems.map((item) => (
                        <Link
                          key={item.label}
                          to={item.href}
                          className="group/item flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-primary/30 hover:shadow-md transition-all duration-200"
                          onClick={() => setActiveDropdown(null)}
                        >
                          <div className="p-2 rounded-lg bg-primary/10 group-hover/item:bg-primary/20 transition-colors">
                            <CreditCard className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <span className="font-medium text-sm text-foreground group-hover/item:text-primary transition-colors block">
                              {item.label}
                            </span>
                            <span className="text-xs text-muted-foreground">Competitive rates</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                    
                    {/* Footer */}
                    <div className="px-6 py-3 border-t border-border/50 bg-muted/20 flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <CreditCard className="h-3.5 w-3.5" />
                          {NAVIGATION_CONFIG.financing.subItems.length} Finance Products
                        </span>
                      </div>
                      <Link
                        to="/financing"
                        className="text-xs text-muted-foreground hover:text-primary transition-colors"
                        onClick={() => setActiveDropdown(null)}
                      >
                        Calculate EMI
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* RoboBook Menu - Professional Mega Menu */}
            <div
              className="relative flex-1 group"
              onMouseEnter={() => handleDropdownEnter("robobook")}
              onMouseLeave={handleDropdownLeave}
            >
              <button
                onClick={() => handleNavigation("/robobook")}
                className={cn(
                  "nav-item flex items-center justify-center gap-2 w-full",
                  activeDropdown === "robobook" && "text-primary"
                )}
              >
                <BookOpen className="h-4 w-4" />
                <span>RoboBook</span>
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform duration-200",
                    activeDropdown === "robobook" && "rotate-180",
                  )}
                />
              </button>
              
              {/* Professional Mega Menu Dropdown */}
              {activeDropdown === "robobook" && (
                <div 
                  className="fixed left-1/2 -translate-x-1/2 top-[120px] w-[95vw] max-w-[700px] z-[100] animate-in fade-in-0 slide-in-from-top-2 duration-200"
                  onMouseEnter={handleDropdownContentEnter}
                  onMouseLeave={handleDropdownLeave}
                >
                  <div className="bg-popover border border-border rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-border/50 bg-gradient-to-r from-primary/5 via-transparent to-accent/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 rounded-xl bg-primary/10 ring-1 ring-primary/20">
                            <BookOpen className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-foreground">RoboBook Community</h3>
                            <p className="text-xs text-muted-foreground">Articles, videos, and community posts</p>
                          </div>
                        </div>
                        <Link
                          to="/robobook"
                          className="group/link flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary hover:text-primary-foreground rounded-lg transition-all duration-200"
                          onClick={() => setActiveDropdown(null)}
                        >
                          View All Content
                          <ChevronDown className="h-4 w-4 -rotate-90 group-hover/link:translate-x-0.5 transition-transform" />
                        </Link>
                      </div>
                    </div>
                    
                    {/* RoboBook Grid */}
                    <div className="p-6 grid grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto scrollbar-thin">
                      {NAVIGATION_CONFIG.robobook.subItems.map((item) => (
                        <Link
                          key={item.label}
                          to={item.href}
                          className="group/item flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-primary/30 hover:shadow-md transition-all duration-200"
                          onClick={() => setActiveDropdown(null)}
                        >
                          <div className="p-2 rounded-lg bg-primary/10 group-hover/item:bg-primary/20 transition-colors">
                            <BookOpen className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <span className="font-medium text-sm text-foreground group-hover/item:text-primary transition-colors block">
                              {item.label}
                            </span>
                            <span className="text-xs text-muted-foreground">Community content</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                    
                    {/* Footer */}
                    <div className="px-6 py-3 border-t border-border/50 bg-muted/20 flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5" />
                          {NAVIGATION_CONFIG.robobook.subItems.length} Content Types
                        </span>
                      </div>
                      <Link
                        to="/robobook"
                        className="text-xs text-muted-foreground hover:text-primary transition-colors"
                        onClick={() => setActiveDropdown(null)}
                      >
                        Create Post
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden border-t border-border bg-background px-4 pb-4 max-h-[80vh] overflow-y-auto">
          {/* Mobile Search */}
          <form onSubmit={handleSearch} className="pt-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full rounded-full border border-border bg-muted/50 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </form>

          {/* Mobile Quick Actions */}
          <div className="flex items-center justify-around py-3 mb-4 border-b border-border">
            <Link to="/watchlist" onClick={() => setMenuOpen(false)} className="flex flex-col items-center gap-1">
              <Heart className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Wishlist</span>
            </Link>
            <button className="flex flex-col items-center gap-1">
              <Scale className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Compare</span>
            </button>
            {user && (
              <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="flex flex-col items-center gap-1">
                <LayoutGrid className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Dashboard</span>
              </Link>
            )}
          </div>

          <nav className="flex flex-col space-y-1">
            {/* Robots */}
            <div>
              <button
                className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted rounded-md transition"
                onClick={() => setMobileExpandedMenu(mobileExpandedMenu === "robots" ? null : "robots")}
              >
                <span className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Robots
                </span>
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform", mobileExpandedMenu === "robots" && "rotate-180")}
                />
              </button>
              {mobileExpandedMenu === "robots" && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-3">
                  <Link
                    to="/robots"
                    className="block px-3 py-2 text-sm font-medium text-primary"
                    onClick={() => setMenuOpen(false)}
                  >
                    All Robots
                  </Link>
                  {NAVIGATION_CONFIG.robots.subItems.map((item) => (
                    <Link
                      key={item.label}
                      to={item.href}
                      className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                      onClick={() => setMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Spare Parts - Multi-level */}
            <div>
              <button
                className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted rounded-md transition"
                onClick={() => setMobileExpandedMenu(mobileExpandedMenu === "spares" ? null : "spares")}
              >
                <span className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Spare Parts
                </span>
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform", mobileExpandedMenu === "spares" && "rotate-180")}
                />
              </button>
              {mobileExpandedMenu === "spares" && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-3">
                  <Link
                    to="/parts"
                    className="block px-3 py-2 text-sm font-medium text-primary"
                    onClick={() => setMenuOpen(false)}
                  >
                    All Spare Parts
                  </Link>
                  {NAVIGATION_CONFIG.spares.categories.map((category) => {
                    const IconComponent = menuIcons[category.label] || Package;
                    return (
                      <div key={category.label}>
                        <button
                          className="flex items-center justify-between w-full px-3 py-2 text-sm text-foreground hover:text-primary"
                          onClick={() =>
                            setMobileExpandedSubMenu(mobileExpandedSubMenu === category.label ? null : category.label)
                          }
                        >
                          <span className="flex items-center gap-2">
                            <IconComponent className="h-3.5 w-3.5" />
                            {category.label}
                          </span>
                          <ChevronDown
                            className={cn(
                              "h-3 w-3 transition-transform",
                              mobileExpandedSubMenu === category.label && "rotate-180",
                            )}
                          />
                        </button>
                        {mobileExpandedSubMenu === category.label && (
                          <div className="ml-4 mt-1 space-y-1 border-l border-border/50 pl-3">
                            <Link
                              to={category.href}
                              className="block px-2 py-1.5 text-xs font-medium text-primary"
                              onClick={() => setMenuOpen(false)}
                            >
                              All {category.label}
                            </Link>
                            {category.subcategories.map((sub) => (
                              <div key={sub.label}>
                                <button
                                  className="flex items-center justify-between w-full px-2 py-1.5 text-xs text-foreground hover:text-primary"
                                  onClick={() =>
                                    setMobileExpandedComponentMenu(
                                      mobileExpandedComponentMenu === sub.label ? null : sub.label,
                                    )
                                  }
                                >
                                  <span>{sub.label}</span>
                                  <ChevronDown
                                    className={cn(
                                      "h-3 w-3 transition-transform",
                                      mobileExpandedComponentMenu === sub.label && "rotate-180",
                                    )}
                                  />
                                </button>
                                {mobileExpandedComponentMenu === sub.label &&
                                  sub.componentTypes &&
                                  sub.componentTypes.length > 0 && (
                                    <div className="ml-3 mt-1 space-y-0.5 border-l border-border/30 pl-2">
                                      <Link
                                        to={sub.href}
                                        className="block px-2 py-1 text-xs font-medium text-primary"
                                        onClick={() => setMenuOpen(false)}
                                      >
                                        All {sub.label}
                                      </Link>
                                      {sub.componentTypes.map((ct) => (
                                        <Link
                                          key={ct.label}
                                          to={ct.href}
                                          className="block px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                                          onClick={() => setMenuOpen(false)}
                                        >
                                          {ct.label}
                                        </Link>
                                      ))}
                                    </div>
                                  )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Services */}
            <div>
              <button
                className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted rounded-md transition"
                onClick={() => setMobileExpandedMenu(mobileExpandedMenu === "services" ? null : "services")}
              >
                <span className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Services
                </span>
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform", mobileExpandedMenu === "services" && "rotate-180")}
                />
              </button>
              {mobileExpandedMenu === "services" && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-3">
                  <Link
                    to="/services"
                    className="block px-3 py-2 text-sm font-medium text-primary"
                    onClick={() => setMenuOpen(false)}
                  >
                    All Services
                  </Link>
                  {NAVIGATION_CONFIG.services.subItems.map((item) => (
                    <Link
                      key={item.label}
                      to={item.href}
                      className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                      onClick={() => setMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Logistics */}
            <div>
              <button
                className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted rounded-md transition"
                onClick={() => setMobileExpandedMenu(mobileExpandedMenu === "logistics" ? null : "logistics")}
              >
                <span className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Logistics
                </span>
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform", mobileExpandedMenu === "logistics" && "rotate-180")}
                />
              </button>
              {mobileExpandedMenu === "logistics" && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-3">
                  <Link
                    to="/logistics"
                    className="block px-3 py-2 text-sm font-medium text-primary"
                    onClick={() => setMenuOpen(false)}
                  >
                    All Logistics
                  </Link>
                  {NAVIGATION_CONFIG.logistics.subItems.map((item) => (
                    <Link
                      key={item.label}
                      to={item.href}
                      className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                      onClick={() => setMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Financing */}
            <div>
              <button
                className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted rounded-md transition"
                onClick={() => setMobileExpandedMenu(mobileExpandedMenu === "financing" ? null : "financing")}
              >
                <span className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Financing
                </span>
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform", mobileExpandedMenu === "financing" && "rotate-180")}
                />
              </button>
              {mobileExpandedMenu === "financing" && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-3">
                  <Link
                    to="/financing"
                    className="block px-3 py-2 text-sm font-medium text-primary"
                    onClick={() => setMenuOpen(false)}
                  >
                    All Financing
                  </Link>
                  {NAVIGATION_CONFIG.financing.subItems.map((item) => (
                    <Link
                      key={item.label}
                      to={item.href}
                      className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                      onClick={() => setMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* RoboBook */}
            <div>
              <button
                className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted rounded-md transition"
                onClick={() => setMobileExpandedMenu(mobileExpandedMenu === "robobook" ? null : "robobook")}
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  RoboBook
                </span>
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform", mobileExpandedMenu === "robobook" && "rotate-180")}
                />
              </button>
              {mobileExpandedMenu === "robobook" && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-3">
                  <Link
                    to="/robobook"
                    className="block px-3 py-2 text-sm font-medium text-primary"
                    onClick={() => setMenuOpen(false)}
                  >
                    All Articles
                  </Link>
                  {NAVIGATION_CONFIG.robobook.subItems.map((item) => (
                    <Link
                      key={item.label}
                      to={item.href}
                      className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                      onClick={() => setMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Mobile Auth */}
          <div className="mt-4 pt-4 border-t border-border">
            {user ? (
              <div className="space-y-3">
                {/* User Profile Header */}
                <div className="flex items-center gap-3 px-3 pb-3 border-b border-border">
                  <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                    <AvatarImage src={userProfile?.avatar_url || ''} />
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                      {getInitials(userProfile?.full_name, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {getDisplayName()}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                </div>

                {/* Profile Menu Items */}
                <div className="space-y-1">
                  {profileMenuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                      >
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>

                {/* Sign Out Button */}
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10" 
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Link to="/auth" onClick={() => setMenuOpen(false)}>
                  <Button size="sm" variant="ghost" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link to="/auth?signup=true" onClick={() => setMenuOpen(false)}>
                  <Button size="sm" className="w-full">
                    Join Free
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
    <UserProductRequestModal open={showRequestModal} onOpenChange={setShowRequestModal} />
    </>
  );
};

export default EnhancedHeader;
