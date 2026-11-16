import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Eye, EyeOff, Plane, ShieldCheck, Sparkles } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { login, requestEmailOtp, resendEmailOtp, verifyEmailOtp } from '../services/authApi';

type LoginMode = 'password' | 'email-otp';

function secondsUntil(value: string | null, now: number): number {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : Math.max(0, Math.ceil((timestamp - now) / 1000));
}

function countdownLabel(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return String(minutes).padStart(2, '0') + ':' + String(remainder).padStart(2, '0');
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<LoginMode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [resendAvailableAt, setResendAvailableAt] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const expirySeconds = useMemo(() => secondsUntil(expiresAt, now), [expiresAt, now]);
  const resendSeconds = useMemo(() => secondsUntil(resendAvailableAt, now), [resendAvailableAt, now]);

  function continueToAccount() {
    const next = searchParams.get('next');
    navigate(next?.startsWith('/') && !next.startsWith('//') ? next : '/account', { replace: true });
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      continueToAccount();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function applyOtpTiming(response: { message: string; expiresAt: string; resendAvailableAt: string }) {
    setOtpSent(true);
    setExpiresAt(response.expiresAt);
    setResendAvailableAt(response.resendAvailableAt);
    setNotice(response.message);
    setError('');
    setNow(Date.now());
  }

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      const response = await requestEmailOtp(email.trim());
      applyOtpTiming(response);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to request a sign-in code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function resendCode() {
    if (resendSeconds > 0 || submitting) return;
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      const response = await resendEmailOtp(email.trim());
      applyOtpTiming(response);
      setCode('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to resend the sign-in code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (expirySeconds <= 0) {
      setError('This sign-in code has expired. Request a new code to continue.');
      return;
    }
    setSubmitting(true);
    try {
      await verifyEmailOtp(email.trim(), code);
      continueToAccount();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The sign-in code is invalid or expired.');
    } finally {
      setSubmitting(false);
    }
  }

  function selectMode(nextMode: LoginMode) {
    setMode(nextMode);
    setError('');
    setNotice('');
    setOtpSent(false);
    setCode('');
    setExpiresAt(null);
    setResendAvailableAt(null);
  }

  return (
    <main className="auth-page">
      <Link className="auth-brand" to="/">
        <span className="brand-mark"><Plane size={19} fill="currentColor" /></span>
        <span>fly<span>scanner</span></span>
      </Link>
      <div className="auth-layout">
        <section className="auth-story">
          <div className="auth-story-orbit" />
          <span className="eyebrow"><Sparkles size={14} /> YOUR JOURNEY, IN ONE PLACE</span>
          <h1>Travel plans<br /><span>made simpler.</span></h1>
          <p>Keep your saved flights, route ideas and price alerts together. Pick up right where your next journey begins.</p>
          <div className="auth-story-points">
            <span><ShieldCheck size={16} /> Your travel space</span>
            <span><Plane size={16} /> Saved flight ideas</span>
          </div>
          <div className="auth-story-note">FLYSCANNER · TRAVEL SMARTER</div>
        </section>
        <section className="auth-card">
          <div className="auth-card-heading">
            <span className="eyebrow">WELCOME BACK</span>
            <h2>Sign in to FlyScanner</h2>
            <p>Choose how you want to securely access your account.</p>
          </div>

          <div className="auth-method-switch" role="group" aria-label="Sign-in method">
            <button type="button" className={mode === 'password' ? 'active' : ''} onClick={() => selectMode('password')} aria-pressed={mode === 'password'}>Email & password</button>
            <button type="button" className={mode === 'email-otp' ? 'active' : ''} onClick={() => selectMode('email-otp')} aria-pressed={mode === 'email-otp'}>Email OTP</button>
          </div>

          {mode === 'password' ? (
            <form className="auth-form" onSubmit={submitPassword}>
              <label>Email address
                <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
              </label>
              <label>Password
                <span className="password-input">
                  <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" required minLength={12} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" />
                  <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                </span>
              </label>
              {error && <p className="auth-error" role="alert">{error}</p>}
              <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in with password'} <ArrowRight size={17} /></button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={otpSent ? verifyCode : sendCode}>
              <label>Email address
                <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={otpSent} placeholder="you@example.com" />
              </label>
              {!otpSent ? (
                <>
                  {error && <p className="auth-error" role="alert">{error}</p>}
                  <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? 'Sending code…' : 'Send sign-in code'} <ArrowRight size={17} /></button>
                  <p className="auth-demo-note">We’ll email a six-digit code. It expires after 5 minutes.</p>
                </>
              ) : (
                <>
                  <label>Six-digit email code
                    <input type="text" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" minLength={6} maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Enter 6-digit code" />
                  </label>
                  <div className="otp-timing" aria-live="polite">
                    <span>Code expires in <strong>{countdownLabel(expirySeconds)}</strong></span>
                    <span>Resend available in <strong>{countdownLabel(resendSeconds)}</strong></span>
                  </div>
                  {expirySeconds === 0 && <p className="auth-error" role="alert">Your code has expired. Request a new code.</p>}
                  {error && <p className="auth-error" role="alert">{error}</p>}
                  {notice && <p className="auth-notice" role="status">{notice}</p>}
                  <button className="auth-submit" type="submit" disabled={submitting || expirySeconds === 0 || code.length !== 6}>{submitting ? 'Verifying…' : 'Verify code & sign in'} <ArrowRight size={17} /></button>
                  <button className="otp-resend-button" type="button" onClick={() => void resendCode()} disabled={submitting || resendSeconds > 0}>
                    {resendSeconds > 0 ? 'Resend code in ' + countdownLabel(resendSeconds) : 'Resend code'}
                  </button>
                  <button className="otp-change-email" type="button" onClick={() => { setOtpSent(false); setCode(''); setExpiresAt(null); setResendAvailableAt(null); setError(''); setNotice(''); }}>Use a different email address</button>
                </>
              )}
            </form>
          )}

          {notice && mode === 'email-otp' && !otpSent && <p className="auth-notice" role="status">{notice}</p>}
          <div className="auth-forgot-link"><Link to="/forgot-password">Forgot password?</Link></div>
          <p className="auth-switch">New to FlyScanner? <Link to="/register">Create an account</Link></p>
          <Link className="auth-back-home" to="/">Back to flight search</Link>
        </section>
      </div>
      <footer className="auth-footer">© 2026 FlyScanner <span>Explore more. Compare smarter.</span></footer>
    </main>
  );
}
