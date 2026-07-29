import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from '@/lib/router-compat';
import { Eye, EyeOff } from 'lucide-react';
import type { CSSProperties } from 'react';

interface ErrorState {
  newPassword?: string;
  confirmPassword?: string;
  api?: string;
}

const ResetPassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({ newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState<ErrorState>({});
  const [hasValidRecoverySession, setHasValidRecoverySession] = useState(false);
  // State for password visibility toggles:
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
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
      if (tokenHash && !accessToken) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
        setHasValidRecoverySession(!error);
        if (error) navigate('/auth');
        return;
      }
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        setHasValidRecoverySession(!error);
        if (error) navigate('/auth');
        return;
      }
      const { data: { session }, error } = await supabase.auth.getSession();
      setHasValidRecoverySession(!!session && !error);
      if (error || !session) navigate('/auth');
    };
    checkRecoverySession();
  }, [navigate]);

  const validatePasswords = () => {
    const newErrors: ErrorState = {};
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
  // Styles for password inputs:
  const passwordInputStyle: CSSProperties = {
    color: 'black',
    border: '1px solid #ccc',
    borderRadius: 4,
    padding: '10px 36px 10px 10px',
    width: '100%',
    fontSize: 16,
    outline: 'none',
    marginBottom: 4
  };
  // Container for eye icon position
  const passwordFieldContainer: CSSProperties = {
    position: 'relative',
    marginBottom: 16
  };
  const eyeIconStyle: CSSProperties = {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    cursor: 'pointer',
    color: 'black'
  };
  return (
    <form onSubmit={handlePasswordReset}>
      <h2>Set New Password</h2>
      <div style={passwordFieldContainer}>
        <input
          type={showNewPassword ? 'text' : 'password'}
          placeholder="New password"
          value={formData.newPassword}
          onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
          style={passwordInputStyle}
        />
        <span
          style={eyeIconStyle}
          onClick={() => setShowNewPassword((v) => !v)}
          tabIndex={0}
          aria-label={showNewPassword ? 'Hide password' : 'Show password'}
        >
          {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </span>
        {errors.newPassword && <div style={{ color: 'red' }}>{errors.newPassword}</div>}
      </div>
      <div style={passwordFieldContainer}>
        <input
          type={showConfirmPassword ? 'text' : 'password'}
          placeholder="Confirm password"
          value={formData.confirmPassword}
          onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
          style={passwordInputStyle}
        />
        <span
          style={eyeIconStyle}
          onClick={() => setShowConfirmPassword((v) => !v)}
          tabIndex={0}
          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
        >
          {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </span>
        {errors.confirmPassword && <div style={{ color: 'red' }}>{errors.confirmPassword}</div>}
      </div>
      {errors.api && <div style={{ color: 'red' }}>{errors.api}</div>}
      <button type="submit" disabled={loading}>
        {loading ? 'Updating...' : 'Update Password'}
      </button>
    </form>
  );
};
export default ResetPassword;
