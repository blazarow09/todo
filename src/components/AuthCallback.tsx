import React, { useEffect } from 'react';
import { signInWithRedirect, getRedirectResult, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import './Login.css';

// This page handles the OAuth callback from Google
// It uses redirect-based auth (no popup) to avoid COOP issues
export default function AuthCallback() {
  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    const handleCallback = async () => {
      try {
        // First, check if we're returning from a Google OAuth redirect
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          // User just completed OAuth redirect - get token and send to Electron
          console.log('OAuth redirect completed, user:', result.user.email);
          const idToken = await result.user.getIdToken();
          if (mounted) {
            window.location.href = `mytodo://auth?token=${encodeURIComponent(idToken)}`;
          }
          return;
        }

        // No redirect result - check if user is already signed in
        const currentUser = auth.currentUser;
        if (currentUser) {
          console.log('User already signed in:', currentUser.email);
          try {
            const idToken = await currentUser.getIdToken();
            if (mounted) {
              window.location.href = `mytodo://auth?token=${encodeURIComponent(idToken)}`;
            }
            return;
          } catch (tokenError) {
            console.error('Failed to get ID token:', tokenError);
            if (mounted) {
              window.location.href = `mytodo://auth?error=${encodeURIComponent('Failed to get token')}`;
            }
            return;
          }
        }

        // Not signed in - initiate OAuth redirect to Google immediately
        // signInWithRedirect will redirect the entire page, so this is the last line that executes
        console.log('No user found, initiating Google OAuth redirect...');
        try {
          // signInWithRedirect redirects immediately, so this line may not complete
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectError: any) {
          // If redirect fails (shouldn't happen normally), send error to Electron
          console.error('Redirect error:', redirectError);
          if (mounted) {
            window.location.href = `mytodo://auth?error=${encodeURIComponent(redirectError.message || 'Redirect failed')}`;
          }
        }
      } catch (err: any) {
        if (!mounted) return;
        console.error('Callback error:', err);
        // If error is not about redirect, send to Electron
        if (!err.code || err.code !== 'auth/popup-blocked') {
          window.location.href = `mytodo://auth?error=${encodeURIComponent(err.message || String(err))}`;
        }
      }
    };

    handleCallback();

    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Signing in...</h1>
        <p>Redirecting to Google to complete sign-in...</p>
        <p style={{ fontSize: '0.9em', color: '#999', marginTop: '1em' }}>
          You'll be redirected back automatically.
        </p>
      </div>
    </div>
  );
}
