import { apiClient } from './client';
import type { Follow } from '../types';

export const followsApi = {
  follow: async (userId: number): Promise<void> => {
    await apiClient.post(`/follows/${userId}`);
  },

  unfollow: async (userId: number): Promise<void> => {
    await apiClient.delete(`/follows/${userId}`);
  },

  getFollowers: async (page = 1, limit = 20): Promise<{ data: Follow[] }> => {
    const response = await apiClient.get<{ data: Follow[] }>('/follows/followers', {
      params: { page, limit },
    });
    return response.data;
  },

  getFollowing: async (page = 1, limit = 20): Promise<{ data: Follow[] }> => {
    const response = await apiClient.get<{ data: Follow[] }>('/follows/following', {
      params: { page, limit },
    });
    return response.data;
  },
};
