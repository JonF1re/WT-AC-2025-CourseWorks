import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string()
    .min(3, 'Имя пользователя должно содержать минимум 3 символа')
    .max(20, 'Имя пользователя не должно превышать 20 символов')
    .regex(/^[a-zA-Z0-9_]+$/, 'Только латинские буквы, цифры и подчеркивание'),
  password: z.string()
    .min(6, 'Пароль должен содержать минимум 6 символов')
    .max(100, 'Пароль не должен превышать 100 символов'),
});

export const registerSchema = z.object({
  username: z.string()
    .min(3, 'Имя пользователя должно содержать минимум 3 символа')
    .max(20, 'Имя пользователя не должно превышать 20 символов')
    .regex(/^[a-zA-Z0-9_]+$/, 'Только латинские буквы, цифры и подчеркивание'),
  email: z.string()
    .email('Введите корректный email'),
  password: z.string()
    .min(6, 'Пароль должен содержать минимум 6 символов')
    .max(100, 'Пароль не должен превышать 100 символов'),
  displayName: z.string()
    .min(2, 'Отображаемое имя должно содержать минимум 2 символа')
    .max(50, 'Отображаемое имя не должно превышать 50 символов'),
});

export const createPostSchema = z.object({
  text: z.string()
    .min(1, 'Пост не может быть пустым')
    .max(280, 'Пост не должен превышать 280 символов'),
});

export const createReplySchema = z.object({
  content: z.string()
    .min(1, 'Комментарий не может быть пустым')
    .max(1000, 'Комментарий не должен превышать 1000 символов'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type CreateReplyInput = z.infer<typeof createReplySchema>;
