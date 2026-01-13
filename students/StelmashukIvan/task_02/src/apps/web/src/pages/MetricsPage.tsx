import React, { useEffect, useState, useRef } from 'react';
import '../styles/metrics.css';
import '../styles/forms.css';

type Device = { 
  id: string; 
  name: string;
  description?: string;
};

type Metric = { 
  id: string; 
  name: string; 
  device: Device; 
  unit: string;
  created_at?: string;
};

const MetricsPage = () => {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState({ metrics: false, devices: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const token = localStorage.getItem('token');
  const nameInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!token) return;
    
    setLoading({ metrics: true, devices: true });
    try {
      const [mRes, dRes] = await Promise.all([
        fetch('http://localhost:3000/metrics', { 
          headers: { Authorization: `Bearer ${token}` } 
        }),
        fetch('http://localhost:3000/devices', { 
          headers: { Authorization: `Bearer ${token}` } 
        })
      ]);
      
      const mData = await mRes.json();
      const dData = await dRes.json();
      
      if (!mRes.ok) throw new Error(mData.error?.message || 'Ошибка загрузки метрик');
      if (!dRes.ok) throw new Error(dData.error?.message || 'Ошибка загрузки устройств');
      
      setMetrics(mData.data || []);
      setDevices(dData.data || []);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ошибка загрузки данных');
    } finally {
      setLoading({ metrics: false, devices: false });
    }
  };

  useEffect(() => { 
    load(); 
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Название метрики обязательно');
      nameInputRef.current?.focus();
      return;
    }
    
    if (!unit.trim()) {
      setError('Единицы измерения обязательны');
      return;
    }
    
    if (!deviceId) {
      setError('Выберите устройство');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingId 
        ? `http://localhost:3000/metrics/${editingId}`
        : 'http://localhost:3000/metrics';
      
      const method = editingId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 
          Authorization: `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          name: name.trim(), 
          device_id: deviceId, 
          unit: unit.trim() 
        }),
      });
      
      const result = await res.json();
      if (!res.ok) {
        setError(result.error?.message || `Ошибка при ${editingId ? 'редактировании' : 'создании'} метрики`);
        return;
      }
      
      setName('');
      setUnit('');
      setDeviceId('');
      setEditingId(null);
      setError(null);
      
      load();
      
      nameInputRef.current?.focus();
    } catch (err) {
      console.error(err);
      setError(`Ошибка сети при ${editingId ? 'редактировании' : 'создании'} метрики`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const remove = async (id: string, metricName: string) => {
    if (!token) return;
    
    if (!window.confirm(`Вы уверены, что хотите удалить метрику "${metricName}"?`)) {
      return;
    }
    
    try {
      const res = await fetch(`http://localhost:3000/metrics/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || 'Ошибка при удалении метрики');
      }
      
      load();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ошибка при удалении метрики');
    }
  };

  const startEditing = (metric: Metric) => {
    setEditingId(metric.id);
    setName(metric.name);
    setUnit(metric.unit);
    setDeviceId(metric.device.id);
    setError(null);
    nameInputRef.current?.focus();
  };

  const cancelEditing = () => {
    setEditingId(null);
    setName('');
    setUnit('');
    setDeviceId('');
    setError(null);
    nameInputRef.current?.focus();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="page metrics-page">
      <header className="metrics-header">
        <h1 className="metrics-header__title">Управление метриками</h1>
        <p className="metrics-header__subtitle">
          Создавайте и управляйте метриками для мониторинга устройств
        </p>
      </header>

      <div className="card metrics-form-card">
        <h2 className="metrics-form__title">
          {editingId ? 'Редактирование метрики' : 'Добавить новую метрику'}
          {editingId && (
            <span className="editing-badge">
              Режим редактирования
            </span>
          )}
        </h2>
        
        <form onSubmit={handleSubmit} className="metrics-form">
          <div className="metrics-form__grid">
            <div className="form-field">
              <label htmlFor="metric-name" className="form-label">
                Название метрики *
              </label>
              <input
                id="metric-name"
                type="text"
                ref={nameInputRef}
                placeholder="Например: Температура процессора"
                value={name}
                onChange={e => setName(e.target.value)}
                aria-required="true"
                disabled={isSubmitting}
                className="form-input"
              />
              <small className="form-hint">
                Описательное название метрики
              </small>
            </div>

            <div className="form-field">
              <label htmlFor="metric-unit" className="form-label">
                Единицы измерения *
              </label>
              <input
                id="metric-unit"
                type="text"
                placeholder="Например: °C, %, МБ, м/с"
                value={unit}
                onChange={e => setUnit(e.target.value)}
                aria-required="true"
                disabled={isSubmitting}
                className="form-input"
              />
              <small className="form-hint">
                Обозначение единиц измерения
              </small>
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="metric-device" className="form-label">
              Устройство *
            </label>
            <select 
              id="metric-device"
              value={deviceId} 
              onChange={e => setDeviceId(e.target.value)}
              aria-required="true"
              disabled={isSubmitting}
              className="form-select"
            >
              <option value="">Выберите устройство</option>
              {devices.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.description ? `(${d.description})` : ''}
                </option>
              ))}
            </select>
            <small className="form-hint">
              Устройство, к которому привязана метрика
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

          <div className="metrics-form__actions">
            {editingId && (
              <button 
                type="button" 
                onClick={cancelEditing}
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
              ) : editingId ? 'Сохранить изменения' : 'Создать метрику'}
            </button>
          </div>
        </form>
      </div>

      <div className="card metrics-list-card">
        <div className="metrics-list-header">
          <h2 className="metrics-list__title">Список метрик</h2>
          <div className="metrics-list-actions">
            <button 
              type="button" 
              onClick={load}
              disabled={loading.metrics}
              className="secondary button--icon"
              aria-label="Обновить список метрик"
            >
              {loading.metrics ? (
                <>
                  <div className="spinner spinner--small" />
                  Загрузка...
                </>
              ) : 'Обновить'}
            </button>
          </div>
        </div>

        {loading.metrics && !metrics.length ? (
          <div className="loading-placeholder">
            Загрузка метрик...
          </div>
        ) : metrics.length === 0 ? (
          <div className="empty-placeholder">
            Метрики не найдены. Добавьте первую метрику.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="metrics-table">
              <thead>
                <tr>
                  <th className="metrics-table__header metrics-table__header--name">Метрика</th>
                  <th className="metrics-table__header metrics-table__header--unit">Единицы</th>
                  <th className="metrics-table__header metrics-table__header--device">Устройство</th>
                  <th className="metrics-table__header metrics-table__header--created">Создана</th>
                  <th className="metrics-table__header metrics-table__header--actions">Действия</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map(metric => (
                  <tr 
                    key={metric.id}
                    className="metric-row"
                  >
                    <td className="metric-name">
                      <div className="metric-name__text">{metric.name}</div>
                      {metric.id === editingId && (
                        <span className="editing-badge">
                          Редактируется
                        </span>
                      )}
                    </td>
                    <td className="metric-unit">
                      <span className="unit-badge">
                        {metric.unit}
                      </span>
                    </td>
                    <td className="metric-device">
                      <div className="metric-device__info">
                        <div className="metric-device__name">{metric.device.name}</div>
                        {metric.device.description && (
                          <div className="metric-device__description">
                            {metric.device.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="metric-created">
                      {formatDate(metric.created_at)}
                    </td>
                    <td className="metric-actions">
                      <div className="metric-actions__buttons">
                        <button
                          type="button"
                          onClick={() => startEditing(metric)}
                          className="secondary metric-action-button"
                          aria-label={`Редактировать метрику ${metric.name}`}
                          title="Редактировать"
                        >
                          Редакт.
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(metric.id, metric.name)}
                          className="danger metric-action-button"
                          aria-label={`Удалить метрику ${metric.name}`}
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

export default MetricsPage;