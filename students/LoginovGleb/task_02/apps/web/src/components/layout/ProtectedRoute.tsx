import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts';
import { LoadingOverlay, Alert } from '../ui';
import type { Role } from '../../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingOverlay text="Проверка авторизации..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return (
      <div className="page-container">
        <Alert variant="error">
          У вас нет прав для доступа к этой странице.
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
};
