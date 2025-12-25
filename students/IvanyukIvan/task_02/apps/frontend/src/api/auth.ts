import { api } from './client';

export type User = {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
};

export async function register(payload: { username: string; email: string; password: string }) {
  const res = await api.post('/auth/register', payload);
  return res.data.data as { user: User; accessToken: string };
}

export async function login(payload: { email: string; password: string }) {
  const res = await api.post('/auth/login', payload);
  return res.data.data as { user: User; accessToken: string };
}

export async function refresh() {
  const res = await api.post('/auth/refresh');
  return res.data.data as { accessToken: string };
}

export async function logout() {
  await api.post('/auth/logout');
}

export async function fetchMe() {
  const res = await api.get('/users/me');
  return res.data.data.user as User;
}
