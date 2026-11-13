import { type FormEvent, useState } from 'react';
import { ArrowLeft, ArrowRight, Mail, Plane, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setSubmitted(true);
  }

  return (
    <main className="auth-page">
      <Link className="auth-brand" to="/">
        <span className="brand-mark"><Plane size={19} fill="currentColor" /></span>
        <span>fly<span>scanner</span></span>
      </Link>
      <div className="auth-layout auth-layout-single">
        <section className="auth-card auth-recovery-card">
          <div className="auth-card-heading">
            <span className="eyebrow"><ShieldCheck size={13} /> ACCOUNT ACCESS</span>
            <h2>{submitted ? 'Check your inbox' : 'Reset your password'}</h2>
            <p>{submitted
              ? 'This is a UI demo. No email was sent, but the recovery confirmation state is ready for backend integration.'
              : 'Enter the email address associated with your FlyScanner demo account.'}</p>
          </div>
          {submitted ? (
            <div className="recovery-success" role="status">
              <span><Mail size={22} /></span>
              <strong>Recovery request prepared</strong>
              <small>{email}</small>
              <p>When authentication is connected, a secure password-reset link will be delivered here.</p>
              <Link to="/login" className="auth-submit">Back to sign in <ArrowRight size={16} /></Link>
            </div>
          ) : (
            <form className="auth-form" onSubmit={submit}>
              <label>Email address
                <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
              </label>
              {error && <p className="auth-error" role="alert">{error}</p>}
              <button className="auth-submit" type="submit">Continue <ArrowRight size={17} /></button>
            </form>
          )}
          <Link className="auth-back-home" to="/login"><ArrowLeft size={14} /> Back to sign in</Link>
        </section>
      </div>
      <footer className="auth-footer">© 2026 FlyScanner <span>Explore more. Compare smarter.</span></footer>
    </main>
  );
}
