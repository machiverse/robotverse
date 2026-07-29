import { ReactNode } from 'react';
import { DashboardSettingsSidebar } from './DashboardSettingsSidebar';
import EnhancedHeader from '@/components/EnhancedHeader';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@/lib/router-compat';
import { Button } from '@/components/ui/button';

interface DashboardSettingsLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export const DashboardSettingsLayout = ({ 
  children, 
  title, 
  description 
}: DashboardSettingsLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      
      <div className="flex">
        <DashboardSettingsSidebar />
        
        <main className="flex-1 min-h-[calc(100vh-4rem)]">
          {/* Back to Dashboard & Page Header */}
          <div className="border-b border-border bg-card/50 backdrop-blur-xs sticky top-0 z-10">
            <div className="px-6 py-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              {title && (
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{title}</h1>
                  {description && (
                    <p className="text-muted-foreground mt-1">{description}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Page Content */}
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
