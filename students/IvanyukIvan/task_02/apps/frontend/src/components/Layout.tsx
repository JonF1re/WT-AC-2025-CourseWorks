import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="layout">
      <header className="header">
        <div className="brand">
          <Link to="/">Progress Tracker</Link>
        </div>
        <nav className="nav">
          {user && (
            <>
              <NavLink to="/dashboard">Dashboard</NavLink>
              <NavLink to="/topics">Topics</NavLink>
              <NavLink to="/goals">Goals</NavLink>
              <NavLink to="/progress">Progress</NavLink>
              <NavLink to="/reports">Reports</NavLink>
            </>
          )}
        </nav>
        <div className="user-block">
          {user ? (
            <>
              <span className="user-info">{user.username} ({user.role})</span>
              <Button onClick={logout} className="ghost">Logout</Button>
            </>
          ) : (
            <div className="auth-links">
              <NavLink to="/login">Login</NavLink>
              <NavLink to="/register">Register</NavLink>
            </div>
          )}
        </div>
      </header>
      <main className="content">{children}</main>
    </div>
  );
}
