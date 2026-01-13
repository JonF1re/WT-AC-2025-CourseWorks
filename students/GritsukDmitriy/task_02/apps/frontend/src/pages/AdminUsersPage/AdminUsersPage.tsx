import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usersApi } from '../../api';
import type { User } from '../../types';
import './AdminUsersPage.css';

export function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    loadUsers();
  }, [offset]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await usersApi.getUsers({ limit, offset });
      setUsers(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить пользователя? Это действие необратимо.')) return;
    try {
      await usersApi.deleteUser(id);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  const handleRoleChange = async (id: string, newRole: 'user' | 'admin') => {
    try {
      await usersApi.updateUser(id, { role: newRole });
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка обновления роли');
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="admin-users-page">
      <div className="page-header">
        <h1>👥 Управление пользователями</h1>
      </div>

      {error && <div className="error-message">{error}</div>}

      {users.length === 0 ? (
        <p className="empty">Пользователей нет</p>
      ) : (
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Логин</th>
                <th>Email</th>
                <th>Роль</th>
                <th>Дата регистрации</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td><strong>{user.username}</strong></td>
                  <td>{user.email}</td>
                  <td>
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as 'user' | 'admin')}
                      className={`role-select ${user.role}`}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString('ru-RU')}</td>
                  <td>
                    <button 
                      className="btn-danger small"
                      onClick={() => handleDelete(user.id)}
                    >
                      🗑️ Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > limit && (
        <div className="pagination">
          <button disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - limit))}>
            ← Назад
          </button>
          <span>{Math.floor(offset / limit) + 1} / {Math.ceil(total / limit)}</span>
          <button disabled={offset + limit >= total} onClick={() => setOffset(o => o + limit)}>
            Вперёд →
          </button>
        </div>
      )}
    </div>
  );
}
