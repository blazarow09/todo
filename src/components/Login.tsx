import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

// Check if we're running in Electron
const isElectron = () => {
  return typeof window !== 'undefined' && window.electronAPI !== undefined;
};

export default function Login() {
  const { signInWithGoogle, loading } = useAuth();

  if (loading) {
    return <div className="login-container">Loading...</div>;
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>My Todo</h1>
        <p>Sign in to sync your tasks across devices</p>
        {isElectron() && (
          <p style={{ fontSize: '0.9em', color: '#999', marginBottom: '1em' }}>
            You'll be redirected to your browser to sign in
          </p>
        )}
        <button className="google-btn" onClick={signInWithGoogle}>
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            alt="Google logo" 
          />
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

