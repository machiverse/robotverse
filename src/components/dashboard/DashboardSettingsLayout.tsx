import { ReactNode, useEffect } from 'react';
import { DashboardSettingsSidebar } from './DashboardSettingsSidebar';
import EnhancedHeader from '@/components/EnhancedHeader';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
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
  // Open every settings page at the top and make sure the page can scroll
  useEffect(() => {
    document.body.style.overflow = '';
    document.body.style.overflowY = 'auto';
    window.scrollTo({ top: 0, behavior: 'auto' });
    return () => { document.body.style.overflowY = ''; };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      
      <div className="flex">
        <div className="hidden md:block sticky top-0 h-screen shrink-0 overflow-y-auto">
          <DashboardSettingsSidebar />
        </div>
        
        <main className="flex-1 min-w-0 min-h-[calc(100vh-4rem)]">
          {/* Back to Dashboard & Page Header */}
          <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
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
