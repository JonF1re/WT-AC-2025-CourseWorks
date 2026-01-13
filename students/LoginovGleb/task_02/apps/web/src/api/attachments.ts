import type { Attachment, AttachmentCreateDto } from '../types';
import { apiRequest } from './client';

export const attachmentsApi = {
  list: async (applicationId?: string): Promise<Attachment[]> => {
    const params = applicationId ? `?applicationId=${applicationId}` : '';
    return apiRequest<Attachment[]>(`/attachments${params}`);
  },

  get: async (id: string): Promise<Attachment> => {
    return apiRequest<Attachment>(`/attachments/${id}`);
  },

  create: async (data: AttachmentCreateDto): Promise<Attachment> => {
    return apiRequest<Attachment>('/attachments', {
      method: 'POST',
      body: data,
    });
  },

  delete: async (id: string): Promise<void> => {
    return apiRequest<void>(`/attachments/${id}`, {
      method: 'DELETE',
    });
  },
};
