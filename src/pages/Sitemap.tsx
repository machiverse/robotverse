import EnhancedHeader from "@/components/EnhancedHeader";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import SEOMetaTags from "@/components/SEOMetaTags";
import { ROBOT_TYPES, SERVICE_TYPES, LOGISTICS_TYPES, FINANCE_TYPES, ROBOBOOK_CATEGORIES, ROBOBOOK_CATEGORY_LABELS } from "@/constants/navigationMenus";

const Sitemap = () => {
  const sitePages = {
    "Main Pages": [
      { name: "Home", path: "/" },
      { name: "Browse Robots", path: "/robots" },
      { name: "Spare Parts", path: "/parts" },
      { name: "Services", path: "/services" },
      { name: "Logistics", path: "/logistics" },
      { name: "Financing", path: "/financing" },
      { name: "RoboBook", path: "/robobook" },
      { name: "Blogs", path: "/blogs" },
      { name: "Pricing", path: "/pricing" },
    ],
    "Robot Types": ROBOT_TYPES.map(type => ({
      name: type,
      path: `/robots?type=${encodeURIComponent(type)}`,
    })),
    "Services Categories": SERVICE_TYPES.map(type => ({
      name: type,
      path: `/services?type=${encodeURIComponent(type)}`,
    })),
    "Logistics Categories": LOGISTICS_TYPES.map(type => ({
      name: type,
      path: `/logistics?type=${encodeURIComponent(type)}`,
    })),
    "Financing Categories": FINANCE_TYPES.map(type => ({
      name: type,
      path: `/financing?type=${encodeURIComponent(type)}`,
    })),
    "RoboBook Categories": ROBOBOOK_CATEGORIES.map(cat => ({
      name: ROBOBOOK_CATEGORY_LABELS[cat] || cat,
      path: `/robobook?category=${encodeURIComponent(cat)}`,
    })),
    "User Account": [
      { name: "Sign In / Sign Up", path: "/auth" },
      { name: "Dashboard", path: "/dashboard" },
      { name: "My Robots", path: "/dashboard/robots" },
      { name: "Parts Management", path: "/dashboard/parts" },
      { name: "Services Management", path: "/dashboard/services" },
      { name: "Messages", path: "/dashboard/messages" },
      { name: "Quotations", path: "/dashboard/quotations" },
      { name: "My Requests", path: "/dashboard/my-requests" },
      { name: "Analytics", path: "/dashboard/analytics" },
      { name: "Reports", path: "/dashboard/reports" },
      { name: "Credits", path: "/dashboard/credits" },
      { name: "Finance", path: "/dashboard/finance" },
      { name: "Logistics", path: "/dashboard/logistics" },
      { name: "Settings", path: "/dashboard/settings" },
      { name: "Profile Settings", path: "/profile-settings" },
      { name: "Watchlist", path: "/watchlist" },
    ],
    "Guides & Support": [
      { name: "Buyer Guide", path: "/buyer-guide" },
      { name: "Seller Guide", path: "/seller-guide" },
      { name: "Contact Us", path: "/contact" },
      { name: "Help Center", path: "/dashboard/help" },
    ],
    "Legal": [
      { name: "Terms of Service", path: "/terms" },
      { name: "Privacy Policy", path: "/privacy" },
      { name: "Cookie Policy", path: "/cookies" },
      { name: "Accessibility", path: "/accessibility" },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
              Sitemap
            </h1>
            <p className="text-lg text-muted-foreground">
              Navigate through all sections of RobotVerse platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Object.entries(sitePages).map(([category, pages]) => (
              <Card key={category} className="h-fit">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{category}</CardTitle>
                  <p className="text-xs text-muted-foreground">{pages.length} pages</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {pages.map((page) => (
                      <li key={page.path}>
                        <Link 
                          to={page.path}
                          className="text-sm text-muted-foreground hover:text-primary transition-colors block py-0.5"
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

          {/* Summary & XML Sitemap Info */}
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
                      This sitemap includes all static pages and category filters. Individual robot listings, spare parts, blog posts, and service pages are dynamically generated from the database.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">XML Sitemap</h3>
                    <p className="text-sm text-muted-foreground">
                      For search engines and crawlers, an XML sitemap is available at{" "}
                      <a href="/sitemap.xml" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                        /sitemap.xml
                      </a>
                      {" "}which includes all public pages and dynamic content URLs.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Total Pages</h3>
                    <p className="text-sm text-muted-foreground">
                      {Object.values(sitePages).reduce((sum, pages) => sum + pages.length, 0)} pages listed across {Object.keys(sitePages).length} categories, plus dynamic individual listing pages.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Need Help?</h3>
                    <p className="text-sm text-muted-foreground">
                      Can't find what you're looking for?{" "}
                      <Link to="/contact" className="text-primary hover:underline">Contact our support team</Link> for assistance.
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
