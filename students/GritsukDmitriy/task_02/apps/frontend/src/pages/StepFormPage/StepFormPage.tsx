import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { stepsApi, resourcesApi } from '../../api';
import type { Step, Resource } from '../../types';
import './StepFormPage.css';

const stepSchema = z.object({
  title: z.string().min(1, 'Введите название').max(200),
  description: z.string().min(1, 'Введите описание').max(2000),
  order: z.coerce.number().min(1, 'Порядок должен быть больше 0'),
});

type StepForm = z.infer<typeof stepSchema>;

const resourceSchema = z.object({
  title: z.string().min(1, 'Введите название'),
  url: z.string().url('Введите корректный URL'),
  type: z.enum(['video', 'article', 'course']),
});

type ResourceForm = z.infer<typeof resourceSchema>;

export function StepFormPage() {
  const { id: roadmapId, stepId } = useParams<{ id: string; stepId: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(stepId);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const [resources, setResources] = useState<Resource[]>([]);
  const [showResourceForm, setShowResourceForm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StepForm>({
    resolver: zodResolver(stepSchema),
    defaultValues: {
      title: '',
      description: '',
      order: 1,
    },
  });

  const {
    register: registerResource,
    handleSubmit: handleResourceSubmit,
    reset: resetResource,
    formState: { errors: resourceErrors, isSubmitting: isResourceSubmitting },
  } = useForm<ResourceForm>({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      title: '',
      url: '',
      type: 'article',
    },
  });

  useEffect(() => {
    if (isEdit && stepId && roadmapId) {
      stepsApi.getStep(stepId)
        .then((step: Step) => {
          reset({
            title: step.title,
            description: step.description ?? '',
            order: step.order,
          });
          setResources(step.resources ?? []);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [roadmapId, stepId, isEdit, reset]);

  const onSubmit = async (data: StepForm) => {
    setError('');
    try {
      if (isEdit && stepId) {
        await stepsApi.updateStep(stepId, data);
      } else {
        await stepsApi.createStep({ roadmapId: roadmapId!, ...data });
      }
      navigate(`/roadmaps/${roadmapId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    }
  };

  const onAddResource = async (data: ResourceForm) => {
    if (!stepId) return;
    try {
      const created = await resourcesApi.createResource({ stepId, ...data });
      setResources([...resources, created]);
      resetResource();
      setShowResourceForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка добавления ресурса');
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!confirm('Удалить ресурс?')) return;
    try {
      await resourcesApi.deleteResource(resourceId);
      setResources(resources.filter(r => r.id !== resourceId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="step-form-page">
      <Link to={`/roadmaps/${roadmapId}`} className="back-link">
        ← Назад к дорожной карте
      </Link>

      <h1>{isEdit ? 'Редактирование шага' : 'Новый шаг'}</h1>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit(onSubmit)} className="step-form">
        <div className="form-group">
          <label htmlFor="order">Порядок</label>
          <input
            id="order"
            type="number"
            min={1}
            {...register('order')}
          />
          {errors.order && <span className="error">{errors.order.message}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="title">Название</label>
          <input
            id="title"
            type="text"
            placeholder="Например: Изучить HTML"
            {...register('title')}
          />
          {errors.title && <span className="error">{errors.title.message}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="description">Описание</label>
          <textarea
            id="description"
            rows={4}
            placeholder="Что нужно сделать на этом шаге..."
            {...register('description')}
          />
          {errors.description && <span className="error">{errors.description.message}</span>}
        </div>

        <div className="form-actions">
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать'}
          </button>
          <Link to={`/roadmaps/${roadmapId}`} className="btn-secondary">
            Отмена
          </Link>
        </div>
      </form>

      {isEdit && (
        <div className="resources-section">
          <div className="section-header">
            <h2>📚 Ресурсы</h2>
            <button 
              type="button" 
              className="btn-secondary"
              onClick={() => setShowResourceForm(!showResourceForm)}
            >
              {showResourceForm ? 'Отмена' : '+ Добавить ресурс'}
            </button>
          </div>

          {showResourceForm && (
            <form onSubmit={handleResourceSubmit(onAddResource)} className="resource-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="res-title">Название</label>
                  <input
                    id="res-title"
                    type="text"
                    placeholder="MDN Web Docs"
                    {...registerResource('title')}
                  />
                  {resourceErrors.title && <span className="error">{resourceErrors.title.message}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="res-type">Тип</label>
                  <select id="res-type" {...registerResource('type')}>
                    <option value="article">📄 Статья</option>
                    <option value="video">🎬 Видео</option>
                    <option value="course">🎓 Курс</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="res-url">URL</label>
                <input
                  id="res-url"
                  type="url"
                  placeholder="https://developer.mozilla.org/..."
                  {...registerResource('url')}
                />
                {resourceErrors.url && <span className="error">{resourceErrors.url.message}</span>}
              </div>
              <button type="submit" disabled={isResourceSubmitting}>
                {isResourceSubmitting ? 'Добавление...' : 'Добавить'}
              </button>
            </form>
          )}

          {resources.length === 0 ? (
            <p className="empty">Ресурсов пока нет</p>
          ) : (
            <ul className="resources-list">
              {resources.map((res) => (
                <li key={res.id}>
                  <span className="res-type">
                    {res.type === 'video' && '🎬'}
                    {res.type === 'article' && '📄'}
                    {res.type === 'course' && '🎓'}
                  </span>
                  <a href={res.url} target="_blank" rel="noopener noreferrer">
                    {res.title}
                  </a>
                  <button 
                    type="button" 
                    className="btn-danger small"
                    onClick={() => handleDeleteResource(res.id)}
                  >
                    🗑️
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
