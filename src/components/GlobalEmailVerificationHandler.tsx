import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Globally processes Supabase email verification tokens regardless of which
 * route the email link lands on. Supabase email confirm links typically look
 * like `<site>/?token_hash=...&type=signup`. If the configured Site URL is
 * the bare origin (no `/auth` path), the user lands on `/` and the verifier
 * inside the Auth page never runs — leaving them stuck.
 *
 * This handler runs once on mount, picks up any token_hash / error params
 * from the URL (search or hash), verifies the OTP, then redirects to home
 * with a success toast. On error it routes to /auth so the user can resend
 * the verification email.
 */
export const GlobalEmailVerificationHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;

    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));

    const tokenHash = search.get('token_hash') || hash.get('token_hash');
    const type = search.get('type') || hash.get('type');
    const errorParam = search.get('error') || hash.get('error');
    const errorDesc =
      search.get('error_description') || hash.get('error_description');

    // No verification payload present — nothing to do.
    if (!tokenHash && !errorParam) return;

    // Let the dedicated /auth and /reset-password pages handle their own flows.
    if (location.pathname === '/auth' || location.pathname === '/reset-password') return;
    if (type === 'recovery') return;

    handled.current = true;

    const cleanUrl = (path: string) => {
      window.history.replaceState({}, document.title, path);
    };

    (async () => {
      if (errorParam) {
        console.error('❌ Email link error:', errorParam, errorDesc);
        toast({
          variant: 'destructive',
          title: 'Verification Failed',
          description:
            errorDesc?.replace(/\+/g, ' ') ||
            'The verification link is invalid or has expired. Please request a new one.',
        });
        cleanUrl('/auth');
        navigate('/auth', { replace: true });
        return;
      }

      if (!tokenHash || !type) return;

      try {
        console.log('🔗 Global handler: verifying email token, type =', type);
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as 'signup' | 'email' | 'email_change' | 'invite' | 'magiclink',
        });

        if (error) {
          console.error('❌ Global verifyOtp failed:', error);
          toast({
            variant: 'destructive',
            title: 'Verification Failed',
            description: error.message.includes('expired')
              ? 'This verification link has expired. Please request a new one.'
              : error.message,
          });
          cleanUrl('/auth');
          navigate('/auth', { replace: true });
          return;
        }

        if (data?.user) {
          console.log('✅ Global handler verified email for:', data.user.email);
          toast({
            title: '✅ Email Verified!',
            description: 'Your account is now active. Welcome to RobotVerse!',
          });
          cleanUrl('/');
          navigate('/', { replace: true });
        }
      } catch (err: any) {
        console.error('❌ Global verification exception:', err);
        toast({
          variant: 'destructive',
          title: 'Verification Error',
          description: err?.message || 'Something went wrong. Please try again.',
        });
        cleanUrl('/auth');
        navigate('/auth', { replace: true });
      }
    })();
  }, [navigate, location.pathname, toast]);

  return null;
};

export default GlobalEmailVerificationHandler;
