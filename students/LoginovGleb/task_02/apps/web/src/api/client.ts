import type { ApiError } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

// Хранение access token в памяти (не в localStorage!)
let accessToken: string | null = null;

// Коллбек для обновления пользователя при logout
let onAuthError: (() => void) | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

export const setOnAuthError = (callback: () => void) => {
  onAuthError = callback;
};

// Флаг для предотвращения множественных refresh-запросов
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

const refreshAccessToken = async (): Promise<boolean> => {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // Важно для отправки refresh cookie
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        setAccessToken(null);
        return false;
      }

      const data = await response.json();
      setAccessToken(data?.data?.accessToken ?? null);
      return true;
    } catch {
      setAccessToken(null);
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuth?: boolean;
}

export const apiRequest = async <T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> => {
  const { body, skipAuth = false, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  if (!skipAuth && accessToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
  }

  const config: RequestInit = {
    ...fetchOptions,
    headers,
    credentials: 'include', // Всегда отправляем credentials для refresh cookie
  };

  if (body !== undefined) {
    config.body = JSON.stringify(body);
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  // Если получили 401 и не пропускаем auth - пробуем refresh
  if (response.status === 401 && !skipAuth) {
    const refreshed = await refreshAccessToken();
    
    if (refreshed) {
      // Повторяем запрос с новым токеном
      (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
      response = await fetch(`${API_BASE_URL}${endpoint}`, { ...config, headers });
    } else {
      // Refresh не удался - разлогиниваем
      onAuthError?.();
      throw new ApiRequestError(401, 'Сессия истекла. Пожалуйста, войдите снова.', 'unauthorized');
    }
  }

  if (!response.ok) {
    let errorData: ApiError;
    try {
      const raw = await response.json();
      // Server format: { status: 'error', error: { code, message, fields? } }
      if (raw?.error?.message) {
        let message = raw.error.message;
        // Для ошибок валидации (ZodError) формируем читаемое сообщение из fields
        if (raw.error.code === 'validation_failed' && raw.error.fields) {
          const fieldErrors: string[] = [];
          const fields = raw.error.fields.fieldErrors || {};
          for (const [field, errors] of Object.entries(fields)) {
            if (Array.isArray(errors) && errors.length > 0) {
              fieldErrors.push(`${field}: ${errors[0]}`);
            }
          }
          if (fieldErrors.length > 0) {
            message = fieldErrors.join('; ');
          }
        }
        errorData = {
          statusCode: response.status,
          message,
          error: raw.error.code,
        };
      } else {
        errorData = raw;
      }
    } catch {
      errorData = {
        statusCode: response.status,
        message: 'Произошла ошибка при выполнении запроса',
      };
    }
    throw new ApiRequestError(
      errorData.statusCode || response.status,
      errorData.message || 'Произошла ошибка',
      errorData.error
    );
  }

  // Если нет контента, возвращаем пустой объект
  if (response.status === 204) {
    return {} as T;
  }

  const json = await response.json();
  // Backend convention: { status: 'ok', data: ... }
  if (json && typeof json === 'object' && 'data' in (json as Record<string, unknown>)) {
    return (json as { data: T }).data;
  }

  return json as T;
};

export class ApiRequestError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public error?: string
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export { API_BASE_URL };
