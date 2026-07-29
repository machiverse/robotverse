import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TalentPageWrapper from "@/components/talent/TalentPageWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCreateJob, ROBOT_BRANDS, JOB_CATEGORIES, JOB_TYPES, useSkillTags } from "@/hooks/useRobotTalent";

const TalentPostJob = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createJob = useCreateJob();
  const { data: skillTags } = useSkillTags();
  const [form, setForm] = useState({
    title: '', category: '', description: '', robot_brand: '',
    experience_min: 0, experience_max: undefined as number | undefined,
    salary_min: undefined as number | undefined, salary_max: undefined as number | undefined,
    job_type: 'full-time', location: '', city: '',
    skills_required: [] as string[], company_type: 'Integrator',
  });
  const [skillInput, setSkillInput] = useState('');

  if (!user) { navigate('/auth'); return null; }

  const addSkill = (s: string) => {
    if (s && !form.skills_required.includes(s)) setForm(f => ({ ...f, skills_required: [...f.skills_required, s] }));
    setSkillInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createJob.mutate(form, { onSuccess: () => navigate('/robot-talent') });
  };

  const allSkills = skillTags?.map((t: any) => t.skill_name) || [];

  return (
    <TalentPageWrapper title="Post a Job" subtitle="Create a new job listing for robotics professionals" maxWidth="max-w-2xl">
      <Card className="border-border shadow-sm">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-lg">Job Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Job Title *</Label><Input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Robot Programmer - Fanuc" /></div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{JOB_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Robot Brand</Label>
                <Select value={form.robot_brand} onValueChange={v => setForm(f => ({ ...f, robot_brand: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{ROBOT_BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label>Min Experience (yrs)</Label><Input type="number" min={0} value={form.experience_min} onChange={e => setForm(f => ({ ...f, experience_min: +e.target.value }))} /></div>
              <div><Label>Max Experience (yrs)</Label><Input type="number" min={0} value={form.experience_max || ''} onChange={e => setForm(f => ({ ...f, experience_max: e.target.value ? +e.target.value : undefined }))} /></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label>Min Salary (₹/yr)</Label><Input type="number" value={form.salary_min || ''} onChange={e => setForm(f => ({ ...f, salary_min: e.target.value ? +e.target.value : undefined }))} placeholder="e.g. 500000" /></div>
              <div><Label>Max Salary (₹/yr)</Label><Input type="number" value={form.salary_max || ''} onChange={e => setForm(f => ({ ...f, salary_max: e.target.value ? +e.target.value : undefined }))} placeholder="e.g. 1200000" /></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Job Type</Label>
                <Select value={form.job_type} onValueChange={v => setForm(f => ({ ...f, job_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{JOB_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>City</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
            </div>

            <div>
              <Label>Skills Required</Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.skills_required.map(s => (
                  <Badge key={s} variant="secondary" className="gap-1">
                    {s} <X className="h-3 w-3 cursor-pointer" onClick={() => setForm(f => ({ ...f, skills_required: f.skills_required.filter(x => x !== s) }))} />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={skillInput} onChange={e => setSkillInput(e.target.value)} placeholder="Add skill" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput); } }} list="skill-suggestions" />
                <Button type="button" variant="outline" size="sm" onClick={() => addSkill(skillInput)}>Add</Button>
              </div>
              <datalist id="skill-suggestions">
                {allSkills.filter((s: string) => !form.skills_required.includes(s)).map((s: string) => <option key={s} value={s} />)}
              </datalist>
            </div>

            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={5} placeholder="Job description, responsibilities, requirements..." /></div>

            <Button type="submit" className="w-full" disabled={!form.title || !form.category || createJob.isPending}>
              {createJob.isPending ? 'Posting...' : 'Post Job'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </TalentPageWrapper>
  );
};

export default TalentPostJob;
