import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSeekerProfile, useSaveSeekerProfile, ROBOT_BRANDS, useSkillTags } from "@/hooks/useRobotTalent";

const TalentSeekerProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: existingProfile, isLoading } = useSeekerProfile();
  const saveProfile = useSaveSeekerProfile();
  const { data: skillTags } = useSkillTags();

  const [form, setForm] = useState({
    headline: '', skills: [] as string[], experience_areas: [] as string[],
    robot_brands: [] as string[], total_experience_years: 0, projects_completed: 0,
    preferred_role: '', expected_salary_min: undefined as number | undefined,
    expected_salary_max: undefined as number | undefined, availability: 'immediate',
    location: '', city: '', bio: '',
  });
  const [skillInput, setSkillInput] = useState('');

  useEffect(() => {
    if (existingProfile) {
      setForm({
        headline: existingProfile.headline || '',
        skills: existingProfile.skills || [],
        experience_areas: existingProfile.experience_areas || [],
        robot_brands: existingProfile.robot_brands || [],
        total_experience_years: existingProfile.total_experience_years || 0,
        projects_completed: existingProfile.projects_completed || 0,
        preferred_role: existingProfile.preferred_role || '',
        expected_salary_min: existingProfile.expected_salary_min,
        expected_salary_max: existingProfile.expected_salary_max,
        availability: existingProfile.availability || 'immediate',
        location: existingProfile.location || '',
        city: existingProfile.city || '',
        bio: existingProfile.bio || '',
      });
    }
  }, [existingProfile, userProfile]);

  if (!user) { navigate('/auth'); return null; }

  const addSkill = (s: string) => {
    if (s && !form.skills.includes(s)) setForm(f => ({ ...f, skills: [...f.skills, s] }));
    setSkillInput('');
  };

  const toggleBrand = (brand: string) => {
    setForm(f => ({
      ...f,
      robot_brands: f.robot_brands.includes(brand) ? f.robot_brands.filter(b => b !== brand) : [...f.robot_brands, brand]
    }));
  };

  const expAreas = ['Programming', 'Maintenance', 'Integration', 'PLC', 'Vision Systems', 'EOAT', 'Simulation', 'Sales'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveProfile.mutate(form);
  };

  const allSkills = skillTags?.map((t: any) => t.skill_name) || [];

  if (isLoading) return <div className="min-h-screen bg-background"><Header /><div className="container mx-auto px-4 py-16 text-center text-muted-foreground">Loading...</div><Footer /></div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate('/robot-talent')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Card>
          <CardHeader><CardTitle>{existingProfile ? 'Edit' : 'Create'} Job Seeker Profile</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label>Headline</Label><Input value={form.headline} onChange={e => setForm(f => ({ ...f, headline: e.target.value }))} placeholder="e.g. Senior Robot Programmer - Fanuc & ABB" /></div>

              <div><Label>Preferred Role</Label><Input value={form.preferred_role} onChange={e => setForm(f => ({ ...f, preferred_role: e.target.value }))} placeholder="e.g. Robot Programmer" /></div>

              <div>
                <Label>Skills</Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {form.skills.map(s => <Badge key={s} variant="secondary" className="gap-1">{s} <X className="h-3 w-3 cursor-pointer" onClick={() => setForm(f => ({ ...f, skills: f.skills.filter(x => x !== s) }))} /></Badge>)}
                </div>
                <div className="flex gap-2">
                  <Input value={skillInput} onChange={e => setSkillInput(e.target.value)} placeholder="Add skill" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput); } }} list="seeker-skill-suggestions" />
                  <Button type="button" variant="outline" size="sm" onClick={() => addSkill(skillInput)}>Add</Button>
                </div>
                <datalist id="seeker-skill-suggestions">
                  {allSkills.filter((s: string) => !form.skills.includes(s)).map((s: string) => <option key={s} value={s} />)}
                </datalist>
              </div>

              <div>
                <Label>Robot Brands Known</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {ROBOT_BRANDS.map(b => (
                    <label key={b} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <Checkbox checked={form.robot_brands.includes(b)} onCheckedChange={() => toggleBrand(b)} />
                      {b}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label>Experience Areas</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {expAreas.map(a => (
                    <label key={a} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <Checkbox checked={form.experience_areas.includes(a)} onCheckedChange={() => setForm(f => ({ ...f, experience_areas: f.experience_areas.includes(a) ? f.experience_areas.filter(x => x !== a) : [...f.experience_areas, a] }))} />
                      {a}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><Label>Total Experience (years)</Label><Input type="number" min={0} value={form.total_experience_years} onChange={e => setForm(f => ({ ...f, total_experience_years: +e.target.value }))} /></div>
                <div><Label>Projects Completed</Label><Input type="number" min={0} value={form.projects_completed} onChange={e => setForm(f => ({ ...f, projects_completed: +e.target.value }))} /></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><Label>Expected Min Salary (₹/yr)</Label><Input type="number" value={form.expected_salary_min || ''} onChange={e => setForm(f => ({ ...f, expected_salary_min: e.target.value ? +e.target.value : undefined }))} /></div>
                <div><Label>Expected Max Salary (₹/yr)</Label><Input type="number" value={form.expected_salary_max || ''} onChange={e => setForm(f => ({ ...f, expected_salary_max: e.target.value ? +e.target.value : undefined }))} /></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Availability</Label>
                  <Select value={form.availability} onValueChange={v => setForm(f => ({ ...f, availability: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="1_month">1 Month</SelectItem>
                      <SelectItem value="2_months">2 Months</SelectItem>
                      <SelectItem value="3_months">3 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>City</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
              </div>

              <div><Label>Bio</Label><Textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={4} placeholder="About yourself, achievements..." /></div>

              <Button type="submit" className="w-full" disabled={saveProfile.isPending}>
                {saveProfile.isPending ? 'Saving...' : 'Save Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default TalentSeekerProfile;
