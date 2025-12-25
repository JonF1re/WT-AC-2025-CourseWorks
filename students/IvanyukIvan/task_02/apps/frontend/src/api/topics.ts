import { api } from './client';

export type Topic = {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
};

export async function listTopics() {
  const res = await api.get('/topics');
  return res.data.data.topics as Topic[];
}

export async function createTopic(data: { name: string; description?: string }) {
  const res = await api.post('/topics', data);
  return res.data.data.topic as Topic;
}

export async function updateTopic(id: string, data: { name: string; description?: string }) {
  const res = await api.put(`/topics/${id}`, data);
  return res.data.data.topic as Topic;
}

export async function deleteTopic(id: string) {
  await api.delete(`/topics/${id}`);
}
