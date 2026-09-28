import React from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute Component
 * 
 * Wraps components that require authentication.
 * If user is not authenticated, redirects to login page.
 * If still loading, shows a loading message.
 */
function ProtectedRoute({ children, onNeedLogin }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    // Notify parent to show login
    if (onNeedLogin) {
      onNeedLogin();
    }
    return <div className="error-message">Please log in to continue</div>;
  }

  return children;
}

export default ProtectedRoute;
