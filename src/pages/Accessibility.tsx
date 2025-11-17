import EnhancedHeader from "@/components/EnhancedHeader";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SEOMetaTags from "@/components/SEOMetaTags";

const Accessibility = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* SEO handled by document title */}
      <EnhancedHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
              Accessibility Statement
            </h1>
            <p className="text-lg text-muted-foreground">
              Our commitment to making RobotVerse accessible to everyone
            </p>
          </div>

          <Card>
            <CardContent className="prose prose-neutral dark:prose-invert max-w-none p-8">
              <h2>Our Commitment</h2>
              <p>
                RobotVerse is committed to ensuring digital accessibility for all users, including those with disabilities. We strive to provide an inclusive experience that enables everyone to access our industrial robot marketplace platform with ease and independence.
              </p>

              <h2>Accessibility Standards</h2>
              <p>
                We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 at the AA level. These guidelines explain how to make web content more accessible for people with disabilities and create a better user experience for everyone.
              </p>

              <h2>Accessibility Features</h2>
              <p>
                RobotVerse includes the following accessibility features:
              </p>

              <h3>Keyboard Navigation</h3>
              <ul>
                <li>All interactive elements are keyboard accessible</li>
                <li>Logical tab order throughout the site</li>
                <li>Skip links to main content areas</li>
                <li>Visible focus indicators</li>
              </ul>

              <h3>Screen Reader Compatibility</h3>
              <ul>
                <li>Semantic HTML structure</li>
                <li>Descriptive alt text for images</li>
                <li>Proper heading hierarchy</li>
                <li>ARIA labels and descriptions where needed</li>
                <li>Form labels and error messages</li>
              </ul>

              <h3>Visual Design</h3>
              <ul>
                <li>High contrast color schemes</li>
                <li>Scalable text that can be enlarged up to 200%</li>
                <li>Clear visual hierarchy and layout</li>
                <li>Color is not the only way to convey information</li>
                <li>Dark mode support for reduced eye strain</li>
              </ul>

              <h3>Content & Navigation</h3>
              <ul>
                <li>Clear and consistent navigation</li>
                <li>Descriptive page titles and headings</li>
                <li>Simple, plain language</li>
                <li>Error messages that are clear and helpful</li>
                <li>Sufficient time limits for timed content</li>
              </ul>

              <h2>Assistive Technologies</h2>
              <p>
                RobotVerse has been tested with the following assistive technologies:
              </p>
              <ul>
                <li>Screen readers (NVDA, JAWS, VoiceOver)</li>
                <li>Keyboard-only navigation</li>
                <li>Voice recognition software</li>
                <li>Browser zoom up to 200%</li>
                <li>High contrast mode</li>
              </ul>

              <h2>Known Issues</h2>
              <p>
                We are aware of the following accessibility issues and are working to address them:
              </p>
              <ul>
                <li>Some PDF documents may not be fully accessible - we're working to provide alternative formats</li>
                <li>Video content is being updated to include captions and transcripts</li>
                <li>Complex data visualizations in analytics dashboards are being enhanced with alternative text descriptions</li>
              </ul>

              <h2>Browser Support</h2>
              <p>
                RobotVerse is designed to work with the latest versions of these browsers:
              </p>
              <ul>
                <li>Chrome (Windows, macOS, Android, iOS)</li>
                <li>Firefox (Windows, macOS)</li>
                <li>Safari (macOS, iOS)</li>
                <li>Edge (Windows)</li>
              </ul>

              <h2>Mobile Accessibility</h2>
              <p>
                Our mobile applications and responsive website include:
              </p>
              <ul>
                <li>Large touch targets (minimum 44px)</li>
                <li>Gestures that work with assistive technologies</li>
                <li>Support for device orientation changes</li>
                <li>Compatibility with mobile screen readers</li>
              </ul>

              <h2>Feedback and Contact</h2>
              <p>
                We welcome your feedback on the accessibility of RobotVerse. If you encounter any accessibility barriers or have suggestions for improvement, please contact us:
              </p>
              
              <div className="bg-muted p-4 rounded-lg">
                <h3>Accessibility Contact Information</h3>
                <p><strong>Email:</strong> accessibility@robotverse.in</p>
                <p><strong>Phone:</strong> +918610925352</p>
                <p><strong>General Support:</strong> support@robotverse.in</p>
                <p><strong>Address:</strong> SIPCOT IT Park, 5-B/9, 6th Cross St, Siruseri, Chennai, Tamil Nadu 603103</p>
              </div>

              <h2>Response Time</h2>
              <p>
                We aim to respond to accessibility feedback within 2 business days. For urgent accessibility issues that prevent you from using critical features, we'll prioritize these requests and respond within 24 hours.
              </p>

              <h2>Alternative Formats</h2>
              <p>
                If you need content in an alternative format, we can provide:
              </p>
              <ul>
                <li>Large print versions</li>
                <li>Audio descriptions</li>
                <li>Plain text versions</li>
                <li>Simplified layouts</li>
              </ul>

              <h2>Third-Party Content</h2>
              <p>
                Some content on RobotVerse is provided by third parties (such as user-generated listings and embedded videos). We encourage our users to follow accessibility best practices and provide guidance on creating accessible content.
              </p>

              <h2>Ongoing Efforts</h2>
              <p>
                Accessibility is an ongoing effort. We regularly:
              </p>
              <ul>
                <li>Conduct accessibility audits</li>
                <li>Test with real users who have disabilities</li>
                <li>Train our development team on accessibility best practices</li>
                <li>Update our guidelines and standards</li>
                <li>Monitor for new accessibility issues</li>
              </ul>

              <h2>Legal Information</h2>
              <p>
                This accessibility statement was created on {new Date().toLocaleDateString()} and last reviewed on {new Date().toLocaleDateString()}. We review and update this statement regularly to ensure it remains current and accurate.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Accessibility;