import type { Form, FormCreateDto, FormUpdateDto } from '../types';
import { apiRequest, API_BASE_URL } from './client';

export const formsApi = {
  list: async (options?: { isActive?: boolean; skipAuth?: boolean }): Promise<Form[]> => {
    const params = options?.isActive !== undefined ? `?isActive=${options.isActive}` : '';
    // По умолчанию используем auth, чтобы показывать неактивные формы авторизованным пользователям
    return apiRequest<Form[]>(`/forms${params}`, { skipAuth: options?.skipAuth ?? false });
  },

  get: async (id: string): Promise<Form> => {
    return apiRequest<Form>(`/forms/${id}`);
  },

  create: async (data: FormCreateDto): Promise<Form> => {
    return apiRequest<Form>('/forms', {
      method: 'POST',
      body: data,
    });
  },

  update: async (id: string, data: FormUpdateDto): Promise<Form> => {
    return apiRequest<Form>(`/forms/${id}`, {
      method: 'PUT',
      body: data,
    });
  },

  delete: async (id: string): Promise<void> => {
    return apiRequest<void>(`/forms/${id}`, {
      method: 'DELETE',
    });
  },
};
