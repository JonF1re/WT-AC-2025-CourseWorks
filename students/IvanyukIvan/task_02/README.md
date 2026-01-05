# Progress Tracker (Вариант 14 — «До сессии успею»)

MVP: темы, цели, прогресс, отчёты. Full-stack монорепозиторий (frontend + backend) с JWT access/refresh, ролями admin/user и PostgreSQL.

## Требования

- Node.js 18+
- PostgreSQL 14+

## Структура

- apps/backend — Express + TypeScript, Prisma, JWT
- apps/frontend — React + TypeScript + Vite, react-router, react-hook-form, zod
- package.json (workspaces) в корне

## Быстрый запуск всего проекта (одной командой)

1. Установить зависимости:

```bash
npm install
```

1. Настроить окружение:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
# backend: прописать DATABASE_URL, JWT_* секреты, CORS_ORIGIN (например, http://localhost:5173)
# frontend: VITE_API_URL (например, http://localhost:3000)
```

1. Поднять БД и применить миграции + сид:

```bash
npm run prisma:migrate      # из корня, запускает prisma migrate dev в backend
npm run prisma:seed -w backend
```

1. Старт обоих сервисов одной командой:

```bash
npm run dev
```

- backend: <http://localhost:3000>
- frontend: <http://localhost:5173>

## Проверка работоспособности (минимальный сценарий)

1. Зарегистрировать пользователя на странице Register (frontend) или POST /auth/register.
1. Войти (Login) — получите access в памяти и refresh-cookie.
1. Дождаться истечения access (можно задать короткий JWT_ACCESS_TTL в .env для теста) — запросы должны автоматически вызвать POST /auth/refresh и продолжить работу.
1. Logout — refresh-cookie очищается, последующий /auth/refresh вернёт 401.
1. Основной сценарий: создать/посмотреть темы, цели, прогресс, отчёты (доступы зависят от роли).

## Дополнительно

- Детали backend: apps/backend/README.md
- Детали frontend: apps/frontend/README.md
- .env создаются только в приложениях (в корне .env не нужен)
