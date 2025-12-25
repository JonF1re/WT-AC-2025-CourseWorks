import { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useApiError } from '../hooks/useApiError';
import { useAuth } from '../context/AuthContext';
import { TopicReport, UserReport, getTopicReport, getUserReport } from '../api/reports';

export default function ReportsPage() {
  const { user } = useAuth();
  const { error, setErrorFrom } = useApiError();
  const [userId, setUserId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [userReport, setUserReport] = useState<UserReport | null>(null);
  const [topicReport, setTopicReport] = useState<TopicReport | null>(null);
  const [loading, setLoading] = useState(false);

  const loadDefault = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const report = await getUserReport(user.id);
      setUserReport(report);
      setTopicReport(null);
    } catch (err) {
      setErrorFrom(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDefault();
  }, [user?.id]);

  const runUserReport = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const targetId = userId || user.id;
      const report = await getUserReport(targetId);
      setUserReport(report);
      setTopicReport(null);
    } catch (err) {
      setErrorFrom(err);
    } finally {
      setLoading(false);
    }
  };

  const runTopicReport = async () => {
    if (!user || !topicId) return;
    setLoading(true);
    try {
      const report = await getTopicReport(topicId);
      setTopicReport(report);
    } catch (err) {
      setErrorFrom(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid">
      <Card title="Report filters">
        <div className="form inline">
          <label>
            User ID
            <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder={user?.id} />
          </label>
          {user?.role === 'admin' && (
            <label>
              Topic ID
              <Input value={topicId} onChange={(e) => setTopicId(e.target.value)} placeholder="admin only" />
            </label>
          )}
          <Button onClick={runUserReport} disabled={loading}>
            {loading ? 'Loading...' : 'User report'}
          </Button>
          {user?.role === 'admin' && (
            <Button onClick={runTopicReport} disabled={loading || !topicId}>
              Topic report
            </Button>
          )}
        </div>
        {error && <div className="error">{error}</div>}
      </Card>

      <Card title="User report">
        {loading && <div className="center">Loading...</div>}
        {!loading && userReport && (
          <>
            <div className="section-title">{userReport.username}</div>
            <div className="muted">Goals: {userReport.totalGoals}, Completed: {userReport.completedGoals}, In progress: {userReport.inProgressGoals}, Progress: {userReport.progressPercentage}%</div>
            <div className="table">
              <div className="table-head">
                <div>Topic</div>
                <div>Goals</div>
                <div>Completed</div>
                <div>Progress %</div>
              </div>
              {userReport.topicsSummary.map((t) => (
                <div className="table-row" key={t.topicId}>
                  <div>{t.topicName}</div>
                  <div>{t.goalsCount}</div>
                  <div>{t.completedCount}</div>
                  <div>{t.progressPercentage}</div>
                </div>
              ))}
            </div>
          </>
        )}
        {!loading && !userReport && <div className="muted">No user report yet</div>}
      </Card>

      {user?.role === 'admin' && (
        <Card title="Topic report">
          {loading && <div className="center">Loading...</div>}
          {!loading && topicReport && (
            <>
              <div className="section-title">{topicReport.topicName}</div>
              <div className="muted">Goals: {topicReport.totalGoals}, Completed: {topicReport.completedGoals}, Progress: {topicReport.progressPercentage}%</div>
              <div className="table">
                <div className="table-head">
                  <div>User</div>
                  <div>Goals</div>
                  <div>Completed</div>
                  <div>Progress %</div>
                </div>
                {topicReport.usersSummary.map((u) => (
                  <div className="table-row" key={u.userId}>
                    <div>{u.username}</div>
                    <div>{u.goalsCount}</div>
                    <div>{u.completedCount}</div>
                    <div>{u.progressPercentage}</div>
                  </div>
                ))}
              </div>
            </>
          )}
          {!loading && !topicReport && <div className="muted">Run a topic report</div>}
        </Card>
      )}
    </div>
  );
}
