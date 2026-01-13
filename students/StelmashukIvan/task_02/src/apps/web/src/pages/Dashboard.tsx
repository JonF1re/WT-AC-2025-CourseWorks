import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { io, Socket } from 'socket.io-client';
import '../styles/dashboard.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

type Device = { id: string; name: string; description?: string; location?: string; owner_id: string };
type Metric = { id: string; name: string; unit: string; device_id: string };
type Reading = { id: string; timestamp: string; value: number; metric_id: string };
type Alert = {
  id: string;
  metric_id: string;
  reading_id: string;
  level: 'info' | 'warning' | 'critical';
  status: 'new' | 'acknowledged' | 'closed';
  message: string;
  created_at: string;
  device_id?: string;
  reading?: Reading;
  threshold?: number;
};
type AlertRule = {
  id: string;
  metric_id: string;
  condition: string;
  threshold: number;
  level: 'info' | 'warning' | 'critical';
  message_template: string;
};
type Summary = { devices: number; metrics: number; openAlerts: number };
type EventLog = { id: string; alert_id?: string; device_id: string; message: string; created_at: string };

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [selectedMetricId, setSelectedMetricId] = useState<string>('');
  const [readings, setReadings] = useState<Reading[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [events, setEvents] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState({ devices: false, metrics: false, readings: false, alerts: false });
  const [error, setError] = useState<string | null>(null);

  const deviceSelectRef = useRef<HTMLSelectElement>(null);
  const selectedDevice = devices.find(d => d.id === selectedDeviceId);

  const exportCSV = (data: any[], filename: string, headers?: string[]) => {
    let csv = '';
    if (data.length) {
      const keys = Object.keys(data[0]);
      csv += keys.join(',') + '\n';
      csv += data.map(row => keys.map(k => JSON.stringify(row[k] ?? '')).join(',')).join('\n');
    } else if (headers && headers.length) {
      csv += headers.join(',') + '\n';
    } else {
      csv += 'Нет данных\n';
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    link.click();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    navigate('/login');
  };

  useEffect(() => {
    if (!token) return;
    const fetchDevices = async () => {
      setLoading(prev => ({ ...prev, devices: true }));
      try {
        const res = await fetch('http://localhost:3000/devices', { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        if (!res.ok) throw new Error('Ошибка загрузки устройств');
        const data = await res.json();
        setDevices(data.data || []);
      } catch (err: any) {
        setError(err.message || 'Ошибка загрузки устройств');
      } finally {
        setLoading(prev => ({ ...prev, devices: false }));
      }
    };
    fetchDevices();
  }, [token]);

  useEffect(() => {
    if (!selectedDeviceId || !token) {
      setMetrics([]);
      setSelectedMetricId('');
      return;
    }
    const fetchMetrics = async () => {
      setLoading(prev => ({ ...prev, metrics: true }));
      try {
        const res = await fetch(`http://localhost:3000/metrics?device_id=${selectedDeviceId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Ошибка загрузки метрик');
        const data = await res.json();
        setMetrics(data.data || []);
      } catch (err: any) {
        setError(err.message || 'Ошибка загрузки метрик');
      } finally {
        setLoading(prev => ({ ...prev, metrics: false }));
      }
    };
    fetchMetrics();
  }, [selectedDeviceId, token]);

  useEffect(() => {
    if (!selectedDeviceId || !token) {
      setRules([]);
      return;
    }
    const fetchRules = async () => {
      try {
        const res = await fetch(`http://localhost:3000/alerts/rules?device_id=${selectedDeviceId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setRules(data.data || []);
      } catch (err) {
        console.warn('Ошибка загрузки правил', err);
      }
    };
    fetchRules();
  }, [selectedDeviceId, token]);

  useEffect(() => {
    if (!selectedMetricId || !token) {
      setReadings([]);
      return;
    }
    const fetchReadings = async () => {
      setLoading(prev => ({ ...prev, readings: true }));
      try {
        const res = await fetch(`http://localhost:3000/metrics/${selectedMetricId}/readings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Ошибка загрузки показаний');
        const data = await res.json();
        setReadings(data.data || []);
      } catch (err: any) {
        setError(err.message || 'Ошибка загрузки показаний');
      } finally {
        setLoading(prev => ({ ...prev, readings: false }));
      }
    };
    fetchReadings();
  }, [selectedMetricId, token]);

  useEffect(() => {
    if (!selectedDeviceId || !token) {
      setAlerts([]);
      return;
    }
    const fetchAlerts = async () => {
      setLoading(prev => ({ ...prev, alerts: true }));
      try {
        const res = await fetch(`http://localhost:3000/alerts?device_id=${selectedDeviceId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Ошибка загрузки алертов');
        const data = await res.json();
        setAlerts(data.data || []);
      } catch (err: any) {
        setError(err.message || 'Ошибка загрузки алертов');
      } finally {
        setLoading(prev => ({ ...prev, alerts: false }));
      }
    };
    fetchAlerts();
  }, [selectedDeviceId, token]);

  useEffect(() => {
    if (!token || !selectedDeviceId) return;
    const socket: Socket = io('http://localhost:3000', { auth: { token } });

    socket.on('new_alert', (alert: Alert) => {
      if (alert.device_id === selectedDeviceId) {
        setAlerts(prev => (!prev.some(a => a.id === alert.id) ? [alert, ...prev] : prev));
        if (alert.reading && (!selectedMetricId || alert.reading.metric_id === selectedMetricId)) {
          setReadings(prev => (!prev.some(r => r.id === alert.reading!.id) ? [alert.reading!, ...prev] : prev));
        }
      }
    });

    return () => { socket.disconnect(); };
  }, [token, selectedDeviceId, selectedMetricId]);

  useEffect(() => {
    if (!selectedDeviceId || !token) {
      setSummary(null);
      return;
    }
    const device = devices.find(d => d.id === selectedDeviceId);
    if (!device) return;
    const fetchSummary = async () => {
      try {
        const res = await fetch(`http://localhost:3000/dashboards/home/${device.owner_id}/metrics-summary`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setSummary(data.data || null);
      } catch (err) {
        console.warn('Сводка недоступна', err);
      }
    };
    fetchSummary();
  }, [selectedDeviceId, devices, token]);

  useEffect(() => {
    if (!selectedDeviceId || !token) {
      setEvents([]);
      return;
    }
    const fetchEvents = async () => {
      try {
        const res = await fetch(`http://localhost:3000/events?device_id=${selectedDeviceId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setEvents(data.data || []);
      } catch (err) {
        console.warn('Журнал событий недоступен', err);
      }
    };
    fetchEvents();
  }, [selectedDeviceId, token]);

  const handleAlertAction = async (alertId: string, action: 'acknowledge' | 'close') => {
    const newStatus = action === 'acknowledge' ? 'acknowledged' : 'closed';
    
    setAlerts(prev =>
      prev.map(a =>
        a.id === alertId ? { ...a, status: newStatus } : a
      )
    );
    
    if (!token) return;
    
    try {
      await fetch(`http://localhost:3000/alerts/${alertId}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error(err);
      setAlerts(prev =>
        prev.map(a =>
          a.id === alertId ? { 
            ...a, 
            status: action === 'acknowledge' ? 'new' : 'acknowledged' 
          } : a
        )
      );
    }
  };

  const getMetricName = (metricId: string) => {
    const metric = metrics.find(m => m.id === metricId);
    return metric ? `${metric.name} (${metric.unit})` : 'Неизвестная метрика';
  };

  const getLevelClass = (level: string) => {
    return level === 'critical' ? 'critical' : level === 'warning' ? 'warning' : 'info';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getConditionSymbol = (condition: string) => {
    const map: Record<string, string> = { '>=': '≥', '<=': '≤', '==': '=', '!=': '≠' };
    return map[condition] || condition;
  };

  const chartData = {
    labels: readings.map(r => new Date(r.timestamp).toLocaleTimeString()),
    datasets: [{ 
      label: 'Значение', 
      data: readings.map(r => r.value), 
      borderColor: 'rgb(59, 130, 246)', 
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.1 
    }],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      title: { 
        display: true, 
        text: readings.length === 0 ? 'График показаний (нет данных)' : 'График показаний метрики'
      },
      legend: { display: false }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255, 255, 255, 0.1)' }
      },
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.1)' }
      }
    }
  };

  return (
    <div className="page dashboard">
      <header className="dashboard-header">
        <div className="dashboard-header__info">
          <h1 className="dashboard-header__title">Панель управления</h1>
          <p className="dashboard-header__user-info">
            <span>Пользователь:</span>
            <span className="dashboard-header__username">{user.username}</span>
            <span className={`dashboard-header__role ${user.role === 'admin' ? 'dashboard-header__role--admin' : ''}`}>
              {user.role === 'admin' ? 'Администратор' : 'Пользователь'}
            </span>
          </p>
        </div>
        
        <button 
          onClick={handleLogout}
          className="secondary button--icon"
          aria-label="Выйти из системы"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Выйти
        </button>
      </header>

      {error && (
        <div className="alert critical alert--dismissible" role="alert">
          <span>{error}</span>
          <button 
            onClick={() => setError(null)}
            className="alert__close"
          >
            ✕
          </button>
        </div>
      )}

      <div className="card dashboard-card">
        <h2 className="card__title">Выбор устройства</h2>
        <div className="device-selector">
          <div className="device-selector__field">
            <label htmlFor="device-select" className="form-label">
              Устройство / Дом
            </label>
            <select
              id="device-select"
              ref={deviceSelectRef}
              value={selectedDeviceId}
              onChange={e => setSelectedDeviceId(e.target.value)}
              disabled={loading.devices}
              className="form-select"
            >
              <option value="">-- Выберите устройство --</option>
              {devices.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.location ? `(${d.location})` : ''}
                </option>
              ))}
            </select>
          </div>
          
          {selectedDevice && (
            <div className="device-selector__export">
              <button
                onClick={() => exportCSV(devices.filter(d => d.id === selectedDeviceId), `device_${selectedDeviceId}.csv`)}
                className="secondary"
              >
                Экспорт устройства
              </button>
            </div>
          )}
        </div>

        {selectedDevice && (
          <div className="device-info">
            <div className="device-info__field">
              <div className="device-info__label">Название</div>
              <div className="device-info__value">{selectedDevice.name}</div>
            </div>
            {selectedDevice.location && (
              <div className="device-info__field">
                <div className="device-info__label">Локация</div>
                <div>{selectedDevice.location}</div>
              </div>
            )}
            {selectedDevice.description && (
              <div className="device-info__field">
                <div className="device-info__label">Описание</div>
                <div>{selectedDevice.description}</div>
              </div>
            )}
            {summary && (
              <>
                <div className="device-info__field">
                  <div className="device-info__label">Устройств в доме</div>
                  <div className="device-info__value">{summary.devices}</div>
                </div>
                <div className="device-info__field">
                  <div className="device-info__label">Всего метрик</div>
                  <div className="device-info__value">{summary.metrics}</div>
                </div>
                <div className="device-info__field">
                  <div className="device-info__label">Открытых алертов</div>
                  <div className={`device-info__value ${summary.openAlerts > 0 ? 'device-info__value--critical' : ''}`}>
                    {summary.openAlerts}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {selectedDeviceId && metrics.length > 0 && (
        <div className="card dashboard-card">
          <div className="dashboard-card__header">
            <h2 className="card__title">Метрики устройства</h2>
            {selectedMetricId && (
              <button
                onClick={() => exportCSV(readings, `readings_${selectedMetricId}.csv`)}
                className="secondary"
                disabled={loading.readings}
              >
                {loading.readings ? 'Загрузка...' : 'Экспорт показаний'}
              </button>
            )}
          </div>

          <div className="metric-selector">
            <label htmlFor="metric-select" className="form-label">
              Выберите метрику для графика
            </label>
            <select
              id="metric-select"
              value={selectedMetricId}
              onChange={e => setSelectedMetricId(e.target.value)}
              disabled={loading.metrics}
              className="form-select metric-selector__select"
            >
              <option value="">-- Все метрики устройства --</option>
              {metrics.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.unit})
                </option>
              ))}
            </select>
          </div>

          {selectedMetricId && (
            <div className="chart-container">
              <div className="chart-wrapper">
                <Line data={chartData} options={chartOptions} />
              </div>
              {readings.length === 0 && !loading.readings && (
                <p className="chart-empty">
                  Нет данных для отображения
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {selectedDeviceId && (
        <div className="card dashboard-card">
          <div className="dashboard-card__header">
            <h2 className="card__title">Оповещения устройства</h2>
            <button
              onClick={() => exportCSV(alerts, `alerts_${selectedDeviceId}.csv`)}
              className="secondary"
              disabled={loading.alerts}
            >
              Экспорт алертов
            </button>
          </div>

          {loading.alerts ? (
            <div className="loading-placeholder">
              Загрузка оповещений...
            </div>
          ) : alerts.length === 0 ? (
            <div className="empty-state">
              Нет оповещений для этого устройства
            </div>
          ) : (
            <div className="table-responsive">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Метрика</th>
                    <th>Уровень</th>
                    <th>Сообщение</th>
                    <th>Статус</th>
                    <th>Время</th>
                    <th className="text-right">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map(alert => (
                    <tr 
                      key={alert.id}
                      className={`alert-row ${alert.status === 'new' ? 'alert-row--new' : ''}`}
                    >
                      <td>{getMetricName(alert.metric_id)}</td>
                      <td>
                        <span className={`alert alert--${getLevelClass(alert.level)} alert--badge`}>
                          {alert.level}
                        </span>
                      </td>
                      <td className="alert-message">{alert.message}</td>
                      <td>
                        <span className={`status-badge status-badge--${alert.status}`}>
                          {alert.status === 'new' ? 'Новый' : 
                           alert.status === 'acknowledged' ? 'Подтверждён' : 'Закрыт'}
                        </span>
                      </td>
                      <td className="text-muted">
                        {formatDate(alert.created_at)}
                      </td>
                      <td className="text-right">
                        {alert.status === 'new' && (
                          <div className="action-buttons">
                            <button
                              onClick={() => handleAlertAction(alert.id, 'acknowledge')}
                              className="secondary action-button"
                            >
                              Прочитано
                            </button>
                            <button
                              onClick={() => handleAlertAction(alert.id, 'close')}
                              className="danger action-button"
                            >
                              Закрыть
                            </button>
                          </div>
                        )}
                        {alert.status === 'acknowledged' && (
                          <button
                            onClick={() => handleAlertAction(alert.id, 'close')}
                            className="danger action-button"
                          >
                            Закрыть
                          </button>
                        )}
                        {alert.status === 'closed' && (
                          <span className="text-muted">Закрыто</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {selectedDeviceId && events.length > 0 && (
        <div className="card dashboard-card">
          <div className="dashboard-card__header">
            <h2 className="card__title">Журнал событий</h2>
            <button
              onClick={() => exportCSV(events, `events_${selectedDeviceId}.csv`)}
              className="secondary"
            >
              Экспорт событий
            </button>
          </div>

          <div className="table-responsive">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Время</th>
                  <th>Событие</th>
                  <th>Связанный алерт</th>
                </tr>
              </thead>
              <tbody>
                {events.map(ev => (
                  <tr key={ev.id}>
                    <td className="text-muted">
                      {formatDate(ev.created_at)}
                    </td>
                    <td>{ev.message}</td>
                    <td>
                      {ev.alert_id ? (
                        <span className="alert-id">{ev.alert_id}</span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedDeviceId && rules.length > 0 && (
        <div className="card">
          <h2 className="card__title">Активные правила оповещений</h2>
          
          <div className="table-responsive">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Метрика</th>
                  <th>Условие</th>
                  <th>Порог</th>
                  <th>Уровень</th>
                  <th>Шаблон сообщения</th>
                </tr>
              </thead>
              <tbody>
                {rules
                  .filter(rule => metrics.some(m => m.id === rule.metric_id))
                  .map(rule => {
                    const metric = metrics.find(m => m.id === rule.metric_id);
                    return (
                      <tr key={rule.id}>
                        <td>
                          <div className="metric-name">{metric?.name || 'Неизвестная метрика'}</div>
                          <div className="text-muted">{metric?.unit}</div>
                        </td>
                        <td>
                          <span className="condition-badge">
                            {getConditionSymbol(rule.condition)}
                          </span>
                        </td>
                        <td className="threshold-value">{rule.threshold}</td>
                        <td>
                          <span className={`alert alert--${getLevelClass(rule.level)} alert--badge`}>
                            {rule.level}
                          </span>
                        </td>
                        <td className="message-template">{rule.message_template}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;