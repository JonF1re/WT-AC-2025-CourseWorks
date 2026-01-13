import { useFeed } from '../hooks/usePosts.ts';
import PostCard from '../components/PostCard.tsx';
import CreatePost from '../components/CreatePost.tsx';

export default function HomePage() {
  const { data, isLoading, error } = useFeed();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-600">Ошибка загрузки ленты</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Моя лента</h1>
      
      <CreatePost />
      
      <div className="mt-8 space-y-4">
        {data?.items.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
        
        {data?.items.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            Лента пуста. Подпишитесь на пользователей или создайте свой первый пост!
          </div>
        )}
      </div>
    </div>
  );
}
