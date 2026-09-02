import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import EnhancedHeader from "@/components/EnhancedHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Briefcase, Users, GraduationCap, PlusCircle, UserPlus, Building,
  Search, Zap, Target, Award, ArrowRight, MapPin, TrendingUp, LayoutDashboard,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import TalentJobsList from "@/components/talent/TalentJobsList";
import TalentProfilesList from "@/components/talent/TalentProfilesList";
import TalentTrainingList from "@/components/talent/TalentTrainingList";

const TRENDING_SKILLS = [
  "Fanuc Programming", "ABB RobotStudio", "KUKA KRL", "PLC Integration",
  "Vision Systems", "Welding Automation", "Palletizing", "Machine Tending",
];

function useTalentStats() {
  return useQuery({
    queryKey: ['talent-stats'],
    queryFn: async () => {
      const [jobsRes, profilesRes, employersRes, trainingRes] = await Promise.all([
        supabase.from('talent_jobs' as any).select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('job_seeker_profiles' as any).select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('talent_jobs' as any).select('employer_id').eq('status', 'open'),
        supabase.from('training_programs' as any).select('id', { count: 'exact', head: true }).eq('status', 'active'),
      ]);
      const uniqueEmployers = new Set((employersRes.data || []).map((j: any) => j.employer_id)).size;
      return {
        activeJobs: jobsRes.count || 0,
        professionals: profilesRes.count || 0,
        companiesHiring: uniqueEmployers,
        trainingPrograms: trainingRes.count || 0,
      };
    },
    staleTime: 60 * 1000,
  });
}

const RobotTalent = () => {
  const [activeSection, setActiveSection] = useState<"jobs" | "talent" | "training">("jobs");
  const [heroSearch, setHeroSearch] = useState("");
  const [heroLocation, setHeroLocation] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: stats } = useTalentStats();

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSection("jobs");
  };

  const STATS = [
    { label: "Active Jobs", value: stats?.activeJobs ?? 0, icon: Briefcase },
    { label: "Professionals", value: stats?.professionals ?? 0, icon: Users },
    { label: "Companies Hiring", value: stats?.companiesHiring ?? 0, icon: Building },
    { label: "Training Programs", value: stats?.trainingPrograms ?? 0, icon: GraduationCap },
  ];

  const tabs = [
    { key: "jobs" as const, label: "Jobs", icon: Briefcase, count: String(stats?.activeJobs ?? 0) },
    { key: "talent" as const, label: "Talent Profiles", icon: Users, count: String(stats?.professionals ?? 0) },
    { key: "training" as const, label: "Training", icon: GraduationCap, count: String(stats?.trainingPrograms ?? 0) },
  ];

  // Contextual actions per tab
  const contextActions = {
    jobs: user ? [
      { label: "Post a Job", icon: PlusCircle, path: "/robot-talent/post-job", variant: "default" as const },
      { label: "Employer Dashboard", icon: LayoutDashboard, path: "/robot-talent/employer-dashboard", variant: "outline" as const },
      { label: "My Profile", icon: UserPlus, path: "/robot-talent/seeker-profile", variant: "outline" as const },
    ] : [],
    talent: user ? [
      { label: "Create My Profile", icon: UserPlus, path: "/robot-talent/seeker-profile", variant: "default" as const },
      { label: "Employer Dashboard", icon: LayoutDashboard, path: "/robot-talent/employer-dashboard", variant: "outline" as const },
    ] : [],
    training: user ? [
      { label: "Add Training Program", icon: GraduationCap, path: "/robot-talent/post-training", variant: "default" as const },
      { label: "My Profile", icon: UserPlus, path: "/robot-talent/seeker-profile", variant: "outline" as const },
    ] : [],
  };

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />

      {/* Hero Section - Dark theme matching Robots/Spare Parts */}
      <section className="relative overflow-hidden border-b border-border" style={{ background: 'hsl(var(--muted))' }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(200_100%_50%/0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,hsl(270_100%_60%/0.06),transparent_40%)]" />
        <div className="container mx-auto px-4 py-10 md:py-14 relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="bg-primary/15 text-primary border-primary/25 mb-4 text-xs font-medium backdrop-blur-sm">
              <Zap className="h-3 w-3 mr-1" /> India's #1 Robotics Talent Platform
            </Badge>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 leading-tight">
              <span className="text-primary">Find Your Dream Job in</span><br />
              <span className="text-foreground">Industrial Robotics</span>
            </h1>
            <p className="text-muted-foreground text-base md:text-lg mb-8 max-w-xl mx-auto">
              Connect with top robotics employers, skilled professionals, and certified training programs.
            </p>

            {/* Search Bar */}
            <form onSubmit={handleHeroSearch} className="bg-card rounded-xl p-2 shadow-lg border border-border flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={heroSearch}
                  onChange={(e) => setHeroSearch(e.target.value)}
                  placeholder="Skills, job title, company..."
                  className="pl-10 border-0 bg-transparent shadow-none focus-visible:ring-0 h-11"
                />
              </div>
              <div className="hidden sm:block w-px bg-border" />
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={heroLocation}
                  onChange={(e) => setHeroLocation(e.target.value)}
                  placeholder="City or location..."
                  className="pl-10 border-0 bg-transparent shadow-none focus-visible:ring-0 h-11"
                />
              </div>
              <Button type="submit" size="lg" className="h-11 px-8 rounded-lg font-semibold">
                Search
              </Button>
            </form>

            {/* Trending Skills */}
            <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
              <span className="text-muted-foreground text-xs font-medium">Trending:</span>
              {TRENDING_SKILLS.slice(0, 5).map((skill) => (
                <Badge
                  key={skill}
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/20 text-xs cursor-pointer hover:bg-primary/20 transition-colors"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8 max-w-3xl mx-auto">
            {STATS.map((stat) => (
              <div key={stat.label} className="bg-card/80 backdrop-blur-sm border border-border rounded-xl p-3 text-center hover:border-primary/30 transition-colors">
                <stat.icon className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-xl font-bold text-foreground">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Tabs + Context Actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-1 bg-card border border-border p-1 rounded-xl w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveSection(tab.key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeSection === tab.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeSection === tab.key
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Contextual Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {contextActions[activeSection].map((action) => (
              <Button
                key={action.label}
                size="sm"
                variant={action.variant}
                className="gap-1.5 text-xs"
                onClick={() => navigate(action.path)}
              >
                <action.icon className="h-3.5 w-3.5" />
                {action.label}
              </Button>
            ))}
            {!user && (
              <Button size="sm" onClick={() => navigate('/auth')} className="gap-1.5 text-xs">
                Get Started <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        {activeSection === "jobs" && <TalentJobsList />}
        {activeSection === "talent" && <TalentProfilesList />}
        {activeSection === "training" && <TalentTrainingList />}
      </main>

      {/* Why Robot Talent */}
      <section className="border-t border-border py-10" style={{ background: 'hsl(var(--card))' }}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-primary">Why Robot Talent?</h2>
            <p className="text-sm text-muted-foreground mt-1">The only hiring platform built for industrial robotics & automation</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {[
              { icon: Target, title: "Industry Focused", desc: "Exclusively for industrial robotics and automation professionals across India." },
              { icon: TrendingUp, title: "Smart Matching", desc: "AI-powered matching based on robot brands, skills, and experience level." },
              { icon: Award, title: "Verified & Trusted", desc: "Verified employers, certified trainers, and authenticated skill profiles." },
            ].map((f) => (
              <div key={f.title} className="flex gap-4 p-5 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">{f.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{f.desc}</p>
                </div>
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
