import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export function ProtectedRoute({ children, requirePremium = false }: { children: React.ReactNode, requirePremium?: boolean }) {
  const { user, hasPremiumAccess, isAuthReady } = useAppContext();
  
  if (!isAuthReady) return null;
  if (!user) return <Navigate to="/" replace />;
  if (requirePremium && !hasPremiumAccess) return <Navigate to="/premium" replace />;
  
  return <>{children}</>;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, userRole, isAuthReady } = useAppContext();
  
  if (!isAuthReady) return null;
  if (!user || userRole !== 'admin') return <Navigate to="/" replace />;
  
  return <>{children}</>;
}
