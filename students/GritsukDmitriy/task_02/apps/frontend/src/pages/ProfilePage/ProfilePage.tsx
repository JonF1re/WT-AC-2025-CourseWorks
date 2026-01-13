import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../context/AuthContext';
import { usersApi } from '../../api';
import './ProfilePage.css';

const profileSchema = z.object({
  username: z.string().min(3, 'Минимум 3 символа'),
  email: z.string().email('Введите корректный email'),
});

const passwordSchema = z.object({
  password: z.string().min(8, 'Минимум 8 символов'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export function ProfilePage() {
  const { user } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isSubmitting: isProfileSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username ?? '',
      email: user?.email ?? '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onProfileSubmit = async (data: ProfileForm) => {
    if (!user) return;
    setError('');
    setSuccess('');
    try {
      await usersApi.updateUser(user.id, data);
      setSuccess('Профиль обновлён');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка обновления');
    }
  };

  const onPasswordSubmit = async (data: PasswordForm) => {
    if (!user) return;
    setError('');
    setSuccess('');
    try {
      await usersApi.updateUser(user.id, { password: data.password });
      setSuccess('Пароль изменён');
      resetPassword();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка изменения пароля');
    }
  };

  if (!user) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div className="profile-page">
      <h1>👤 Мой профиль</h1>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="profile-info">
        <p><strong>Роль:</strong> {user.role === 'admin' ? '👑 Администратор' : '👤 Пользователь'}</p>
        <p><strong>Дата регистрации:</strong> {new Date(user.createdAt).toLocaleDateString('ru-RU')}</p>
      </div>

      <div className="profile-sections">
        <section className="profile-section">
          <h2>Основная информация</h2>
          <form onSubmit={handleProfileSubmit(onProfileSubmit)}>
            <div className="form-group">
              <label htmlFor="username">Имя пользователя</label>
              <input
                id="username"
                type="text"
                {...registerProfile('username')}
              />
              {profileErrors.username && (
                <span className="error">{profileErrors.username.message}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                {...registerProfile('email')}
              />
              {profileErrors.email && (
                <span className="error">{profileErrors.email.message}</span>
              )}
            </div>

            <button type="submit" disabled={isProfileSubmitting}>
              {isProfileSubmitting ? 'Сохранение...' : 'Сохранить'}
            </button>
          </form>
        </section>

        <section className="profile-section">
          <h2>Изменить пароль</h2>
          <form onSubmit={handlePasswordSubmit(onPasswordSubmit)}>
            <div className="form-group">
              <label htmlFor="password">Новый пароль</label>
              <input
                id="password"
                type="password"
                {...registerPassword('password')}
              />
              {passwordErrors.password && (
                <span className="error">{passwordErrors.password.message}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Подтвердите пароль</label>
              <input
                id="confirmPassword"
                type="password"
                {...registerPassword('confirmPassword')}
              />
              {passwordErrors.confirmPassword && (
                <span className="error">{passwordErrors.confirmPassword.message}</span>
              )}
            </div>

            <button type="submit" disabled={isPasswordSubmitting}>
              {isPasswordSubmitting ? 'Изменение...' : 'Изменить пароль'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
