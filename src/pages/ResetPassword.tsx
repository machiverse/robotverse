import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({ newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
    api?: string;
  }>({});
  const [hasValidRecoverySession, setHasValidRecoverySession] = useState(false);

  useEffect(() => {
    // Check for recovery tokens in search params
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const type = urlParams.get('type') || hashParams.get('type');
    const accessToken = urlParams.get('access_token') || hashParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token') || hashParams.get('refresh_token');
    const tokenHash = urlParams.get('token_hash');

    const checkRecoverySession = async () => {
      if (type !== 'recovery') {
        setHasValidRecoverySession(false);
        navigate('/auth');
        return;
      }
      // Handle newer Supabase (token_hash)
      if (tokenHash && !accessToken) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash, type: 'recovery'
        });
        setHasValidRecoverySession(!error);
        if (error) navigate('/auth');
        return;
      }
      // Handle access/refresh tokens (older Supabase)
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        setHasValidRecoverySession(!error);
        if (error) navigate('/auth');
        return;
      }
      // Already-active session case
      const { data: { session }, error } = await supabase.auth.getSession();
      setHasValidRecoverySession(!!session && !error);
      if (error || !session) navigate('/auth');
    };

    checkRecoverySession();
  }, [navigate]);

  const validatePasswords = () => {
    const newErrors: {
      newPassword?: string;
      confirmPassword?: string;
    } = {};
    if (!formData.newPassword) newErrors.newPassword = 'New password required';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Confirm password required';
    if (formData.newPassword !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!validatePasswords()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: formData.newPassword });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => navigate('/auth'), 3000);
    } catch {
      setErrors({ api: 'Failed to update password. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (!hasValidRecoverySession) {
    return (
      <div>
        <h2>Invalid or Expired Reset Link</h2>
        <button onClick={() => navigate('/auth')}>Back to Sign In</button>
      </div>
    );
  }
  if (success) {
    return <div>Password updated! Redirecting to sign in…</div>;
  }

  return (
    <form onSubmit={handlePasswordReset}>
      <h2>Set New Password</h2>
      <input
        type="password"
        placeholder="New password"
        value={formData.newPassword}
        onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
      />
      {errors.newPassword && <div style={{color: 'red'}}>{errors.newPassword}</div>}
      <input
        type="password"
        placeholder="Confirm password"
        value={formData.confirmPassword}
        onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
      />
      {errors.confirmPassword && <div style={{color: 'red'}}>{errors.confirmPassword}</div>}
      {errors.api && <div style={{color: 'red'}}>{errors.api}</div>}
      <button type="submit" disabled={loading}>
        {loading ? 'Updating...' : 'Update Password'}
      </button>
    </form>
  );
};
export default ResetPassword;
