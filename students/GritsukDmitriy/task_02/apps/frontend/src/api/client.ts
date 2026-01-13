const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export { API_BASE };

type TokenGetter = () => string | null;
type TokenSetter = (token: string | null) => void;
type OnUnauthorized = () => void;

let getAccessToken: TokenGetter = () => null;
let setAccessToken: TokenSetter = () => {};
let onUnauthorized: OnUnauthorized = () => {};

export function configureApi(
  getter: TokenGetter,
  setter: TokenSetter,
  onUnauth: OnUnauthorized
) {
  getAccessToken = getter;
  setAccessToken = setter;
  onUnauthorized = onUnauth;
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!res.ok) {
      return null;
    }
    const json = await res.json();
    return json.data?.accessToken ?? null;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const doFetch = async (token: string | null) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>)
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, {
      ...options,
      headers,
      credentials: 'include'
    });
  };

  let res = await doFetch(getAccessToken());

  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      setAccessToken(newToken);
      res = await doFetch(newToken);
    } else {
      setAccessToken(null);
      onUnauthorized();
      throw new Error('Session expired');
    }
  }

  const json = await res.json();
  if (!res.ok) {
    const err = json as { error?: { message?: string } };
    throw new Error(err.error?.message || 'Request failed');
  }
  return json as T;
}
