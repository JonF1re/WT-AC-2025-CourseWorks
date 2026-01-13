import React, { useEffect, useState, useRef } from 'react';
import '../styles/users.css';

type User = {
  id: string;
  username: string;
  role: string;
};

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const usernameInputRef = useRef<HTMLInputElement>(null);
  
  const token = localStorage.getItem('token');
  const currentUserId = localStorage.getItem('userId');

  const fetchUsers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        const sorted = [...(data.data || [])].sort((a: User) =>
          a.role === 'admin' ? -1 : 1
        );
        setUsers(sorted);
      } else {
        setError(data.error?.message || 'Ошибка при загрузке пользователей');
      }
    } catch (err) {
      console.error(err);
      setError('Ошибка сети при загрузке пользователей');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username || !password) {
      setError('Введите логин и пароль');
      usernameInputRef.current?.focus();
      return;
    }

    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('http://localhost:3000/users/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || 'Ошибка при создании пользователя');
        return;
      }

      setUsername('');
      setPassword('');
      fetchUsers();
      usernameInputRef.current?.focus();
    } catch (err) {
      console.error(err);
      setError('Ошибка сети при создании пользователя');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string, username: string) => {
    if (!token) return;
    if (id === currentUserId) {
      setError('Вы не можете удалить себя');
      return;
    }

    if (!window.confirm(`Вы уверены, что хотите удалить пользователя "${username}"?`)) return;

    try {
      const res = await fetch(`http://localhost:3000/users/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message || 'Ошибка при удалении пользователя');
        return;
      }

      fetchUsers();
    } catch (err) {
      console.error(err);
      setError('Ошибка сети при удалении пользователя');
    }
  };

  return (
    <div className="page users-page">
      <header className="users-header">
        <h1 className="users-header__title">Управление пользователями</h1>
        <p className="users-header__subtitle">Добавляйте и управляйте пользователями системы</p>
      </header>

      <div className="card users-form-card">
        <h2 className="users-form__title">Добавить нового пользователя</h2>
        <form 
          onSubmit={handleAddUser}
          aria-label="Форма добавления пользователя"
          className="users-form"
        >
          <div className="form-field">
            <label htmlFor="username" className="form-label">
              Имя пользователя
            </label>
            <input
              id="username"
              type="text"
              ref={usernameInputRef}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Введите имя пользователя"
              aria-required="true"
              aria-describedby="username-hint"
              disabled={isSubmitting}
              className="form-input"
            />
            <small id="username-hint" className="form-hint">
              Уникальное имя для входа в систему
            </small>
          </div>

          <div className="form-field">
            <label htmlFor="password" className="form-label">
              Пароль
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              aria-required="true"
              aria-describedby="password-hint"
              disabled={isSubmitting}
              className="form-input"
            />
            <small id="password-hint" className="form-hint">
              Не менее 6 символов
            </small>
          </div>

          {error && (
            <div className="alert critical alert--dismissible" role="alert" aria-live="polite">
              <span>{error}</span>
              <button 
                type="button" 
                className="alert__close"
                onClick={() => setError(null)}
                aria-label="Закрыть сообщение об ошибке"
              >
                ✕
              </button>
            </div>
          )}

          <div className="form-actions">
            <button 
              type="submit" 
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="submit-button"
            >
              {isSubmitting ? (
                <>
                  <span className="submit-button__text--hidden">Создание...</span>
                  <div className="spinner" />
                </>
              ) : 'Создать пользователя'}
            </button>
          </div>
        </form>
      </div>

      <div className="card users-list-card">
        <div className="users-list-header">
          <h2 className="users-list__title">Список пользователей</h2>
          <div className="users-list-actions">
            <button 
              type="button" 
              onClick={fetchUsers}
              disabled={loading}
              className="secondary"
              aria-label="Обновить список пользователей"
            >
              {loading ? 'Загрузка...' : 'Обновить'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-placeholder" aria-live="polite">
            Загрузка пользователей...
          </div>
        ) : users.length === 0 ? (
          <div className="empty-placeholder" aria-live="polite">
            Пользователи не найдены
          </div>
        ) : (
          <div className="table-responsive">
            <table className="users-table" aria-label="Список пользователей">
              <thead>
                <tr>
                  <th className="users-table__header users-table__header--username" scope="col">
                    Имя пользователя
                  </th>
                  <th className="users-table__header users-table__header--role" scope="col">
                    Роль
                  </th>
                  <th className="users-table__header users-table__header--actions" scope="col">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr 
                    key={user.id} 
                    className={`user-row ${user.id === currentUserId ? 'user-row--current' : ''}`}
                  >
                    <td className="user-username">
                      <div className="user-username__content">
                        <span className="user-username__name">{user.username}</span>
                        {user.id === currentUserId && (
                          <span className="current-user-badge" aria-label="Текущий пользователь">
                            (Вы)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="user-role">
                      <span className={`role-badge ${user.role === 'admin' ? 'role-badge--admin' : 'role-badge--user'}`}>
                        {user.role === 'admin' ? 'Администратор' : 'Пользователь'}
                      </span>
                    </td>
                    <td className="user-actions">
                      {user.id !== currentUserId ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user.id, user.username)}
                          className="danger user-action-button"
                          aria-label={`Удалить пользователя ${user.username}`}
                          title="Удалить пользователя"
                        >
                          Удалить
                        </button>
                      ) : (
                        <span className="no-action" aria-hidden="true">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersPage;