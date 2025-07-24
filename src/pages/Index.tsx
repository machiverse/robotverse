import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import EnhancedHeader from "@/components/EnhancedHeader";
import EnhancedHero from "@/components/EnhancedHero";
import LiveStats from "@/components/LiveStats";
import MarketplaceCategories from "@/components/MarketplaceCategories";
import RobotListings from "@/components/RobotListings";
import JobWork from "@/components/JobWork";
import TrustIndicators from "@/components/TrustIndicators";
import UserTypeSelector from "@/components/UserTypeSelector";
import Dashboard from "@/components/Dashboard";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedUserType, setSelectedUserType] = useState<'buyer' | 'seller' | 'service' | 'parts' | null>(null);

  // Redirect to auth if not logged in and trying to select user type
  useEffect(() => {
    if (!loading && !user && selectedUserType) {
      navigate('/auth');
    }
  }, [user, loading, selectedUserType, navigate]);

  const handleUserTypeSelect = (type: 'buyer' | 'seller' | 'service' | 'parts') => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setSelectedUserType(type);
  };

  const handleBackToSelection = () => {
    setSelectedUserType(null);
  };

  if (selectedUserType) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="container mx-auto px-4 py-4">
          <button 
            onClick={handleBackToSelection}
            className="text-primary hover:text-primary-glow transition-colors mb-4"
          >
            ← Back to User Type Selection
          </button>
        </div>
        <Dashboard userType={selectedUserType} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      <EnhancedHero />
      <MarketplaceCategories />
      <LiveStats />
      <RobotListings />
      <JobWork />
      <TrustIndicators />
      <UserTypeSelector onSelect={handleUserTypeSelect} />
    </div>
  );
};

export default Index;
