import { api } from './client';

export type ProgressEntry = {
  id: string;
  goalId: string;
  timestamp: string;
  value: number;
  comment?: string | null;
};

export async function listProgress(params?: { goalId?: string; userId?: string; from?: string; to?: string; limit?: number; offset?: number }) {
  const res = await api.get('/progress', { params });
  return res.data.data.progress as ProgressEntry[];
}

export async function getProgress(id: string) {
  const res = await api.get(`/progress/${id}`);
  return res.data.data.progress as ProgressEntry & { goal: { userId: string } };
}

export async function createProgress(data: { goalId: string; timestamp?: string; value: number; comment?: string }) {
  const res = await api.post('/progress', data);
  return res.data.data.progress as ProgressEntry;
}

export async function updateProgress(id: string, data: Partial<Omit<ProgressEntry, 'id'>>) {
  const res = await api.put(`/progress/${id}`, data);
  return res.data.data.progress as ProgressEntry;
}

export async function deleteProgress(id: string) {
  await api.delete(`/progress/${id}`);
}
