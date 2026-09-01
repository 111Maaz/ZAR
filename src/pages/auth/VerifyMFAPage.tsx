import { useState, type FormEvent, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export function VerifyMFAPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [factorId, setFactorId] = useState('');

  const email = (location.state as { email?: string })?.email || '';
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  useEffect(() => {
    async function getFactor() {
      // We need to re-authenticate to get the challenge
      if (!email) {
        navigate('/login');
        return;
      }
    }
    getFactor();
  }, [email, navigate]);

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (code.length !== 6) {
      setError('Please enter the 6-digit code from your authenticator app.');
      return;
    }

    setLoading(true);

    try {
      // Sign in again to get a session, then challenge MFA
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: '', // We can't re-use password; user must re-enter
      });

      if (signInError && !signInData?.session) {
        // Can't proceed without password — redirect to login
        setError('Session expired. Please sign in again.');
        setTimeout(() => navigate('/login'), 2000);
        return;
      }

      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.[0];

      if (!totpFactor) {
        navigate(from);
        return;
      }

      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });

      if (challengeError) {
        setError(challengeError.message);
        return;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) {
        setError(verifyError.message);
        return;
      }

      navigate(from);
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-brand-50/30 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
            <ShieldCheck className="h-6 w-6 text-brand-600" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Two-Factor Authentication</h1>
          <p className="mt-1 text-sm text-gray-500">
            Enter the 6-digit verification code from your authenticator app
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleVerify} className="space-y-4">
            <Input
              label="Verification code"
              type="text"
              name="code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="text-center text-lg tracking-widest"
              autoComplete="one-time-code"
              inputMode="numeric"
            />
            {error && (
              <div className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700">
                {error}
              </div>
            )}
            <Button type="submit" fullWidth loading={loading}>
              {loading ? 'Verifying...' : 'Verify'}
            </Button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
