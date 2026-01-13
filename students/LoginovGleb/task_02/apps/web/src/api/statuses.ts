import type { Status, StatusCreateDto, StatusUpdateDto } from '../types';
import { apiRequest } from './client';

export const statusesApi = {
  list: async (): Promise<Status[]> => {
    return apiRequest<Status[]>('/statuses');
  },

  get: async (id: string): Promise<Status> => {
    return apiRequest<Status>(`/statuses/${id}`);
  },

  create: async (data: StatusCreateDto): Promise<Status> => {
    return apiRequest<Status>('/statuses', {
      method: 'POST',
      body: data,
    });
  },

  update: async (id: string, data: StatusUpdateDto): Promise<Status> => {
    return apiRequest<Status>(`/statuses/${id}`, {
      method: 'PUT',
      body: data,
    });
  },

  delete: async (id: string): Promise<void> => {
    return apiRequest<void>(`/statuses/${id}`, {
      method: 'DELETE',
    });
  },
};
