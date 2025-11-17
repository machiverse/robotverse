import EnhancedHeader from "@/components/EnhancedHeader";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import SEOMetaTags from "@/components/SEOMetaTags";

const Sitemap = () => {
  const sitePages = {
    "Main Pages": [
      { name: "Home", path: "/" },
      { name: "Browse Robots", path: "/robots" },
      { name: "Spare Parts", path: "/parts" },
      { name: "Services", path: "/services" },
      { name: "Logistics", path: "/logistics" },
      { name: "Financing", path: "/financing" },
      { name: "RoboBook", path: "/robobook" }
    ],
    "User Account": [
      { name: "Sign In / Sign Up", path: "/auth" },
      { name: "Dashboard", path: "/dashboard" },
      { name: "My Robots", path: "/dashboard/robots" },
      { name: "Parts Management", path: "/dashboard/parts" },
      { name: "Services Management", path: "/dashboard/services" },
      { name: "Analytics", path: "/dashboard/analytics" },
      { name: "Reports", path: "/dashboard/reports" },
      { name: "Finance", path: "/dashboard/finance" },
      { name: "Settings", path: "/dashboard/settings" },
      { name: "Profile Settings", path: "/profile-settings" },
      { name: "Watchlist", path: "/watchlist" }
    ],
    "Support & Legal": [
      { name: "Contact Us", path: "/contact" },
      { name: "Help Center", path: "/dashboard/help" },
      { name: "Seller Guide", path: "/seller-guide" },
      { name: "Buyer Guide", path: "/buyer-guide" },
      { name: "Terms of Service", path: "/terms" },
      { name: "Privacy Policy", path: "/dashboard/privacy" },
      { name: "Cookie Policy", path: "/cookies" },
      { name: "Accessibility", path: "/accessibility" }
    ],
    "Marketplace Categories": [
      { name: "Industrial Robots", path: "/robots?category=industrial" },
      { name: "Collaborative Robots", path: "/robots?category=collaborative" },
      { name: "Welding Robots", path: "/robots?category=welding" },
      { name: "Painting Robots", path: "/robots?category=painting" },
      { name: "Assembly Robots", path: "/robots?category=assembly" },
      { name: "Material Handling", path: "/robots?category=material-handling" }
    ],
    "Services": [
      { name: "Robot Installation", path: "/services?type=installation" },
      { name: "Maintenance & Repair", path: "/services?type=maintenance" },
      { name: "Training & Support", path: "/services?type=training" },
      { name: "Programming Services", path: "/services?type=programming" },
      { name: "System Integration", path: "/services?type=integration" }
    ]
  };

  return (
    <div className="min-h-screen bg-background">
      {/* SEO handled by document title */}
      <EnhancedHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
              Sitemap
            </h1>
            <p className="text-lg text-muted-foreground">
              Navigate through all sections of RobotVerse platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(sitePages).map(([category, pages]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="text-lg">{category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {pages.map((page) => (
                      <li key={page.path}>
                        <Link 
                          to={page.path}
                          className="text-sm text-muted-foreground hover:text-primary transition-colors block py-1"
                        >
                          {page.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Additional Information */}
          <div className="mt-12">
            <Card>
              <CardHeader>
                <CardTitle>About This Sitemap</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium mb-2">Dynamic Content</h3>
                    <p className="text-sm text-muted-foreground">
                      This sitemap includes the main static pages of RobotVerse. Dynamic content such as individual robot listings, blog posts, and user-specific pages are generated based on database content.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Updates</h3>
                    <p className="text-sm text-muted-foreground">
                      This sitemap is updated regularly as we add new features and pages to the platform. For the most current navigation, please use the main menu and search functionality.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">XML Sitemap</h3>
                    <p className="text-sm text-muted-foreground">
                      For search engines and automated crawlers, an XML sitemap is available at <code>/sitemap.xml</code> which includes all public pages and content.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Help & Support</h3>
                    <p className="text-sm text-muted-foreground">
                      If you can't find what you're looking for, please use our search function or <Link to="/contact" className="text-primary hover:underline">contact our support team</Link> for assistance.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Sitemap;