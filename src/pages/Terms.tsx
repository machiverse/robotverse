import EnhancedHeader from "@/components/EnhancedHeader";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SEOHead } from "@/components/SEOHead";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Terms of Service | RobotVerse - Industrial Robot Marketplace"
        description="Read the RobotVerse terms of service. Understand our platform policies, user responsibilities, and guidelines for buying and selling industrial robots."
        keywords="robotverse terms, terms of service, robot marketplace policy, industrial robots terms, seller agreement, buyer terms india"
      />
      <EnhancedHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-primary mb-4">
              Terms of Service
            </h1>
            <p className="text-lg text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <Card>
            <CardContent className="prose prose-neutral dark:prose-invert max-w-none p-8">
              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing and using RobotVerse, you accept and agree to be bound by the terms and provision of this
                agreement.
              </p>

              <h2>2. Platform Description</h2>
              <p>
                RobotVerse is an online marketplace that connects buyers and sellers of industrial robots, spare parts,
                and related services. We facilitate transactions but are not party to the actual sale agreements between
                users.
              </p>

              <h2>3. User Accounts</h2>
              <p>To use certain features of our platform, you must create an account. You are responsible for:</p>
              <ul>
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Providing accurate and current information</li>
                <li>Notifying us immediately of any unauthorized use</li>
              </ul>

              <h2>4. Seller Obligations</h2>
              <p>Sellers using RobotVerse agree to:</p>
              <ul>
                <li>Provide accurate descriptions and images of listed items</li>
                <li>Honor all sales commitments made through the platform</li>
                <li>Comply with all applicable laws and regulations</li>
                <li>Handle customer service inquiries professionally</li>
                <li>Maintain proper documentation for industrial equipment sales</li>
              </ul>

              <h2>5. Buyer Responsibilities</h2>
              <p>Buyers agree to:</p>
              <ul>
                <li>Make purchases in good faith</li>
                <li>Provide accurate shipping and payment information</li>
                <li>Communicate directly with sellers for technical specifications</li>
                <li>Conduct proper due diligence before making purchases</li>
              </ul>

              <h2>6. Prohibited Activities</h2>
              <p>Users may not:</p>
              <ul>
                <li>List illegal, stolen, or counterfeit items</li>
                <li>Engage in fraudulent activities</li>
                <li>Misrepresent the condition or specifications of equipment</li>
                <li>Circumvent the platform's payment systems</li>
                <li>Use the platform for any unlawful purpose</li>
              </ul>

              <h2>7. Payment and Fees</h2>
              <p>
                RobotVerse charges fees for successful transactions. Current fee structures are available in your
                account dashboard. Payment processing is handled by our secure payment partners.
              </p>

              <h2>8. Intellectual Property</h2>
              <p>
                All content on RobotVerse, including but not limited to text, graphics, logos, and software, is
                protected by intellectual property laws and remains the property of RobotVerse or its licensors.
              </p>

              <h2>9. Limitation of Liability</h2>
              <p>
                RobotVerse acts as a marketplace platform. We are not responsible for the quality, safety, or legality
                of items listed, the truth or accuracy of listings, or the ability of sellers to sell or buyers to pay.
              </p>

              <h2>10. Dispute Resolution</h2>
              <p>
                Any disputes arising from the use of RobotVerse shall be resolved through arbitration in Chennai, Tamil
                Nadu, India, in accordance with Indian arbitration laws.
              </p>

              <h2>11. Modifications</h2>
              <p>
                RobotVerse reserves the right to modify these terms at any time. Users will be notified of significant
                changes via email or platform notifications.
              </p>

              <h2>12. Contact Information</h2>
              <p>For questions about these Terms of Service, please contact us at:</p>
              <p>
                Email: support@robotverse.in
                <br />
                Phone: +918610925352
                <br />
                Address: No. 309A, ECR, Near PEC & PU,Pillaichavady, Vanur Taluk,Villupuram District,Tamil Nadu –
                605014, India
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Terms;
