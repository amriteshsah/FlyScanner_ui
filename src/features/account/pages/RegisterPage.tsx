import { type FormEvent, useState } from 'react';
import { ArrowRight, Eye, EyeOff, Plane, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { registerDemo } from '../services/mockAccountStore';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Your passwords do not match.');
      return;
    }
    try {
      registerDemo(name, email, password);
      navigate('/account');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to create your demo account.');
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
          <span className="eyebrow"><Sparkles size={14} /> A BETTER WAY TO PLAN</span>
          <h1>Make room<br /><span>for somewhere new.</span></h1>
          <p>Create your FlyScanner travel space to keep the routes, fares and ideas you want to come back to.</p>
          <div className="auth-story-points"><span>✓ Save flight ideas</span><span>✓ Keep routes together</span></div>
          <div className="auth-story-note">FLYSCANNER · TRAVEL SMARTER</div>
        </section>
        <section className="auth-card">
          <div className="auth-card-heading">
            <span className="eyebrow">GET STARTED</span>
            <h2>Create your account</h2>
            <p>A few details and your travel space is ready.</p>
          </div>
          <form className="auth-form" onSubmit={submit}>
            <label>Full name
              <input type="text" autoComplete="name" required minLength={2} value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
            </label>
            <label>Email address
              <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
            </label>
            <label>Password
              <span className="password-input">
                <input type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" />
                <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </span>
            </label>
            <label>Confirm password
              <input type="password" autoComplete="new-password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Re-enter your password" />
            </label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="auth-submit" type="submit">Create account <ArrowRight size={17} /></button>
          </form>
          <p className="auth-demo-note">Demo only: registration is stored in this browser and does not create a secure server account.</p>
          <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
          <Link className="auth-back-home" to="/">Back to flight search</Link>
        </section>
      </div>
      <footer className="auth-footer">© 2026 FlyScanner <span>Explore more. Compare smarter.</span></footer>
    </main>
  );
}
