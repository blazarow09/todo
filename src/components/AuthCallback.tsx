import React, { useEffect, useState } from 'react';
import { signInWithRedirect, getRedirectResult, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import './Login.css';

// Check if we're running in Electron
const isElectron = () => {
    return typeof window !== 'undefined' && (window as any).electronAPI !== undefined;
};

const ELECTRON_FLOW_FLAG = 'electron-auth-flow';

const markElectronFlow = () => {
    if (typeof window === 'undefined') return;
    try {
        window.sessionStorage.setItem(ELECTRON_FLOW_FLAG, '1');
    } catch (err) {
        console.warn('AuthCallback: Unable to persist electron auth flag', err);
    }
};

const clearElectronFlow = () => {
    if (typeof window === 'undefined') return;
    try {
        window.sessionStorage.removeItem(ELECTRON_FLOW_FLAG);
    } catch (err) {
        console.warn('AuthCallback: Unable to clear electron auth flag', err);
    }
};

const shouldReturnToDesktop = () => {
    if (isElectron()) return true;
    if (typeof window === 'undefined') return false;
    try {
        return window.sessionStorage.getItem(ELECTRON_FLOW_FLAG) === '1';
    } catch {
        return false;
    }
};

// This page handles the OAuth callback from Google
// It uses redirect-based auth (no popup) to avoid COOP issues
export default function AuthCallback() {
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('Checking authentication...');

    useEffect(() => {
        let mounted = true;
        let unsubscribe: (() => void) | null = null;

        const handleCallback = async () => {
            try {
                setStatus('Checking for redirect result...');
                const params = new URLSearchParams(window.location.search);
                if (params.get('platform') === 'electron') {
                    markElectronFlow();
                }
                console.log('AuthCallback: Starting callback handling');

                // First, check if we're returning from a Google OAuth redirect
                let result;
                try {
                    result = await getRedirectResult(auth);
                    console.log('AuthCallback: getRedirectResult returned:', result ? 'User found' : 'No result');
                } catch (redirectError: any) {
                    console.error('AuthCallback: getRedirectResult error:', redirectError);
                    // If there's an error getting redirect result, check current user
                    result = null;
                }

                if (result && result.user) {
                    // User just completed OAuth redirect - get token and send to Electron
                    setStatus(`Successfully authenticated as ${result.user.email}`);
                    console.log('AuthCallback: OAuth redirect completed, user:', result.user.email);

                    try {
                        const idToken = await result.user.getIdToken();
                        console.log('AuthCallback: Got ID token, redirecting to Electron...');

                        if (shouldReturnToDesktop() && mounted) {
                            // In Electron, redirect to protocol
                            clearElectronFlow();
                            window.location.href = `mytodo://auth?token=${encodeURIComponent(idToken)}`;
                        } else {
                            // In web, just redirect to home (user is already signed in)
                            setStatus('Sign-in successful! Redirecting...');
                            setTimeout(() => {
                                window.location.href = '/';
                            }, 1000);
                        }
                        return;
                    } catch (tokenError: any) {
                        console.error('AuthCallback: Failed to get ID token:', tokenError);
                        const errorMsg = `Failed to get token: ${tokenError.message}`;
                        setError(errorMsg);
                        if (isElectron() && mounted) {
                            window.location.href = `mytodo://auth?error=${encodeURIComponent(errorMsg)}`;
                        }
                        return;
                    }
                }

                // No redirect result - check if user is already signed in
                const currentUser = auth.currentUser;
                if (currentUser) {
                    setStatus(`Already signed in as ${currentUser.email}`);
                    console.log('AuthCallback: User already signed in:', currentUser.email);
                    try {
                        const idToken = await currentUser.getIdToken();
                        if (shouldReturnToDesktop() && mounted) {
                            clearElectronFlow();
                            window.location.href = `mytodo://auth?token=${encodeURIComponent(idToken)}`;
                        } else {
                            setStatus('Sign-in successful! Redirecting...');
                            setTimeout(() => {
                                window.location.href = '/';
                            }, 1000);
                        }
                        return;
                    } catch (tokenError: any) {
                        console.error('AuthCallback: Failed to get ID token from current user:', tokenError);
                        const errorMsg = `Failed to get token: ${tokenError.message}`;
                        setError(errorMsg);
                        if (isElectron() && mounted) {
                            window.location.href = `mytodo://auth?error=${encodeURIComponent(errorMsg)}`;
                        }
                        return;
                    }
                }

                // Set up auth state listener as fallback
                unsubscribe = onAuthStateChanged(auth, async (user) => {
                    if (!mounted) return;

                    if (user) {
                        setStatus(`Authenticated as ${user.email}`);
                        console.log('AuthCallback: Auth state changed, user signed in:', user.email);
                        try {
                            const idToken = await user.getIdToken();
                            if (shouldReturnToDesktop()) {
                                clearElectronFlow();
                                window.location.href = `mytodo://auth?token=${encodeURIComponent(idToken)}`;
                            } else {
                                setStatus('Sign-in successful! Redirecting...');
                                setTimeout(() => {
                                    window.location.href = '/';
                                }, 1000);
                            }
                        } catch (tokenError: any) {
                            console.error('AuthCallback: Failed to get ID token from auth state change:', tokenError);
                            const errorMsg = `Failed to get token: ${tokenError.message}`;
                            setError(errorMsg);
                        }
                    }
                });

                // Not signed in - check URL params to see if we're coming back from Google
                const urlParams = new URLSearchParams(window.location.search);
                const hasAuthParams = urlParams.has('code') || urlParams.has('error');

                if (!hasAuthParams) {
                    // No auth params and no user - initiate OAuth redirect to Google
                    setStatus('Redirecting to Google...');
                    console.log('AuthCallback: No user found, initiating Google OAuth redirect...');
                    try {
                        await signInWithRedirect(auth, googleProvider);
                        // signInWithRedirect redirects immediately, so this line won't execute
                    } catch (redirectError: any) {
                        console.error('AuthCallback: Redirect error:', redirectError);
                        const errorMsg = `Redirect failed: ${redirectError.message}`;
                        setError(errorMsg);
                        if (shouldReturnToDesktop() && mounted) {
                            clearElectronFlow();
                            window.location.href = `mytodo://auth?error=${encodeURIComponent(errorMsg)}`;
                        }
                    }
                } else {
                    // We have auth params but no result - wait a bit for Firebase to process
                    setStatus('Processing authentication...');
                    console.log('AuthCallback: Auth params detected, waiting for Firebase to process...');
                    // Give Firebase a moment to process the redirect
                    setTimeout(() => {
                        if (mounted && !auth.currentUser) {
                            const errorMsg = 'Authentication timed out. Please try again.';
                            setError(errorMsg);
                            console.error('AuthCallback: Timeout waiting for authentication');
                        }
                    }, 3000);
                }
            } catch (err: any) {
                if (!mounted) return;
                console.error('AuthCallback: Unexpected error:', err);
                const errorMsg = err.message || String(err);
                setError(`Authentication error: ${errorMsg}`);

                if (shouldReturnToDesktop()) {
                    clearElectronFlow();
                    window.location.href = `mytodo://auth?error=${encodeURIComponent(errorMsg)}`;
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
                <h1>{error ? 'Authentication Error' : 'Signing in...'}</h1>
                {error ? (
                    <>
                        <p style={{ color: '#e74c3c', marginBottom: '1em' }}>{error}</p>
                        <button
                            onClick={() => {
                                window.location.href = '/auth-callback';
                            }}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#4285f4',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                            }}
                        >
                            Try Again
                        </button>
                        {!isElectron() && (
                            <button
                                onClick={() => {
                                    window.location.href = '/';
                                }}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#666',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    marginLeft: '10px',
                                }}
                            >
                                Go Home
                            </button>
                        )}
                    </>
                ) : (
                    <>
                        <p>{status}</p>
                        <p style={{ fontSize: '0.9em', color: '#999', marginTop: '1em' }}>
                            {isElectron()
                                ? 'You\'ll be redirected back to the app automatically.'
                                : 'You\'ll be redirected back automatically.'}
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
