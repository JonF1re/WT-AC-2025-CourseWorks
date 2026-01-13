import { useParams } from 'react-router-dom';
import { usePost } from '../hooks/usePosts.ts';
import { useReplies, useCreateReply } from '../hooks/useReplies.ts';
import PostCard from '../components/PostCard';
import { useState } from 'react';
import type { Reply } from '../types';

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const postId = id!;
  const { data: post, isLoading: postLoading } = usePost(postId);
  const { data: replies, isLoading: repliesLoading } = useReplies(postId);
  const createReply = useCreateReply();
  const [replyContent, setReplyContent] = useState('');

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    try {
      await createReply.mutateAsync({ postId, content: replyContent });
      setReplyContent('');
    } catch (error) {
      console.error('Failed to create reply:', error);
    }
  };

  if (postLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Загрузка...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-600">Пост не найден</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <PostCard post={post} />

      <div className="mt-8 card">
        <h2 className="text-xl font-bold mb-4">Комментарии</h2>
        
        <form onSubmit={handleSubmitReply} className="mb-6">
          <textarea
            className="input resize-none"
            rows={3}
            placeholder="Написать комментарий..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            maxLength={280}
          />
          <div className="flex justify-between items-center mt-3">
            <span className="text-sm text-gray-500">
              {replyContent.length}/280
            </span>
            <button
              type="submit"
              disabled={!replyContent.trim() || createReply.isPending}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createReply.isPending ? 'Отправка...' : 'Отправить'}
            </button>
          </div>
        </form>

        {repliesLoading && <div className="text-gray-600">Загрузка комментариев...</div>}

        <div className="space-y-4">
          {replies?.map((reply: Reply) => (
            <div key={reply.id} className="border-l-2 border-gray-200 pl-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                    {reply.author.username[0].toUpperCase()}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-gray-900">{reply.author.username}</span>
                    <span className="text-gray-500 text-sm">
                      {new Date(reply.createdAt).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                  <p className="mt-1 text-gray-800 whitespace-pre-wrap">{reply.text}</p>
                </div>
              </div>
            </div>
          ))}
          
          {replies?.length === 0 && (
            <div className="text-center text-gray-500 py-4">
              Комментариев пока нет. Будьте первым!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
