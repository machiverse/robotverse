import { useState } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import UserTypeSelector from "@/components/UserTypeSelector";
import Dashboard from "@/components/Dashboard";

const Index = () => {
  const [selectedUserType, setSelectedUserType] = useState<'buyer' | 'seller' | 'service' | 'parts' | null>(null);

  const handleUserTypeSelect = (type: 'buyer' | 'seller' | 'service' | 'parts') => {
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
      <UserTypeSelector onSelect={handleUserTypeSelect} />
    </div>
  );
};

export default Index;
