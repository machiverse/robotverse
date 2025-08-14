-- Remove Resend integration from admin notification function
CREATE OR REPLACE FUNCTION public.notify_admin_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Admin notifications disabled - no action needed
  RETURN NEW;
END;
$function$;