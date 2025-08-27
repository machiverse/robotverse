-- Update incomplete profiles to show them as needing completion
UPDATE profiles 
SET registration_complete = false 
WHERE company_name IS NULL 
   OR mobile_number IS NULL 
   OR location IS NULL;