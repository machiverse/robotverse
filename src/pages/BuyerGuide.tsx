import EnhancedHeader from "@/components/EnhancedHeader";
import BackButton from "@/components/navigation/BackButton";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Search, Shield, CreditCard, Truck, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";

const BuyerGuide = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Robot Buyer's Guide | How to Buy Industrial Robots - RobotVerse"
        description="Complete guide to buying industrial robots. Learn how to evaluate equipment condition, negotiate prices, and make secure purchases on RobotVerse marketplace."
        keywords="buy industrial robot, robot buying guide, how to buy robot, robot purchase tips, used robot buying, industrial automation purchase, robot buyer india"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "HowTo",
          "name": "How to Buy Industrial Robots",
          "description": "Step-by-step guide to purchasing industrial robots on RobotVerse",
          "step": [
            {"@type": "HowToStep", "name": "Find the Right Robot", "text": "Use filters to find robots matching your specifications"},
            {"@type": "HowToStep", "name": "Evaluate Condition", "text": "Review photos, documentation, and maintenance history"},
            {"@type": "HowToStep", "name": "Secure Purchase", "text": "Use our secure payment system and coordinate delivery"}
          ]
        }}
      />
      <EnhancedHeader />
      <BackButton fallbackPath="/" label="Back" />

      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-primary mb-4">
              Buyer Guide
            </h1>
            <p className="text-lg text-muted-foreground">
              Your complete guide to finding and purchasing the perfect industrial robots on RobotVerse
            </p>
            <Link to="/robots">
              <Button className="mt-4">Browse Robots</Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* Main Guide Steps */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-primary" />
                    Step 1: Find the Right Robot
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                      <span className="text-sm">Use our advanced filters to narrow down by brand, type, and specifications</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                      <span className="text-sm">Compare multiple options side by side</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                      <span className="text-sm">Read detailed descriptions and technical specifications</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                      <span className="text-sm">Review seller ratings and previous buyer feedback</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Step 2: Evaluate Equipment Condition
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                      <span className="text-sm">Examine all provided photos carefully</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                      <span className="text-sm">Ask for maintenance records and service history</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                      <span className="text-sm">Request additional photos or videos if needed</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                      <span className="text-sm">Consider arranging an inspection for high-value purchases</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Step 3: Secure Purchase Process
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                      <span className="text-sm">Communicate directly with verified sellers</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                      <span className="text-sm">Use our secure payment system for protection</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                      <span className="text-sm">Review all terms and conditions before purchase</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                      <span className="text-sm">Coordinate shipping and delivery logistics</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Side Tips */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>What to Look For</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <h4 className="font-medium mb-2">🔧 Technical Specifications</h4>
                    <p className="text-sm text-muted-foreground">
                      Payload capacity, reach, repeatability, and controller type.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <h4 className="font-medium mb-2">📋 Documentation</h4>
                    <p className="text-sm text-muted-foreground">
                      Manuals, certificates, calibration records, and software licenses.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <h4 className="font-medium mb-2">🔍 Condition Details</h4>
                    <p className="text-sm text-muted-foreground">
                      Operating hours, maintenance history, and any wear or damage.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Common Questions to Ask</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium">Why are you selling?</p>
                    <p className="text-muted-foreground">Understanding the reason helps assess condition</p>
                  </div>
                  
                  <div>
                    <p className="font-medium">What's included?</p>
                    <p className="text-muted-foreground">Controllers, cables, software, tools, etc.</p>
                  </div>
                  
                  <div>
                    <p className="font-medium">Recent maintenance?</p>
                    <p className="text-muted-foreground">When was the last service or repair?</p>
                  </div>
                  
                  <div>
                    <p className="font-medium">Installation support?</p>
                    <p className="text-muted-foreground">Will seller provide setup assistance?</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Services Available */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  Logistics Support
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Professional shipping and handling for industrial equipment.
                </p>
                <ul className="text-sm space-y-1">
                  <li>• Specialized transport vehicles</li>
                  <li>• Insurance coverage</li>
                  <li>• Installation services</li>
                  <li>• Customs clearance</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Financing Options
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Flexible payment solutions for your equipment purchase.
                </p>
                <ul className="text-sm space-y-1">
                  <li>• Equipment financing</li>
                  <li>• Lease-to-own programs</li>
                  <li>• Trade-in options</li>
                  <li>• Competitive rates</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-primary" />
                  Service Support
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Expert technical support and maintenance services.
                </p>
                <ul className="text-sm space-y-1">
                  <li>• Installation & setup</li>
                  <li>• Training programs</li>
                  <li>• Maintenance contracts</li>
                  <li>• Technical support</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Buyer Protection */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Buyer Protection Program</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-success" />
                    Purchase Protection
                  </h3>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li>• Secure escrow payment system</li>
                    <li>• Verified seller network</li>
                    <li>• Dispute resolution service</li>
                    <li>• Equipment inspection support</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-success" />
                    Quality Assurance
                  </h3>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li>• Detailed equipment reports</li>
                    <li>• Professional inspections available</li>
                    <li>• Maintenance history verification</li>
                    <li>• Return policy for misrepresented items</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Call to Action */}
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Find Your Perfect Robot?</h2>
            <p className="text-muted-foreground mb-6">
              Browse our extensive catalog of verified industrial robots from trusted sellers worldwide.
            </p>
            <div className="space-x-4">
              <Link to="/robots">
                <Button>Start Shopping</Button>
              </Link>
              <Link to="/contact">
                <Button variant="outline">Get Expert Help</Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default BuyerGuide;