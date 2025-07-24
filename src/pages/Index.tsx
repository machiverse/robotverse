import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import LiveStats from "@/components/LiveStats";
import RobotListings from "@/components/RobotListings";
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
        <Header />
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
      <Header />
      <Hero />
      <LiveStats />
      <RobotListings />
      <UserTypeSelector onSelect={handleUserTypeSelect} />
    </div>
  );
};

export default Index;
