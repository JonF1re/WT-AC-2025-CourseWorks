import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import '../styles/alert-rules.css';
import '../styles/forms.css';

type Metric = { id: string; name: string; unit: string };
type AlertRule = {
  id: string;
  metric_id: string;
  condition: string;
  threshold: number;
  level: 'info' | 'warning' | 'critical';
  message_template: string;
};
type Alert = {
  id: string;
  metric_id: string;
  reading_id: string;
  level: 'info' | 'warning' | 'critical';
  status: 'new' | 'acknowledged' | 'closed';
  message: string;
  created_at: string;
};

const AlertRulesPage: React.FC = () => {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [metricId, setMetricId] = useState('');
  const [condition, setCondition] = useState('>');
  const [threshold, setThreshold] = useState<number>(0);
  const [level, setLevel] = useState<'info' | 'warning' | 'critical'>('info');
  const [messageTemplate, setMessageTemplate] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'rules' | 'alerts'>('rules');

  const token = localStorage.getItem('token');
  const formRef = useRef<HTMLFormElement>(null);

  const fetchData = async () => {
    if (!token) return;
    try {
      const [metricsRes, rulesRes] = await Promise.all([
        fetch('http://localhost:3000/metrics', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:3000/alerts/rules', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const metricsData = await metricsRes.json();
      const rulesData = await rulesRes.json();
      setMetrics(metricsData.data || []);
      setRules(rulesData.data || []);
    } catch (err) {
      console.error(err);
      setError('Ошибка загрузки данных');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!token) return;
    const socket: Socket = io('http://localhost:3000', { auth: { token } });

    socket.on('new_alert', (alert: Alert) => {
      setAlerts(prev => [alert, ...prev.slice(0, 49)]);
      setActiveTab('alerts');
    });

    return () => { socket.disconnect(); };
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token || !metricId) {
      setError('Выберите метрику');
      return;
    }
    if (!messageTemplate.trim()) {
      setError('Заполните шаблон сообщения');
      return;
    }

    const payload = { 
      metric_id: metricId, 
      condition, 
      threshold, 
      level, 
      message_template: messageTemplate.trim() 
    };

    try {
      const url = editingId
        ? `http://localhost:3000/alerts/rules/${editingId}`
        : 'http://localhost:3000/alerts/rules';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error?.message || 'Ошибка при сохранении правила');
        return;
      }

      const updatedRule = result.data;
      if (editingId) {
        setRules(prev => prev.map(r => (r.id === editingId ? updatedRule : r)));
      } else {
        setRules(prev => [updatedRule, ...prev]);
      }

      setMetricId('');
      setCondition('>');
      setThreshold(0);
      setLevel('info');
      setMessageTemplate('');
      setEditingId(null);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Ошибка сети при сохранении правила');
    }
  };

  const handleEdit = (rule: AlertRule) => {
    setEditingId(rule.id);
    setMetricId(rule.metric_id);
    setCondition(rule.condition);
    setThreshold(rule.threshold);
    setLevel(rule.level);
    setMessageTemplate(rule.message_template);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!token || !confirm('Удалить это правило?')) return;
    try {
      const res = await fetch(`http://localhost:3000/alerts/rules/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error?.message || 'Ошибка при удалении');
        return;
      }
      setRules(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
      setError('Ошибка сети при удалении');
    }
  };

  const handleAlertAction = (alertId: string, action: 'acknowledge' | 'close') => {
    setAlerts(prev =>
      prev.map(a =>
        a.id === alertId ? { ...a, status: action === 'acknowledge' ? 'acknowledged' : 'closed' } : a
      )
    );
    if (!token) return;
    fetch(`http://localhost:3000/alerts/${alertId}/${action}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(console.error);
  };

  const getLevelClass = (level: string) => {
    return level === 'critical' ? 'critical' : level === 'warning' ? 'warning' : 'info';
  };

  const getConditionSymbol = (cond: string) => {
    const map: Record<string, string> = { '>=': '≥', '<=': '≤', '==': '=', '!=': '≠' };
    return map[cond] || cond;
  };

  const getMetricName = (id: string) => {
    return metrics.find(m => m.id === id)?.name || 'Неизвестная метрика';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="page alert-rules-page">
      <header className="alert-rules-header">
        <h1 className="alert-rules-header__title">Правила оповещений</h1>
        <p className="alert-rules-header__subtitle">
          Настройте пороговые значения для отслеживания метрик
        </p>
      </header>

      <div className="alert-rules-tabs">
        <button
          onClick={() => setActiveTab('rules')}
          className={`alert-rules-tab ${activeTab === 'rules' ? 'alert-rules-tab--active' : ''}`}
        >
          Правила ({rules.length})
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`alert-rules-tab ${activeTab === 'alerts' ? 'alert-rules-tab--active' : ''}`}
        >
          Оповещения ({alerts.filter(a => a.status === 'new').length})
        </button>
      </div>

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

      {activeTab === 'rules' && (
        <>
          <div className="card alert-rules-form-card">
            <h2 className="alert-rules-form__title">
              {editingId ? 'Редактирование правила' : 'Новое правило'}
            </h2>
            <form ref={formRef} onSubmit={handleSave} className="alert-rules-form">
              <div className="alert-rules-form__grid">
                <div className="form-field">
                  <label className="form-label">
                    Метрика *
                  </label>
                  <select
                    value={metricId}
                    onChange={e => setMetricId(e.target.value)}
                    className="form-select"
                    required
                  >
                    <option value="">Выберите метрику</option>
                    {metrics.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">
                    Уровень *
                  </label>
                  <select
                    value={level}
                    onChange={e => setLevel(e.target.value as any)}
                    className="form-select"
                  >
                    <option value="info">Информационный</option>
                    <option value="warning">Предупреждение</option>
                    <option value="critical">Критический</option>
                  </select>
                </div>
              </div>

              <div className="alert-rules-form__grid alert-rules-form__grid--three">
                <div className="form-field">
                  <label className="form-label">
                    Условие *
                  </label>
                  <select
                    value={condition}
                    onChange={e => setCondition(e.target.value)}
                    className="form-select"
                  >
                    <option value=">">Больше</option>
                    <option value="<">Меньше</option>
                    <option value=">=">≥</option>
                    <option value="<=">≤</option>
                    <option value="==">=</option>
                    <option value="!=">≠</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">
                    Порог *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={threshold}
                    onChange={e => setThreshold(Number(e.target.value))}
                    placeholder="0.00"
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">
                    Шаблон *
                  </label>
                  <input
                    type="text"
                    value={messageTemplate}
                    onChange={e => setMessageTemplate(e.target.value)}
                    placeholder="Шаблон сообщения"
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="alert-rules-form__actions">
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setMetricId('');
                      setCondition('>');
                      setThreshold(0);
                      setLevel('info');
                      setMessageTemplate('');
                    }}
                    className="secondary"
                  >
                    Отменить
                  </button>
                )}
                <button type="submit" className="alert-rules-form__submit">
                  {editingId ? 'Сохранить' : 'Создать правило'}
                </button>
              </div>
            </form>
          </div>

          <div className="card alert-rules-list-card">
            <h2 className="alert-rules-list__title">Активные правила</h2>
            {rules.length === 0 ? (
              <p className="alert-rules-empty">
                Правила не настроены
              </p>
            ) : (
              <div className="table-responsive">
                <table className="alert-rules-table">
                  <thead>
                    <tr>
                      <th className="alert-rules-table__header">Метрика</th>
                      <th className="alert-rules-table__header">Условие</th>
                      <th className="alert-rules-table__header">Уровень</th>
                      <th className="alert-rules-table__header alert-rules-table__header--actions">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map(rule => (
                      <tr key={rule.id} className="alert-rules-row">
                        <td className="alert-rules-metric">
                          <div className="alert-rules-metric__name">{getMetricName(rule.metric_id)}</div>
                          <div className="alert-rules-metric__template">
                            {rule.message_template}
                          </div>
                        </td>
                        <td className="alert-rules-condition">
                          <span className="condition-badge">
                            {getConditionSymbol(rule.condition)} {rule.threshold}
                          </span>
                        </td>
                        <td className="alert-rules-level">
                          <span className={`alert alert--${getLevelClass(rule.level)} alert--badge`}>
                            {rule.level}
                          </span>
                        </td>
                        <td className="alert-rules-actions">
                          <button
                            onClick={() => handleEdit(rule)}
                            className="secondary alert-rules-action-button"
                          >
                            Редакт.
                          </button>
                          <button
                            onClick={() => handleDelete(rule.id)}
                            className="danger alert-rules-action-button"
                          >
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'alerts' && (
        <div className="card alert-alerts-card">
          <h2 className="alert-alerts__title">Оповещения</h2>
          {alerts.length === 0 ? (
            <p className="alert-alerts-empty">
              Оповещений пока нет
            </p>
          ) : (
            <div className="alert-alerts-list">
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`alert alert--${getLevelClass(alert.level)} alert--compact`}
                >
                  <div className="alert-alerts-content">
                    <div className="alert-alerts-header">
                      <strong className="alert-alerts-message">{alert.message}</strong>
                      <span className={`status-badge status-badge--${alert.status}`}>
                        {alert.status === 'new' ? 'Новый' : 
                         alert.status === 'acknowledged' ? 'Подтверждён' : 'Закрыт'}
                      </span>
                    </div>
                    <div className="alert-alerts-date">
                      {formatDate(alert.created_at)}
                    </div>
                  </div>
                  {alert.status === 'new' && (
                    <div className="alert-alerts-actions">
                      <button
                        onClick={() => handleAlertAction(alert.id, 'acknowledge')}
                        className="secondary alert-alerts-action-button"
                      >
                        Прочитано
                      </button>
                      <button
                        onClick={() => handleAlertAction(alert.id, 'close')}
                        className="danger alert-alerts-action-button"
                      >
                        Закрыть
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AlertRulesPage;