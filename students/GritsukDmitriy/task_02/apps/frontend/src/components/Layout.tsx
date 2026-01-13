import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <header className="header">
        <Link to="/" className="logo">🗺️ Roadmaps</Link>
        <nav className="nav">
          {user ? (
            <>
              <Link to="/">Дорожные карты</Link>
              {user.role === 'admin' && <Link to="/admin/users">Пользователи</Link>}
              <Link to="/profile" className="profile-link">
                👤 {user.username}
              </Link>
              <button className="secondary" onClick={handleLogout}>Выйти</button>
            </>
          ) : (
            <>
              <Link to="/login">Вход</Link>
              <Link to="/register">Регистрация</Link>
            </>
          )}
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
