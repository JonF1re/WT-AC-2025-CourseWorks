import { apiClient } from './client';
import type { Post, CursorPaginatedResponse } from '../types';

interface CreatePostRequest {
  text: string;
}

interface FeedParams {
  cursor?: string;
  limit?: number;
}

export const postsApi = {
  getFeed: async (params: FeedParams = {}): Promise<CursorPaginatedResponse<Post>> => {
    const response = await apiClient.get<CursorPaginatedResponse<Post>>('/posts', { params });
    return response.data;
  },

  getExplore: async (params: FeedParams = {}): Promise<CursorPaginatedResponse<Post>> => {
    const response = await apiClient.get<CursorPaginatedResponse<Post>>('/posts/explore/all', { params });
    return response.data;
  },

  getPost: async (id: string): Promise<Post> => {
    const response = await apiClient.get<Post>(`/posts/${id}`);
    return response.data;
  },

  createPost: async (data: CreatePostRequest): Promise<Post> => {
    const response = await apiClient.post<Post>('/posts', data);
    return response.data;
  },

  updatePost: async (id: string, data: CreatePostRequest): Promise<Post> => {
    const response = await apiClient.patch<Post>(`/posts/${id}`, data);
    return response.data;
  },

  deletePost: async (id: string): Promise<void> => {
    await apiClient.delete(`/posts/${id}`);
  },

  likePost: async (id: string): Promise<void> => {
    await apiClient.post(`/likes/${id}`);
  },

  unlikePost: async (id: string): Promise<void> => {
    await apiClient.delete(`/likes/${id}`);
  },
};
