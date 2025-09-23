import EnhancedHeader from "@/components/EnhancedHeader";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SEOMetaTags from "@/components/SEOMetaTags";

const Cookies = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* SEO handled by document title */}
      <EnhancedHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
              Cookie Policy
            </h1>
            <p className="text-lg text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>

          <Card>
            <CardContent className="prose prose-neutral dark:prose-invert max-w-none p-8">
              <h2>What Are Cookies?</h2>
              <p>
                Cookies are small text files that are stored on your device when you visit our website. They help us provide you with a better browsing experience by remembering your preferences and improving our services.
              </p>

              <h2>How We Use Cookies</h2>
              <p>
                RobotVerse uses cookies for the following purposes:
              </p>

              <h3>Essential Cookies</h3>
              <p>
                These cookies are necessary for the website to function properly. They enable basic functions like page navigation, access to secure areas, and authentication.
              </p>
              <ul>
                <li>Session management</li>
                <li>User authentication</li>
                <li>Security features</li>
                <li>Load balancing</li>
              </ul>

              <h3>Performance Cookies</h3>
              <p>
                These cookies help us understand how visitors interact with our website by collecting anonymous information about page visits and user behavior.
              </p>
              <ul>
                <li>Page view tracking</li>
                <li>Error reporting</li>
                <li>Performance monitoring</li>
                <li>User experience improvements</li>
              </ul>

              <h3>Functional Cookies</h3>
              <p>
                These cookies enable enhanced functionality and personalization, such as remembering your preferences and providing customized content.
              </p>
              <ul>
                <li>Language preferences</li>
                <li>Search filters</li>
                <li>Recently viewed items</li>
                <li>User interface settings</li>
              </ul>

              <h3>Marketing Cookies</h3>
              <p>
                These cookies are used to deliver relevant advertisements and track the effectiveness of our marketing campaigns.
              </p>
              <ul>
                <li>Targeted advertising</li>
                <li>Social media integration</li>
                <li>Campaign performance</li>
                <li>Retargeting</li>
              </ul>

              <h2>Third-Party Cookies</h2>
              <p>
                We may use third-party services that place cookies on your device. These include:
              </p>
              <ul>
                <li><strong>Google Analytics:</strong> For website analytics and performance monitoring</li>
                <li><strong>Payment Processors:</strong> For secure payment processing</li>
                <li><strong>Social Media Platforms:</strong> For social sharing and login features</li>
                <li><strong>Customer Support:</strong> For chat and help desk functionality</li>
              </ul>

              <h2>Cookie Duration</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-border">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border border-border p-3 text-left">Cookie Type</th>
                      <th className="border border-border p-3 text-left">Duration</th>
                      <th className="border border-border p-3 text-left">Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-border p-3">Session Cookies</td>
                      <td className="border border-border p-3">Until browser closes</td>
                      <td className="border border-border p-3">Authentication and navigation</td>
                    </tr>
                    <tr>
                      <td className="border border-border p-3">Persistent Cookies</td>
                      <td className="border border-border p-3">30 days to 2 years</td>
                      <td className="border border-border p-3">Preferences and analytics</td>
                    </tr>
                    <tr>
                      <td className="border border-border p-3">Third-party Cookies</td>
                      <td className="border border-border p-3">Varies by provider</td>
                      <td className="border border-border p-3">External services and analytics</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h2>Managing Your Cookie Preferences</h2>
              <p>
                You have several options for managing cookies:
              </p>

              <h3>Browser Settings</h3>
              <p>
                Most web browsers allow you to control cookies through their settings. You can:
              </p>
              <ul>
                <li>Block all cookies</li>
                <li>Accept only first-party cookies</li>
                <li>Delete existing cookies</li>
                <li>Receive notifications when cookies are set</li>
              </ul>

              <h3>Cookie Consent Manager</h3>
              <p>
                When you first visit our website, you'll see a cookie consent banner. You can:
              </p>
              <ul>
                <li>Accept all cookies</li>
                <li>Reject non-essential cookies</li>
                <li>Customize your preferences by category</li>
                <li>Change your preferences at any time</li>
              </ul>

              <h3>Opt-Out Links</h3>
              <p>
                For third-party cookies, you can often opt out directly:
              </p>
              <ul>
                <li><a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">Google Analytics Opt-out</a></li>
                <li><a href="https://www.facebook.com/settings?tab=ads" target="_blank" rel="noopener noreferrer">Facebook Ad Preferences</a></li>
                <li><a href="http://optout.aboutads.info/" target="_blank" rel="noopener noreferrer">Digital Advertising Alliance Opt-out</a></li>
              </ul>

              <h2>Impact of Disabling Cookies</h2>
              <p>
                If you disable cookies, some features of our website may not function properly:
              </p>
              <ul>
                <li>You may need to log in repeatedly</li>
                <li>Your preferences won't be remembered</li>
                <li>Some personalized features may not work</li>
                <li>Performance and user experience may be affected</li>
              </ul>

              <h2>Updates to This Policy</h2>
              <p>
                We may update this Cookie Policy from time to time to reflect changes in our practices or for legal reasons. We'll notify you of any significant changes by posting the updated policy on our website.
              </p>

              <h2>Contact Us</h2>
              <p>
                If you have questions about our use of cookies, please contact us:
              </p>
              <p>
                Email: support@robotverse.in<br />
                Phone: +918610925352<br />
                Address: SIPCOT IT Park, 5-B/9, 6th Cross St, Siruseri, Chennai, Tamil Nadu 603103
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Cookies;