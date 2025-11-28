import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogIn, UserPlus, X } from "lucide-react";

export const AutoSignInPopup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Clear any existing timers
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Don't show popup if user is logged in
    if (user) {
      setIsOpen(false);
      return;
    }

    // Show popup after 30 seconds
    timerRef.current = setTimeout(() => {
      if (isMountedRef.current && !user) {
        setIsOpen(true);
      }
    }, 30000); // 30 seconds

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [user]);

  const handleClose = () => {
    if (!isMountedRef.current) return;
    
    setIsOpen(false);
    
    // Clear existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    // Re-trigger after another 30 seconds if user closes without signing in
    timerRef.current = setTimeout(() => {
      if (isMountedRef.current && !user) {
        setIsOpen(true);
      }
    }, 30000);
  };

  const handleSignIn = () => {
    setIsOpen(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    navigate("/auth");
  };

  const handleSignUp = () => {
    setIsOpen(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    navigate("/auth?signup=true");
  };

  // Don't render anything if user is logged in
  if (user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Welcome to RobotVerse! 🤖
          </DialogTitle>
          <DialogDescription className="text-center pt-2 text-base">
            Log in to access full features of Robotverse and connect with thousands of robotics professionals
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-sm">Benefits of signing in:</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>✓ Save and manage your listings</li>
              <li>✓ Connect with sellers directly</li>
              <li>✓ Access AI-powered market insights</li>
              <li>✓ Get personalized recommendations</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={handleSignUp}
              size="lg"
              className="w-full"
            >
              <UserPlus className="mr-2 h-5 w-5" />
              Create Account
            </Button>
            
            <Button
              onClick={handleSignIn}
              variant="outline"
              size="lg"
              className="w-full"
            >
              <LogIn className="mr-2 h-5 w-5" />
              Sign In
            </Button>
          </div>

          <button
            onClick={handleClose}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            Continue browsing
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
