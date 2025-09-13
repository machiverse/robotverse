import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Search, MessageCircle, FileText, Video, Phone, Mail } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";

const Help = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });

  const faqs = [
    {
      id: 1,
      question: "How do I list a robot for sale?",
      answer: "To list a robot for sale, navigate to your dashboard and click 'Add New Robot'. Fill in all the required details including specifications, images, and pricing. Your listing will be reviewed and published within 24 hours."
    },
    {
      id: 2,
      question: "What are the commission fees?",
      answer: "Our commission structure varies by user type. Robot sellers pay 3% on successful sales, spare parts sellers pay 2.5%, and service providers pay 5% on completed bookings. There are no listing fees."
    },
    {
      id: 3,
      question: "How do I track my orders?",
      answer: "You can track all your orders from the dashboard. Each order has a unique tracking ID that allows you to monitor its status from processing to delivery. You'll also receive email notifications for status updates."
    },
    {
      id: 4,
      question: "What payment methods are accepted?",
      answer: "We accept major credit cards, bank transfers, and for qualified businesses, we offer financing options through our partner finance providers. All transactions are secured with industry-standard encryption."
    },
    {
      id: 5,
      question: "How do I become a verified seller?",
      answer: "To become a verified seller, you need to complete your profile, upload business documents, and maintain a good rating. The verification process typically takes 3-5 business days."
    }
  ];

  const tickets = [
    {
      id: 1,
      subject: "Unable to upload robot images",
      status: "open",
      priority: "high",
      created: "2024-01-15"
    },
    {
      id: 2,
      subject: "Payment processing issue",
      status: "in_progress",
      priority: "urgent",
      created: "2024-01-14"
    },
    {
      id: 3,
      subject: "Question about commission fees",
      status: "resolved",
      priority: "low",
      created: "2024-01-12"
    }
  ];

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'chat':
        toast({
          title: "Live Chat",
          description: "Opening chat window...",
        });
        break;
      case 'email':
        window.location.href = "mailto:support@robotverse.in";
        break;
      case 'phone':
        window.location.href = "tel:+918610925352";
        break;
      case 'videos':
        toast({
          title: "Video Tutorials",
          description: "Redirecting to tutorial section...",
        });
        break;
    }
  };

  const handleCreateTicket = () => {
    toast({
      title: "Create Ticket",
      description: "Ticket creation form will open here",
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Message Sent",
      description: "Your support request has been submitted. We'll get back to you within 24 hours.",
    });
    
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 text-yellow-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'resolved': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Help & Support</h1>
          <p className="text-muted-foreground">
            Get help with your account and find answers to common questions
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Live Chat
            </CardTitle>
            <CardDescription>Chat with our support team</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => handleQuickAction('chat')}
            >
              Start Chat
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Support
            </CardTitle>
            <CardDescription>Send us a detailed message</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => handleQuickAction('email')}
            >
              Send Email
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Phone Support
            </CardTitle>
            <CardDescription>Call us for urgent issues</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => handleQuickAction('phone')}
            >
              Call Now
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Video className="h-5 w-5" />
              Video Tutorials
            </CardTitle>
            <CardDescription>Watch how-to videos</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => handleQuickAction('videos')}
            >
              Watch Videos
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* FAQs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Frequently Asked Questions
            </CardTitle>
            <CardDescription>
              Find quick answers to common questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input 
                  placeholder="Search FAQs..." 
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Accordion type="single" collapsible className="w-full">
                {filteredFaqs.map((faq) => (
                  <AccordionItem key={faq.id} value={`item-${faq.id}`}>
                    <AccordionTrigger className="text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent>
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </CardContent>
        </Card>

        {/* Support Tickets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Your Support Tickets
            </CardTitle>
            <CardDescription>
              Track your support requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button className="w-full" onClick={handleCreateTicket}>
                Create New Ticket
              </Button>
              
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-sm">{ticket.subject}</h4>
                        <p className="text-xs text-muted-foreground">
                          Created: {new Date(ticket.created).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Badge className={getStatusColor(ticket.status)}>
                          {ticket.status.replace('_', ' ')}
                        </Badge>
                        <Badge className={getPriorityColor(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contact Form */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Our Support Team</CardTitle>
          <CardDescription>
            Can't find what you're looking for? Send us a message
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input 
                  placeholder="Your name" 
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input 
                  type="email" 
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <Input 
                placeholder="Brief description of your issue"
                value={formData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <Textarea 
                placeholder="Describe your issue in detail..." 
                rows={4}
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
              />
            </div>
            <Button type="submit">
              Send Message
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Help;