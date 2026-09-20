import EnhancedHeader from "@/components/EnhancedHeader";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { UniversalSEOHead } from "@/components/SEO/UniversalSEOHead";
import { generateOrganizationSchema, generateLocalBusinessSchema, generateFAQSchema } from "@/utils/seo/modernSchemas";

const Contact = () => {
  // Contact page FAQs for schema
  const contactFAQs = [
    {
      question: "How do I list my robot for sale on RobotVerse?",
      answer: "Sign up for a free seller account, complete your profile, and use our easy listing process to showcase your industrial robots. Upload photos, add specifications, and set your price."
    },
    {
      question: "What payment methods does RobotVerse accept?",
      answer: "We support various payment methods including bank transfer, UPI, and credit cards through our secure payment partners."
    },
    {
      question: "Does RobotVerse provide shipping assistance?",
      answer: "Yes, RobotVerse connects you with trusted logistics partners specializing in safe industrial robot transportation across India."
    },
    {
      question: "How can I contact RobotVerse customer support?",
      answer: "You can reach us at support@robotverse.in or call +91-8610925352. Our support team is available Monday-Friday 9AM-6PM and Saturday 10AM-4PM IST."
    }
  ];

  const schemas = [
    generateOrganizationSchema(),
    generateLocalBusinessSchema(),
    generateFAQSchema(contactFAQs)
  ];

  return (
    <div className="min-h-screen bg-background">
      <UniversalSEOHead
        pageType="contact"
        title="Contact RobotVerse | Industrial Robot Marketplace Support India"
        description="Contact RobotVerse for robot buying inquiries, seller support, or technical assistance. Call +91-8610925352 or email support@robotverse.in. Quick response guaranteed."
        keywords={[
          'contact RobotVerse',
          'industrial robot marketplace support',
          'robot inquiry India',
          'robot marketplace contact',
          'buy robot inquiry',
          'sell robot support',
          'robot quotation request',
          'automation marketplace help',
          'RobotVerse customer service',
          'robot marketplace India contact'
        ]}
        ogTitle="Contact RobotVerse - Industrial Robot Marketplace Support"
        ogDescription="Get in touch with India's largest industrial robot marketplace. Quick response for buying, selling, or technical inquiries."
        schemas={schemas}
      />
      <EnhancedHeader />
      <BackButton fallbackPath="/" label="Back" />

      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-primary mb-4">
              Contact Us
            </h1>
            <p className="text-lg text-muted-foreground">
              Have questions? We're here to help you with your industrial robot marketplace needs.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Contact Form */}
            <Card>
              <CardHeader>
                <CardTitle>Send us a Message</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" placeholder="Your first name" />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" placeholder="Your last name" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="your@email.com" />
                </div>
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" placeholder="What can we help you with?" />
                </div>
                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea 
                    id="message" 
                    placeholder="Tell us more about your inquiry..."
                    rows={6}
                  />
                </div>
                <Button className="w-full">Send Message</Button>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Get in Touch</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h3 className="font-medium">Our Office</h3>
                      <p className="text-muted-foreground text-sm">
                        SIPCOT IT Park, 5-B/9,<br />
                        6th Cross St, Siruseri,<br />
                        Chennai, Tamil Nadu 603103
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Phone className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h3 className="font-medium">Phone</h3>
                      <p className="text-muted-foreground text-sm">+918610925352</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Mail className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h3 className="font-medium">Email</h3>
                      <p className="text-muted-foreground text-sm">support@robotverse.in</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Clock className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h3 className="font-medium">Business Hours</h3>
                      <p className="text-muted-foreground text-sm">
                        Monday - Friday: 9:00 AM - 6:00 PM IST<br />
                        Saturday: 10:00 AM - 4:00 PM IST
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Frequently Asked Questions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">How do I list my robot for sale?</h4>
                      <p className="text-sm text-muted-foreground">
                        Sign up for a seller account and use our easy listing process to showcase your industrial robots.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">What payment methods do you accept?</h4>
                      <p className="text-sm text-muted-foreground">
                        We support various payment methods through our secure payment partners.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Do you provide shipping assistance?</h4>
                      <p className="text-sm text-muted-foreground">
                        Yes, we connect you with trusted logistics partners for safe robot transportation.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Contact;