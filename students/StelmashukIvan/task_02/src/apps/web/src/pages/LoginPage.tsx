import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/login.css';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const emailInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Введите логин');
      emailInputRef.current?.focus();
      return;
    }
    
    if (!password) {
      setError('Введите пароль');
      return;
    }
    
    if (password.length < 6) {
      setError('Пароль должен быть не короче 6 символов');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || 'Ошибка входа. Проверьте логин и пароль');
      }

      // Сохраняем данные
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      localStorage.setItem('userId', data.data.user.id); // Для проверок "не удалить себя"

      // Перенаправление по роли
      if (data.data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError((err as Error).message);
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page login-page">
      <div className="card login-card">
        <header className="login-header">
          <h1 className="login-header__title">Вход в систему</h1>
          <p className="login-header__subtitle">Введите данные для авторизации</p>
        </header>

        <form 
          onSubmit={handleSubmit} 
          aria-label="Форма входа"
          className="login-form"
        >
          <div className="form-field">
            <label 
              htmlFor="login-username" 
              className="form-label"
            >
              Логин *
            </label>
            <input
              id="login-username"
              type="text"
              ref={emailInputRef}
              placeholder="Введите ваш логин"
              value={email}
              onChange={e => setEmail(e.target.value)}
              aria-required="true"
              disabled={loading}
              autoComplete="username"
              className="form-input"
            />
            <small className="form-hint">
              Имя пользователя для входа
            </small>
          </div>

          <div className="form-field">
            <label 
              htmlFor="login-password" 
              className="form-label"
            >
              Пароль *
            </label>
            <input
              id="login-password"
              type="password"
              placeholder="Введите ваш пароль"
              value={password}
              onChange={e => setPassword(e.target.value)}
              aria-required="true"
              disabled={loading}
              autoComplete="current-password"
              className="form-input"
            />
            <small className="form-hint">
              Не менее 6 символов
            </small>
          </div>

          {error && (
            <div 
              className="alert critical alert--dismissible" 
              role="alert" 
              aria-live="polite"
            >
              <span>{error}</span>
              <button 
                type="button"
                onClick={() => setError(null)}
                aria-label="Закрыть сообщение об ошибке"
                className="alert__close"
              >
                ✕
              </button>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            aria-busy={loading}
            className="login-submit-button"
          >
            {loading ? (
              <>
                <span className="login-submit-button__text--hidden">Вход...</span>
                <div className="spinner" />
              </>
            ) : 'Войти в систему'}
          </button>
        </form>

        <div className="login-footer">
          <p className="login-footer__text">
            Система мониторинга устройств
          </p>
          <p className="login-footer__note">
            Для тестирования используйте данные администратора
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;