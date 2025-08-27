import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Eye, Lock, FileText, Users, Globe } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const Privacy = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-muted-foreground">
            Understanding how we protect and use your information
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy Overview
            </CardTitle>
            <CardDescription>
              Last updated: January 15, 2024
            </CardDescription>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p className="text-muted-foreground">
              At RobotVerse, we are committed to protecting your privacy and ensuring the security of your personal information. 
              This privacy policy explains how we collect, use, and safeguard your data when you use our platform.
            </p>
          </CardContent>
        </Card>

        {/* Information We Collect */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Information We Collect
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Personal Information</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Name, email address, and contact information</li>
                <li>• Business information and company details</li>
                <li>• Profile pictures and biographical information</li>
                <li>• Payment and billing information</li>
              </ul>
            </div>
            <Separator />
            <div>
              <h4 className="font-medium mb-2">Usage Information</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• How you interact with our platform</li>
                <li>• Pages visited and features used</li>
                <li>• Search queries and preferences</li>
                <li>• Device information and IP addresses</li>
              </ul>
            </div>
            <Separator />
            <div>
              <h4 className="font-medium mb-2">Business Data</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Robot listings and specifications</li>
                <li>• Transaction history and analytics</li>
                <li>• Customer communications and support tickets</li>
                <li>• Performance metrics and ratings</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* How We Use Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              How We Use Your Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Platform Operations</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Facilitate transactions between buyers and sellers</li>
                <li>• Process payments and manage accounts</li>
                <li>• Provide customer support and resolve issues</li>
                <li>• Maintain and improve platform security</li>
              </ul>
            </div>
            <Separator />
            <div>
              <h4 className="font-medium mb-2">Communication</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Send important account and transaction updates</li>
                <li>• Provide customer support and assistance</li>
                <li>• Share relevant product information and updates</li>
                <li>• Send marketing communications (with your consent)</li>
              </ul>
            </div>
            <Separator />
            <div>
              <h4 className="font-medium mb-2">Improvements</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Analyze usage patterns to improve our services</li>
                <li>• Develop new features and functionalities</li>
                <li>• Conduct research and analytics</li>
                <li>• Ensure compliance with legal requirements</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Data Protection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Data Protection & Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Security Measures</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• End-to-end encryption for sensitive data</li>
                <li>• Regular security audits and penetration testing</li>
                <li>• Secure data centers with 24/7 monitoring</li>
                <li>• Multi-factor authentication for account access</li>
              </ul>
            </div>
            <Separator />
            <div>
              <h4 className="font-medium mb-2">Data Retention</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Account data retained while your account is active</li>
                <li>• Transaction records kept for 7 years for compliance</li>
                <li>• Support communications stored for 3 years</li>
                <li>• Marketing data deleted upon unsubscription</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Your Rights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Your Privacy Rights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Access & Control</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Request access to your personal data</li>
                <li>• Update or correct inaccurate information</li>
                <li>• Delete your account and associated data</li>
                <li>• Export your data in a portable format</li>
              </ul>
            </div>
            <Separator />
            <div>
              <h4 className="font-medium mb-2">Communication Preferences</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Opt out of marketing communications</li>
                <li>• Control notification settings</li>
                <li>• Manage cookie preferences</li>
                <li>• Request data processing restrictions</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Third Parties */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Third-Party Services
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Service Providers</h4>
              <p className="text-sm text-muted-foreground mb-2">
                We work with trusted third-party service providers to operate our platform:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Payment processors for secure transactions</li>
                <li>• Cloud hosting providers for data storage</li>
                <li>• Analytics services for platform improvement</li>
                <li>• Customer support tools for assistance</li>
              </ul>
            </div>
            <Separator />
            <div>
              <h4 className="font-medium mb-2">Data Sharing</h4>
              <p className="text-sm text-muted-foreground">
                We do not sell your personal data to third parties. We only share information when necessary 
                to provide our services, comply with legal requirements, or protect our users' safety and security.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Us</CardTitle>
            <CardDescription>
              Questions about this privacy policy or your data?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>Email:</strong> privacy@robotverse.com</p>
              <p><strong>Address:</strong> 123 Innovation Drive, Tech City, TC 12345</p>
              <p><strong>Phone:</strong> +1 (555) 123-4567</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Privacy;