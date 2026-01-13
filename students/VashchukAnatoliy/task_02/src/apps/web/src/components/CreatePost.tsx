import { useState } from 'react';
import { useCreatePost } from '../hooks/usePosts';

export default function CreatePost() {
  const [content, setContent] = useState('');
  const createPost = useCreatePost();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      await createPost.mutateAsync(content);
      setContent('');
    } catch (error) {
      console.error('Failed to create post:', error);
    }
  };

  return (
    <div className="card">
      <form onSubmit={handleSubmit}>
        <textarea
          className="input resize-none"
          rows={3}
          placeholder="О чём думаешь?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={280}
        />
        <div className="flex justify-between items-center mt-3">
          <span className="text-sm text-gray-500">
            {content.length}/280
          </span>
          <button
            type="submit"
            disabled={!content.trim() || createPost.isPending}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createPost.isPending ? 'Публикация...' : 'Опубликовать'}
          </button>
        </div>
      </form>
    </div>
  );
}
