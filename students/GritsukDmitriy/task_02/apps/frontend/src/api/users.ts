import { apiFetch } from './client';
import type { User } from '../types';

interface UsersResponse {
  status: 'ok';
  data: {
    items: User[];
    total: number;
    limit: number;
    offset: number;
  };
}

interface UserResponse {
  status: 'ok';
  data: {
    user: User;
  };
}

interface UsersFilters {
  limit?: number;
  offset?: number;
}

// GET /users?limit=...&offset=...
async function getUsers(filters: UsersFilters = {}): Promise<{ items: User[]; total: number }> {
  const params = new URLSearchParams();
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.offset) params.set('offset', String(filters.offset));
  const qs = params.toString();
  const res = await apiFetch<UsersResponse>(`/users${qs ? `?${qs}` : ''}`);
  return { items: res.data.items, total: res.data.total };
}

// GET /users/:id
async function getUser(id: string): Promise<User> {
  const res = await apiFetch<UserResponse>(`/users/${id}`);
  return res.data.user;
}

// POST /users
async function createUser(data: {
  username: string;
  email: string;
  password: string;
  role?: 'admin' | 'user';
}): Promise<User> {
  const res = await apiFetch<UserResponse>('/users', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return res.data.user;
}

// PUT /users/:id
async function updateUser(id: string, data: Partial<{
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
}>): Promise<User> {
  const res = await apiFetch<UserResponse>(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  return res.data.user;
}

// DELETE /users/:id
async function deleteUser(id: string): Promise<void> {
  await apiFetch<{ status: 'ok' }>(`/users/${id}`, { method: 'DELETE' });
}

export const usersApi = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
};
