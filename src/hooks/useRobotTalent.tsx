import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export const ROBOT_BRANDS = ['Fanuc', 'ABB', 'KUKA', 'Yaskawa', 'Universal Robots', 'Mitsubishi', 'Kawasaki', 'Epson', 'Doosan', 'Omron', 'Other'] as const;

export const JOB_CATEGORIES = [
  'Robot Programming', 'Robot Maintenance', 'Automation & PLC', 'Vision Systems',
  'EOAT', 'Application Skills', 'Advanced Skills', 'Project Management', 'Sales & Support'
] as const;

export const JOB_TYPES = ['full-time', 'contract', 'freelance', 'internship'] as const;

export const EXPERIENCE_RANGES = [
  { label: '0-2 years', min: 0, max: 2 },
  { label: '3-5 years', min: 3, max: 5 },
  { label: '5-10 years', min: 5, max: 10 },
  { label: '10+ years', min: 10, max: 99 },
] as const;

export function useSkillTags() {
  return useQuery({
    queryKey: ['skill-tags'],
    queryFn: async () => {
      const { data, error } = await supabase.from('skill_tags' as any).select('*').order('sort_order');
      if (error) throw error;
      return data as any[];
    },
    staleTime: 30 * 60 * 1000,
  });
}

export function useTalentJobs(filters?: { category?: string; brand?: string; type?: string; city?: string; expMin?: number; expMax?: number }) {
  return useQuery({
    queryKey: ['talent-jobs', filters],
    queryFn: async () => {
      let query = supabase.from('talent_jobs' as any).select('*').eq('status', 'open').order('created_at', { ascending: false });
      if (filters?.category) query = query.eq('category', filters.category);
      if (filters?.brand) query = query.eq('robot_brand', filters.brand);
      if (filters?.type) query = query.eq('job_type', filters.type);
      if (filters?.city) query = query.ilike('city', `%${filters.city}%`);
      if (filters?.expMin !== undefined) query = query.gte('experience_min', filters.expMin);
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useMyJobs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-talent-jobs', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from('talent_jobs' as any).select('*').eq('employer_id', user.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });
}

export function useJobApplications(jobId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['job-applications', jobId],
    queryFn: async () => {
      if (!jobId) return [];
      const { data, error } = await supabase.from('job_applications' as any).select('*, job_seeker_profiles!inner(*)').eq('job_id', jobId);
      if (error) {
        // fallback without join
        const { data: d2, error: e2 } = await supabase.from('job_applications' as any).select('*').eq('job_id', jobId);
        if (e2) throw e2;
        return d2 as any[];
      }
      return data as any[];
    },
    enabled: !!jobId && !!user,
  });
}

export function useMyApplications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-applications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from('job_applications' as any).select('*, talent_jobs(*)').eq('applicant_id', user.id);
      if (error) {
        const { data: d2, error: e2 } = await supabase.from('job_applications' as any).select('*').eq('applicant_id', user.id);
        if (e2) throw e2;
        return d2 as any[];
      }
      return data as any[];
    },
    enabled: !!user,
  });
}

export function useSeekerProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['seeker-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from('job_seeker_profiles' as any).select('*').eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!user,
  });
}

export function useTalentProfiles(filters?: { skill?: string; brand?: string; city?: string; expMin?: number }) {
  return useQuery({
    queryKey: ['talent-profiles', filters],
    queryFn: async () => {
      let query = supabase.from('job_seeker_profiles' as any).select('*').eq('is_active', true).order('updated_at', { ascending: false });
      if (filters?.city) query = query.ilike('city', `%${filters.city}%`);
      if (filters?.expMin) query = query.gte('total_experience_years', filters.expMin);
      const { data, error } = await query;
      if (error) throw error;
      // Client-side filter for arrays
      let results = data as any[];
      if (filters?.skill) results = results.filter((p: any) => p.skills?.includes(filters.skill));
      if (filters?.brand) results = results.filter((p: any) => p.robot_brands?.includes(filters.brand));
      return results;
    },
  });
}

export function useTrainingPrograms(filters?: { brand?: string; category?: string; mode?: string }) {
  return useQuery({
    queryKey: ['training-programs', filters],
    queryFn: async () => {
      let query = supabase.from('training_programs' as any).select('*').eq('status', 'active').order('created_at', { ascending: false });
      if (filters?.brand) query = query.eq('robot_brand', filters.brand);
      if (filters?.category) query = query.eq('skill_category', filters.category);
      if (filters?.mode) query = query.eq('mode', filters.mode);
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useCreateJob() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (job: any) => {
      const { data, error } = await supabase.from('talent_jobs' as any).insert({ ...job, employer_id: user!.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['talent-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['my-talent-jobs'] });
      toast({ title: 'Job posted successfully!' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

export function useApplyJob() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ jobId, coverLetter }: { jobId: string; coverLetter?: string }) => {
      const { error } = await supabase.from('job_applications' as any).insert({ job_id: jobId, applicant_id: user!.id, cover_letter: coverLetter });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-applications'] });
      toast({ title: 'Application submitted!' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

export function useSaveSeekerProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (profile: any) => {
      const { data, error } = await supabase.from('job_seeker_profiles' as any).upsert({ ...profile, user_id: user!.id }, { onConflict: 'user_id' }).select().single();
      if (error) throw error;
      // Also update profile flag
      await supabase.from('profiles').update({ is_job_seeker: true } as any).eq('user_id', user!.id);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seeker-profile'] });
      toast({ title: 'Profile saved!' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

export function useCreateTraining() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (program: any) => {
      const { data, error } = await supabase.from('training_programs' as any).insert({ ...program, trainer_id: user!.id }).select().single();
      if (error) throw error;
      await supabase.from('profiles').update({ is_trainer: true } as any).eq('user_id', user!.id);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-programs'] });
      toast({ title: 'Training program created!' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}
