import { Link } from 'react-router-dom';
import { useAuthStore } from '../store';
import { useLogout } from '../hooks/useAuth';

export default function Navbar() {
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold text-blue-600">
              Мысли вслух
            </Link>
            <div className="hidden md:flex space-x-4">
              <Link to="/" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md">
                Моя лента
              </Link>
              <Link to="/explore" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md">
                Обзор
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {user && (
              <>
                <span className="text-gray-700">@{user.username}</span>
                <button
                  onClick={logout}
                  className="btn btn-secondary text-sm"
                >
                  Выйти
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
