
-- Add talent flags to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_job_seeker BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_employer BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_trainer BOOLEAN DEFAULT false;

-- Skill tags master table
CREATE TABLE public.skill_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category, skill_name)
);

ALTER TABLE public.skill_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view skill tags" ON public.skill_tags FOR SELECT USING (true);

-- Seed skill tags
INSERT INTO public.skill_tags (category, skill_name, icon, sort_order) VALUES
('Robot Programming', 'Teach Pendant Programming', '🤖', 1),
('Robot Programming', 'Offline Programming (RobotStudio, RoboGuide)', '🤖', 2),
('Robot Programming', 'Path Optimization', '🤖', 3),
('Robot Maintenance', 'Preventive Maintenance', '🔧', 1),
('Robot Maintenance', 'Troubleshooting', '🔧', 2),
('Robot Maintenance', 'Servo / Motor Handling', '🔧', 3),
('Automation & PLC', 'PLC Programming', '🔌', 1),
('Automation & PLC', 'HMI / SCADA', '🔌', 2),
('Automation & PLC', 'Control Panel', '🔌', 3),
('Vision Systems', '2D / 3D Vision', '👁️', 1),
('Vision Systems', 'Inspection Systems', '👁️', 2),
('EOAT', 'Gripper Design', '🛠️', 1),
('EOAT', 'Tooling Integration', '🛠️', 2),
('Application Skills', 'Welding Robots', '🏭', 1),
('Application Skills', 'Painting Robots', '🏭', 2),
('Application Skills', 'Material Handling', '🏭', 3),
('Application Skills', 'CNC Machine Tending', '🏭', 4),
('Advanced Skills', 'AI + Robotics', '🧠', 1),
('Advanced Skills', 'Simulation', '🧠', 2),
('Advanced Skills', 'Digital Twin', '🧠', 3);

-- Job Seeker Profiles
CREATE TABLE public.job_seeker_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  headline TEXT,
  skills TEXT[] DEFAULT '{}',
  experience_areas TEXT[] DEFAULT '{}',
  robot_brands TEXT[] DEFAULT '{}',
  total_experience_years INTEGER DEFAULT 0,
  projects_completed INTEGER DEFAULT 0,
  resume_url TEXT,
  preferred_role TEXT,
  expected_salary_min INTEGER,
  expected_salary_max INTEGER,
  availability TEXT DEFAULT 'immediate',
  location TEXT,
  city TEXT,
  bio TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.job_seeker_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view active seeker profiles" ON public.job_seeker_profiles FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Users can insert own seeker profile" ON public.job_seeker_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own seeker profile" ON public.job_seeker_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own seeker profile" ON public.job_seeker_profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Jobs table
CREATE TABLE public.talent_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  robot_brand TEXT,
  experience_min INTEGER DEFAULT 0,
  experience_max INTEGER,
  salary_min INTEGER,
  salary_max INTEGER,
  job_type TEXT DEFAULT 'full-time',
  location TEXT,
  city TEXT,
  skills_required TEXT[] DEFAULT '{}',
  company_type TEXT,
  status TEXT DEFAULT 'open',
  is_featured BOOLEAN DEFAULT false,
  application_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.talent_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view open jobs" ON public.talent_jobs FOR SELECT USING (status = 'open' OR (auth.uid() = employer_id));
CREATE POLICY "Authenticated users can post jobs" ON public.talent_jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = employer_id);
CREATE POLICY "Employers can update own jobs" ON public.talent_jobs FOR UPDATE TO authenticated USING (auth.uid() = employer_id);
CREATE POLICY "Employers can delete own jobs" ON public.talent_jobs FOR DELETE TO authenticated USING (auth.uid() = employer_id);

-- Job Applications
CREATE TABLE public.job_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.talent_jobs(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cover_letter TEXT,
  status TEXT DEFAULT 'applied',
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, applicant_id)
);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Applicants can view own applications" ON public.job_applications FOR SELECT TO authenticated USING (auth.uid() = applicant_id);
CREATE POLICY "Employers can view applications for their jobs" ON public.job_applications FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.talent_jobs WHERE id = job_id AND employer_id = auth.uid()));
CREATE POLICY "Authenticated users can apply" ON public.job_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = applicant_id);
CREATE POLICY "Employers can update application status" ON public.job_applications FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.talent_jobs WHERE id = job_id AND employer_id = auth.uid()));

-- Saved Jobs
CREATE TABLE public.saved_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.talent_jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, job_id)
);

ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own saved jobs" ON public.saved_jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can save jobs" ON public.saved_jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave jobs" ON public.saved_jobs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Training Programs
CREATE TABLE public.training_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_name TEXT NOT NULL,
  description TEXT,
  robot_brand TEXT,
  skill_category TEXT,
  duration TEXT,
  mode TEXT DEFAULT 'offline',
  fees INTEGER,
  certification TEXT,
  location TEXT,
  city TEXT,
  skills_covered TEXT[] DEFAULT '{}',
  max_students INTEGER,
  status TEXT DEFAULT 'active',
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.training_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active training" ON public.training_programs FOR SELECT USING (status = 'active' OR (auth.uid() = trainer_id));
CREATE POLICY "Trainers can add programs" ON public.training_programs FOR INSERT TO authenticated WITH CHECK (auth.uid() = trainer_id);
CREATE POLICY "Trainers can update own programs" ON public.training_programs FOR UPDATE TO authenticated USING (auth.uid() = trainer_id);
CREATE POLICY "Trainers can delete own programs" ON public.training_programs FOR DELETE TO authenticated USING (auth.uid() = trainer_id);

-- Training Inquiries
CREATE TABLE public.training_inquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(program_id, user_id)
);

ALTER TABLE public.training_inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own inquiries" ON public.training_inquiries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Trainers can view inquiries for their programs" ON public.training_inquiries FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.training_programs WHERE id = program_id AND trainer_id = auth.uid()));
CREATE POLICY "Users can submit inquiries" ON public.training_inquiries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Trainers can update inquiry status" ON public.training_inquiries FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.training_programs WHERE id = program_id AND trainer_id = auth.uid()));

-- Update triggers
CREATE TRIGGER update_job_seeker_profiles_updated_at BEFORE UPDATE ON public.job_seeker_profiles FOR EACH ROW EXECUTE FUNCTION public.update_crm_updated_at();
CREATE TRIGGER update_talent_jobs_updated_at BEFORE UPDATE ON public.talent_jobs FOR EACH ROW EXECUTE FUNCTION public.update_crm_updated_at();
CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON public.job_applications FOR EACH ROW EXECUTE FUNCTION public.update_crm_updated_at();
CREATE TRIGGER update_training_programs_updated_at BEFORE UPDATE ON public.training_programs FOR EACH ROW EXECUTE FUNCTION public.update_crm_updated_at();
CREATE TRIGGER update_training_inquiries_updated_at BEFORE UPDATE ON public.training_inquiries FOR EACH ROW EXECUTE FUNCTION public.update_crm_updated_at();

-- Indexes
CREATE INDEX idx_talent_jobs_status ON public.talent_jobs(status);
CREATE INDEX idx_talent_jobs_category ON public.talent_jobs(category);
CREATE INDEX idx_talent_jobs_employer ON public.talent_jobs(employer_id);
CREATE INDEX idx_job_applications_job ON public.job_applications(job_id);
CREATE INDEX idx_job_applications_applicant ON public.job_applications(applicant_id);
CREATE INDEX idx_job_seeker_profiles_active ON public.job_seeker_profiles(is_active);
CREATE INDEX idx_training_programs_status ON public.training_programs(status);
