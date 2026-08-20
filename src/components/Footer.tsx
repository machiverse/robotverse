import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, MapPin, Facebook, Youtube, Linkedin, Instagram } from "lucide-react";
import robotverseLogo from "@/assets/robotverse-r-logo.png";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary/5 border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <span className="inline-flex rounded-lg dark:bg-[hsl(210_20%_96%)] dark:p-1">
                <img
                  src={robotverseLogo}
                  alt="RobotVerse"
                  className="h-10 w-10 object-contain bg-card dark:bg-transparent rounded-lg border border-border dark:border-transparent shadow-sm"
                />
              </span>
              <span className="text-xl font-bold text-foreground">RobotVerse</span>
            </div>

            <p className="text-muted-foreground text-sm leading-relaxed">
              The ultimate marketplace for industrial robots, spare parts, and professional services. Connecting buyers,
              sellers, and service providers worldwide.
            </p>
            <div className="flex space-x-3">
              <a href="https://www.facebook.com/people/RobotVerse/61579279622501/" target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                  <Facebook className="h-4 w-4" />
                </Button>
              </a>
              <a href="https://youtube.com/@robotverse-in?si=IvwGixDEN0xA2JCo" target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                  <Youtube className="h-4 w-4" />
                </Button>
              </a>
              <a href="https://www.linkedin.com/company/robotverse/" target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                  <Linkedin className="h-4 w-4" />
                </Button>
              </a>
              <a href="https://www.instagram.com/robot.verse?igsh=bnNiOXkzOWlpbGg1" target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                  <Instagram className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Quick Links</h3>
            <nav className="flex flex-col space-y-2">
              <a href="/robots" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Browse Robots
              </a>
              <a href="/parts" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Spare Parts
              </a>
              <a href="/services" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Services
              </a>
              <a href="/financing" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Financing
              </a>
              <a href="/logistics" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Logistics
              </a>
              <a href="/robobook" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                RoboBook
              </a>
            </nav>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Support</h3>
            <nav className="flex flex-col space-y-2">
              <a href="/dashboard/help" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Help Center
              </a>
              <a href="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Contact Us
              </a>
              <a
                href="/dashboard/privacy"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Privacy Policy
              </a>
              <a href="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Terms of Service
              </a>
              <a href="/seller-guide" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Seller Guide
              </a>
              <a href="/buyer-guide" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Buyer Guide
              </a>
            </nav>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Contact</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <MapPin className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                <div className="text-sm text-muted-foreground leading-relaxed">
                  <p className="font-medium text-foreground">RobotVerse</p>
                  <p>No. 309A, ECR, Near PEC & PU,</p>
                  <p>Pillaichavady, Vanur Taluk,</p>
                  <p>Villupuram District,</p>
                  <p>Tamil Nadu – 605014, India</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                <a
                  href="tel:+918610925352"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
                >
                  +91 86109 25352
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                <a
                  href="mailto:support@robotverse.in"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  support@robotverse.in
                </a>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-sm text-muted-foreground">© {currentYear} RobotVerse. All rights reserved.</div>
          <div className="flex items-center space-x-6 text-sm text-muted-foreground">
            <a href="/cookies" className="hover:text-primary transition-colors">
              Cookie Policy
            </a>
            <a href="/sitemap" className="hover:text-primary transition-colors">
              Sitemap
            </a>
            <a href="/accessibility" className="hover:text-primary transition-colors">
              Accessibility
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
