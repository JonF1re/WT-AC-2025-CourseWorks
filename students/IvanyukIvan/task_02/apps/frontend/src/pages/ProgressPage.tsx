import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProgressEntry, createProgress, deleteProgress, listProgress, updateProgress } from '../api/progress';
import { Goal, listGoals } from '../api/goals';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { useApiError } from '../hooks/useApiError';

type FormValues = {
  goalId: string;
  value: number;
  comment?: string;
  timestamp?: string;
};

const schema = z.object({
  goalId: z.string().min(1, 'Goal is required'),
  value: z.coerce.number().int().min(0, 'Value must be >= 0'),
  comment: z.string().optional(),
  timestamp: z.string().optional(),
});

export default function ProgressPage() {
  const { error, setErrorFrom } = useApiError();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { goalId: '', value: 0, comment: '', timestamp: '' },
  });

  const load = async () => {
    try {
      setLoading(true);
      const [goalsData, progressData] = await Promise.all([listGoals(), listProgress({ limit: 50 })]);
      setGoals(goalsData);
      setProgress(progressData);
    } catch (err) {
      setErrorFrom(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = (item: ProgressEntry) => {
    setEditingId(item.id);
    form.reset({
      goalId: item.goalId,
      value: item.value,
      comment: item.comment ?? '',
      timestamp: item.timestamp ? item.timestamp.slice(0, 16) : '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    form.reset({ goalId: '', value: 0, comment: '', timestamp: '' });
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        value: Number(values.value),
        timestamp: values.timestamp ? new Date(values.timestamp).toISOString() : undefined,
        comment: values.comment?.trim() ? values.comment : undefined,
      };
      if (editingId) {
        const updated = await updateProgress(editingId, payload);
        setProgress((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
      } else {
        const created = await createProgress(payload);
        setProgress((prev) => [created, ...prev]);
      }
      cancelEdit();
    } catch (err) {
      setErrorFrom(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSubmitting(true);
    try {
      await deleteProgress(id);
      setProgress((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setErrorFrom(err);
    } finally {
      setSubmitting(false);
    }
  };

  const header = useMemo(
    () => (
      <div className="section-title">Progress</div>
    ),
    []
  );

  return (
    <div className="grid">
      <Card title="Progress entries" header={header}>
        {loading && <div className="center">Loading...</div>}
        {error && <div className="error">{error}</div>}
        {!loading && progress.length === 0 && <div className="muted">No progress yet</div>}
        <div className="table">
          <div className="table-head">
            <div>Goal</div>
            <div>Value</div>
            <div>Comment</div>
            <div>Date</div>
            <div>Actions</div>
          </div>
          {progress.map((item) => (
            <div className="table-row" key={item.id}>
              <div className="muted">{goals.find((g) => g.id === item.goalId)?.name || '—'}</div>
              <div>{item.value}</div>
              <div>{item.comment || '—'}</div>
              <div className="muted small">{new Date(item.timestamp).toLocaleString()}</div>
              <div className="actions">
                <Button variant="secondary" onClick={() => startEdit(item)}>
                  Edit
                </Button>
                <Button variant="ghost" onClick={() => handleDelete(item.id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title={editingId ? 'Edit progress' : 'Add progress'}>
        <form className="form" onSubmit={form.handleSubmit(onSubmit)}>
          <label>
            Goal
            <Select disabled={submitting} {...form.register('goalId')}>
              <option value="">Select goal</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.name}
                </option>
              ))}
            </Select>
            {form.formState.errors.goalId && (
              <span className="error-inline">{form.formState.errors.goalId.message}</span>
            )}
          </label>
          <label>
            Value
            <Input type="number" disabled={submitting} {...form.register('value')} />
            {form.formState.errors.value && (
              <span className="error-inline">{form.formState.errors.value.message}</span>
            )}
          </label>
          <label>
            Comment (optional)
            <Textarea disabled={submitting} rows={3} {...form.register('comment')} />
            {form.formState.errors.comment && (
              <span className="error-inline">{form.formState.errors.comment.message}</span>
            )}
          </label>
          <label>
            Timestamp (optional)
            <Input type="datetime-local" disabled={submitting} {...form.register('timestamp')} />
            {form.formState.errors.timestamp && (
              <span className="error-inline">{form.formState.errors.timestamp.message}</span>
            )}
          </label>
          <div className="actions">
            {editingId && (
              <Button type="button" variant="ghost" onClick={cancelEdit}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={submitting}>
              {editingId ? 'Save' : 'Add'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
