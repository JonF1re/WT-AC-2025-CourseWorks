import { apiFetch, API_BASE } from './client';
import type { AuthResponse, RefreshResponse, User } from '../types';

interface LoginData {
  username: string;
  password: string;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
}

async function login(data: LoginData): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || 'Ошибка входа');
  return json;
}

async function register(data: RegisterData): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || 'Ошибка регистрации');
  return json;
}

async function refresh(): Promise<RefreshResponse> {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include'
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || 'Ошибка обновления токена');
  return json;
}

async function logout(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include'
  });
}

async function getMe(): Promise<{ status: 'ok'; data: { user: User } }> {
  return apiFetch('/users/me/profile');
}

export const authApi = {
  login,
  register,
  refresh,
  logout,
  getMe,
};

// Named exports for AuthContext
export { login, register, refresh, logout, getMe };
