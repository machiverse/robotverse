import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Building,
  Phone,
  Mail,
  Lock,
  Unlock,
  CreditCard,
  Loader2,
  User,
  MapPin,
  Coins,
} from "lucide-react";
import { useContactUnlock } from "@/hooks/useContactUnlock";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "@/lib/router-compat";

interface SellerProfile {
  full_name?: string;
  company_name?: string;
  phone?: string;
  mobile_number?: string;
  email?: string;
  location?: string;
}

interface LockedContactCardProps {
  sellerId: string;
  itemId: string;
  itemType: "robot" | "spare_part" | "service" | "logistics" | "finance";
  itemName: string;
  sellerProfile: SellerProfile | null;
  showLocation?: boolean;
  variant?: "default" | "compact" | "inline";
  className?: string;
}

export const LockedContactCard = ({
  sellerId,
  itemId,
  itemType,
  itemName,
  sellerProfile,
  showLocation = true,
  variant = "default",
  className = "",
}: LockedContactCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    isContactUnlocked,
    unlockContact,
    userCredits,
    creditsRequired,
    loading: hookLoading,
  } = useContactUnlock();

  const [unlocking, setUnlocking] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const isUnlocked = isContactUnlocked(sellerId, itemId, itemType);
  const isOwnListing = user?.id === sellerId;

  const handleUnlockClick = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleConfirmUnlock = async () => {
    setUnlocking(true);
    setShowConfirmDialog(false);
    await unlockContact(sellerId, itemId, itemType, itemName);
    setUnlocking(false);
  };

  // If user owns the listing, show full contact info
  if (isOwnListing) {
    return null; // Owner doesn't need to see their own contact card
  }

  if (!sellerProfile) {
    return null;
  }

  // Locked state - show masked info
  if (!isUnlocked && !isOwnListing) {
    if (variant === "inline") {
      return (
        <div className={`flex items-center gap-4 p-4 bg-muted/50 rounded-lg border border-dashed border-border ${className}`}>
          <Lock className="w-5 h-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">Contact information is locked</p>
            <p className="text-xs text-muted-foreground">Use {creditsRequired} credits to unlock</p>
          </div>
          <Button
            size="sm"
            onClick={handleUnlockClick}
            disabled={unlocking || hookLoading}
            className="bg-gradient-to-r from-primary to-primary/80"
          >
            {unlocking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Unlock className="w-4 h-4 mr-2" />
                Unlock ({creditsRequired} credits)
              </>
            )}
          </Button>
        </div>
      );
    }

    if (variant === "compact") {
      return (
        <Card className={`border-dashed border-2 border-muted-foreground/30 bg-muted/20 ${className}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">Seller Contact Hidden</p>
                  <p className="text-xs text-muted-foreground">
                    {creditsRequired} credits to unlock
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleUnlockClick}
                disabled={unlocking || hookLoading}
              >
                {unlocking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Unlock className="w-4 h-4 mr-1" />
                    Unlock
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Default variant - full card
    return (
      <>
        <Card className={`border-dashed border-2 border-primary/30 bg-gradient-to-br from-muted/40 to-muted/20 ${className}`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <span className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                Seller Contact
              </span>
              <Badge variant="secondary" className="font-normal">
                <Coins className="w-3 h-3 mr-1" />
                {userCredits?.current_balance || 0} credits
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Masked Contact Info */}
            <div className="space-y-3 opacity-50 select-none">
              {sellerProfile.company_name && (
                <div className="flex items-center gap-3">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Company</p>
                    <p className="font-medium blur-xs">••••••••••••</p>
                  </div>
                </div>
              )}
              {(sellerProfile.mobile_number || sellerProfile.phone) && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Mobile</p>
                    <p className="font-medium blur-xs">•••••-•••••</p>
                  </div>
                </div>
              )}
              {sellerProfile.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium blur-xs">•••••@••••.•••</p>
                  </div>
                </div>
              )}
            </div>

            {/* Unlock CTA */}
            <div className="pt-3 border-t border-border">
              <Button
                onClick={handleUnlockClick}
                disabled={unlocking || hookLoading}
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                {unlocking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Unlocking...
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4 mr-2" />
                    Unlock Contact ({creditsRequired} credits)
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-2">
                View company name, mobile & email
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Confirm Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Unlock Contact Information
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <p>
                    You are about to spend <strong>{creditsRequired} credits</strong> to unlock the seller's contact details for:
                  </p>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="font-medium">{itemName}</p>
                    <p className="text-xs text-muted-foreground capitalize">{itemType.replace("_", " ")}</p>
                  </div>
                  <p className="text-sm">
                    After unlocking, you will be able to view:
                  </p>
                  <ul className="text-sm list-disc list-inside space-y-1">
                    <li>Company Name</li>
                    <li>Mobile Number</li>
                    <li>Email ID</li>
                  </ul>
                  <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                    <span className="text-sm font-medium">Your Balance:</span>
                    <span className="font-bold">{userCredits?.current_balance || 0} credits</span>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmUnlock}
                disabled={!userCredits || userCredits.current_balance < creditsRequired}
              >
                <Unlock className="w-4 h-4 mr-2" />
                Confirm & Unlock
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Unlocked state - show full contact info
  return (
    <Card className={`border-2 border-green-500/30 bg-gradient-to-br from-green-50/50 to-green-100/30 dark:from-green-950/20 dark:to-green-900/10 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Unlock className="w-5 h-5 text-green-600" />
          Seller Contact
          <Badge variant="outline" className="text-green-600 border-green-500 ml-auto">
            Unlocked
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sellerProfile.company_name && (
          <div className="flex items-center gap-3 p-2 rounded-lg bg-background/50">
            <Building className="w-4 h-4 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Company</p>
              <p className="font-semibold">{sellerProfile.company_name}</p>
            </div>
          </div>
        )}
        
        {(sellerProfile.mobile_number || sellerProfile.phone) && (
          <div className="flex items-center gap-3 p-2 rounded-lg bg-background/50">
            <Phone className="w-4 h-4 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Mobile</p>
              <p className="font-semibold">{sellerProfile.mobile_number || sellerProfile.phone}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => window.open(`tel:${sellerProfile.mobile_number || sellerProfile.phone}`)}
            >
              <Phone className="w-3 h-3 mr-1" />
              Call
            </Button>
          </div>
        )}
        
        {sellerProfile.email && (
          <div className="flex items-center gap-3 p-2 rounded-lg bg-background/50">
            <Mail className="w-4 h-4 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-semibold text-sm break-all">{sellerProfile.email}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => window.open(`mailto:${sellerProfile.email}`)}
            >
              <Mail className="w-3 h-3 mr-1" />
              Email
            </Button>
          </div>
        )}

        {showLocation && sellerProfile.location && (
          <div className="flex items-center gap-3 p-2 rounded-lg bg-background/50">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="font-medium text-sm">{sellerProfile.location}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LockedContactCard;
