# Микро-твиттер «Мысли вслух»

**Вариант 20** | Курсовая работа по веб-технологиям

## 📋 Описание проекта

Полнофункциональное веб-приложение для публикации коротких мыслей (микроблогинг), аналог Twitter/X с основными функциями: публикация постов, лайки, репосты, подписки, комментарии и модерация контента.

## 🏗️ Структура проекта

```
test_02/
├── src/
│   ├── .github/             # CI/CD конфигурация
│   │   └── workflows/
│   │       └── ci.yml
│   ├── apps/
│   │   ├── server/          # Backend (NestJS + Prisma + PostgreSQL)
│   │   │   ├── src/
│   │   │   ├── prisma/
│   │   │   ├── package.json
│   │   │   └── ...
│   │   └── web/             # Frontend (React + TypeScript + Vite)
│   │       ├── src/
│   │       ├── public/
│   │       ├── package.json
│   │       └── ...
│   ├── docs/                # Документация
│   │   ├── PROJECT_IMPLEMENTATION_PLAN.md
│   │   ├── BACKEND_ANALYSIS.md
│   │   ├── BACKEND_READINESS_CHECK.md
│   │   └── R2_TechStack.md
│   ├── e2e/                 # E2E тесты (Playwright)
│   ├── k8s/                 # Kubernetes манифесты
│   │   ├── base/
│   │   └── README.md
│   ├── playwright-report/   # Отчеты Playwright
│   └── test-results/        # Результаты тестов
├── docker-compose.yml       # Docker конфигурация
├── playwright.config.ts     # Playwright конфигурация
├── package.json             # Корневой package.json (monorepo)
└── README.md
```

## 🛠️ Технологический стек

### Backend (Server)

- **Framework**: NestJS 11.x
- **Language**: TypeScript 5.7.x
- **ORM**: Prisma 6.16.x
- **Database**: PostgreSQL 16
- **Authentication**: JWT (passport-jwt)
- **Validation**: class-validator + class-transformer
- **Documentation**: Swagger/OpenAPI 11.x
- **Security**: Helmet, CORS, bcrypt

### Frontend (Web)

- **Framework**: React 18.x
- **Language**: TypeScript 5.7.x
- **Build Tool**: Vite 6.x
- **Routing**: React Router DOM v7
- **State Management**: Zustand + TanStack Query
- **Styling**: Tailwind CSS 3.x
- **HTTP Client**: Axios

### DevOps

- **Containerization**: Docker + Docker Compose
- **Database Migrations**: Prisma Migrate

## 🚀 Быстрый старт

### Предварительные требования

- Node.js 20.x или выше
- npm 10.x или выше
- Docker и Docker Compose (опционально)
- PostgreSQL 16 (если без Docker)

### Установка зависимостей

```bash
# Установка всех зависимостей (root + server + web)
npm run install:all
```

### Настройка базы данных

- 1.Создайте `.env` файл в `src/apps/server/`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/micro_twitter"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
PORT=3000
```

- 2.Примените миграции:

```bash
npm run db:migrate
```

- 3.(Опционально) Заполните базу тестовыми данными:

```bash
npm run db:seed
```

### Запуск в режиме разработки

#### Вариант 1: Локальный запуск

```bash
# Терминал 1: Запуск backend
npm run dev:server

# Терминал 2: Запуск frontend
npm run dev:web
```

- Backend: http://localhost:3000
- Frontend: http://localhost:5173
- Swagger API Docs: http://localhost:3000/api/docs
- Prisma Studio: `npm run db:studio`

#### Вариант 2: Docker Compose

```bash
# Запуск всех сервисов
npm run docker:up

# Остановка
npm run docker:down

# Пересборка образов
npm run docker:build
```

## 📚 API Documentation

После запуска backend, Swagger документация доступна по адресу:
**http://localhost:3000/api/docs**

### Основные endpoints

#### Authentication

- `POST /api/auth/register` - Регистрация нового пользователя
- `POST /api/auth/login` - Вход в систему

#### Posts

- `POST /api/posts` - Создание поста
- `GET /api/posts/feed` - Лента постов (подписки)
- `GET /api/posts/explore` - Общая лента (все посты)
- `GET /api/posts/:id` - Получение поста
- `PATCH /api/posts/:id` - Обновление поста
- `DELETE /api/posts/:id` - Удаление поста

#### Likes

- `POST /api/likes/posts/:postId` - Лайк поста
- `DELETE /api/likes/posts/:postId` - Удалить лайк

#### Follows

- `POST /api/follows/:userId` - Подписаться на пользователя
- `DELETE /api/follows/:userId` - Отписаться
- `GET /api/follows/followers` - Список подписчиков
- `GET /api/follows/following` - Список подписок

#### Replies (Комментарии)

- `POST /api/replies/posts/:postId` - Создать комментарий
- `GET /api/replies/posts/:postId` - Получить комментарии к посту

#### Reports (Жалобы)

- `POST /api/reports/posts/:postId` - Пожаловаться на пост
- `GET /api/reports/my` - Мои жалобы

#### Admin (Модерация)

- `GET /api/admin/reports` - Список жалоб
- `PATCH /api/admin/reports/:id/status` - Изменить статус жалобы
- `POST /api/admin/posts/:id/moderate` - Модерировать пост
- `GET /api/admin/moderation-logs` - Логи модерации

## 🗄️ Модель данных

### Основные сущности

- **User**: id, username, email, password, role, createdAt
- **Post**: id, content, authorId, createdAt, updatedAt
- **Like**: id, userId, postId, createdAt
- **Follow**: id, followerId, followingId, createdAt
- **Reply**: id, content, authorId, postId, createdAt
- **Report**: id, reason, status, reporterId, postId, createdAt

## 📊 Реализованные возможности

### ✅ Backend (100%)

- Полная архитектура NestJS с модульной структурой
- Аутентификация и авторизация (JWT + Roles)
- CRUD операции для всех сущностей
- Prisma ORM с миграциями
- Swagger API документация
- Комплексное тестирование (Unit + E2E)

### ✅ Базовая инфраструктура (100%)

- Docker Compose для локальной разработки
- PostgreSQL с автоматическими миграциями
- Seed скрипты для тестовых данных

### ✅ Тестирование (100%)

- 31 unit-тестов (100% coverage критичных модулей)
- 25 E2E тестов backend API
- 10 Playwright тестов фронтенда
- Интеграция CI/CD пайплайна

### ✅ DevOps & Kubernetes (100%)

- GitHub Actions CI/CD конфигурация
- Kubernetes манифесты (Deployments, Services, ConfigMaps)
- Horizontal Pod Autoscaler
- Ingress для роутинга
- Kustomize для управления манифестами

## 📝 Скрипты

```bash
# Разработка
npm run dev:server        # Запуск backend в dev режиме
npm run dev:web          # Запуск frontend в dev режиме

# Сборка
npm run build:server     # Сборка backend
npm run build:web        # Сборка frontend

# Продакшн
npm run start:server     # Запуск backend в prod режиме
npm run preview:web      # Preview frontend сборки

# База данных
npm run db:migrate       # Применить миграции
npm run db:studio        # Открыть Prisma Studio
npm run db:seed          # Заполнить тестовыми данными

# Docker
npm run docker:up        # Запуск в Docker
npm run docker:down      # Остановка Docker
npm run docker:build     # Пересборка образов

# Тестирование
npm run test             # Запуск тестов
npm run test:coverage    # Покрытие кода тестами
```

## 🔐 Безопасность

- JWT токены для аутентификации
- Пароли хешируются с помощью bcrypt
- Helmet для защиты HTTP заголовков
- CORS настроен для безопасных запросов
- Валидация всех входных данных
- Role-based access control (USER, MODERATOR, ADMIN)
