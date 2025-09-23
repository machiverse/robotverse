import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Bot,
  Menu,
  Search,
  User,
  LogOut,
  Home,
  Settings,
  Package,
  Package as PartsIcon,
  Briefcase as OrdersIcon,
  Truck,
  CreditCard,
  BookOpen,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "Robots", href: "/robots", icon: Bot },
  { name: "Spares", href: "/parts", icon: PartsIcon },
  { name: "Services", href: "/services", icon: Settings },
  { name: "Logistics", href: "/logistics", icon: Truck },
  { name: "Financing", href: "/financing", icon: CreditCard },
  { name: "RoboBook", href: "/robobook", icon: BookOpen },
];

const EnhancedHeader = () => {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold">R</span>
          </div>
          <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            RobotVerse
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex space-x-2">
          {navItems.map(({ name, href, icon: Icon }) => (
            <Link
              key={name}
              to={href}
              className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-primary/10 hover:text-primary transition"
            >
              <Icon className="h-4 w-4" />
              <span>{name}</span>
            </Link>
          ))}
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
            <div className="hidden md:flex items-center gap-2">
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
  <Menu className="h-6 w-6" />
</button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden border-t border-border bg-background px-4 pb-4">
          <nav className="flex flex-col space-y-1 pt-4">
            {navItems.map(({ name, href, icon: Icon }) => (
              <Link
                key={name}
                to={href}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-primary/10 hover:text-primary transition"
                onClick={() => setMenuOpen(false)}
              >
                <Icon className="h-4 w-4" />
                <span>{name}</span>
              </Link>
            ))}
          </nav>

          <div className="mt-4">
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
                <p className="text-sm text-muted-foreground">
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
