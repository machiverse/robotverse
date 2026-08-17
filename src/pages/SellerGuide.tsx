import EnhancedHeader from "@/components/EnhancedHeader";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Upload, DollarSign, Truck, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";

const SellerGuide = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Robot Seller's Guide | How to Sell Industrial Robots - RobotVerse"
        description="Complete guide to selling industrial robots on RobotVerse. Learn how to create listings, price equipment, and reach verified buyers across India."
        keywords="sell industrial robot, robot selling guide, how to sell robot, robot listing tips, sell used robot, industrial automation sale, robot seller india"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "HowTo",
          "name": "How to Sell Industrial Robots",
          "description": "Step-by-step guide to selling industrial robots on RobotVerse",
          "step": [
            {"@type": "HowToStep", "name": "Create Listing", "text": "Add photos, specifications, and documentation"},
            {"@type": "HowToStep", "name": "Price Equipment", "text": "Research market and set competitive pricing"},
            {"@type": "HowToStep", "name": "Manage Orders", "text": "Respond to inquiries and coordinate shipping"}
          ]
        }}
      />
      <EnhancedHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-primary mb-4">
              Seller Guide
            </h1>
            <p className="text-lg text-muted-foreground">
              Everything you need to know to successfully sell industrial robots on RobotVerse
            </p>
            <Link to="/auth?signup=true">
              <Button className="mt-4">Start Selling Today</Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* Steps to Get Started */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-primary" />
                    Step 1: Create Your Listing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                      <span className="text-sm">Take high-quality photos from multiple angles</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                      <span className="text-sm">Provide detailed technical specifications</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                      <span className="text-sm">Include maintenance history and documentation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                      <span className="text-sm">Write a compelling description highlighting key features</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    Step 2: Price Your Equipment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                      <span className="text-sm">Research comparable listings for market pricing</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                      <span className="text-sm">Consider age, condition, and original purchase price</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                      <span className="text-sm">Factor in any included accessories or software</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                      <span className="text-sm">Set competitive but fair pricing</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" />
                    Step 3: Manage Orders & Shipping
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                      <span className="text-sm">Respond to buyer inquiries within 24 hours</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                      <span className="text-sm">Coordinate with our logistics partners for shipping</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                      <span className="text-sm">Ensure proper packaging and documentation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                      <span className="text-sm">Provide installation support if applicable</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Quick Tips */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Tips for Success</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <h4 className="font-medium mb-2">📸 Photography Tips</h4>
                    <p className="text-sm text-muted-foreground">
                      Use natural lighting, clean the equipment, and show all sides including control panels and wear points.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <h4 className="font-medium mb-2">💬 Communication</h4>
                    <p className="text-sm text-muted-foreground">
                      Be responsive, professional, and provide detailed answers to technical questions.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <h4 className="font-medium mb-2">🏆 Build Trust</h4>
                    <p className="text-sm text-muted-foreground">
                      Complete your seller profile, get verified, and collect positive reviews.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Seller Protection
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <h4 className="font-medium mb-1">Secure Payments</h4>
                    <p className="text-muted-foreground">All payments are processed securely through our verified payment partners.</p>
                  </div>
                  
                  <div className="text-sm">
                    <h4 className="font-medium mb-1">Dispute Resolution</h4>
                    <p className="text-muted-foreground">Our team helps resolve any disputes fairly and efficiently.</p>
                  </div>
                  
                  <div className="text-sm">
                    <h4 className="font-medium mb-1">Fraud Prevention</h4>
                    <p className="text-muted-foreground">Advanced verification systems protect against fraudulent buyers.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Fees and Commission */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Selling Fees & Commission</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary mb-2">6%</div>
                  <h3 className="font-medium mb-2">Commission Fee</h3>
                  <p className="text-sm text-muted-foreground">Only charged on successful sales</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary mb-2">Free</div>
                  <h3 className="font-medium mb-2">Listing Fee</h3>
                  <p className="text-sm text-muted-foreground">No upfront costs to list your equipment</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary mb-2">3-5 Days</div>
                  <h3 className="font-medium mb-2">Payment Time</h3>
                  <p className="text-sm text-muted-foreground">Receive payment after buyer confirmation</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Call to Action */}
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Start Selling?</h2>
            <p className="text-muted-foreground mb-6">
              Join thousands of sellers who trust RobotVerse to reach qualified buyers worldwide.
            </p>
            <div className="space-x-4">
              <Link to="/auth?signup=true">
                <Button>Create Seller Account</Button>
              </Link>
              <Link to="/contact">
                <Button variant="outline">Contact Support</Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default SellerGuide;