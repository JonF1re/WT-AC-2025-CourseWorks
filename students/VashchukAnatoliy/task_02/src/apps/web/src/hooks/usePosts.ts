import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postsApi } from '../api';

export const useFeed = (cursor?: string, limit = 20) => {
  return useQuery({
    queryKey: ['posts', 'feed', cursor, limit],
    queryFn: () => postsApi.getFeed({ cursor, limit }),
  });
};

export const useExplore = (cursor?: string, limit = 20) => {
  return useQuery({
    queryKey: ['posts', 'explore', cursor, limit],
    queryFn: () => postsApi.getExplore({ cursor, limit }),
  });
};

export const usePost = (id: string) => {
  return useQuery({
    queryKey: ['posts', id],
    queryFn: () => postsApi.getPost(id),
  });
};

export const useCreatePost = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (text: string) => postsApi.createPost({ text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
};

export const useLikePost = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => postsApi.likePost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
};

export const useUnlikePost = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => postsApi.unlikePost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
};
