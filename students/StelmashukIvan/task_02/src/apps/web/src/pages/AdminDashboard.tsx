import { Link, Outlet, Navigate, useLocation } from 'react-router-dom';

const AdminDashboard = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const location = useLocation();
  
  if (!user?.role || user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    window.location.href = '/login';
  };

  const navItems = [
    { path: 'users', label: 'Пользователи' },
    { path: 'devices', label: 'Устройства' },
    { path: 'metrics', label: 'Метрики' },
    { path: 'alert-rules', label: 'Правила оповещений' },
  ];

  const isActive = (path: string) => {
    return location.pathname.includes(path);
  };

  return (
    <div className="page">
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
        paddingBottom: '16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '28px' }}>Административная панель</h1>
          <p style={{ 
            color: 'var(--muted)', 
            margin: 0, 
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>Вы вошли как: </span>
            <span style={{ 
              color: 'var(--primary)',
              fontWeight: 500
            }}>{user.username}</span>
            <span style={{
              background: 'rgba(59, 130, 246, 0.2)',
              color: '#3b82f6',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 500
            }}>
              Администратор
            </span>
          </p>
        </div>
        
        <button 
          onClick={handleLogout}
          className="secondary"
          aria-label="Выйти из системы"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            style={{ flexShrink: 0 }}
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Выйти
        </button>
      </header>

      <nav 
        aria-label="Основная навигация" 
        style={{ 
          marginBottom: '32px',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius)',
          padding: '8px'
        }}
      >
        <ul style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          gap: '4px'
        }}>
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                style={{
                  display: 'block',
                  padding: '12px 20px',
                  textDecoration: 'none',
                  color: isActive(item.path) ? 'white' : 'var(--muted)',
                  background: isActive(item.path) 
                    ? 'var(--primary)' 
                    : 'transparent',
                  borderRadius: '6px',
                  fontWeight: isActive(item.path) ? 500 : 400,
                  transition: 'var(--transition)',
                  fontSize: '14px'
                }}
                onMouseEnter={(e) => {
                  if (!isActive(item.path)) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.color = 'white';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive(item.path)) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--muted)';
                  }
                }}
                aria-current={isActive(item.path) ? 'page' : undefined}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <main style={{ minHeight: '400px' }}>
        <Outlet />
      </main>

      <footer style={{
        marginTop: '48px',
        paddingTop: '20px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        color: 'var(--muted)',
        fontSize: '13px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          Административная панель системы мониторинга
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>Сессия активна</span>
          <span style={{
            width: '8px',
            height: '8px',
            background: 'var(--success)',
            borderRadius: '50%',
            marginTop: '4px'
          }} aria-hidden="true" />
        </div>
      </footer>

      <style>{`
        [aria-current="page"] {
          position: relative;
        }
        
        [aria-current="page"]::after {
          content: '';
          position: absolute;
          bottom: -8px;
          left: 20px;
          right: 20px;
          height: 2px;
          background: white;
          border-radius: 1px;
        }
        
        nav ul li a:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;