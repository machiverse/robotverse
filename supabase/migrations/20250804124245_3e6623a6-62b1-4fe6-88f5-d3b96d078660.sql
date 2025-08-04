-- Add state and pincode fields to robots table for import duty calculation
ALTER TABLE public.robots 
ADD COLUMN state TEXT,
ADD COLUMN pincode TEXT;

-- Add comment to clarify the purpose
COMMENT ON COLUMN public.robots.state IS 'State/province where the robot is located for import duty calculation';
COMMENT ON COLUMN public.robots.pincode IS 'Postal/ZIP code where the robot is located for precise import duty calculation';