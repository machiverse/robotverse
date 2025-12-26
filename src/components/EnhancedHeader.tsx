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
        "absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-xl z-50 min-w-[220px]",
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
  const [mobileExpandedMenu, setMobileExpandedMenu] = useState<string | null>(null);
  const [mobileExpandedSubMenu, setMobileExpandedSubMenu] = useState<string | null>(null);
  
  useChatNotifications();

  const handleDropdownEnter = (menu: string) => {
    setActiveDropdown(menu);
    setActiveSubMenu(null);
  };

  const handleDropdownLeave = () => {
    setActiveDropdown(null);
    setActiveSubMenu(null);
  };

  const handleNavigation = (href: string) => {
    navigate(href);
    setActiveDropdown(null);
    setActiveSubMenu(null);
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-3">
          <img src={robotverseLogo} alt="RobotVerse Logo" className="h-10 w-10 object-cover rounded-lg border border-border shadow-sm" />
          <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            RobotVerse
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center space-x-1">
          {/* Robots Menu */}
          <div
            className="relative"
            onMouseEnter={() => handleDropdownEnter("robots")}
            onMouseLeave={handleDropdownLeave}
          >
            <button
              onClick={() => handleNavigation("/robots")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-primary/10 hover:text-primary transition"
            >
              <Bot className="h-4 w-4" />
              <span>Robots</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            <DropdownMenu isOpen={activeDropdown === "robots"} onClose={() => setActiveDropdown(null)}>
              <div className="p-2 max-h-[400px] overflow-y-auto">
                <Link
                  to="/robots"
                  className="block px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-md transition"
                  onClick={() => setActiveDropdown(null)}
                >
                  All Robots
                </Link>
                <div className="border-t border-border my-1" />
                {NAVIGATION_CONFIG.robots.subItems.map((item) => (
                  <Link
                    key={item.label}
                    to={item.href}
                    className="block px-3 py-2 text-sm text-foreground hover:bg-muted hover:text-primary rounded-md transition"
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
            className="relative"
            onMouseEnter={() => handleDropdownEnter("spares")}
            onMouseLeave={handleDropdownLeave}
          >
            <button
              onClick={() => handleNavigation("/parts")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-primary/10 hover:text-primary transition"
            >
              <Package className="h-4 w-4" />
              <span>Spare Parts</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            <DropdownMenu 
              isOpen={activeDropdown === "spares"} 
              onClose={() => setActiveDropdown(null)}
              className="min-w-[240px]"
            >
              <div className="p-2">
                <Link
                  to="/parts"
                  className="block px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-md transition"
                  onClick={() => setActiveDropdown(null)}
                >
                  All Spare Parts
                </Link>
                <div className="border-t border-border my-1" />
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
                        className="flex items-center justify-between px-3 py-2.5 text-sm text-foreground hover:bg-muted hover:text-primary rounded-md transition group"
                        onClick={() => setActiveDropdown(null)}
                      >
                        <span className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                          {category.label}
                        </span>
                        <ChevronDown className="h-3 w-3 -rotate-90" />
                      </Link>
                      {/* Sub-menu subcategories */}
                      {activeSubMenu === category.label && (
                        <div className="absolute left-full top-0 ml-1 bg-popover border border-border rounded-lg shadow-xl min-w-[240px] max-h-[400px] overflow-y-auto z-50">
                          <div className="p-2">
                            {category.subcategories.map((sub) => (
                              <Link
                                key={sub.label}
                                to={sub.href}
                                className="block px-3 py-2 text-sm text-foreground hover:bg-muted hover:text-primary rounded-md transition"
                                onClick={() => setActiveDropdown(null)}
                              >
                                {sub.label}
                              </Link>
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
            className="relative"
            onMouseEnter={() => handleDropdownEnter("services")}
            onMouseLeave={handleDropdownLeave}
          >
            <button
              onClick={() => handleNavigation("/services")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-primary/10 hover:text-primary transition"
            >
              <Settings className="h-4 w-4" />
              <span>Services</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            <DropdownMenu isOpen={activeDropdown === "services"} onClose={() => setActiveDropdown(null)}>
              <div className="p-2 max-h-[400px] overflow-y-auto">
                <Link
                  to="/services"
                  className="block px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-md transition"
                  onClick={() => setActiveDropdown(null)}
                >
                  All Services
                </Link>
                <div className="border-t border-border my-1" />
                {NAVIGATION_CONFIG.services.subItems.map((item) => (
                  <Link
                    key={item.label}
                    to={item.href}
                    className="block px-3 py-2 text-sm text-foreground hover:bg-muted hover:text-primary rounded-md transition"
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
            className="relative"
            onMouseEnter={() => handleDropdownEnter("logistics")}
            onMouseLeave={handleDropdownLeave}
          >
            <button
              onClick={() => handleNavigation("/logistics")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-primary/10 hover:text-primary transition"
            >
              <Truck className="h-4 w-4" />
              <span>Logistics</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            <DropdownMenu isOpen={activeDropdown === "logistics"} onClose={() => setActiveDropdown(null)}>
              <div className="p-2 max-h-[400px] overflow-y-auto">
                <Link
                  to="/logistics"
                  className="block px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-md transition"
                  onClick={() => setActiveDropdown(null)}
                >
                  All Logistics
                </Link>
                <div className="border-t border-border my-1" />
                {NAVIGATION_CONFIG.logistics.subItems.map((item) => (
                  <Link
                    key={item.label}
                    to={item.href}
                    className="block px-3 py-2 text-sm text-foreground hover:bg-muted hover:text-primary rounded-md transition"
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
            className="relative"
            onMouseEnter={() => handleDropdownEnter("financing")}
            onMouseLeave={handleDropdownLeave}
          >
            <button
              onClick={() => handleNavigation("/financing")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-primary/10 hover:text-primary transition"
            >
              <CreditCard className="h-4 w-4" />
              <span>Financing</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            <DropdownMenu isOpen={activeDropdown === "financing"} onClose={() => setActiveDropdown(null)}>
              <div className="p-2 max-h-[400px] overflow-y-auto">
                <Link
                  to="/financing"
                  className="block px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-md transition"
                  onClick={() => setActiveDropdown(null)}
                >
                  All Financing
                </Link>
                <div className="border-t border-border my-1" />
                {NAVIGATION_CONFIG.financing.subItems.map((item) => (
                  <Link
                    key={item.label}
                    to={item.href}
                    className="block px-3 py-2 text-sm text-foreground hover:bg-muted hover:text-primary rounded-md transition"
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
            className="relative"
            onMouseEnter={() => handleDropdownEnter("robobook")}
            onMouseLeave={handleDropdownLeave}
          >
            <button
              onClick={() => handleNavigation("/robobook")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-primary/10 hover:text-primary transition"
            >
              <BookOpen className="h-4 w-4" />
              <span>RoboBook</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            <DropdownMenu isOpen={activeDropdown === "robobook"} onClose={() => setActiveDropdown(null)}>
              <div className="p-2 max-h-[400px] overflow-y-auto">
                <Link
                  to="/robobook"
                  className="block px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-md transition"
                  onClick={() => setActiveDropdown(null)}
                >
                  All Articles
                </Link>
                <div className="border-t border-border my-1" />
                {NAVIGATION_CONFIG.robobook.subItems.map((item) => (
                  <Link
                    key={item.label}
                    to={item.href}
                    className="block px-3 py-2 text-sm text-foreground hover:bg-muted hover:text-primary rounded-md transition"
                    onClick={() => setActiveDropdown(null)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </DropdownMenu>
          </div>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          {/* Search (desktop) */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              placeholder="Search..."
              className="w-48 rounded-md border border-border bg-input py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Auth buttons */}
          {user ? (
            <>
              <div className="hidden md:flex items-center gap-2">
                <NotificationCenter />
                <Link to="/dashboard">
                  <Button size="sm" variant="ghost" className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
                <span className="text-sm text-muted-foreground">
                  {user.email?.split("@")[0]}
                </span>
                <Button size="sm" variant="outline" onClick={signOut}>
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
              <div className="md:hidden">
                <NotificationCenter />
              </div>
            </>
          ) : (
            <div className="hidden md:flex gap-2">
              <Link to="/auth">
                <Button size="sm" variant="ghost">Sign In</Button>
              </Link>
              <Link to="/auth?signup=true">
                <Button size="sm">Join Free!</Button>
              </Link>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            aria-label="Toggle menu"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            className="lg:hidden p-2"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden border-t border-border bg-background px-4 pb-4 max-h-[80vh] overflow-y-auto">
          <nav className="flex flex-col space-y-1 pt-4">
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
                            {category.subcategories.map((sub) => (
                              <Link
                                key={sub.label}
                                to={sub.href}
                                className="block px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => setMenuOpen(false)}
                              >
                                {sub.label}
                              </Link>
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

          <div className="mt-4 pt-4 border-t border-border">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full rounded-md border border-border bg-input py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {user ? (
              <div className="space-y-2">
                <Link to="/dashboard" onClick={() => setMenuOpen(false)}>
                  <Button size="sm" variant="ghost" className="w-full flex items-center gap-1">
                    <User className="h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
                <p className="text-sm text-muted-foreground px-3">
                  {user.email?.split("@")[0]}
                </p>
                <Button size="sm" variant="outline" className="w-full" onClick={signOut}>
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Link to="/auth" onClick={() => setMenuOpen(false)}>
                  <Button size="sm" variant="ghost" className="w-full">Sign In</Button>
                </Link>
                <Link to="/auth?signup=true" onClick={() => setMenuOpen(false)}>
                  <Button size="sm" className="w-full">Join Free!</Button>
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
