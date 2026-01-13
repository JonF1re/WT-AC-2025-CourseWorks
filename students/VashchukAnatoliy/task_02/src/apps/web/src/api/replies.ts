import { apiClient } from './client';
import type { Reply, CursorPaginatedResponse } from '../types';

interface CreateReplyRequest {
  content: string;
}

export const repliesApi = {
  getReplies: async (postId: string): Promise<Reply[]> => {
    const response = await apiClient.get<CursorPaginatedResponse<Reply>>(`/posts/${postId}/replies`);
    return response.data.items;
  },

  createReply: async (postId: string, data: CreateReplyRequest): Promise<Reply> => {
    const response = await apiClient.post<Reply>(`/posts/${postId}/replies`, data);
    return response.data;
  },
};
