import type {
  Application,
  ApplicationCreateDto,
  ApplicationUpdateDto,
  ApplicationStatusChangeDto,
  PaginatedResponse,
} from '../types';
import { apiRequest } from './client';

interface ApplicationFilters {
  statusId?: string;
  formId?: string;
  userId?: string;
  page?: number;
  pageSize?: number;
}

export const applicationsApi = {
  list: async (filters: ApplicationFilters = {}): Promise<PaginatedResponse<Application>> => {
    const params = new URLSearchParams();
    if (filters.statusId) params.append('statusId', filters.statusId);
    if (filters.formId) params.append('formId', filters.formId);
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.pageSize) params.append('pageSize', filters.pageSize.toString());
    
    const query = params.toString();
    return apiRequest<PaginatedResponse<Application>>(`/applications${query ? `?${query}` : ''}`);
  },

  get: async (id: string): Promise<Application> => {
    return apiRequest<Application>(`/applications/${id}`);
  },

  create: async (data: ApplicationCreateDto): Promise<Application> => {
    return apiRequest<Application>('/applications', {
      method: 'POST',
      body: data,
    });
  },

  update: async (id: string, data: ApplicationUpdateDto): Promise<Application> => {
    return apiRequest<Application>(`/applications/${id}`, {
      method: 'PUT',
      body: data,
    });
  },

  delete: async (id: string): Promise<void> => {
    return apiRequest<void>(`/applications/${id}`, {
      method: 'DELETE',
    });
  },

  submit: async (id: string): Promise<Application> => {
    return apiRequest<Application>(`/applications/${id}/submit`, {
      method: 'POST',
    });
  },

  changeStatus: async (id: string, data: ApplicationStatusChangeDto): Promise<Application> => {
    return apiRequest<Application>(`/applications/${id}/status`, {
      method: 'PUT',
      body: data,
    });
  },

  withdraw: async (id: string, comment?: string | null): Promise<Application> => {
    return apiRequest<Application>(`/applications/${id}/withdraw`, {
      method: 'POST',
      body: { comment },
    });
  },
};
