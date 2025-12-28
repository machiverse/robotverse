import { useState, useRef, useEffect } from "react";
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
  GitCompare,
  Bell,
  LayoutDashboard,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useChatNotifications } from "@/hooks/useChatNotifications";
import robotverseLogo from "@/assets/robotverse-r-logo.png";
import { NotificationCenter } from "@/components/NotificationCenter";
import { NAVIGATION_CONFIG } from "@/constants/navigationMenus";
import { cn } from "@/lib/utils";

const menuIcons: Record<string, React.ElementType> = {
  "Robot Parts": Cpu,
  "Devices": Monitor,
  "Tools": Wrench,
  "Software": Code,
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
      className={cn(
        "absolute top-full left-0 mt-2 dropdown-professional min-w-[240px] animate-in fade-in-0 zoom-in-95 duration-150",
        className
      )}
    >
      {children}
    </div>
  );
};

const EnhancedHeader = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);
  const [activeComponentMenu, setActiveComponentMenu] = useState<string | null>(null);
  const [mobileExpandedMenu, setMobileExpandedMenu] = useState<string | null>(null);
  const [mobileExpandedSubMenu, setMobileExpandedSubMenu] = useState<string | null>(null);
  const [mobileExpandedComponentMenu, setMobileExpandedComponentMenu] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  useChatNotifications();

  const handleDropdownEnter = (menu: string) => {
    setActiveDropdown(menu);
    setActiveSubMenu(null);
    setActiveComponentMenu(null);
  };

  const handleDropdownLeave = () => {
    setActiveDropdown(null);
    setActiveSubMenu(null);
    setActiveComponentMenu(null);
  };

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
            <p className="text-[10px] text-muted-foreground font-medium -mt-0.5 tracking-wide">INDUSTRIAL MARKETPLACE</p>
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
          {/* Wishlist */}
          <Link to="/watchlist" className="hidden sm:flex">
            <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors">
              <Heart className="h-5 w-5" />
              <span className="sr-only">Wishlist</span>
            </Button>
          </Link>

          {/* Compare */}
          <Button variant="ghost" size="icon" className="hidden sm:flex relative h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors">
            <GitCompare className="h-5 w-5" />
            <span className="sr-only">Compare</span>
          </Button>

          {/* Notification Center */}
          <NotificationCenter />

          {/* Dashboard / Auth */}
          {user ? (
            <>
              <Link to="/dashboard" className="hidden sm:flex">
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors">
                  <LayoutDashboard className="h-5 w-5" />
                  <span className="sr-only">Dashboard</span>
                </Button>
              </Link>
              <div className="hidden lg:block w-px h-8 bg-border mx-2" />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={signOut}
                className="hidden lg:flex items-center gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl px-4 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-medium">Sign Out</span>
              </Button>
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link to="/auth">
                <Button size="sm" variant="ghost" className="rounded-xl px-4 font-medium hover:bg-primary/10 hover:text-primary">
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
            {/* Robots Menu */}
            <div
              className="relative flex-1"
              onMouseEnter={() => handleDropdownEnter("robots")}
              onMouseLeave={handleDropdownLeave}
            >
              <button
                onClick={() => handleNavigation("/robots")}
                className="nav-item flex items-center justify-center gap-2 w-full"
              >
                <Bot className="h-4 w-4" />
                <span>Robots</span>
                <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", activeDropdown === "robots" && "rotate-180")} />
              </button>
              <DropdownMenu isOpen={activeDropdown === "robots"} onClose={() => setActiveDropdown(null)}>
                <div className="p-3 max-h-[400px] overflow-y-auto">
                  <Link
                    to="/robots"
                    className="dropdown-item font-semibold text-primary"
                    onClick={() => setActiveDropdown(null)}
                  >
                    <Bot className="h-4 w-4" />
                    All Robots
                  </Link>
                  <div className="border-t border-border my-2" />
                  {NAVIGATION_CONFIG.robots.subItems.map((item) => (
                    <Link
                      key={item.label}
                      to={item.href}
                      className="dropdown-item"
                      onClick={() => setActiveDropdown(null)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </DropdownMenu>
            </div>

            {/* Spare Parts Menu - Multi-level */}
            <div
              className="relative flex-1"
              onMouseEnter={() => handleDropdownEnter("spares")}
              onMouseLeave={handleDropdownLeave}
            >
              <button
                onClick={() => handleNavigation("/parts")}
                className="nav-item flex items-center justify-center gap-2 w-full"
              >
                <Package className="h-4 w-4" />
                <span>Spare Parts</span>
                <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", activeDropdown === "spares" && "rotate-180")} />
              </button>
              <DropdownMenu 
                isOpen={activeDropdown === "spares"} 
                onClose={() => setActiveDropdown(null)}
                className="min-w-[260px]"
              >
                <div className="p-3">
                  <Link
                    to="/parts"
                    className="dropdown-item font-semibold text-primary"
                    onClick={() => setActiveDropdown(null)}
                  >
                    <Package className="h-4 w-4" />
                    All Spare Parts
                  </Link>
                  <div className="border-t border-border my-2" />
                  {NAVIGATION_CONFIG.spares.categories.map((category) => {
                    const IconComponent = menuIcons[category.label] || Package;
                    return (
                      <div
                        key={category.label}
                        className="relative"
                        onMouseEnter={() => setActiveSubMenu(category.label)}
                      >
                        <Link
                          to={category.href}
                          className="dropdown-item justify-between group"
                          onClick={() => setActiveDropdown(null)}
                        >
                          <span className="flex items-center gap-3">
                            <IconComponent className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            {category.label}
                          </span>
                          <ChevronDown className="h-3 w-3 -rotate-90 text-muted-foreground group-hover:text-primary transition-colors" />
                        </Link>
                        {/* Sub-menu subcategories */}
                        {activeSubMenu === category.label && (
                          <div className="absolute left-full top-0 ml-1 dropdown-professional min-w-[280px] max-h-[450px] overflow-y-auto">
                            <div className="p-3">
                              <Link
                                to={category.href}
                                className="dropdown-item font-semibold text-primary"
                                onClick={() => setActiveDropdown(null)}
                              >
                                All {category.label}
                              </Link>
                              <div className="border-t border-border my-2" />
                              {category.subcategories.map((sub) => (
                                <div
                                  key={sub.label}
                                  className="relative"
                                  onMouseEnter={() => setActiveComponentMenu(sub.label)}
                                >
                                  <Link
                                    to={sub.href}
                                    className="dropdown-item justify-between group"
                                    onClick={() => setActiveDropdown(null)}
                                  >
                                    <span>{sub.label}</span>
                                    <ChevronDown className="h-3 w-3 -rotate-90 text-muted-foreground group-hover:text-primary transition-colors" />
                                  </Link>
                                  {/* Third level - Component Types */}
                                  {activeComponentMenu === sub.label && sub.componentTypes && sub.componentTypes.length > 0 && (
                                    <div className="absolute left-full top-0 ml-1 dropdown-professional min-w-[280px] max-h-[450px] overflow-y-auto">
                                      <div className="p-3">
                                        <Link
                                          to={sub.href}
                                          className="dropdown-item font-semibold text-primary"
                                          onClick={() => setActiveDropdown(null)}
                                        >
                                          All {sub.label}
                                        </Link>
                                        <div className="border-t border-border my-2" />
                                        {sub.componentTypes.map((ct) => (
                                          <Link
                                            key={ct.label}
                                            to={ct.href}
                                            className="dropdown-item"
                                            onClick={() => setActiveDropdown(null)}
                                          >
                                            {ct.label}
                                          </Link>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </DropdownMenu>
            </div>

            {/* Services Menu */}
            <div
              className="relative flex-1"
              onMouseEnter={() => handleDropdownEnter("services")}
              onMouseLeave={handleDropdownLeave}
            >
              <button
                onClick={() => handleNavigation("/services")}
                className="nav-item flex items-center justify-center gap-2 w-full"
              >
                <Settings className="h-4 w-4" />
                <span>Services</span>
                <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", activeDropdown === "services" && "rotate-180")} />
              </button>
              <DropdownMenu isOpen={activeDropdown === "services"} onClose={() => setActiveDropdown(null)}>
                <div className="p-3 max-h-[400px] overflow-y-auto">
                  <Link
                    to="/services"
                    className="dropdown-item font-semibold text-primary"
                    onClick={() => setActiveDropdown(null)}
                  >
                    <Settings className="h-4 w-4" />
                    All Services
                  </Link>
                  <div className="border-t border-border my-2" />
                  {NAVIGATION_CONFIG.services.subItems.map((item) => (
                    <Link
                      key={item.label}
                      to={item.href}
                      className="dropdown-item"
                      onClick={() => setActiveDropdown(null)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </DropdownMenu>
            </div>

            {/* Logistics Menu */}
            <div
              className="relative flex-1"
              onMouseEnter={() => handleDropdownEnter("logistics")}
              onMouseLeave={handleDropdownLeave}
            >
              <button
                onClick={() => handleNavigation("/logistics")}
                className="nav-item flex items-center justify-center gap-2 w-full"
              >
                <Truck className="h-4 w-4" />
                <span>Logistics</span>
                <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", activeDropdown === "logistics" && "rotate-180")} />
              </button>
              <DropdownMenu isOpen={activeDropdown === "logistics"} onClose={() => setActiveDropdown(null)}>
                <div className="p-3 max-h-[400px] overflow-y-auto">
                  <Link
                    to="/logistics"
                    className="dropdown-item font-semibold text-primary"
                    onClick={() => setActiveDropdown(null)}
                  >
                    <Truck className="h-4 w-4" />
                    All Logistics
                  </Link>
                  <div className="border-t border-border my-2" />
                  {NAVIGATION_CONFIG.logistics.subItems.map((item) => (
                    <Link
                      key={item.label}
                      to={item.href}
                      className="dropdown-item"
                      onClick={() => setActiveDropdown(null)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </DropdownMenu>
            </div>

            {/* Financing Menu */}
            <div
              className="relative flex-1"
              onMouseEnter={() => handleDropdownEnter("financing")}
              onMouseLeave={handleDropdownLeave}
            >
              <button
                onClick={() => handleNavigation("/financing")}
                className="nav-item flex items-center justify-center gap-2 w-full"
              >
                <CreditCard className="h-4 w-4" />
                <span>Financing</span>
                <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", activeDropdown === "financing" && "rotate-180")} />
              </button>
              <DropdownMenu isOpen={activeDropdown === "financing"} onClose={() => setActiveDropdown(null)}>
                <div className="p-3 max-h-[400px] overflow-y-auto">
                  <Link
                    to="/financing"
                    className="dropdown-item font-semibold text-primary"
                    onClick={() => setActiveDropdown(null)}
                  >
                    <CreditCard className="h-4 w-4" />
                    All Financing
                  </Link>
                  <div className="border-t border-border my-2" />
                  {NAVIGATION_CONFIG.financing.subItems.map((item) => (
                    <Link
                      key={item.label}
                      to={item.href}
                      className="dropdown-item"
                      onClick={() => setActiveDropdown(null)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </DropdownMenu>
            </div>

            {/* RoboBook Menu */}
            <div
              className="relative flex-1"
              onMouseEnter={() => handleDropdownEnter("robobook")}
              onMouseLeave={handleDropdownLeave}
            >
              <button
                onClick={() => handleNavigation("/robobook")}
                className="nav-item flex items-center justify-center gap-2 w-full"
              >
                <BookOpen className="h-4 w-4" />
                <span>RoboBook</span>
                <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", activeDropdown === "robobook" && "rotate-180")} />
              </button>
              <DropdownMenu isOpen={activeDropdown === "robobook"} onClose={() => setActiveDropdown(null)}>
                <div className="p-3 max-h-[400px] overflow-y-auto">
                  <Link
                    to="/robobook"
                    className="dropdown-item font-semibold text-primary"
                    onClick={() => setActiveDropdown(null)}
                  >
                    <BookOpen className="h-4 w-4" />
                    All Articles
                  </Link>
                  <div className="border-t border-border my-2" />
                  {NAVIGATION_CONFIG.robobook.subItems.map((item) => (
                    <Link
                      key={item.label}
                      to={item.href}
                      className="dropdown-item"
                      onClick={() => setActiveDropdown(null)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </DropdownMenu>
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
              <GitCompare className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Compare</span>
            </button>
            {user && (
              <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="flex flex-col items-center gap-1">
                <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
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
                <ChevronDown className={cn("h-4 w-4 transition-transform", mobileExpandedMenu === "robots" && "rotate-180")} />
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
                <ChevronDown className={cn("h-4 w-4 transition-transform", mobileExpandedMenu === "spares" && "rotate-180")} />
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
                          onClick={() => setMobileExpandedSubMenu(mobileExpandedSubMenu === category.label ? null : category.label)}
                        >
                          <span className="flex items-center gap-2">
                            <IconComponent className="h-3.5 w-3.5" />
                            {category.label}
                          </span>
                          <ChevronDown className={cn("h-3 w-3 transition-transform", mobileExpandedSubMenu === category.label && "rotate-180")} />
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
                                  onClick={() => setMobileExpandedComponentMenu(mobileExpandedComponentMenu === sub.label ? null : sub.label)}
                                >
                                  <span>{sub.label}</span>
                                  <ChevronDown className={cn("h-3 w-3 transition-transform", mobileExpandedComponentMenu === sub.label && "rotate-180")} />
                                </button>
                                {mobileExpandedComponentMenu === sub.label && sub.componentTypes && sub.componentTypes.length > 0 && (
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
                <ChevronDown className={cn("h-4 w-4 transition-transform", mobileExpandedMenu === "services" && "rotate-180")} />
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
                <ChevronDown className={cn("h-4 w-4 transition-transform", mobileExpandedMenu === "logistics" && "rotate-180")} />
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
                <ChevronDown className={cn("h-4 w-4 transition-transform", mobileExpandedMenu === "financing" && "rotate-180")} />
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
                <ChevronDown className={cn("h-4 w-4 transition-transform", mobileExpandedMenu === "robobook" && "rotate-180")} />
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
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground px-3">
                  Signed in as {user.email?.split("@")[0]}
                </p>
                <Button size="sm" variant="outline" className="w-full" onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Link to="/auth" onClick={() => setMenuOpen(false)}>
                  <Button size="sm" variant="ghost" className="w-full">Sign In</Button>
                </Link>
                <Link to="/auth?signup=true" onClick={() => setMenuOpen(false)}>
                  <Button size="sm" className="w-full">Join Free</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default EnhancedHeader;
