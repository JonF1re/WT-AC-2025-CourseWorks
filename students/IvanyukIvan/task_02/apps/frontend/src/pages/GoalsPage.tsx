import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Goal, createGoal, deleteGoal, listGoals, updateGoal } from '../api/goals';
import { Topic, listTopics } from '../api/topics';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useAuth } from '../context/AuthContext';
import { useApiError } from '../hooks/useApiError';

const adminSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  targetValue: z.coerce.number().int().positive('Target must be > 0'),
  deadline: z.string().optional(),
  topicId: z.string().min(1, 'Topic is required'),
  userId: z.string().min(1, 'User is required'),
});

const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  deadline: z.string().optional(),
});

type AdminForm = z.infer<typeof adminSchema>;
type UserForm = z.infer<typeof userSchema>;

export default function GoalsPage() {
  const { user } = useAuth();
  const { error, setErrorFrom } = useApiError();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const canManageAll = user?.role === 'admin';

  const adminForm = useForm<AdminForm>({
    resolver: zodResolver(adminSchema),
    defaultValues: { name: '', description: '', targetValue: 0, deadline: '', topicId: '', userId: '' },
  });

  const userForm = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: '', description: '', deadline: '' },
  });

  const load = async () => {
    try {
      setLoading(true);
      const [topicsData, goalsData] = await Promise.all([listTopics(), listGoals()]);
      setTopics(topicsData);
      setGoals(goalsData);
    } catch (err) {
      setErrorFrom(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = (goal: Goal) => {
    setEditingId(goal.id);
    if (canManageAll) {
      adminForm.reset({
        name: goal.name,
        description: goal.description ?? '',
        targetValue: goal.targetValue,
        deadline: goal.deadline ? goal.deadline.slice(0, 10) : '',
        topicId: goal.topicId,
        userId: goal.userId,
      });
    } else {
      userForm.reset({
        name: goal.name,
        description: goal.description ?? '',
        deadline: goal.deadline ? goal.deadline.slice(0, 10) : '',
      });
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    adminForm.reset({ name: '', description: '', targetValue: 0, deadline: '', topicId: '', userId: '' });
    userForm.reset({ name: '', description: '', deadline: '' });
  };

  const submitAdmin = async (values: AdminForm) => {
    setSubmitting(true);
    try {
      if (editingId) {
        const updated = await updateGoal(editingId, { ...values, targetValue: Number(values.targetValue) });
        setGoals((prev) => prev.map((g) => (g.id === editingId ? updated : g)));
      } else {
        const created = await createGoal({ ...values, targetValue: Number(values.targetValue) });
        setGoals((prev) => [created, ...prev]);
      }
      cancelEdit();
    } catch (err) {
      setErrorFrom(err);
    } finally {
      setSubmitting(false);
    }
  };

  const submitUser = async (values: UserForm) => {
    if (!editingId) return;
    setSubmitting(true);
    try {
      const updated = await updateGoal(editingId, values);
      setGoals((prev) => prev.map((g) => (g.id === editingId ? updated : g)));
      cancelEdit();
    } catch (err) {
      setErrorFrom(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canManageAll) return;
    setSubmitting(true);
    try {
      await deleteGoal(id);
      setGoals((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      setErrorFrom(err);
    } finally {
      setSubmitting(false);
    }
  };

  const header = useMemo(
    () => (
      <div className="section-title">Goals</div>
    ),
    []
  );

  return (
    <div className="grid">
      <Card title="Goals list" header={header}>
        {loading && <div className="center">Loading...</div>}
        {error && <div className="error">{error}</div>}
        {!loading && goals.length === 0 && <div className="muted">No goals</div>}
        <div className="table">
          <div className="table-head">
            <div>Name</div>
            <div>Topic</div>
            <div>Target</div>
            <div>Deadline</div>
            <div>Actions</div>
          </div>
          {goals.map((goal) => (
            <div className="table-row" key={goal.id}>
              <div>
                <div>{goal.name}</div>
                <div className="muted small">{goal.description || '—'}</div>
              </div>
              <div className="muted">{topics.find((t) => t.id === goal.topicId)?.name || '—'}</div>
              <div>{goal.targetValue}</div>
              <div className="muted small">{goal.deadline ? goal.deadline.slice(0, 10) : '—'}</div>
              <div className="actions">
                <Button variant="secondary" onClick={() => startEdit(goal)}>
                  Edit
                </Button>
                {canManageAll && (
                  <Button variant="ghost" onClick={() => handleDelete(goal.id)}>
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {canManageAll ? (
        <Card title={editingId ? 'Edit goal' : 'Create goal'}>
          <form className="form" onSubmit={adminForm.handleSubmit(submitAdmin)}>
            <label>
              Name
              <Input disabled={submitting} {...adminForm.register('name')} />
              {adminForm.formState.errors.name && (
                <span className="error-inline">{adminForm.formState.errors.name.message}</span>
              )}
            </label>
            <label>
              Description
              <Input disabled={submitting} {...adminForm.register('description')} />
              {adminForm.formState.errors.description && (
                <span className="error-inline">{adminForm.formState.errors.description.message}</span>
              )}
            </label>
            <label>
              Target value
              <Input type="number" disabled={submitting} {...adminForm.register('targetValue')} />
              {adminForm.formState.errors.targetValue && (
                <span className="error-inline">{adminForm.formState.errors.targetValue.message}</span>
              )}
            </label>
            <label>
              Deadline (optional)
              <Input type="date" disabled={submitting} {...adminForm.register('deadline')} />
              {adminForm.formState.errors.deadline && (
                <span className="error-inline">{adminForm.formState.errors.deadline.message}</span>
              )}
            </label>
            <label>
              Topic
              <Select disabled={submitting} {...adminForm.register('topicId')}>
                <option value="">Select topic</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </Select>
              {adminForm.formState.errors.topicId && (
                <span className="error-inline">{adminForm.formState.errors.topicId.message}</span>
              )}
            </label>
            <label>
              User ID
              <Input disabled={submitting} placeholder="Assign to user" {...adminForm.register('userId')} />
              {adminForm.formState.errors.userId && (
                <span className="error-inline">{adminForm.formState.errors.userId.message}</span>
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
      ) : (
        <Card title={editingId ? 'Edit goal' : 'Select goal to edit'}>
          {editingId ? (
            <form className="form" onSubmit={userForm.handleSubmit(submitUser)}>
              <label>
                Name
                <Input disabled={submitting} {...userForm.register('name')} />
                {userForm.formState.errors.name && (
                  <span className="error-inline">{userForm.formState.errors.name.message}</span>
                )}
              </label>
              <label>
                Description
                <Input disabled={submitting} {...userForm.register('description')} />
                {userForm.formState.errors.description && (
                  <span className="error-inline">{userForm.formState.errors.description.message}</span>
                )}
              </label>
              <label>
                Deadline (optional)
                <Input type="date" disabled={submitting} {...userForm.register('deadline')} />
                {userForm.formState.errors.deadline && (
                  <span className="error-inline">{userForm.formState.errors.deadline.message}</span>
                )}
              </label>
              <div className="actions">
                <Button type="button" variant="ghost" onClick={cancelEdit}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  Save
                </Button>
              </div>
            </form>
          ) : (
            <div className="muted">Select a goal in the list to edit details.</div>
          )}
        </Card>
      )}
    </div>
  );
}
