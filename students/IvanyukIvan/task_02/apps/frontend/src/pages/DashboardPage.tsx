import { useEffect, useState } from 'react';
import { listTopics } from '../api/topics';
import { listGoals } from '../api/goals';
import { listProgress } from '../api/progress';
import { Card } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const [topicsCount, setTopicsCount] = useState(0);
  const [goalsCount, setGoalsCount] = useState(0);
  const [progressCount, setProgressCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [topics, goals, progress] = await Promise.all([listTopics(), listGoals(), listProgress({ limit: 50 })]);
        setTopicsCount(topics.length);
        setGoalsCount(goals.length);
        setProgressCount(progress.length);
      } catch (err: any) {
        setError(err?.response?.data?.error?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="center">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="grid">
      <Card title="Topics">
        <div className="section-title">Total: {topicsCount}</div>
        <p className="muted">Admin может создавать/редактировать темы.</p>
      </Card>
      <Card title="Goals">
        <div className="section-title">Total: {goalsCount}</div>
        <p className="muted">{user?.role === 'admin' ? 'Admin может назначать цели.' : 'Вы видите только свои цели.'}</p>
      </Card>
      <Card title="Progress entries">
        <div className="section-title">Total: {progressCount}</div>
        <p className="muted">Добавляйте записи, чтобы видеть прогресс.</p>
      </Card>
    </div>
  );
}
