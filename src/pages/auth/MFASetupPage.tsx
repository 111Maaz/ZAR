import { useState, type FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ShieldCheck, KeyRound, AlertCircle } from 'lucide-react';

export function MFASetupPage() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [qrUrl, setQrUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [factorId, setFactorId] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'enroll' | 'verify' | 'done'>('enroll');

  useEffect(() => {
    async function enroll() {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'ZAR Admin',
      });
      if (error) {
        setError(error.message);
        return;
      }
      setQrUrl(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
    }
    enroll();
  }, []);

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (verifyCode.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }

    setLoading(true);

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: (await supabase.auth.mfa.challenge({ factorId })).data!.id,
      code: verifyCode,
    });

    setLoading(false);

    if (verifyError) {
      setError(verifyError.message);
      return;
    }

    setStep('done');
    toast('Two-factor authentication enabled successfully.', 'success');
  };

  if (step === 'done') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-brand-50/30 px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-100">
            <ShieldCheck className="h-6 w-6 text-success-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">2FA Enabled</h1>
          <p className="mt-2 text-sm text-gray-500">
            Your account is now protected with two-factor authentication. You'll need your authenticator app every time you sign in.
          </p>
          <Button className="mt-6" onClick={() => navigate('/dashboard')}>
            Continue to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-brand-50/30 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
            <KeyRound className="h-6 w-6 text-brand-600" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Set Up 2FA</h1>
          <p className="mt-1 text-sm text-gray-500">
            Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {step === 'enroll' && qrUrl && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <img src={qrUrl} alt="QR Code" className="h-48 w-48 rounded-lg border border-gray-200" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Or enter this secret manually:</p>
                <code className="mt-1 block break-all rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700">
                  {secret}
                </code>
              </div>
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
              <Button fullWidth onClick={() => setStep('verify')}>
                I've added it to my app
              </Button>
            </div>
          )}

          {step === 'verify' && (
            <form onSubmit={handleVerify} className="space-y-4">
              <p className="text-sm text-gray-600">
                Enter the 6-digit code shown in your authenticator app to verify setup.
              </p>
              <Input
                label="Verification code"
                type="text"
                name="verifyCode"
                required
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="text-center text-lg tracking-widest"
                inputMode="numeric"
              />
              {error && (
                <div className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700">
                  {error}
                </div>
              )}
              <Button type="submit" fullWidth loading={loading}>
                {loading ? 'Verifying...' : 'Verify and enable'}
              </Button>
            </form>
          )}
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={async () => {
              await signOut();
              navigate('/login');
            }}
            className="text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            Cancel and sign out
          </button>
        </div>
      </div>
    </div>
  );
}
