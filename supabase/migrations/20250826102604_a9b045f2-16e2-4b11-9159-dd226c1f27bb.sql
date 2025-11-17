-- Add foreign key constraint to robot_view_counts table
ALTER TABLE public.robot_view_counts 
ADD CONSTRAINT robot_view_counts_robot_id_fkey 
FOREIGN KEY (robot_id) REFERENCES public.robots(id) ON DELETE CASCADE;