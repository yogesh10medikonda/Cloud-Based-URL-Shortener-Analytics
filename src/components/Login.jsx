import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Login Component
 * 
 * Handles user login with email and password.
 * On successful login, redirects to dashboard.
 */
function Login({ onSwitchToSignup, onLoginSuccess }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Basic validation
    if (!email || !password) {
      setError('Email and password are required');
      setLoading(false);
      return;
    }

    const result = await login(email, password);

    if (result.success) {
      // Clear form
      setEmail('');
      setPassword('');
      // Notify parent component
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } else {
      setError(result.error || 'Login failed. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="auth-form">
      <h2>Login to Your Account</h2>
      
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <p className="auth-switch">
        Don't have an account?{' '}
        <button 
          type="button"
          onClick={onSwitchToSignup}
          className="link-btn"
        >
          Sign up here
        </button>
      </p>
    </div>
  );
}

export default Login;
