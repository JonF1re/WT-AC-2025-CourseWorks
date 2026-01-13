import { Routes, Route } from 'react-router-dom';
import { Layout, ProtectedRoute } from './components';
import {
  LoginPage,
  RegisterPage,
  RoadmapsPage,
  RoadmapDetailPage,
  RoadmapFormPage,
  StepFormPage,
  AdminUsersPage,
  ProfilePage,
} from './pages';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Публичные маршруты */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Защищённые маршруты (требуют авторизации) */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <RoadmapsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/roadmaps/:id"
          element={
            <ProtectedRoute>
              <RoadmapDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Админские маршруты */}
        <Route
          path="/roadmaps/new"
          element={
            <ProtectedRoute requiredRole="admin">
              <RoadmapFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/roadmaps/:id/edit"
          element={
            <ProtectedRoute requiredRole="admin">
              <RoadmapFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/roadmaps/:id/steps/new"
          element={
            <ProtectedRoute requiredRole="admin">
              <StepFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/roadmaps/:id/steps/:stepId/edit"
          element={
            <ProtectedRoute requiredRole="admin">
              <StepFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminUsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
