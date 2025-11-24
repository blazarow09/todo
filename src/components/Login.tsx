import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

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

