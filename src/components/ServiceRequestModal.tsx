import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Star, 
  Send, 
  CheckCircle,
  AlertCircle,
  Calendar,
  DollarSign,
  Target,
  MessageSquare
} from 'lucide-react';

interface Service {
  id: string;
  name: string;
  category: string;
  priceRange: string;
  location: string;
  provider: string;
  description: string;
  rating: number;
  responseTime: string;
  completedJobs: number;
  availability: string;
  providerProfile: any;
  providerId: string;
}

interface ServiceRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Service | null;
}

const ServiceRequestModal = ({ open, onOpenChange, service }: ServiceRequestModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    customerName: user?.user_metadata?.full_name || '',
    customerEmail: user?.email || '',
    customerPhone: '',
    projectLocation: '',
    urgency: 'normal',
    budget: '',
    timeline: '',
    message: '',
    preferredContact: 'email'
  });

  const urgencyOptions = [
    { value: 'low', label: 'Low Priority - Within a week', color: 'text-green-600 bg-green-50 border-green-200' },
    { value: 'normal', label: 'Normal - Within 2-3 days', color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { value: 'high', label: 'High Priority - Within 24 hours', color: 'text-orange-600 bg-orange-50 border-orange-200' },
    { value: 'urgent', label: 'Urgent - ASAP', color: 'text-red-600 bg-red-50 border-red-200' }
  ];

  const timelineOptions = [
    'Immediately',
    'Within 1 week',
    'Within 2 weeks', 
    'Within 1 month',
    'Within 3 months',
    'Flexible timeline'
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to send service requests.",
        variant: "destructive",
      });
      return;
    }

    if (!service) return;

    setLoading(true);
    
    try {
      const quoteData = {
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        serviceProviderEmail: service.providerProfile?.email,
        serviceProviderName: service.provider,
        serviceName: service.name,
        serviceType: service.category,
        message: formData.message,
        urgency: formData.urgency,
        location: formData.projectLocation,
        budget: formData.budget,
        timeline: formData.timeline,
        preferredContact: formData.preferredContact
      };

      const response = await fetch('https://cmahwgetrqczytnijbuk.supabase.co/functions/v1/send-quote-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quoteData)
      });

      if (response.ok) {
        toast({
          title: "Service Request Sent Successfully!",
          description: `Your detailed request has been sent to ${service.provider}. You'll receive a response within ${service.responseTime}.`,
        });
        
        onOpenChange(false);
        
        // Reset form
        setFormData({
          customerName: user?.user_metadata?.full_name || '',
          customerEmail: user?.email || '',
          customerPhone: '',
          projectLocation: '',
          urgency: 'normal',
          budget: '',
          timeline: '',
          message: '',
          preferredContact: 'email'
        });
      } else {
        throw new Error('Failed to send service request');
      }
    } catch (error) {
      console.error('Error sending service request:', error);
      toast({
        variant: "destructive",
        title: "Request Failed",
        description: "Failed to send service request. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!service) return null;

  const selectedUrgency = urgencyOptions.find(opt => opt.value === formData.urgency);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader className="pb-6 border-b border-border">
          <DialogTitle className="flex items-center text-2xl font-bold">
            <MessageSquare className="w-6 h-6 mr-3 text-blue-600" />
            Request Professional Service
          </DialogTitle>
          <DialogDescription className="text-lg text-muted-foreground">
            Get a detailed quote and connect with certified professionals
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Service Details */}
          <div className="lg:col-span-1 space-y-6">
            {/* Service Info Card */}
            <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50/50 to-purple-50/50">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
                <CardTitle className="flex items-center text-lg">
                  <Settings className="w-5 h-5 mr-2" />
                  Service Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase tracking-wider">Service Name</Label>
                    <p className="font-bold text-lg text-gray-900">{service.name}</p>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase tracking-wider">Category</Label>
                      <Badge variant="secondary" className="mt-1">{service.category}</Badge>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase tracking-wider">Price Range</Label>
                      <div className="flex items-center mt-1">
                        <DollarSign className="w-4 h-4 text-green-600 mr-1" />
                        <p className="font-semibold text-green-600">{service.priceRange}</p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase tracking-wider">Location</Label>
                      <div className="flex items-center mt-1">
                        <MapPin className="w-4 h-4 text-blue-600 mr-1" />
                        <p className="font-medium text-gray-800">{service.location}</p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase tracking-wider">Response Time</Label>
                      <div className="flex items-center mt-1">
                        <Clock className="w-4 h-4 text-orange-600 mr-1" />
                        <p className="font-medium text-orange-600">{service.responseTime}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Provider Info */}
            <Card className="border border-green-200 bg-green-50/30">
              <CardHeader>
                <CardTitle className="flex items-center text-lg text-green-700">
                  <User className="w-5 h-5 mr-2" />
                  Service Provider
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">{service.provider.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-green-800">{service.provider}</p>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium ml-1">{service.rating}</span>
                        </div>
                        <span className="text-xs text-green-600">•</span>
                        <span className="text-xs text-green-600">{service.completedJobs} projects completed</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-green-600 bg-green-100 p-2 rounded">
                    <CheckCircle className="w-4 h-4 inline mr-1" />
                    Verified Professional
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Service Description */}
            <Card className="border border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg">About This Service</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 leading-relaxed">{service.description}</p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Request Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-xl">
                    <User className="w-5 h-5 mr-2 text-blue-600" />
                    Your Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customerName" className="text-sm font-medium">Full Name *</Label>
                      <Input
                        id="customerName"
                        value={formData.customerName}
                        onChange={(e) => handleInputChange('customerName', e.target.value)}
                        required
                        className="mt-1"
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerEmail" className="text-sm font-medium">Email Address *</Label>
                      <Input
                        id="customerEmail"
                        type="email"
                        value={formData.customerEmail}
                        onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                        required
                        className="mt-1"
                        placeholder="your.email@company.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerPhone" className="text-sm font-medium">Phone Number</Label>
                      <Input
                        id="customerPhone"
                        value={formData.customerPhone}
                        onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                        className="mt-1"
                        placeholder="+91 XXXXX XXXXX"
                      />
                    </div>
                    <div>
                      <Label htmlFor="preferredContact" className="text-sm font-medium">Preferred Contact Method</Label>
                      <Select value={formData.preferredContact} onValueChange={(value) => handleInputChange('preferredContact', value)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select contact method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Phone Call</SelectItem>
                          <SelectItem value="both">Both Email & Phone</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Project Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-xl">
                    <Target className="w-5 h-5 mr-2 text-green-600" />
                    Project Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="projectLocation" className="text-sm font-medium">Project Location</Label>
                      <Input
                        id="projectLocation"
                        value={formData.projectLocation}
                        onChange={(e) => handleInputChange('projectLocation', e.target.value)}
                        className="mt-1"
                        placeholder="City, State"
                      />
                    </div>
                    <div>
                      <Label htmlFor="budget" className="text-sm font-medium">Budget Range</Label>
                      <Input
                        id="budget"
                        value={formData.budget}
                        onChange={(e) => handleInputChange('budget', e.target.value)}
                        className="mt-1"
                        placeholder="e.g., ₹50,000 - ₹1,00,000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="urgency" className="text-sm font-medium">Priority Level</Label>
                      <Select value={formData.urgency} onValueChange={(value) => handleInputChange('urgency', value)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          {urgencyOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedUrgency && (
                        <Badge className={`mt-2 ${selectedUrgency.color}`}>
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {selectedUrgency.label}
                        </Badge>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="timeline" className="text-sm font-medium">Expected Timeline</Label>
                      <Select value={formData.timeline} onValueChange={(value) => handleInputChange('timeline', value)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select timeline" />
                        </SelectTrigger>
                        <SelectContent>
                          {timelineOptions.map((timeline) => (
                            <SelectItem key={timeline} value={timeline}>{timeline}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="message" className="text-sm font-medium">Project Details & Requirements</Label>
                      <Textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) => handleInputChange('message', e.target.value)}
                        rows={6}
                        className="mt-1"
                        placeholder="Describe your project requirements, specific needs, expected outcomes, and any technical specifications..."
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <DialogFooter className="pt-6 border-t border-border">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                  size="lg"
                >
                  Cancel Request
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {loading ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-pulse" />
                      Sending Request...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Service Request
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceRequestModal;