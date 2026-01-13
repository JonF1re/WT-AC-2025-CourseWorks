import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import Dashboard from '../pages/Dashboard';
import AdminDashboard from '../pages/AdminDashboard';
import UsersPage from '../pages/UsersPage';
import DevicesPage from '../pages/DevicesPage';
import MetricsPage from '../pages/MetricsPage';
import AlertRulesPage from '../pages/AlertRulesPage';

// ДЛЯ ОТЛАДКИ - добавьте это в консоль при загрузке
console.log('=== APP STARTED ===');
console.log('Token:', localStorage.getItem('token'));
console.log('User:', localStorage.getItem('user'));

// Компонент для защищенных маршрутов (проверка аутентификации)
const PrivateRoute = () => {
  const token = localStorage.getItem('token');
  console.log('PrivateRoute - token:', token);
  
  if (!token) {
    console.log('PrivateRoute - No token, redirecting to /login');
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

// Компонент для проверки роли admin
const AdminRoute = () => {
  const userString = localStorage.getItem('user');
  console.log('AdminRoute - userString from localStorage:', userString);
  
  if (!userString) {
    console.log('AdminRoute - No user string, redirecting to /dashboard');
    return <Navigate to="/dashboard" replace />;
  }
  
  try {
    const user = JSON.parse(userString);
    console.log('AdminRoute - Parsed user:', user);
    console.log('AdminRoute - User role:', user.role);
    
    if (user.role !== 'admin') {
      console.log(`AdminRoute - Role is "${user.role}", not "admin", redirecting to /dashboard`);
      return <Navigate to="/dashboard" replace />;
    }
    
    console.log('AdminRoute - Access granted, user is admin');
    return <Outlet />;
  } catch (error) {
    console.error('AdminRoute - Error parsing user:', error);
    return <Navigate to="/dashboard" replace />;
  }
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Страница входа */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Защищенные маршруты (только аутентифицированные) */}
        <Route element={<PrivateRoute />}>
          {/* Дашборд для всех аутентифицированных пользователей */}
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* Админ-панель (только для админов) */}
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminDashboard />}>
              <Route index element={<Navigate to="users" replace />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="devices" element={<DevicesPage />} />
              <Route path="metrics" element={<MetricsPage />} />
              <Route path="alert-rules" element={<AlertRulesPage />} />
            </Route>
          </Route>
        </Route>
        
        {/* Редирект по умолчанию */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;