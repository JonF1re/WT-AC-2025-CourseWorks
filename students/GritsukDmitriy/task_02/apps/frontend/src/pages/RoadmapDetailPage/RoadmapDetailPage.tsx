import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { roadmapsApi, stepsApi, progressApi } from '../../api';
import type { Roadmap, Step, ProgressResponse } from '../../types';
import './RoadmapDetailPage.css';

export function RoadmapDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAdmin = user?.role === 'admin';
  const roadmapId = id!;

  const loadData = useCallback(async () => {
    if (!roadmapId) return;
    try {
      setLoading(true);
      const [roadmapRes, stepsRes, progressRes] = await Promise.all([
        roadmapsApi.getRoadmap(roadmapId),
        stepsApi.getSteps(roadmapId),
        progressApi.getProgress(roadmapId).catch(() => null),
      ]);
      setRoadmap(roadmapRes);
      // Roadmap already includes steps from backend
      setSteps(roadmapRes.steps ?? stepsRes);
      setProgress(progressRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [roadmapId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleStep = async (stepId: string, isCompleted: boolean) => {
    try {
      if (isCompleted) {
        await progressApi.unmarkStep(stepId);
      } else {
        await progressApi.markStep(stepId);
      }
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка обновления прогресса');
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!roadmap) return <div className="error-message">Дорожная карта не найдена</div>;

  // Backend returns completedSteps as array of stepId strings
  const completedStepIds = new Set(progress?.completedSteps ?? []);

  const difficultyLabel = (d: string | null | undefined) => {
    if (!d) return null;
    switch (d) {
      case 'beginner': return '🟢 Начинающий';
      case 'intermediate': return '🟡 Средний';
      case 'advanced': return '🔴 Продвинутый';
      default: return d;
    }
  };

  return (
    <div className="roadmap-detail">
      <Link to="/" className="back-link">← Назад к списку</Link>

      <div className="roadmap-info">
        <div className="roadmap-title-row">
          <h1>{roadmap.title}</h1>
          {isAdmin && (
            <Link to={`/roadmaps/${roadmap.id}/edit`} className="btn-outline">
              ✏️ Редактировать
            </Link>
          )}
        </div>
        <p className="description">{roadmap.description}</p>
        <div className="meta">
          {roadmap.difficulty && (
            <span className={`difficulty ${roadmap.difficulty}`}>
              {difficultyLabel(roadmap.difficulty)}
            </span>
          )}
          {roadmap.category && <span className="category">{roadmap.category}</span>}
          {!roadmap.isPublished && <span className="draft">Черновик</span>}
        </div>
      </div>

      {progress && (
        <div className="progress-bar-container">
          <div className="progress-info">
            <span>Прогресс: {progress.percentage}%</span>
            <span>{progress.completedSteps.length} / {progress.totalSteps} шагов</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      )}

      <div className="steps-section">
        <div className="section-header">
          <h2>📋 Шаги</h2>
          {isAdmin && (
            <Link to={`/roadmaps/${roadmap.id}/steps/new`} className="btn-secondary">
              + Добавить шаг
            </Link>
          )}
        </div>

        {steps.length === 0 ? (
          <p className="empty">Шагов пока нет</p>
        ) : (
          <div className="steps-list">
            {steps.map((step) => {
              const isCompleted = completedStepIds.has(step.id);
              return (
                <div 
                  key={step.id} 
                  className={`step-card ${isCompleted ? 'completed' : ''}`}
                >
                  <div className="step-header">
                    <button
                      className={`check-btn ${isCompleted ? 'checked' : ''}`}
                      onClick={() => handleToggleStep(step.id, isCompleted)}
                      title={isCompleted ? 'Отметить как невыполненный' : 'Отметить как выполненный'}
                    >
                      {isCompleted ? '✓' : '○'}
                    </button>
                    <div className="step-order">Шаг {step.order}</div>
                    <h3>{step.title}</h3>
                    {isAdmin && (
                      <Link to={`/roadmaps/${roadmap.id}/steps/${step.id}/edit`} className="btn-outline small">
                        ✏️
                      </Link>
                    )}
                  </div>
                  <p>{step.description}</p>
                  
                  {step.resources && step.resources.length > 0 && (
                    <div className="resources">
                      <h4>📚 Ресурсы:</h4>
                      <ul>
                        {step.resources.map((res) => (
                          <li key={res.id}>
                            <a href={res.url} target="_blank" rel="noopener noreferrer">
                              {res.type === 'video' && '🎬'}
                              {res.type === 'article' && '📄'}
                              {res.type === 'course' && '🎓'}
                              {' '}{res.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
