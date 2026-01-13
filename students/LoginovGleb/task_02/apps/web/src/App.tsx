import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts';
import { MainLayout, AuthLayout, ProtectedRoute } from './components';
import {
  LoginPage,
  RegisterPage,
  ApplicationsPage,
  ApplicationDetailPage,
  ApplicationFormPage,
  FormsPage,
  FormDetailPage,
  FormFormPage,
  StatusesPage,
  AdminPage,
  NotFoundPage,
} from './pages';

const RootRedirect: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  return <Navigate to={isAuthenticated ? '/applications' : '/forms'} replace />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Публичные маршруты авторизации */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Защищённые маршруты */}
          <Route element={<MainLayout />}>
            <Route
              path="/"
              element={<RootRedirect />}
            />
            
            {/* Заявки */}
            <Route
              path="/applications"
              element={
                <ProtectedRoute>
                  <ApplicationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/applications/new"
              element={
                <ProtectedRoute>
                  <ApplicationFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/applications/:id"
              element={
                <ProtectedRoute>
                  <ApplicationDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/applications/:id/edit"
              element={
                <ProtectedRoute>
                  <ApplicationFormPage />
                </ProtectedRoute>
              }
            />

            {/* Формы */}
            <Route
              path="/forms"
              element={<FormsPage />}
            />
            <Route
              path="/forms/new"
              element={
                <ProtectedRoute roles={['admin']}>
                  <FormFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/forms/:id"
              element={
                <ProtectedRoute>
                  <FormDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/forms/:id/edit"
              element={
                <ProtectedRoute roles={['admin']}>
                  <FormFormPage />
                </ProtectedRoute>
              }
            />

            {/* Статусы */}
            <Route
              path="/statuses"
              element={
                <ProtectedRoute roles={['admin', 'moderator']}>
                  <StatusesPage />
                </ProtectedRoute>
              }
            />

            {/* Админ-панель */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdminPage />
                </ProtectedRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
