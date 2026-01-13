# Server (Backend) — Вариант 40

REST API сервер для системы управления заявками «Да, я в деле».

## Что реализовано

**Основные функции:**

- JWT аутентификация (access + refresh tokens с ротацией)
- Роли пользователей: admin, moderator, user
- CRUD для форм заявок (только admin)
- CRUD для статусов (только admin)
- Управление заявками (создание, просмотр, редактирование, смена статусов)
- Загрузка вложений к заявкам
- История изменений статусов
- Валидация данных (Zod)
- Структурированное логирование (Pino)

**Эндпоинты:**

*Auth (публичные):*

- `POST /auth/register` — регистрация
- `POST /auth/login` — вход (возвращает access token + устанавливает HttpOnly cookie с refresh)
- `POST /auth/refresh` — обновление access token по refresh cookie
- `POST /auth/logout` — выход (отзыв refresh token)

*Users (защищённые):*

- `GET /users/me` — информация о текущем пользователе

*Forms (GET публичные, остальное admin):*

- `GET /forms` — список форм (гости видят только активные, admin — все)
- `GET /forms/:id` — детали формы
- `POST /forms` — создание (admin)
- `PUT /forms/:id` — редактирование (admin)
- `DELETE /forms/:id` — удаление (admin)

*Statuses (требуют авторизации; создание/изменение/удаление — только admin):*

- `GET /statuses` — список статусов
- `GET /statuses/:id` — детали статуса
- `POST /statuses` — создание (admin)
- `PUT /statuses/:id` — редактирование (admin)
- `DELETE /statuses/:id` — удаление (admin)

*Applications (требуют авторизации):*

- `GET /applications` — список заявок (пользователи видят свои, модераторы/admin — все)
- `GET /applications/:id` — детали заявки
- `POST /applications` — создание заявки
- `PUT /applications/:id` — редактирование (только черновики, владелец или admin)
- `DELETE /applications/:id` — удаление (только черновики, владелец или admin)
- `POST /applications/:id/submit` — отправка на рассмотрение (статус draft → pending)
- `PUT /applications/:id/status` — смена статуса (moderator/admin)
- `POST /applications/:id/withdraw` — отзыв заявки (владелец)

*Attachments (требуют авторизации):*

- `GET /attachments?applicationId=...` — список вложений заявки
- `GET /attachments/:id` — скачивание файла
- `POST /attachments` — загрузка (только черновики, до 10 файлов, макс. 50 МБ на заявку)
- `DELETE /attachments/:id` — удаление (только черновики, владелец или admin)

*Health:*

- `GET /health` — статус сервера
- `GET /ready` — готовность (проверка подключения к БД)

## API Documentation

- Swagger UI: <http://localhost:3000/api-docs>
- OpenAPI JSON: <http://localhost:3000/api-docs.json>
- Для тестирования авторизованных запросов нажмите кнопку **Authorize** в Swagger UI и вставьте `Bearer <access_token>` в поле значения токена.

**Модели данных (Prisma):**

- User (id, username, email, passwordHash, role, createdAt)
- RefreshToken (id, tokenHash, userId, expiresAt, revokedAt, ...)
- Form (id, name, description, fields:JSON, isActive, createdById, ...)
- Status (id, name, description, color, order, isFinal, createdAt)
- Application (id, formId, userId, statusId, data:JSON, comment, submittedAt, ...)
- Attachment (id, applicationId, filename, filePath, fileSize, mimeType, uploadedById, ...)
- StatusHistory (id, applicationId, fromStatusId, toStatusId, changedById, changedAt, comment)

## Требования

- Node.js 20+
- PostgreSQL 14+ (запущен и доступен)
- pnpm 8.15+

## Установка

### 1. Установка зависимостей

```bash
# Из корня проекта
pnpm install
```

### 2. Настройка переменных окружения

Создайте файл `apps/server/.env` со следующими переменными:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/coursework_db?schema=public"

# JWT Secrets
# ВАЖНО: в production используйте криптостойкие случайные строки!
JWT_ACCESS_SECRET="your_access_secret_min_32_chars"
JWT_REFRESH_SECRET="your_refresh_secret_min_32_chars"

# JWT TTL (время жизни токенов)
JWT_ACCESS_TTL="15m"    # Access token на 15 минут
JWT_REFRESH_TTL="7d"    # Refresh token на 7 дней

# CORS (разделяйте запятыми для нескольких origin)
CORS_ORIGIN="http://localhost:5173"

# Server
SERVER_PORT=3000
SERVER_HOST=0.0.0.0
NODE_ENV=development

# Cookies (для production установите true)
COOKIE_SECURE=false
COOKIE_SAMESITE=lax

# Logging / Observability
LOG_LEVEL=debug
REDIS_URL=redis://localhost:6379

# Cache TTL (секунды)
CACHE_TTL_SHORT=30
CACHE_TTL_MEDIUM=300
CACHE_TTL_LONG=3600
```

**Примечания:**

- `DATABASE_URL` — строка подключения к PostgreSQL
- `JWT_*_SECRET` — должны быть разными и достаточно длинными (минимум 32 символа)
- `JWT_ACCESS_TTL` — короткий TTL для access token (5-30 минут)
- `JWT_REFRESH_TTL` — длинный TTL для refresh token (7-30 дней)
- `CORS_ORIGIN` — URL фронтенда (или несколько через запятую)
- `COOKIE_SECURE=true` в production (требует HTTPS)

**Важно про cookies в production:**

- Если frontend и backend находятся на **разных доменах/поддоменах**, для отправки refresh-cookie браузером обычно нужно выставить `COOKIE_SAMESITE=none` и `COOKIE_SECURE=true` (а значит — HTTPS).
- `CORS_ORIGIN` должен быть задан точным origin фронтенда, и на сервере должен быть включён `credentials: true` (в проекте включено).

### 3. Инициализация базы данных

```bash
# Генерация Prisma клиента
pnpm --filter @app/server prisma:generate

# Применение миграций (создаст таблицы)
pnpm --filter @app/server prisma:migrate
# При запросе имени миграции введите, например: init

# Заполнение тестовыми данными (опционально, для разработки)
pnpm --filter @app/server prisma:seed
```

## Запуск

**Из корня проекта:**

```bash
# Только backend
pnpm dev:server

# Или вместе с фронтендом
pnpm dev
```

**Напрямую из apps/server:**

```bash
cd apps/server
pnpm dev
```

Сервер запустится на <http://localhost:3000>

## Seed данные (тестовые пользователи)

После выполнения `pnpm --filter @app/server prisma:seed` в БД будут созданы:

**Пользователи:**

| Email                 | Пароль       | Роль      | Описание                      |
|-----------------------|--------------|-----------|-------------------------------|
| <admin@example.com>     | admin123!    | admin     | Администратор                 |
| <moderator@example.com> | moderator123!| moderator | Модератор                     |
| <user@example.com>      | user123!     | user      | Обычный пользователь          |
| <demo@example.com>      | demo123!     | user      | Демо-пользователь             |
| <analytics@example.com> | student123!  | user      | Анна (аналитика)              |
| <content@example.com>   | author123!   | user      | Иван (контент)                |

**Предзаполненные данные:**

- 5 базовых статусов: draft, pending, approved, rejected, withdrawn (с цветами)
- 2 формы заявок: «Участие в событии» (активна), «Обратная связь» (неактивна)
- 5 демонстрационных заявок в разных статусах

## Тестирование

Сервер покрыт unit и integration тестами с использованием **Vitest**.

### Запуск тестов

```bash
# Запустить все тесты
pnpm test

# Запустить в watch-режиме
pnpm test:watch

# Запустить с coverage-отчётом
pnpm test:coverage
```

### Структура тестов

```
tests/
├── setup.ts              # Глобальная настройка тестовой среды
├── integration/          # Integration-тесты API
│   ├── setup.ts          # Настройка тестовой БД
│   ├── auth.test.ts      # Тесты аутентификации
│   ├── applications.test.ts  # Тесты CRUD заявок
│   ├── forms.test.ts     # Тесты CRUD форм
│   └── health.test.ts    # Тесты health endpoints
└── unit/                 # Unit-тесты
    ├── middleware/       # Тесты middleware
    │   ├── auth.test.ts
    │   ├── authorize.test.ts
    │   └── errorHandler.test.ts
    ├── services/         # Тесты бизнес-логики (future)
    └── utils/            # Тесты утилит
        ├── hash.test.ts
        ├── jwt.test.ts
        └── pagination.test.ts
```

### Покрытие

**Unit-тесты:**

- Утилиты хеширования паролей (bcrypt)
- Утилиты JWT (создание/верификация токенов)
- Пагинация
- Middleware авторизации
- Error handler

**Integration-тесты:**

- Регистрация и вход пользователей
- Обновление токенов (refresh)
- CRUD операции с заявками
- CRUD операции с формами
- Health checks
- Проверка прав доступа на уровне API

### Тестовая БД

Integration-тесты используют in-memory SQLite базу данных, которая создаётся и уничтожается для каждого тестового запуска. Никакая продакшн-данные не затрагиваются.

- 1 файл-вложение

⚠️ **Важно:** Seed **очищает все таблицы** перед созданием данных! Используйте только в dev-окружении.

## Примеры запросов (PowerShell + curl.exe)

### 1. Регистрация

```powershell
curl.exe -X POST "http://localhost:3000/auth/register" `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"newuser@test.com\",\"username\":\"newuser\",\"password\":\"Pass123!\"}'
```

**Ответ:**

```json
{
  "status": "ok",
  "data": {
    "user": {
      "id": "...",
      "username": "newuser",
      "email": "newuser@test.com",
      "role": "user",
      "createdAt": "..."
    },
    "accessToken": "eyJhbGc..."
  }
}
```

### 2. Вход (Login)

```powershell
curl.exe -X POST "http://localhost:3000/auth/login" `
  -H "Content-Type: application/json" `
  -c cookies.txt `
  -d '{\"email\":\"admin@example.com\",\"password\":\"admin123!\"}'
```

**Ответ:**

```json
{
  "status": "ok",
  "data": {
    "user": { ... },
    "accessToken": "eyJhbGc..."
  }
}
```

**Примечание:** Флаг `-c cookies.txt` сохраняет HttpOnly cookie с refresh token.

### 3. Refresh (обновление access token)

```powershell
curl.exe -X POST "http://localhost:3000/auth/refresh" `
  -H "Content-Type: application/json" `
  -b cookies.txt `
  -c cookies.txt
```

**Ответ:**

```json
{
  "status": "ok",
  "data": {
    "user": { ... },
    "accessToken": "новый_access_token"
  }
}
```

**Примечание:**

- `-b cookies.txt` отправляет refresh cookie
- `-c cookies.txt` сохраняет новый refresh cookie (ротация)

### 4. Logout (выход)

```powershell
curl.exe -X POST "http://localhost:3000/auth/logout" `
  -b cookies.txt
```

**Ответ:** HTTP 204 (No Content)

После logout повторный refresh вернёт 401.

### 5. Защищённые эндпоинты

Для доступа к защищённым эндпоинтам используйте access token из login/refresh:

```powershell
$accessToken = "полученный_access_token"

# Получить информацию о себе
curl.exe "http://localhost:3000/users/me" `
  -H "Authorization: Bearer $accessToken"

# Список форм (авторизованный пользователь видит неактивные, если admin)
curl.exe "http://localhost:3000/forms" `
  -H "Authorization: Bearer $accessToken"

# Список заявок
curl.exe "http://localhost:3000/applications" `
  -H "Authorization: Bearer $accessToken"

# Создать заявку
curl.exe -X POST "http://localhost:3000/applications" `
  -H "Authorization: Bearer $accessToken" `
  -H "Content-Type: application/json" `
  -d '{\"formId\":\"form_id\",\"data\":{\"field1\":\"value1\"},\"comment\":\"Тест\"}'
```

## Prisma Studio

Графический интерфейс для просмотра и редактирования данных в БД:

```bash
pnpm --filter @app/server prisma:studio
```

Откроется по адресу <http://localhost:5555>

## Health Checks

### Health (базовый)

```bash
curl.exe http://localhost:3000/health
```

**Ответ:**

```json
{ "status": "ok" }
```

### Ready (БД + Redis)

```bash
curl.exe http://localhost:3000/ready
```

**Ответ (пример):**

```json
{
  "status": "ok",
  "checks": {
    "database": { "status": "ok", "responseTime": 5 },
    "redis": { "status": "ok", "responseTime": 2 }
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

Если БД недоступна — HTTP 503 и `status=degraded`. Если Redis недоступен, `status=degraded`, но HTTP 200 (кэш отключается).

## Структура проекта

```
apps/server/
├── src/
│   ├── index.ts              # Точка входа
│   ├── app.ts                # Конфигурация Express
│   ├── lib/                  # Утилиты (config, jwt, logger, prisma, ...)
│   ├── middleware/           # Middleware (auth, errorHandler, ...)
│   ├── modules/              # Бизнес-логика по модулям
│   │   ├── auth/             # Аутентификация (register, login, refresh, logout)
│   │   ├── users/            # Пользователи
│   │   ├── forms/            # Формы
│   │   ├── statuses/         # Статусы
│   │   ├── applications/     # Заявки
│   │   └── attachments/      # Вложения
│   ├── routes/               # Агрегация роутов
│   └── types/                # TypeScript типы
├── prisma/
│   ├── schema.prisma         # Схема БД
│   ├── migrations/           # Миграции
│   └── seed.ts               # Seed данные
├── package.json
├── tsconfig.json
└── README.md
```

## Observability

**Логи (Pino):**

- Структурированный JSON вывод, уровни настраиваются через `LOG_LEVEL`.
- `pino-http` логирует входящие запросы: метод, путь, статус, длительность; заголовки `Authorization` и `Cookie` редактируются.
- Ошибки пишутся с stack trace; бизнес-события (создание/обновление/удаление, auth) логируются явными сообщениями.

**Метрики (Prometheus):**

- Эндпоинт: `/metrics` (text/plain, Prometheus exposition format).
- Метрики: `http_requests_total`, `http_request_duration_seconds`, `auth_attempts_total` (type=login/register/refresh, success), `active_users_total` (зарезервировано) и стандартные `process_*`/`nodejs_*` от `collectDefaultMetrics`.

**Кэш (Redis):**

- Клиент: `ioredis`, URL задаётся `REDIS_URL`.
- Кэшируются часто запрашиваемые списки (`forms:list:*`, `statuses:list:*`) с TTL из `CACHE_TTL_*` (по умолчанию 30/300/3600 секунд).
- Инвалидация выполняется после create/update/delete.
- При недоступном Redis приложение деградирует gracefully (кэш пропускается, остаётся БД).

**Health checks:**

- `/health` — liveness.
- `/ready` — readiness: проверка БД (критична, 503 при недоступности) и Redis (некритичен: статус `degraded`, HTTP 200). Ответ содержит время отклика для проверок.

## Безопасность

- Пароли хэшируются с bcrypt (cost factor 10)
- Refresh tokens хранятся хэшированными (SHA-256)
- HttpOnly cookies для refresh tokens (защита от XSS)
- CORS настроен на конкретные origins
- Helmet для базовых HTTP заголовков безопасности
- Валидация всех входящих данных (Zod)

## Troubleshooting

**Ошибка "Missing required env JWT_ACCESS_SECRET":**

- Создайте файл `apps/server/.env` с нужными переменными

**Ошибка подключения к БД:**

- Убедитесь, что PostgreSQL запущен
- Проверьте `DATABASE_URL` в `.env`

**Ошибка "P1001: Can't reach database server":**

- Проверьте хост/порт PostgreSQL
- Убедитесь, что нет файрволла, блокирующего подключение

**CORS ошибки:**

- Добавьте URL фронтенда в `CORS_ORIGIN`

**Ошибка "Migration failed":**

- Убедитесь, что БД существует и доступна
- Попробуйте `pnpm --filter @app/server prisma:push` для форсированной синхронизации

**Для отладки JWT refresh (короткий TTL):**

```env
JWT_ACCESS_TTL=1m
```

Access token будет истекать через минуту, что удобно для тестирования автоматического обновления на фронтенде.

## Production Checklist

- [ ] Сгенерируйте криптостойкие `JWT_*_SECRET` (минимум 32 символа)
- [ ] Установите `COOKIE_SECURE=true` (требует HTTPS)
- [ ] Настройте `CORS_ORIGIN` на реальный домен
- [ ] Увеличьте `JWT_ACCESS_TTL` до 15-30 минут
- [ ] Настройте централизованный сбор логов
- [ ] Используйте connection pooling для PostgreSQL
- [ ] Настройте rate limiting
- [ ] Включите мониторинг и алерты

## Дополнительные команды

```bash
# Генерация Prisma клиента
pnpm --filter @app/server prisma:generate

# Применение миграций
pnpm --filter @app/server prisma:migrate

# Синхронизация схемы без миграций (dev only!)
pnpm --filter @app/server prisma:push

# Открыть Prisma Studio
pnpm --filter @app/server prisma:studio

# Заполнить БД seed-данными
pnpm --filter @app/server prisma:seed

# Сборка для production
pnpm --filter @app/server build

# Запуск production build
pnpm --filter @app/server start
```

## Следующие этапы

- Дополнить наблюдаемость: дашборды (Grafana), алерты (Alertmanager), трассировка (OpenTelemetry).
- Оптимизация кэшей под реальные нагрузки и профилирование горячих запросов.
