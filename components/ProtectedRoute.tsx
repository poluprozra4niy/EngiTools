import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();

  // In a real app with async auth check, you might check a 'loading' state here
  // For now, assuming synchronous local storage check is fast enough.
  
  if (!user) {
    // Redirect to landing page, saving the location they tried to access
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};