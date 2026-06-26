'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Milk, ShieldCheck } from 'lucide-react';
import { requestOtpSchema, verifyOtpSchema } from '@moderns-milk/contracts';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Step = 'phone' | 'otp';

export default function LoginPage() {
  const router = useRouter();
  const { verifyOtp, isAuthenticated, ready } = useAuth();
  const [step, setStep] = React.useState<Step>('phone');
  const [phone, setPhone] = React.useState('+91');
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (ready && isAuthenticated) router.replace('/dashboard');
  }, [ready, isAuthenticated, router]);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = requestOtpSchema.safeParse({ phone });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid phone number');
      return;
    }
    setSubmitting(true);
    try {
      await api.auth.requestOtp(phone);
      setStep('otp');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send code. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = verifyOtpSchema.safeParse({ phone, code });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter the 6-digit code');
      return;
    }
    setSubmitting(true);
    try {
      await verifyOtp(phone, code);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid or expired code.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand p-12 text-brand-foreground lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Milk className="size-6" />
          </div>
          <div>
            <p className="font-semibold">Moderns Milk</p>
            <p className="text-sm text-brand-foreground/55">Admin Console</p>
          </div>
        </div>
        <div className="relative space-y-4">
          <h2 className="max-w-md text-3xl font-semibold leading-tight">
            Run your dairy operation from one calm, fast dashboard.
          </h2>
          <p className="max-w-md text-brand-foreground/60">
            Orders, catalog, approvals and daily collection trends — all in a clean
            operational workspace built for speed.
          </p>
        </div>
        <div className="relative flex items-center gap-2 text-sm text-brand-foreground/55">
          <ShieldCheck className="size-4" /> Secured with phone &amp; one-time passcode
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Milk className="size-5" />
              </div>
              <span className="font-semibold">Moderns Milk</span>
            </div>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">
            {step === 'phone' ? 'Sign in' : 'Verify your number'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === 'phone'
              ? 'Enter your registered phone number to receive a one-time code.'
              : `We sent a 6-digit code to ${phone}.`}
          </p>

          {error && (
            <Alert variant="destructive" className="mt-5">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 'phone' ? (
            <form onSubmit={handleRequestOtp} className="mt-6 space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  inputMode="tel"
                  autoComplete="tel"
                  autoFocus
                  placeholder="+9198XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ''))}
                />
              </div>
              <Button type="submit" className="w-full" size="lg" loading={submitting}>
                Send code <ArrowRight />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="mt-6 space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="otp">One-time code</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={6}
                  placeholder="••••••"
                  className="text-center text-lg font-semibold tracking-[0.5em]"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </div>
              <Button type="submit" className="w-full" size="lg" loading={submitting}>
                Verify &amp; continue
              </Button>
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setCode('');
                  setError(null);
                }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-4" /> Use a different number
              </button>
            </form>
          )}

          <div className="mt-8 rounded-md border border-dashed border-border bg-muted/40 p-4 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Dev sign-in</p>
            <p className="mt-1">
              Admin number: <code>+919000000001</code>. In dev the OTP is printed to the API
              server log.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
