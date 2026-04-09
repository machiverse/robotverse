import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  Users,
  GraduationCap,
  PlusCircle,
  UserPlus,
  TrendingUp,
  Building,
  MapPin,
  ArrowRight,
  Zap,
  Target,
  Award,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import TalentJobsList from "@/components/talent/TalentJobsList";
import TalentProfilesList from "@/components/talent/TalentProfilesList";
import TalentTrainingList from "@/components/talent/TalentTrainingList";
import TalentHeader from "@/components/talent/TalentHeader";

const STATS = [
  { label: "Active Jobs", value: "500+", icon: Briefcase },
  { label: "Professionals", value: "2,000+", icon: Users },
  { label: "Companies Hiring", value: "150+", icon: Building },
  { label: "Training Programs", value: "80+", icon: GraduationCap },
];

const SKILL_CATEGORIES = [
  { name: "Robot Programming", count: 120, color: "bg-blue-500/10 text-blue-700 border-blue-200" },
  { name: "PLC / Automation", count: 95, color: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
  { name: "Maintenance", count: 85, color: "bg-amber-500/10 text-amber-700 border-amber-200" },
  { name: "Vision Systems", count: 45, color: "bg-purple-500/10 text-purple-700 border-purple-200" },
  { name: "Welding", count: 60, color: "bg-red-500/10 text-red-700 border-red-200" },
  { name: "EOAT / Tooling", count: 35, color: "bg-cyan-500/10 text-cyan-700 border-cyan-200" },
];

const RobotTalent = () => {
  const [activeSection, setActiveSection] = useState<"jobs" | "talent" | "training">("jobs");
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <TalentHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-foreground via-foreground/95 to-foreground/90">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
        <div className="container mx-auto px-4 py-12 md:py-16 relative">
          <div className="max-w-3xl">
            <Badge className="bg-primary/20 text-primary border-primary/30 mb-4">
              <Zap className="h-3 w-3 mr-1" /> India's #1 Robotics Hiring Platform
            </Badge>
            <h1 className="text-3xl md:text-5xl font-bold text-background mb-4 leading-tight">
              Find Your Next Role in
              <span className="text-primary"> Industrial Robotics</span>
            </h1>
            <p className="text-background/70 text-lg mb-8 max-w-xl">
              Connect with top employers, discover training programs, and build your career in automation.
            </p>

            {/* Quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {STATS.map((stat) => (
                <div key={stat.label} className="bg-background/10 backdrop-blur-sm border border-background/10 rounded-xl p-3 text-center">
                  <stat.icon className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-xl font-bold text-background">{stat.value}</p>
                  <p className="text-xs text-background/60">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-3">
              {user ? (
                <>
                  <Button size="lg" onClick={() => navigate('/robot-talent/post-job')} className="gap-2">
                    <PlusCircle className="h-4 w-4" /> Post a Job
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => navigate('/robot-talent/seeker-profile')} className="gap-2 bg-background/10 border-background/20 text-background hover:bg-background/20">
                    <UserPlus className="h-4 w-4" /> Create Seeker Profile
                  </Button>
                </>
              ) : (
                <Button size="lg" onClick={() => navigate('/auth')} className="gap-2">
                  Get Started <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Skill Categories Quick Filter */}
      <section className="border-b border-border bg-muted/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-thin pb-1">
            <span className="text-sm font-medium text-muted-foreground shrink-0">Popular Skills:</span>
            {SKILL_CATEGORIES.map((cat) => (
              <Badge
                key={cat.name}
                variant="outline"
                className={`shrink-0 cursor-pointer hover:shadow-sm transition-all ${cat.color}`}
              >
                {cat.name}
                <span className="ml-1 opacity-60">{cat.count}</span>
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Section Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-border">
          {[
            { key: "jobs" as const, label: "Job Listings", icon: Briefcase, desc: "Browse open positions" },
            { key: "talent" as const, label: "Talent Profiles", icon: Users, desc: "Find professionals" },
            { key: "training" as const, label: "Training Programs", icon: GraduationCap, desc: "Upskill yourself" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px ${
                activeSection === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeSection === "jobs" && <TalentJobsList />}
        {activeSection === "talent" && <TalentProfilesList />}
        {activeSection === "training" && <TalentTrainingList />}
      </main>

      {/* Why Robot Talent section */}
      <section className="bg-muted/50 border-t border-border py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-8">Why Robot Talent?</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { icon: Target, title: "Industry Focused", desc: "Exclusively for industrial robotics and automation professionals." },
              { icon: Zap, title: "Smart Matching", desc: "AI-powered matching based on skills, brands, and experience." },
              { icon: Award, title: "Verified Profiles", desc: "Trusted employers and certified training providers." },
            ].map((f) => (
              <div key={f.title} className="text-center p-6 rounded-xl bg-background border border-border">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default RobotTalent;
