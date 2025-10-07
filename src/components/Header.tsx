import { Button } from "@/components/ui/button";
import { Bot, Menu, Search, User, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import robotverseLogo from "@/assets/robotverse-r-logo.png";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut } = useAuth();

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img src={robotverseLogo} alt="RobotVerse" className="h-10 w-10 object-contain rounded-sm" />
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
            <a href="#about" className="text-foreground hover:text-primary transition-colors">
              About
            </a>
          </nav>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search robots..."
                className="pl-10 pr-4 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm w-64"
              />
            </div>
            {user ? (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  Hello, {user.email?.split('@')[0]}
                </span>
                <Button variant="outline" size="sm" onClick={signOut}>
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
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
                    <div className="text-sm text-muted-foreground">
                      Hello, {user.email?.split('@')[0]}
                    </div>
                    <Button variant="outline" size="sm" className="w-full" onClick={signOut}>
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
