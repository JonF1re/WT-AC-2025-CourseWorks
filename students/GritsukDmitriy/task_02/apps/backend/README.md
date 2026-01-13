# Backend — Roadmaps MVP

Express + TypeScript + Prisma + PostgreSQL. JWT аутентификация (access + refresh) с ротацией refresh-токенов и отзывом активных сессий при злоупотреблении.

## Требования

- Node.js 18+
- PostgreSQL
- Настроенный файл окружения `apps/backend/.env` (см. `.env.example`)

### Переменные окружения (обязательно)

- `DATABASE_URL` — строка подключения к Postgres
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — разные секреты для токенов
- `JWT_ACCESS_TTL` — TTL access (например, `15m` или `1m` для тестов истечения)
- `JWT_REFRESH_TTL` — TTL refresh (например, `7d`)
- `FRONTEND_ORIGIN` — origin фронтенда (например, <http://localhost:5173>)
- `REFRESH_COOKIE_NAME` — имя HttpOnly cookie (по умолчанию `refreshToken`)

## Установка и база данных

1) Из корня выполнить `npm install` (workspace зависимости).
2) Создать `apps/backend/.env` по `.env.example` и заполнить значения.
3) Применить миграции и сгенерировать Prisma client:

```
npm run prisma:migrate:dev -w backend
```

1) (Опционально) залить тестовые данные:

```
npm run prisma:seed -w backend
```

## Запуск

- Dev отдельно: `npm run dev:backend` (порт 4000).
- В составе всей системы: `npm run dev` из корня поднимет и фронт, и бэк.

CORS настроен на `FRONTEND_ORIGIN` с `credentials: true`, refresh-cookie — HttpOnly, `sameSite=lax` в dev, `secure` в production.

## Что реализовано

- Модели: User (roles: user/admin), Roadmap, Step, Resource, Progress, RefreshToken
- Эндпоинты: `/auth` (register/login/refresh/logout), `/users`, `/roadmaps`, `/steps`, `/resources`, `/progress`, `/health`
- JWT access + refresh с ротацией: при `/auth/refresh` старый refresh помечается `revokedAt`, новый записывается в БД; попытка использовать истёкший/отозванный ведёт к очистке cookie и 401
- Валидация входных данных через Zod, rate limit на логин, хэширование паролей через bcrypt, helmet + CORS

## Seed данные (dev)

После `npm run prisma:seed -w backend` доступны:

- admin / Admin123!
- jane / User123!
- john / User234!
- Roadmap «Frontend junior roadmap» с шагами и ресурсами; у jane отмечен один выполненный шаг.

## Примеры curl (PowerShell)

> Refresh-cookie хранится в сессии PowerShell (`WebRequestSession`). Защищённые запросы требуют заголовка `Authorization: Bearer <accessToken>`.

Логин (получить access + refresh-cookie):

```
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$login = Invoke-RestMethod -Method Post -Uri http://localhost:4000/auth/login -WebSession $session -ContentType 'application/json' -Body '{"username":"admin","password":"Admin123!"}'
$access = $login.data.accessToken
```

Обновить access через refresh rotation:

```
$refresh = Invoke-RestMethod -Method Post -Uri http://localhost:4000/auth/refresh -WebSession $session
$newAccess = $refresh.data.accessToken
```

Запрос к защищённому эндпоинту (например, список roadmaps):

```
Invoke-RestMethod -Method Get -Uri http://localhost:4000/roadmaps -WebSession $session -Headers @{ Authorization = "Bearer $access" }
```

Логаут (очищает refresh cookie, дальнейший refresh вернёт 401):

```
Invoke-RestMethod -Method Post -Uri http://localhost:4000/auth/logout -WebSession $session
```

Регистрация нового пользователя:

```
Invoke-RestMethod -Method Post -Uri http://localhost:4000/auth/register -ContentType 'application/json' -Body '{"username":"newuser","email":"new@example.com","password":"NewUser123!"}'
```

## Prisma Studio

```
npm run prisma:studio -w backend
```

Откроет веб-интерфейс для просмотра БД (использует `DATABASE_URL`).
