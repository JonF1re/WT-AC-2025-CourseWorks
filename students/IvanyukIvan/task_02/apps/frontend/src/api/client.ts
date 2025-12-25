import axios from 'axios';

let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;
let refreshPromise: Promise<string | null> | null = null;

const baseURL = import.meta.env.VITE_API_URL;

export const api = axios.create({
  baseURL,
  withCredentials: true
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (!original || original._retry) {
      return Promise.reject(error);
    }
    if (error.response?.status === 401) {
      original._retry = true;
      try {
        const newToken = await refreshAccessToken();
        if (!newToken) {
          throw new Error('Refresh failed');
        }
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (err) {
        if (onUnauthorized) onUnauthorized();
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await axios.post(
          `${baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const token = res.data?.data?.accessToken as string | undefined;
        if (token) {
          accessToken = token;
          return token;
        }
        return null;
      } catch (err) {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setOnUnauthorized(fn: (() => void) | null) {
  onUnauthorized = fn;
}
