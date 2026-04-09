import { useNavigate, useLocation } from "react-router-dom";
import EnhancedHeader from "@/components/EnhancedHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Briefcase, Users, GraduationCap, LayoutDashboard, UserPlus, PlusCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface TalentPageWrapperProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  maxWidth?: string;
}

const NAV_ITEMS = [
  { label: "Jobs", path: "/robot-talent", icon: Briefcase, exact: true },
  { label: "Talent Profiles", path: "/robot-talent", icon: Users, tab: "talent" },
  { label: "Training", path: "/robot-talent", icon: GraduationCap, tab: "training" },
];

const TalentPageWrapper = ({ children, title, subtitle, showBackButton = true, maxWidth }: TalentPageWrapperProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-muted/30">
      <EnhancedHeader />

      {/* Talent Module Banner */}
      <div className="bg-gradient-to-r from-primary via-primary/95 to-primary/90 border-b">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {showBackButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 gap-1.5"
                  onClick={() => navigate('/robot-talent')}
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
              )}
              <div>
                <h1 className="text-xl font-bold text-primary-foreground">{title}</h1>
                {subtitle && <p className="text-xs text-primary-foreground/60 mt-0.5">{subtitle}</p>}
              </div>
            </div>

            {/* Quick Nav */}
            {user && (
              <div className="hidden md:flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10 gap-1.5 text-xs"
                  onClick={() => navigate('/robot-talent/post-job')}
                >
                  <PlusCircle className="h-3.5 w-3.5" /> Post Job
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10 gap-1.5 text-xs"
                  onClick={() => navigate('/robot-talent/seeker-profile')}
                >
                  <UserPlus className="h-3.5 w-3.5" /> My Profile
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10 gap-1.5 text-xs"
                  onClick={() => navigate('/robot-talent/employer-dashboard')}
                >
                  <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className={cn("container mx-auto px-4 py-6", maxWidth)}>
        {children}
      </main>

      <Footer />
    </div>
  );
};

export default TalentPageWrapper;
