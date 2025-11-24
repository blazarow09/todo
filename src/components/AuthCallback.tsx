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
        // First, check if we're returning from a redirect
        try {
          const result = await getRedirectResult(auth);
          if (result && result.user) {
            // User just completed OAuth redirect
            const idToken = await result.user.getIdToken();
            if (mounted) {
              window.location.href = `mytodo://auth?token=${encodeURIComponent(idToken)}`;
            }
            return;
          }
        } catch (redirectError: any) {
          // If redirect result fails, check if user is already signed in
          const currentUser = auth.currentUser;
          if (currentUser) {
            try {
              const idToken = await currentUser.getIdToken();
              if (mounted) {
                window.location.href = `mytodo://auth?token=${encodeURIComponent(idToken)}`;
              }
              return;
            } catch (tokenError) {
              console.error('Failed to get ID token:', tokenError);
            }
          }
          
          // If no user, initiate redirect flow
          if (mounted) {
            await signInWithRedirect(auth, googleProvider);
            // User will be redirected to Google, then back here
            return;
          }
        }

        // Check if user is already signed in
        const currentUser = auth.currentUser;
        if (currentUser) {
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

        // Set up listener as fallback
        unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (!mounted) return;
          
          if (user) {
            try {
              const idToken = await user.getIdToken();
              window.location.href = `mytodo://auth?token=${encodeURIComponent(idToken)}`;
            } catch (tokenError) {
              console.error('Failed to get ID token:', tokenError);
              window.location.href = `mytodo://auth?error=${encodeURIComponent('Failed to get token')}`;
            }
          }
        });

        // Not signed in and no redirect result, initiate OAuth redirect
        await signInWithRedirect(auth, googleProvider);
        // User will be redirected to Google, then back here
      } catch (err: any) {
        if (!mounted) return;
        console.error('Callback error:', err);
        window.location.href = `mytodo://auth?error=${encodeURIComponent(String(err))}`;
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
