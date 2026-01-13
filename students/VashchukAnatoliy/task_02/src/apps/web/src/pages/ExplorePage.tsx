import { useExplore } from '../hooks/usePosts';
import PostCard from '../components/PostCard';
import CreatePost from '../components/CreatePost';

export default function ExplorePage() {
  const { data, isLoading, error } = useExplore();

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
      <h1 className="text-3xl font-bold mb-8">Обзор</h1>
      
      <CreatePost />
      
      <div className="mt-8 space-y-4">
        {data?.items.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
        
        {data?.items.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            Нет постов для отображения
          </div>
        )}
      </div>
    </div>
  );
}
