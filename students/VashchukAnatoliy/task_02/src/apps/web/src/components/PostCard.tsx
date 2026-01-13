import { useLikePost, useUnlikePost } from '../hooks/usePosts';
import { useNavigate } from 'react-router-dom';
import type { Post } from '../types';
import { useState } from 'react';
import { useCreateReply } from '../hooks/useReplies';

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const likePost = useLikePost();
  const unlikePost = useUnlikePost();
  const navigate = useNavigate();
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyText, setReplyText] = useState('');
  const createReply = useCreateReply();

  const handleLike = async () => {
    try {
      if (post.isLikedByMe) {
        await unlikePost.mutateAsync(post.id);
      } else {
        await likePost.mutateAsync(post.id);
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      await createReply.mutateAsync({ postId: post.id, content: replyText });
      setReplyText('');
      setShowReplyModal(false);
    } catch (error) {
      console.error('Failed to create reply:', error);
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}м`;
    if (diffHours < 24) return `${diffHours}ч`;
    if (diffDays < 7) return `${diffDays}д`;
    return d.toLocaleDateString('ru-RU');
  };

  return (
    <div className="card hover:shadow-lg transition-shadow">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
            {post.author.username[0].toUpperCase()}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-gray-900">{post.author.username}</span>
            <span className="text-gray-500 text-sm">· {formatDate(post.createdAt)}</span>
          </div>
          <p 
            className="mt-2 text-gray-800 whitespace-pre-wrap cursor-pointer hover:text-gray-600" 
            onClick={() => navigate(`/post/${post.id}`)}
          >
            {post.text}
          </p>
          
          <div className="mt-4 flex items-center space-x-6 text-gray-500">
            <button
              onClick={handleLike}
              className="flex items-center space-x-2 hover:text-red-600 transition-colors"
            >
              <svg
                className={`w-5 h-5 ${post.isLikedByMe ? 'fill-red-600 text-red-600' : 'fill-none'}`}
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span>{post._count?.likes || 0}</span>
            </button>
            
            <button className="flex items-center space-x-2 hover:text-blue-600 transition-colors" onClick={() => setShowReplyModal(true)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>{post._count?.replies || 0}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal для комментария */}
      {showReplyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowReplyModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Ответить на пост</h3>
              <button onClick={() => setShowReplyModal(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600"><strong>{post.author.username}</strong>: {post.text}</p>
            </div>

            <form onSubmit={handleReply}>
              <textarea
                className="input resize-none w-full"
                rows={4}
                placeholder="Напишите ваш комментарий..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                maxLength={280}
                autoFocus
              />
              <div className="flex justify-between items-center mt-3">
                <span className="text-sm text-gray-500">{replyText.length}/280</span>
                <div className="space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowReplyModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={!replyText.trim() || createReply.isPending}
                    className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createReply.isPending ? 'Отправка...' : 'Ответить'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
