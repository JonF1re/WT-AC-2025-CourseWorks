import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Topic, createTopic, deleteTopic, listTopics, updateTopic } from '../api/topics';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { useAuth } from '../context/AuthContext';
import { useApiError } from '../hooks/useApiError';

const topicSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

type TopicForm = z.infer<typeof topicSchema>;

export default function TopicsPage() {
  const { user } = useAuth();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { error, setErrorFrom } = useApiError();

  const canEdit = user?.role === 'admin';

  const form = useForm<TopicForm>({
    resolver: zodResolver(topicSchema),
    defaultValues: { name: '', description: '' },
  });

  const loadTopics = async () => {
    try {
      setLoading(true);
      const data = await listTopics();
      setTopics(data);
    } catch (err) {
      setErrorFrom(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTopics();
  }, []);

  const startEdit = (topic: Topic) => {
    setEditingId(topic.id);
    form.reset({ name: topic.name, description: topic.description ?? '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    form.reset({ name: '', description: '' });
  };

  const onSubmit = async (values: TopicForm) => {
    if (!canEdit) return;
    setSubmitting(true);
    try {
      if (editingId) {
        const updated = await updateTopic(editingId, values);
        setTopics((prev) => prev.map((t) => (t.id === editingId ? updated : t)));
      } else {
        const created = await createTopic(values);
        setTopics((prev) => [created, ...prev]);
      }
      cancelEdit();
    } catch (err) {
      setErrorFrom(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canEdit) return;
    setSubmitting(true);
    try {
      await deleteTopic(id);
      setTopics((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setErrorFrom(err);
    } finally {
      setSubmitting(false);
    }
  };

  const header = useMemo(
    () => (
      <div className="section-title">Topics</div>
    ),
    []
  );

  return (
    <div className="grid">
      <Card title="Topics list" header={header}>
        {loading && <div className="center">Loading...</div>}
        {error && <div className="error">{error}</div>}
        {!loading && topics.length === 0 && <div className="muted">No topics yet</div>}
        <div className="table">
          <div className="table-head">
            <div>Name</div>
            <div>Description</div>
            {canEdit && <div>Actions</div>}
          </div>
          {topics.map((topic) => (
            <div className="table-row" key={topic.id}>
              <div>{topic.name}</div>
              <div className="muted">{topic.description || '—'}</div>
              {canEdit && (
                <div className="actions">
                  <Button variant="secondary" onClick={() => startEdit(topic)}>
                    Edit
                  </Button>
                  <Button variant="ghost" onClick={() => handleDelete(topic.id)}>
                    Delete
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {canEdit && (
        <Card title={editingId ? 'Edit topic' : 'Create topic'}>
          <form className="form" onSubmit={form.handleSubmit(onSubmit)}>
            <label>
              Name
              <Input disabled={submitting} {...form.register('name')} />
              {form.formState.errors.name && (
                <span className="error-inline">{form.formState.errors.name.message}</span>
              )}
            </label>
            <label>
              Description
              <Textarea disabled={submitting} rows={4} {...form.register('description')} />
              {form.formState.errors.description && (
                <span className="error-inline">{form.formState.errors.description.message}</span>
              )}
            </label>
            <div className="actions">
              {editingId && (
                <Button type="button" variant="ghost" onClick={cancelEdit}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={submitting}>
                {editingId ? 'Save' : 'Create'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
