import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { roadmapsApi } from '../../api';
import type { Roadmap } from '../../types';
import './RoadmapsPage.css';

export function RoadmapsPage() {
  const { user } = useAuth();
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadRoadmaps();
  }, [page]);

  const loadRoadmaps = async () => {
    try {
      setLoading(true);
      const res = await roadmapsApi.getRoadmaps({ page, limit: 10 });
      setRoadmaps(res.data);
      setTotalPages(res.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить дорожную карту?')) return;
    try {
      await roadmapsApi.deleteRoadmap(id);
      loadRoadmaps();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  const difficultyLabel = (d: string | null | undefined) => {
    if (!d) return null;
    switch (d) {
      case 'beginner': return '🟢 Начинающий';
      case 'intermediate': return '🟡 Средний';
      case 'advanced': return '🔴 Продвинутый';
      default: return d;
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="roadmaps-page">
      <div className="page-header">
        <h1>🗺️ Дорожные карты</h1>
        {isAdmin && (
          <Link to="/roadmaps/new" className="btn-primary">
            + Создать
          </Link>
        )}
      </div>

      {roadmaps.length === 0 ? (
        <p className="empty">Дорожных карт пока нет</p>
      ) : (
        <div className="roadmaps-grid">
          {roadmaps.map((roadmap) => (
            <div key={roadmap.id} className="roadmap-card">
              <div className="roadmap-header">
                {roadmap.difficulty && (
                  <span className={`difficulty ${roadmap.difficulty}`}>
                    {difficultyLabel(roadmap.difficulty)}
                  </span>
                )}
                {roadmap.category && <span className="category">{roadmap.category}</span>}
                {!roadmap.isPublished && <span className="draft">Черновик</span>}
              </div>
              <h2>{roadmap.title}</h2>
              <p>{roadmap.description}</p>
              <div className="roadmap-meta">
                <span>{roadmap._count?.steps ?? 0} шагов</span>
              </div>
              <div className="roadmap-actions">
                <Link to={`/roadmaps/${roadmap.id}`} className="btn-secondary">
                  Открыть
                </Link>
                {isAdmin && (
                  <>
                    <Link to={`/roadmaps/${roadmap.id}/edit`} className="btn-outline">
                      ✏️
                    </Link>
                    <button className="btn-danger" onClick={() => handleDelete(roadmap.id)}>
                      🗑️
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            ← Назад
          </button>
          <span>{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
            Вперёд →
          </button>
        </div>
      )}
    </div>
  );
}
