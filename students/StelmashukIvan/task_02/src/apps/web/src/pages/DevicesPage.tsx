import React, { useEffect, useState, useRef } from 'react';
import '../styles/devices.css';

type User = {
  id: string;
  username: string;
  role: string;
};

type Device = {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
};

const DevicesPage: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState({ devices: false, users: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const token = localStorage.getItem('token');
  const nameInputRef = useRef<HTMLInputElement>(null);

  const fetchDevices = async () => {
    if (!token) return;
    setLoading(prev => ({ ...prev, devices: true }));
    try {
      const res = await fetch('http://localhost:3000/devices', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setDevices(data.data || []);
    } catch (err) {
      console.error(err);
      setError('Не удалось загрузить устройства');
    } finally {
      setLoading(prev => ({ ...prev, devices: false }));
    }
  };

  const fetchUsers = async () => {
    if (!token) return;
    setLoading(prev => ({ ...prev, users: true }));
    try {
      const res = await fetch('http://localhost:3000/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUsers(data.data || []);
    } catch (err) {
      console.error(err);
      setError('Не удалось загрузить пользователей');
    } finally {
      setLoading(prev => ({ ...prev, users: false }));
    }
  };

  useEffect(() => {
    fetchDevices();
    fetchUsers();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      setError('Отсутствует токен авторизации');
      return;
    }
    
    if (!ownerId) {
      setError('Выберите владельца устройства');
      return;
    }
    
    if (!name.trim()) {
      setError('Название устройства обязательно');
      nameInputRef.current?.focus();
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      owner_id: ownerId,
    };

    setIsSubmitting(true);
    try {
      const url = editingId 
        ? `http://localhost:3000/devices/${editingId}` 
        : 'http://localhost:3000/devices';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        setError(result.error?.message || (editingId ? 'Ошибка при обновлении устройства' : 'Ошибка при создании устройства'));
        return;
      }

      setName('');
      setDescription('');
      setOwnerId('');
      setEditingId(null);
      setError(null);
      
      fetchDevices();
      
      nameInputRef.current?.focus();
    } catch (err) {
      console.error(err);
      setError('Ошибка сети при сохранении устройства');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (device: Device) => {
    setEditingId(device.id);
    setName(device.name);
    setDescription(device.description || '');
    setOwnerId(device.owner_id);
    nameInputRef.current?.focus();
  };

  const handleDelete = async (id: string, deviceName: string) => {
    if (!token) return;
    
    if (!window.confirm(`Вы уверены, что хотите удалить устройство "${deviceName}"?`)) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:3000/devices/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        const err = await res.json();
        setError(err.error?.message || 'Ошибка при удалении');
        return;
      }
      
      fetchDevices();
    } catch (err) {
      console.error(err);
      setError('Ошибка сети при удалении');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setOwnerId('');
    setError(null);
    nameInputRef.current?.focus();
  };

  const getOwnerName = (ownerId: string) => {
    const owner = users.find(u => u.id === ownerId);
    return owner ? owner.username : 'Неизвестен';
  };

  const getOwnerRole = (ownerId: string) => {
    const owner = users.find(u => u.id === ownerId);
    return owner ? owner.role : '';
  };

  return (
    <div className="page devices-page">
      <header className="devices-header">
        <h1 className="devices-header__title">Управление устройствами</h1>
        <p className="devices-header__subtitle">
          Создавайте и управляйте устройствами системы мониторинга
        </p>
      </header>

      <div className="card devices-form-card">
        <h2 className="devices-form__title">
          {editingId ? 'Редактирование устройства' : 'Добавить новое устройство'}
          {editingId && (
            <span className="editing-badge">
              Режим редактирования
            </span>
          )}
        </h2>
        
        <form onSubmit={handleSave} className="devices-form">
          <div className="devices-form__grid">
            <div className="form-field">
              <label htmlFor="device-name" className="form-label">
                Название устройства *
              </label>
              <input
                id="device-name"
                type="text"
                ref={nameInputRef}
                placeholder="Например: Сервер №1"
                value={name}
                onChange={e => setName(e.target.value)}
                aria-required="true"
                disabled={isSubmitting}
                className="form-input"
              />
            </div>

            <div className="form-field">
              <label htmlFor="device-owner" className="form-label">
                Владелец устройства *
              </label>
              <select 
                id="device-owner"
                value={ownerId} 
                onChange={e => setOwnerId(e.target.value)}
                aria-required="true"
                disabled={isSubmitting}
                className="form-select"
              >
                <option value="">Выберите владельца</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.username} ({u.role === 'admin' ? 'Администратор' : 'Пользователь'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="device-description" className="form-label">
              Описание (необязательно)
            </label>
            <input
              id="device-description"
              type="text"
              placeholder="Краткое описание устройства"
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={isSubmitting}
              className="form-input"
            />
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

          <div className="devices-form__actions">
            {editingId && (
              <button 
                type="button" 
                onClick={handleCancel}
                className="secondary"
                disabled={isSubmitting}
              >
                Отменить
              </button>
            )}
            <button 
              type="submit" 
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="submit-button"
            >
              {isSubmitting ? (
                <>
                  <span className="submit-button__text--hidden">
                    {editingId ? 'Сохранение...' : 'Создание...'}
                  </span>
                  <div className="spinner" />
                </>
              ) : editingId ? 'Сохранить изменения' : 'Создать устройство'}
            </button>
          </div>
        </form>
      </div>

      <div className="card devices-list-card">
        <div className="devices-list-header">
          <h2 className="devices-list__title">Список устройств</h2>
          <div className="devices-list-actions">
            <button 
              type="button" 
              onClick={fetchDevices}
              disabled={loading.devices}
              className="secondary button--icon"
              aria-label="Обновить список устройств"
            >
              {loading.devices ? (
                <>
                  <div className="spinner spinner--small" />
                  Загрузка...
                </>
              ) : 'Обновить'}
            </button>
          </div>
        </div>

        {loading.devices && !devices.length ? (
          <div className="loading-placeholder">
            Загрузка устройств...
          </div>
        ) : devices.length === 0 ? (
          <div className="empty-placeholder">
            Устройства не найдены. Добавьте первое устройство.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="devices-table">
              <thead>
                <tr>
                  <th className="devices-table__header devices-table__header--name">Название</th>
                  <th className="devices-table__header devices-table__header--description">Описание</th>
                  <th className="devices-table__header devices-table__header--owner">Владелец</th>
                  <th className="devices-table__header devices-table__header--actions">Действия</th>
                </tr>
              </thead>
              <tbody>
                {devices.map(device => (
                  <tr 
                    key={device.id}
                    className="device-row"
                  >
                    <td className="device-name">
                      <div className="device-name__text">{device.name}</div>
                    </td>
                    <td className="device-description">
                      <div className={`device-description__text ${!device.description ? 'device-description__text--empty' : ''}`}>
                        {device.description || 'Нет описания'}
                      </div>
                    </td>
                    <td className="device-owner">
                      <div className="device-owner__info">
                        <span className="device-owner__name">{getOwnerName(device.owner_id)}</span>
                        <span className={`owner-role-badge ${getOwnerRole(device.owner_id) === 'admin' ? 'owner-role-badge--admin' : 'owner-role-badge--user'}`}>
                          {getOwnerRole(device.owner_id) === 'admin' ? 'Администратор' : 'Пользователь'}
                        </span>
                      </div>
                    </td>
                    <td className="device-actions">
                      <div className="device-actions__buttons">
                        <button
                          type="button"
                          onClick={() => handleEdit(device)}
                          className="secondary device-action-button"
                          aria-label={`Редактировать устройство ${device.name}`}
                          title="Редактировать"
                        >
                          Редакт.
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(device.id, device.name)}
                          className="danger device-action-button"
                          aria-label={`Удалить устройство ${device.name}`}
                          title="Удалить"
                        >
                          Удалить
                        </button>
                      </div>
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

export default DevicesPage;