import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Briefcase, Users, GraduationCap, PlusCircle, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import TalentJobsList from "@/components/talent/TalentJobsList";
import TalentProfilesList from "@/components/talent/TalentProfilesList";
import TalentTrainingList from "@/components/talent/TalentTrainingList";

const RobotTalent = () => {
  const [activeTab, setActiveTab] = useState("jobs");
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Hero */}
        <div className="mb-8 rounded-2xl bg-gradient-to-r from-primary via-primary/80 to-accent p-8 text-primary-foreground">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">🤖 Robot Talent</h1>
          <p className="text-lg opacity-90 mb-4">The hiring ecosystem for Industrial Robotics & Automation</p>
          <div className="flex flex-wrap gap-3">
            {user && (
              <>
                <Button variant="secondary" onClick={() => navigate('/robot-talent/post-job')}>
                  <PlusCircle className="h-4 w-4 mr-2" /> Post a Job
                </Button>
                <Button variant="secondary" onClick={() => navigate('/robot-talent/seeker-profile')}>
                  <UserPlus className="h-4 w-4 mr-2" /> Create Seeker Profile
                </Button>
                <Button variant="secondary" onClick={() => navigate('/robot-talent/post-training')}>
                  <GraduationCap className="h-4 w-4 mr-2" /> Add Training
                </Button>
              </>
            )}
            {!user && (
              <Button variant="secondary" onClick={() => navigate('/auth')}>
                Sign In to Get Started
              </Button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="jobs" className="gap-2"><Briefcase className="h-4 w-4" /> Jobs</TabsTrigger>
            <TabsTrigger value="talent" className="gap-2"><Users className="h-4 w-4" /> Talent Profiles</TabsTrigger>
            <TabsTrigger value="training" className="gap-2"><GraduationCap className="h-4 w-4" /> Training</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs"><TalentJobsList /></TabsContent>
          <TabsContent value="talent"><TalentProfilesList /></TabsContent>
          <TabsContent value="training"><TalentTrainingList /></TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default RobotTalent;
