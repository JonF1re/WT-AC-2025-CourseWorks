import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { roadmapsApi } from '../../api';
import type { Roadmap } from '../../types';
import './RoadmapFormPage.css';

const roadmapSchema = z.object({
  title: z.string().min(1, 'Введите название').max(200),
  description: z.string().min(1, 'Введите описание').max(2000),
  category: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  isPublished: z.boolean(),
});

type RoadmapForm = z.infer<typeof roadmapSchema>;

export function RoadmapFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RoadmapForm>({
    resolver: zodResolver(roadmapSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      difficulty: 'beginner',
      isPublished: false,
    },
  });

  useEffect(() => {
    if (isEdit && id) {
      roadmapsApi.getRoadmap(id)
        .then((roadmap: Roadmap) => {
          reset({
            title: roadmap.title,
            description: roadmap.description ?? '',
            category: roadmap.category ?? '',
            difficulty: roadmap.difficulty as 'beginner' | 'intermediate' | 'advanced' ?? 'beginner',
            isPublished: roadmap.isPublished,
          });
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit, reset]);

  const onSubmit = async (data: RoadmapForm) => {
    setError('');
    try {
      if (isEdit && id) {
        await roadmapsApi.updateRoadmap(id, data);
        navigate(`/roadmaps/${id}`);
      } else {
        const created = await roadmapsApi.createRoadmap(data);
        navigate(`/roadmaps/${created.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="roadmap-form-page">
      <Link to={isEdit ? `/roadmaps/${id}` : '/'} className="back-link">
        ← Назад
      </Link>

      <h1>{isEdit ? 'Редактирование дорожной карты' : 'Новая дорожная карта'}</h1>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit(onSubmit)} className="roadmap-form">
        <div className="form-group">
          <label htmlFor="title">Название</label>
          <input
            id="title"
            type="text"
            placeholder="Например: Как стать Frontend разработчиком"
            {...register('title')}
          />
          {errors.title && <span className="error">{errors.title.message}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="description">Описание</label>
          <textarea
            id="description"
            rows={4}
            placeholder="Подробное описание дорожной карты..."
            {...register('description')}
          />
          {errors.description && <span className="error">{errors.description.message}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="category">Категория</label>
          <input
            id="category"
            type="text"
            placeholder="Например: Frontend, Backend, DevOps"
            {...register('category')}
          />
        </div>

        <div className="form-group">
          <label htmlFor="difficulty">Сложность</label>
          <select id="difficulty" {...register('difficulty')}>
            <option value="beginner">🟢 Начинающий</option>
            <option value="intermediate">🟡 Средний</option>
            <option value="advanced">🔴 Продвинутый</option>
          </select>
          {errors.difficulty && <span className="error">{errors.difficulty.message}</span>}
        </div>

        <div className="form-group checkbox">
          <label>
            <input type="checkbox" {...register('isPublished')} />
            Опубликовать (видно всем пользователям)
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать'}
          </button>
          <Link to={isEdit ? `/roadmaps/${id}` : '/'} className="btn-secondary">
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}
