import { type FormEvent, useState } from 'react';
import { ArrowRight, Eye, EyeOff, Plane, ShieldCheck, Sparkles } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { signInDemo } from '../services/mockAccountStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('demo@flyscanner.test');
  const [password, setPassword] = useState('FlyDemo123!');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      signInDemo(email, password);
      const next = searchParams.get('next');
      navigate(next?.startsWith('/') ? next : '/account');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
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
            <p>Access your saved flights and travel preferences.</p>
          </div>
          <form className="auth-form" onSubmit={submit}>
            <label>Email address
              <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
            </label>
            <label>Password
              <span className="password-input">
                <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" />
                <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </span>
            </label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'} <ArrowRight size={17} /></button>
          </form>
          <div className="auth-forgot-link"><Link to="/forgot-password">Forgot password?</Link></div>
          <div className="demo-credentials">
            <strong>Demo account</strong>
            <span>demo@flyscanner.test</span>
            <span>FlyDemo123!</span>
            <small>This is a local UI demo. No real authentication or account security is connected.</small>
          </div>
          <p className="auth-switch">New to FlyScanner? <Link to="/register">Create an account</Link></p>
          <Link className="auth-back-home" to="/">Back to flight search</Link>
        </section>
      </div>
      <footer className="auth-footer">© 2026 FlyScanner <span>Explore more. Compare smarter.</span></footer>
    </main>
  );
}
