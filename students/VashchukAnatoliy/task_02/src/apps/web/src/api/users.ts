import { apiClient } from './client';
import type { User } from '../types';

export const usersApi = {
  getUser: async (id: number): Promise<User> => {
    const response = await apiClient.get<User>(`/users/${id}`);
    return response.data;
  },

  getUserByUsername: async (username: string): Promise<User> => {
    const response = await apiClient.get<User>(`/users/username/${username}`);
    return response.data;
  },
};
