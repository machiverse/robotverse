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

const TalentPageWrapper = ({ children, title, subtitle, showBackButton = true, maxWidth }: TalentPageWrapperProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />

      {/* Talent Module Banner - Dark theme */}
      <div className="border-b border-border" style={{ background: 'hsl(var(--muted))' }}>
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {showBackButton && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                  onClick={() => navigate('/robot-talent')}
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
              )}
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{title}</h1>
                {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
              </div>
            </div>

            {/* Quick Nav */}
            {user && (
              <div className="hidden md:flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-primary gap-1.5 text-xs"
                  onClick={() => navigate('/robot-talent/post-job')}
                >
                  <PlusCircle className="h-3.5 w-3.5" /> Post Job
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-primary gap-1.5 text-xs"
                  onClick={() => navigate('/robot-talent/seeker-profile')}
                >
                  <UserPlus className="h-3.5 w-3.5" /> My Profile
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-primary gap-1.5 text-xs"
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
