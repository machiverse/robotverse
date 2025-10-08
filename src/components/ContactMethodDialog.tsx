import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle } from "lucide-react";

interface ContactMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  robotName: string;
  sellerName: string;
  sellerPhone?: string;
  sellerEmail?: string;
  onContactMethodSelected: (method: 'whatsapp' | 'email') => void;
}

export const ContactMethodDialog = ({
  open,
  onOpenChange,
  robotName,
  sellerName,
  sellerPhone,
  sellerEmail,
  onContactMethodSelected,
}: ContactMethodDialogProps) => {
  const handleWhatsApp = () => {
    if (!sellerPhone) return;
    
    const phoneNumber = sellerPhone.replace(/\D/g, "");
    const message = `Hi! I'm interested in ${robotName}. Could you please share the latest price and availability details? Thank you!`;
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
    onContactMethodSelected('whatsapp');
    onOpenChange(false);
  };

  const handleEmail = () => {
    if (!sellerEmail) return;
    
    const subject = `Inquiry about ${robotName}`;
    const body = `Dear ${sellerName || 'Seller'},\n\nI am interested in ${robotName} and would like to know more about it.\n\nCould you please share:\n- Latest price\n- Current availability\n- Technical specifications\n- Delivery timeline\n\nThank you!\n\nBest regards`;
    
    const mailtoUrl = `mailto:${sellerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
    
    onContactMethodSelected('email');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Contact Method</DialogTitle>
          <DialogDescription>
            How would you like to contact the seller about {robotName}?
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          <Button
            variant="outline"
            className="w-full h-auto py-4 flex items-start gap-3 hover:bg-green-50 hover:border-green-500 dark:hover:bg-green-950"
            onClick={handleWhatsApp}
            disabled={!sellerPhone}
          >
            <MessageCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <div className="text-left">
              <div className="font-semibold text-foreground">WhatsApp</div>
              <div className="text-sm text-muted-foreground">
                Send message instantly via WhatsApp
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full h-auto py-4 flex items-start gap-3 hover:bg-blue-50 hover:border-blue-500 dark:hover:bg-blue-950"
            onClick={handleEmail}
            disabled={!sellerEmail}
          >
            <Mail className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-left">
              <div className="font-semibold text-foreground">Email</div>
              <div className="text-sm text-muted-foreground">
                Send detailed inquiry via email
              </div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
