import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signInWithCustomToken, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Check if we're running in Electron
const isElectron = () => {
  return typeof window !== 'undefined' && window.electronAPI !== undefined;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Handle protocol callback from Electron
  useEffect(() => {
    if (!isElectron()) return;

    const handleProtocolCallback = async (url: string) => {
      try {
        // Parse the protocol URL (format: mytodo://auth?token=... or mytodo://auth?error=...)
        const urlMatch = url.match(/mytodo:\/\/auth\?(.+)/);
        if (!urlMatch) return;

        const params = new URLSearchParams(urlMatch[1]);
        const token = params.get('token');
        const error = params.get('error');

        if (error) {
          console.error('Auth error from callback:', error);
          alert(`Sign-in failed: ${error}`);
          return;
        }

        if (token) {
          // The token is an ID token from Firebase web app
          // We need to exchange it for a custom token via backend, then sign in
          try {
            // Call backend endpoint to exchange ID token for custom token
            const response = await fetch('https://tasks.fragmentor.com/api/auth/exchange-token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ idToken: token }),
            });

            if (!response.ok) {
              throw new Error(`Backend error: ${response.statusText}`);
            }

            const { customToken } = await response.json();
            
            // Sign in with the custom token
            await signInWithCustomToken(auth, customToken);
            
            console.log('Successfully signed in via Electron deep link');
          } catch (error: any) {
            console.error('Failed to exchange token and sign in:', error);
            alert(`Sign-in failed: ${error.message}. Please try signing in via the web app at https://tasks.fragmentor.com/`);
          }
        }
      } catch (err) {
        console.error('Error handling protocol callback:', err);
      }
    };

    // Listen for protocol URLs (Electron will send these)
    if (window.electronAPI?.onProtocolCallback) {
      window.electronAPI.onProtocolCallback(handleProtocolCallback);
    }
  }, []);

  const signInWithGoogle = async () => {
    try {
    if (isElectron()) {
      // In Electron, open browser for OAuth
      const authUrl = `https://tasks.fragmentor.com/auth-callback?platform=electron`;
        // Open browser and let it handle the OAuth flow
        // The callback page will redirect back to mytodo:// protocol
        if (window.electronAPI?.openExternal) {
          await window.electronAPI.openExternal(authUrl);
        } else {
          window.open(authUrl, '_blank');
        }
      } else {
        // Web: use popup
        await signInWithPopup(auth, googleProvider);
      }
    } catch (error) {
      console.error("Error signing in with Google", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

