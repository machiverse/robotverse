import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, Heart, Share2, MessageCircle, Phone, Mail, MapPin, Calendar, User, Building2, ChevronLeft, ChevronRight, X, Eye, Plane, CreditCard } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import LoanApplicationModal from '@/components/forms/LoanApplicationModal';

interface Robot {
  id: string;
  name: string;
  model: string;
  brand: string;
  robot_type: string;
  price: number;
  currency: string;
  condition: string;
  description: string;
  specifications?: any;
  images: string[];
  location: string;
  year_manufactured: number;
  seller_id: string;
  profiles?: {
    id: string;
    full_name: string;
    company_name?: string;
    phone?: string;
    email?: string;
    avatar_url?: string;
  };
}

const RobotDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [robot, setRobot] = useState<Robot | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showImportQuote, setShowImportQuote] = useState(false);
  const [showLoanApplication, setShowLoanApplication] = useState(false);
  const [quoteMessage, setQuoteMessage] = useState('');
  const [selectedFinanceProvider, setSelectedFinanceProvider] = useState<any>(null);
  const [importDuty, setImportDuty] = useState<number | null>(null);

  useEffect(() => {
    if (id) {
      fetchRobotDetails();
      trackView();
    }
  }, [id]);

  const fetchRobotDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('robots')
        .select(`
          *,
          profiles (
            id,
            full_name,
            company_name,
            phone,
            email,
            avatar_url
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setRobot(data);
      
      // Calculate import duty if robot is from different country
      if (data?.price) {
        const duty = data.price * 0.18; // 18% import duty
        setImportDuty(duty);
      }
    } catch (error) {
      console.error('Error fetching robot:', error);
      toast.error('Failed to load robot details');
    } finally {
      setLoading(false);
    }
  };

  const trackView = async () => {
    try {
      // Track view using user interactions table with correct schema
      await supabase
        .from('user_interactions')
        .insert({ 
          user_id: '', // Empty string for anonymous users
          target_id: id || '',
          target_type: 'robot',
          interaction_type: 'view'
        });
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(price);
  };

  const nextImage = () => {
    if (robot?.images && robot.images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % robot.images.length);
    }
  };

  const prevImage = () => {
    if (robot?.images && robot.images.length > 1) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? robot.images.length - 1 : prev - 1
      );
    }
  };

  const sendQuoteEmail = async () => {
    try {
      const { error } = await supabase.functions.invoke('send-quote-request', {
        body: {
          robotId: robot?.id,
          robotName: robot?.name,
          sellerEmail: robot?.profiles?.email,
          sellerName: robot?.profiles?.full_name || robot?.profiles?.company_name,
          message: quoteMessage,
          type: 'quote'
        }
      });

      if (error) throw error;
      
      toast.success('Quote request sent successfully!');
      setShowQuoteModal(false);
      setQuoteMessage('');
    } catch (error) {
      console.error('Error sending quote:', error);
      toast.error('Failed to send quote request');
    }
  };

  const sendImportQuoteEmail = async () => {
    try {
      const { error } = await supabase.functions.invoke('send-quote-request', {
        body: {
          robotId: robot?.id,
          robotName: robot?.name,
          sellerEmail: robot?.profiles?.email,
          sellerName: robot?.profiles?.full_name || robot?.profiles?.company_name,
          message: quoteMessage,
          type: 'import',
          importDuty: importDuty
        }
      });

      if (error) throw error;
      
      toast.success('Import quote request sent successfully!');
      setShowImportQuote(false);
      setQuoteMessage('');
    } catch (error) {
      console.error('Error sending import quote:', error);
      toast.error('Failed to send import quote request');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading robot details...</p>
        </div>
      </div>
    );
  }

  if (!robot) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Robot Not Found</h1>
          <p className="text-muted-foreground mb-6">The robot you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/robots')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Robots
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="icon">
              <Heart className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
              <img 
                src={robot.images?.[currentImageIndex] || '/placeholder.svg'} 
                alt={robot.name}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setShowFullscreen(true)}
              />
              {robot.images && robot.images.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                    onClick={nextImage}
                  >
                    <ChevronRight className="w-6 h-6" />
                  </Button>
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded">
                    {currentImageIndex + 1} / {robot.images.length}
                  </div>
                </>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white"
                onClick={() => setShowFullscreen(true)}
              >
                <Eye className="w-4 h-4" />
              </Button>
            </div>
            
            {robot.images && robot.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {robot.images.map((image, index) => (
                  <div 
                    key={index}
                    className={`aspect-square bg-muted rounded cursor-pointer overflow-hidden border-2 ${
                      index === currentImageIndex ? 'border-primary' : 'border-transparent'
                    }`}
                    onClick={() => setCurrentImageIndex(index)}
                  >
                    <img 
                      src={image} 
                      alt={`${robot.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Robot Information */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{robot.name}</h1>
              <p className="text-lg text-muted-foreground mb-4">{robot.model}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="secondary">{robot.robot_type}</Badge>
                <Badge variant={robot.condition === 'New' ? 'default' : 'outline'}>
                  {robot.condition}
                </Badge>
                <Badge variant="outline">{robot.brand}</Badge>
              </div>
              <div className="text-3xl font-bold text-primary mb-6">
                {formatPrice(robot.price, robot.currency)}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                className="w-full"
                onClick={() => setShowQuoteModal(true)}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Request Quote
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline"
                  onClick={() => setShowImportQuote(true)}
                >
                  <Plane className="w-4 h-4 mr-2" />
                  Import Quote
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowLoanApplication(true)}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Finance
                </Button>
              </div>
            </div>

            {/* Seller Information */}
            {robot.profiles && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Seller Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={robot.profiles.avatar_url} />
                      <AvatarFallback>
                        {robot.profiles.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">
                        {robot.profiles.company_name || robot.profiles.full_name}
                      </h3>
                      {robot.profiles.company_name && (
                        <p className="text-sm text-muted-foreground">
                          {robot.profiles.full_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {robot.profiles.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span className="text-sm">{robot.profiles.phone}</span>
                      </div>
                    )}
                    {robot.profiles.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <span className="text-sm">{robot.profiles.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{robot.location}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Brand</p>
                  <p className="font-medium">{robot.brand}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Model</p>
                  <p className="font-medium">{robot.model}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium">{robot.robot_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Year</p>
                  <p className="font-medium">{robot.year_manufactured}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Condition</p>
                  <p className="font-medium">{robot.condition}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{robot.location}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Description */}
        {robot.description && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {robot.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Specifications */}
        {robot.specifications && Object.keys(robot.specifications).length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Technical Specifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(robot.specifications).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">{key}:</span>
                    <span className="font-medium">{value as string}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Fullscreen Image Modal */}
      <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}>
        <DialogContent className="max-w-7xl max-h-[90vh] p-0">
          <div className="relative">
            <img 
              src={robot?.images?.[currentImageIndex]} 
              alt={`${robot?.name} ${currentImageIndex + 1}`}
              className="w-full h-full object-contain rounded-lg bg-muted max-h-[90vh]"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white"
              onClick={() => setShowFullscreen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
            {robot?.images && robot.images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                  onClick={prevImage}
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                  onClick={nextImage}
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded">
                  {currentImageIndex + 1} / {robot.images.length}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Quote Request Modal */}
      <Dialog open={showQuoteModal} onOpenChange={setShowQuoteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Quote</DialogTitle>
            <DialogDescription>
              Send a quote request to {robot?.profiles?.company_name || robot?.profiles?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Add any specific requirements or questions..."
              value={quoteMessage}
              onChange={(e) => setQuoteMessage(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuoteModal(false)}>
              Cancel
            </Button>
            <Button onClick={sendQuoteEmail}>
              <Mail className="w-4 h-4 mr-2" />
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Quote Modal */}
      <Dialog open={showImportQuote} onOpenChange={setShowImportQuote}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Plane className="w-5 h-5 mr-2" />
              Import Quote Request
            </DialogTitle>
            <DialogDescription>
              Request detailed import pricing including duties and logistics
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {importDuty && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Estimated Import Costs</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Base Price:</span>
                    <span>{formatPrice(robot?.price || 0, robot?.currency || 'USD')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Import Duty (18%):</span>
                    <span className="text-orange-600">{formatPrice(importDuty, robot?.currency || 'USD')}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Estimated Total:</span>
                    <span>{formatPrice((robot?.price || 0) + importDuty, robot?.currency || 'USD')}</span>
                  </div>
                </div>
              </div>
            )}
            <Textarea
              placeholder="Additional requirements for import (customs clearance, shipping preferences, etc.)..."
              value={quoteMessage}
              onChange={(e) => setQuoteMessage(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportQuote(false)}>
              Cancel
            </Button>
            <Button onClick={sendImportQuoteEmail}>
              <Mail className="w-4 h-4 mr-2" />
              Send Import Quote Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loan Application Modal */}
      <LoanApplicationModal
        open={showLoanApplication}
        onOpenChange={(open) => {
          setShowLoanApplication(open);
          if (!open) {
            setSelectedFinanceProvider(null);
          }
        }}
        robotDetails={robot ? {
          name: robot.name,
          model: robot.model,
          price: robot.price || 0,
          currency: robot.currency || 'INR',
          type: robot.robot_type
        } : undefined}
        financeProvider={selectedFinanceProvider}
      />
    </div>
  );
};

export default RobotDetails;