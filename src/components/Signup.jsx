import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Signup Component
 * 
 * Handles user registration with email and password.
 * On successful signup, automatically logs in the user.
 */
function Signup({ onSwitchToLogin, onSignupSuccess }) {
  const { signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Basic validation
    if (!email || !password || !confirmPassword) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    const result = await signup(email, password);

    if (result.success) {
      // Clear form
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      // Notify parent component
      if (onSignupSuccess) {
        onSignupSuccess();
      }
    } else {
      setError(result.error || 'Signup failed. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="auth-form">
      <h2>Create Your Account</h2>
      
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="confirm-password">Confirm Password</label>
          <input
            id="confirm-password"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account?{' '}
        <button 
          type="button"
          onClick={onSwitchToLogin}
          className="link-btn"
        >
          Log in here
        </button>
      </p>
    </div>
  );
}

export default Signup;
