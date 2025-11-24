import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

type AuthMode = 'signin' | 'signup' | 'reset';

export default function Login() {
  const { signUp, signIn, resetPassword, loading } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    setMessage(null);
    if (nextMode === 'reset') {
      setPassword('');
      setConfirmPassword('');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!email) {
      setError('Please enter an email address.');
      return;
    }

    if (mode !== 'reset' && password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);
      if (mode === 'signin') {
        await signIn(email, password);
      } else if (mode === 'signup') {
        await signUp(email, password);
      } else if (mode === 'reset') {
        await resetPassword(email);
        setMessage('Password reset email sent. Check your inbox.');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="login-container">Loading...</div>;
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>My Tasks</h1>
        <p>{mode === 'signin' ? 'Sign in to access your tasks' : mode === 'signup' ? 'Create an account' : 'Reset your password'}</p>

        {error && <div className="login-alert error">{error}</div>}
        {message && <div className="login-alert success">{message}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-label">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-input"
              required
            />
          </label>

          {mode !== 'reset' && (
            <label className="login-label">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
                required
                minLength={6}
              />
            </label>
          )}

          {mode === 'signup' && (
            <label className="login-label">
              Confirm Password
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="login-input"
                required
                minLength={6}
              />
            </label>
          )}

          <button className="login-btn" type="submit" disabled={submitting}>
            {mode === 'signin' && (submitting ? 'Signing in...' : 'Sign In')}
            {mode === 'signup' && (submitting ? 'Creating account...' : 'Create Account')}
            {mode === 'reset' && (submitting ? 'Sending email...' : 'Send Reset Email')}
          </button>
        </form>

        <div className="login-links">
          {mode !== 'signin' && (
            <button type="button" onClick={() => switchMode('signin')} className="login-link-btn">
              Already have an account? Sign in
            </button>
          )}
          {mode !== 'signup' && (
            <button type="button" onClick={() => switchMode('signup')} className="login-link-btn">
              Need an account? Sign up
            </button>
          )}
          {mode !== 'reset' && (
            <button type="button" onClick={() => switchMode('reset')} className="login-link-btn">
              Forgot password?
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

