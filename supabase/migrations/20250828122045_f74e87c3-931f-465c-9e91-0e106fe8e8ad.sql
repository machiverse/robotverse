-- Add admin update policies for equipment management

-- Admin policy for robots table
CREATE POLICY "Admins can update any robot listing" 
ON public.robots 
FOR UPDATE 
USING (is_admin_user());

-- Admin policy for services table  
CREATE POLICY "Admins can update any service listing"
ON public.services
FOR UPDATE
USING (is_admin_user());

-- Admin policy for spare_parts table
CREATE POLICY "Admins can update any spare parts listing"
ON public.spare_parts
FOR UPDATE
USING (is_admin_user());