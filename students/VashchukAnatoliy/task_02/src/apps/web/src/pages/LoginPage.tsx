import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLogin } from '../hooks/useAuth.ts';
import { useAuthStore } from '../store';
import { loginSchema, type LoginInput } from '../schemas/auth.schema.ts';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = async (data: LoginInput) => {
    try {
      await login.mutateAsync(data);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Вход в Мысли вслух
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Имя пользователя
              </label>
              <input
                id="username"
                type="text"
                className={`input ${errors.username ? 'border-red-500' : ''}`}
                {...register('username')}
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Пароль
              </label>
              <input
                id="password"
                type="password"
                className={`input ${errors.password ? 'border-red-500' : ''}`}
                {...register('password')}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
          </div>

          {login.isError && (
            <div className="text-red-600 text-sm text-center">
              Неверное имя пользователя или пароль
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isSubmitting || login.isPending}
              className="w-full btn btn-primary disabled:opacity-50"
            >
              {login.isPending ? 'Вход...' : 'Войти'}
            </button>
          </div>

          <div className="text-center">
            <Link to="/register" className="text-blue-600 hover:text-blue-700">
              Нет аккаунта? Зарегистрироваться
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
