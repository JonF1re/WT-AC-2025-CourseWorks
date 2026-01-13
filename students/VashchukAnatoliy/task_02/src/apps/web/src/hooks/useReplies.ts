import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { repliesApi } from '../api';

export const useReplies = (postId: string) => {
  return useQuery({
    queryKey: ['replies', postId],
    queryFn: () => repliesApi.getReplies(postId),
    enabled: !!postId,
  });
};

export const useCreateReply = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      repliesApi.createReply(postId, { content }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['replies', variables.postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
};
