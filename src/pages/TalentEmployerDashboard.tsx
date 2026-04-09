import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, PlusCircle, Users, Eye, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMyJobs, useJobApplications } from "@/hooks/useRobotTalent";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const TalentEmployerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: myJobs, isLoading } = useMyJobs();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const { data: applications } = useJobApplications(selectedJobId || undefined);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  if (!user) { navigate('/auth'); return null; }

  const updateAppStatus = async (appId: string, status: string) => {
    const { error } = await supabase.from('job_applications' as any).update({ status }).eq('id', appId);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: `Application ${status}` });
    queryClient.invalidateQueries({ queryKey: ['job-applications'] });
  };

  const toggleJobStatus = async (jobId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'open' ? 'closed' : 'open';
    await supabase.from('talent_jobs' as any).update({ status: newStatus }).eq('id', jobId);
    queryClient.invalidateQueries({ queryKey: ['my-talent-jobs'] });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate('/robot-talent')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Robot Talent
        </Button>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Employer Dashboard</h1>
          <Button onClick={() => navigate('/robot-talent/post-job')}><PlusCircle className="h-4 w-4 mr-2" /> Post New Job</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* My Jobs */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="font-semibold text-lg">My Jobs ({myJobs?.length || 0})</h2>
            {myJobs?.map((job: any) => (
              <Card key={job.id} className={`cursor-pointer transition-shadow hover:shadow-md ${selectedJobId === job.id ? 'ring-2 ring-primary' : ''}`} onClick={() => setSelectedJobId(job.id)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{job.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{job.category} · {job.city}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={job.status === 'open' ? 'default' : 'secondary'} className="text-xs capitalize">{job.status}</Badge>
                      <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={(e) => { e.stopPropagation(); toggleJobStatus(job.id, job.status); }}>
                        {job.status === 'open' ? 'Close' : 'Reopen'}
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" /> {job.application_count || 0} applicants
                  </div>
                </CardContent>
              </Card>
            ))}
            {!isLoading && (!myJobs || myJobs.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-8">No jobs posted yet</p>
            )}
          </div>

          {/* Applicants */}
          <div className="lg:col-span-2">
            {selectedJobId ? (
              <div className="space-y-3">
                <h2 className="font-semibold text-lg">Applicants</h2>
                {applications?.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No applications yet</p>}
                {applications?.map((app: any) => (
                  <Card key={app.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{app.job_seeker_profiles?.headline || 'Applicant'}</p>
                          <p className="text-sm text-muted-foreground mt-1">{app.cover_letter || 'No cover letter'}</p>
                          <p className="text-xs text-muted-foreground mt-1">Applied: {new Date(app.applied_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={app.status === 'shortlisted' ? 'default' : app.status === 'rejected' ? 'destructive' : 'secondary'} className="capitalize">{app.status}</Badge>
                          {app.status === 'applied' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => updateAppStatus(app.id, 'shortlisted')}>
                                <CheckCircle className="h-3 w-3 mr-1" /> Shortlist
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => updateAppStatus(app.id, 'rejected')}>
                                <XCircle className="h-3 w-3 mr-1" /> Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p>Select a job to view applicants</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TalentEmployerDashboard;
