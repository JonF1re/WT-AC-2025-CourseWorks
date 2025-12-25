import { api } from './client';

export type Goal = {
  id: string;
  topicId: string;
  userId: string;
  name: string;
  description?: string | null;
  targetValue: number;
  deadline?: string | null;
  createdAt: string;
};

export async function listGoals(params?: { userId?: string; topicId?: string; limit?: number; offset?: number }) {
  const res = await api.get('/goals', { params });
  return res.data.data.goals as Goal[];
}

export async function getGoal(id: string) {
  const res = await api.get(`/goals/${id}`);
  return res.data.data.goal as Goal & { progressEntries: any[] };
}

export async function createGoal(data: {
  topicId: string;
  userId: string;
  name: string;
  description?: string;
  targetValue: number;
  deadline?: string;
}) {
  const res = await api.post('/goals', data);
  return res.data.data.goal as Goal;
}

export async function updateGoal(id: string, data: Partial<Omit<Goal, 'id' | 'createdAt'>>) {
  const res = await api.put(`/goals/${id}`, data);
  return res.data.data.goal as Goal;
}

export async function deleteGoal(id: string) {
  await api.delete(`/goals/${id}`);
}
