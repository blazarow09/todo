import React, { useEffect } from 'react';
import { signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import './Login.css';

// This page handles the OAuth callback from Google
// It initiates the OAuth flow, then redirects back to Electron with the ID token
export default function AuthCallback() {
  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    const handleCallback = async () => {
      try {
        // Check current auth state first
        const currentUser = auth.currentUser;
        
        if (currentUser) {
          // User is already signed in, get ID token and redirect
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

        // Set up listener for auth state changes
        unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (!mounted) return;
          
          if (user) {
            // User signed in, get ID token and redirect to Electron
            try {
              const idToken = await user.getIdToken();
              window.location.href = `mytodo://auth?token=${encodeURIComponent(idToken)}`;
            } catch (tokenError) {
              console.error('Failed to get ID token:', tokenError);
              window.location.href = `mytodo://auth?error=${encodeURIComponent('Failed to get token')}`;
            }
          }
        });

        // Not signed in yet, initiate OAuth popup
        try {
          await signInWithPopup(auth, googleProvider);
          // After popup, onAuthStateChanged will fire and redirect
        } catch (popupError: any) {
          if (!mounted) return;
          console.error('Auth popup error:', popupError);
          if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/popup-closed-by-user') {
            alert('Please allow popups for this site to sign in.');
          }
          window.location.href = `mytodo://auth?error=${encodeURIComponent(popupError.message || 'Authentication failed')}`;
        }
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
        <p>Please complete the sign-in process in the popup window.</p>
        <p style={{ fontSize: '0.9em', color: '#999', marginTop: '1em' }}>
          If no popup appears, please allow popups for this site.
        </p>
      </div>
    </div>
  );
}
