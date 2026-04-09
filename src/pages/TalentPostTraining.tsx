import { useState } from "react";
import { useNavigate } from "react-router-dom";
import EnhancedHeader from "@/components/EnhancedHeader";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCreateTraining, ROBOT_BRANDS, JOB_CATEGORIES, useSkillTags } from "@/hooks/useRobotTalent";

const TalentPostTraining = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createTraining = useCreateTraining();
  const { data: skillTags } = useSkillTags();

  const [form, setForm] = useState({
    course_name: '', description: '', robot_brand: '', skill_category: '',
    duration: '', mode: 'offline', fees: undefined as number | undefined,
    certification: '', location: '', city: '',
    skills_covered: [] as string[], max_students: undefined as number | undefined,
  });
  const [skillInput, setSkillInput] = useState('');

  if (!user) { navigate('/auth'); return null; }

  const addSkill = (s: string) => {
    if (s && !form.skills_covered.includes(s)) setForm(f => ({ ...f, skills_covered: [...f.skills_covered, s] }));
    setSkillInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTraining.mutate(form, { onSuccess: () => navigate('/robot-talent') });
  };

  const allSkills = skillTags?.map((t: any) => t.skill_name) || [];

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate('/robot-talent')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Robot Talent
        </Button>
        <Card>
          <CardHeader><CardTitle>Add Training Program</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label>Course Name *</Label><Input required value={form.course_name} onChange={e => setForm(f => ({ ...f, course_name: e.target.value }))} placeholder="e.g. Fanuc Robot Programming - Beginner to Advanced" /></div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Robot Brand</Label>
                  <Select value={form.robot_brand} onValueChange={v => setForm(f => ({ ...f, robot_brand: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{ROBOT_BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Skill Category</Label>
                  <Select value={form.skill_category} onValueChange={v => setForm(f => ({ ...f, skill_category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{JOB_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div><Label>Duration</Label><Input value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="e.g. 3 months" /></div>
                <div>
                  <Label>Mode</Label>
                  <Select value={form.mode} onValueChange={v => setForm(f => ({ ...f, mode: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Fees (₹)</Label><Input type="number" value={form.fees || ''} onChange={e => setForm(f => ({ ...f, fees: e.target.value ? +e.target.value : undefined }))} /></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><Label>Certification</Label><Input value={form.certification} onChange={e => setForm(f => ({ ...f, certification: e.target.value }))} placeholder="e.g. OEM Certified" /></div>
                <div><Label>City</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
              </div>

              <div>
                <Label>Skills Covered</Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {form.skills_covered.map(s => <Badge key={s} variant="secondary" className="gap-1">{s} <X className="h-3 w-3 cursor-pointer" onClick={() => setForm(f => ({ ...f, skills_covered: f.skills_covered.filter(x => x !== s) }))} /></Badge>)}
                </div>
                <div className="flex gap-2">
                  <Input value={skillInput} onChange={e => setSkillInput(e.target.value)} placeholder="Add skill" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput); } }} list="training-skill-suggestions" />
                  <Button type="button" variant="outline" size="sm" onClick={() => addSkill(skillInput)}>Add</Button>
                </div>
                <datalist id="training-skill-suggestions">
                  {allSkills.filter((s: string) => !form.skills_covered.includes(s)).map((s: string) => <option key={s} value={s} />)}
                </datalist>
              </div>

              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} placeholder="Course overview, curriculum, outcomes..." /></div>

              <Button type="submit" className="w-full" disabled={!form.course_name || createTraining.isPending}>
                {createTraining.isPending ? 'Creating...' : 'Create Training Program'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default TalentPostTraining;
