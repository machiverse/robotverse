import { Button } from "@/components/ui/button";
import { Menu, Search, User, LogOut, Settings, CreditCard, Crown, Shield, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate } from "@/lib/router-compat";
import robotverseLogo from "@/assets/robotverse-r-logo.png";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getInitials = (email: string) => {
    return email?.substring(0, 2).toUpperCase() || 'U';
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems = [
    { label: 'Account', icon: User, href: '/profile-settings' },
    { label: 'Profile', icon: User, href: '/dashboard' },
    { label: 'Subscription & Credits', icon: Crown, href: '/dashboard/credits' },
    { label: 'Privacy & Security', icon: Shield, href: '/dashboard/privacy' },
    { label: 'Settings', icon: Settings, href: '/dashboard/settings' },
  ];

  const handleMenuClick = (href: string) => {
    navigate(href);
    setIsProfileDropdownOpen(false);
  };

  const handleSignOut = async () => {
    setIsProfileDropdownOpen(false);
    await signOut();
  };

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur-xs sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img src={robotverseLogo} alt="RobotVerse Logo" className="h-10 w-10 object-cover rounded-lg border border-border shadow-xs" />
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              RobotVerse
            </span>
          </Link>

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center space-x-6">
            <a href="#marketplace" className="text-foreground hover:text-primary transition-colors">
              Marketplace
            </a>
            <a href="#categories" className="text-foreground hover:text-primary transition-colors">
              Categories
            </a>
            <a href="#services" className="text-foreground hover:text-primary transition-colors">
              Services
            </a>
            <Link to="/robot-talent" className="text-foreground hover:text-primary transition-colors font-medium">
              🤖 Robot Talent
            </Link>
            <a href="#about" className="text-foreground hover:text-primary transition-colors">
              About
            </a>
          </nav>

          {/* Search Bar & User - Desktop */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search robots..."
                className="pl-10 pr-4 py-2 bg-input border border-border rounded-md focus:outline-hidden focus:ring-2 focus:ring-primary focus:border-transparent text-sm w-64"
              />
            </div>
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                      {getInitials(user.email || '')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-foreground hidden lg:block">
                    {user.email?.split('@')[0]}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in-0 zoom-in-95">
                    {/* User Info Header */}
                    <div className="px-4 py-3 border-b border-border bg-muted/30">
                      <p className="font-semibold text-foreground truncate">
                        {user.email?.split('@')[0]}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      {menuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.href}
                            onClick={() => handleMenuClick(item.href)}
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
              <Link to="/auth">
                <Button variant="neon" size="sm">
                  <User className="w-4 h-4" />
                  Sign In
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-border py-4">
            <nav className="flex flex-col space-y-3">
              <a href="#marketplace" className="text-foreground hover:text-primary">
                Marketplace
              </a>
              <a href="#categories" className="text-foreground hover:text-primary">
                Categories
              </a>
              <a href="#services" className="text-foreground hover:text-primary">
                Services
              </a>
              <a href="#about" className="text-foreground hover:text-primary">
                About
              </a>
              <div className="pt-3 border-t border-border">
                {user ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 pb-3 border-b border-border">
                      <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                          {getInitials(user.email || '')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-foreground">
                          {user.email?.split('@')[0]}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    
                    {/* Mobile Menu Items */}
                    <div className="space-y-1 py-2">
                      {menuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            to={item.href}
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center gap-3 px-2 py-2.5 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                          >
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>

                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full text-destructive hover:text-destructive hover:bg-destructive/10" 
                      onClick={handleSignOut}
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <Link to="/auth">
                    <Button variant="neon" size="sm" className="w-full">
                      <User className="w-4 h-4" />
                      Sign In
                    </Button>
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
