import React, { useState } from 'react';
import {
  IonApp,
  IonContent,
  IonButton,
  IonSpinner,
  IonIcon,
  setupIonicReact,
} from '@ionic/react';
import { 
  checkmarkCircleOutline, 
  alertCircleOutline,
  mailOutline,
  lockClosedOutline,
  eyeOutline,
  eyeOffOutline,
} from 'ionicons/icons';
import { useAuth } from '../contexts/AuthContext';

// Ionic CSS imports
import "@ionic/react/css/core.css";
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";

// Custom theme
import "../theme/ionic-variables.css";
import "./Login.css";

setupIonicReact({ mode: 'md' });

type AuthMode = 'signin' | 'signup' | 'reset';

export default function Login() {
  const { signUp, signIn, resetPassword, loading } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    return (
      <IonApp>
        <IonContent className="login-content">
          <div className="login-loading">
            <IonSpinner name="crescent" color="primary" />
            <span>Loading...</span>
          </div>
        </IonContent>
      </IonApp>
    );
  }

  return (
    <IonApp>
      <IonContent className="login-content" scrollY={false}>
        <div className="login-container">
          <div className="login-card">
            {/* Logo/Header */}
            <div className="login-header">
              <div className="login-logo">
                <span className="login-logo-icon">✓</span>
              </div>
              <h1 className="login-title">My Tasks</h1>
              <p className="login-subtitle">
                {mode === 'signin' && 'Welcome back! Sign in to continue'}
                {mode === 'signup' && 'Create your account'}
                {mode === 'reset' && 'Reset your password'}
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="login-alert login-alert-error">
                <IonIcon icon={alertCircleOutline} />
                <span>{error}</span>
              </div>
            )}

            {/* Success message */}
            {message && (
              <div className="login-alert login-alert-success">
                <IonIcon icon={checkmarkCircleOutline} />
                <span>{message}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="login-form">
              {/* Email field */}
              <div className="login-field">
                <label className="login-label">Email</label>
                <div className="login-input-wrapper">
                  <IonIcon icon={mailOutline} className="login-input-icon" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="login-input"
                    required
                  />
                </div>
              </div>

              {/* Password field */}
              {mode !== 'reset' && (
                <div className="login-field">
                  <label className="login-label">Password</label>
                  <div className="login-input-wrapper">
                    <IonIcon icon={lockClosedOutline} className="login-input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="login-input"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="login-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <IonIcon icon={showPassword ? eyeOffOutline : eyeOutline} />
                    </button>
                  </div>
                </div>
              )}

              {/* Confirm Password field */}
              {mode === 'signup' && (
                <div className="login-field">
                  <label className="login-label">Confirm Password</label>
                  <div className="login-input-wrapper">
                    <IonIcon icon={lockClosedOutline} className="login-input-icon" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="login-input"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="login-password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <IonIcon icon={showConfirmPassword ? eyeOffOutline : eyeOutline} />
                    </button>
                  </div>
                </div>
              )}

              {/* Forgot password link */}
              {mode === 'signin' && (
                <div className="login-forgot">
                  <button
                    type="button"
                    className="login-link"
                    onClick={() => switchMode('reset')}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Submit button */}
              <IonButton
                expand="block"
                type="submit"
                disabled={submitting}
                className="login-submit-btn"
              >
                {submitting && <IonSpinner name="crescent" />}
                {mode === 'signin' && (submitting ? 'Signing in...' : 'Sign In')}
                {mode === 'signup' && (submitting ? 'Creating account...' : 'Create Account')}
                {mode === 'reset' && (submitting ? 'Sending...' : 'Send Reset Email')}
              </IonButton>
            </form>

            {/* Mode switcher */}
            <div className="login-footer">
              {mode === 'signin' && (
                <p>
                  Don't have an account?{' '}
                  <button type="button" className="login-link" onClick={() => switchMode('signup')}>
                    Sign up
                  </button>
                </p>
              )}
              {mode === 'signup' && (
                <p>
                  Already have an account?{' '}
                  <button type="button" className="login-link" onClick={() => switchMode('signin')}>
                    Sign in
                  </button>
                </p>
              )}
              {mode === 'reset' && (
                <p>
                  Remember your password?{' '}
                  <button type="button" className="login-link" onClick={() => switchMode('signin')}>
                    Sign in
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </IonContent>
    </IonApp>
  );
}
