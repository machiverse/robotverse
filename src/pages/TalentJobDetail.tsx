import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import EnhancedHeader from "@/components/EnhancedHeader";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Clock, IndianRupee, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useApplyJob, useMyApplications } from "@/hooks/useRobotTalent";
import { useState } from "react";

const TalentJobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [coverLetter, setCoverLetter] = useState("");
  const applyJob = useApplyJob();
  const { data: myApps } = useMyApplications();

  const { data: job, isLoading } = useQuery({
    queryKey: ['talent-job', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('talent_jobs' as any).select('*').eq('id', id).single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  const alreadyApplied = myApps?.some((a: any) => a.job_id === id);

  if (isLoading) return <div className="min-h-screen bg-background"><EnhancedHeader /><div className="container mx-auto px-4 py-16 text-center text-muted-foreground">Loading...</div><Footer /></div>;
  if (!job) return <div className="min-h-screen bg-background"><EnhancedHeader /><div className="container mx-auto px-4 py-16 text-center text-muted-foreground">Job not found</div><Footer /></div>;

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate('/robot-talent')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Jobs
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">{job.title}</CardTitle>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                  {job.company_type && <span className="capitalize">{job.company_type}</span>}
                  {job.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.city}</span>}
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(job.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              {job.is_featured && <Badge className="bg-primary text-primary-foreground">Featured</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Job Type</p>
                <p className="font-medium capitalize">{job.job_type?.replace('-', ' ')}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Category</p>
                <p className="font-medium">{job.category}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Experience</p>
                <p className="font-medium">{job.experience_min || 0}{job.experience_max ? `-${job.experience_max}` : '+'} yrs</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Salary</p>
                <p className="font-medium flex items-center gap-1">
                  <IndianRupee className="h-3 w-3" />
                  {job.salary_min ? `${(job.salary_min / 100000).toFixed(1)}L` : 'N/A'}
                  {job.salary_max ? ` - ${(job.salary_max / 100000).toFixed(1)}L` : ''}
                </p>
              </div>
            </div>

            {job.robot_brand && (
              <div><p className="text-xs text-muted-foreground mb-1">Robot Brand</p><Badge>{job.robot_brand}</Badge></div>
            )}

            {job.skills_required?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Skills Required</p>
                <div className="flex flex-wrap gap-1.5">{job.skills_required.map((s: string) => <Badge key={s} variant="outline">{s}</Badge>)}</div>
              </div>
            )}

            {job.description && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-sm whitespace-pre-wrap">{job.description}</p>
              </div>
            )}

            {user && !alreadyApplied && (
              <div className="border-t pt-4 space-y-3">
                <Textarea placeholder="Cover letter (optional)" value={coverLetter} onChange={e => setCoverLetter(e.target.value)} rows={3} />
                <Button onClick={() => applyJob.mutate({ jobId: job.id, coverLetter })} disabled={applyJob.isPending}>
                  {applyJob.isPending ? 'Applying...' : 'Apply Now'}
                </Button>
              </div>
            )}
            {alreadyApplied && <Badge variant="secondary" className="mt-4">✓ Already Applied</Badge>}
            {!user && <Button onClick={() => navigate('/auth')} className="mt-4">Sign In to Apply</Button>}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default TalentJobDetail;
