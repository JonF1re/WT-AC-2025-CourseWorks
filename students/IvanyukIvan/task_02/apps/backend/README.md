# Backend (Express + Prisma)

JWT (access + refresh с ротацией), роли admin/user, модели Topic/Goal/ProgressEntry/User, валидация Zod, Prisma + PostgreSQL.

## Требования

- Node.js 18+
- PostgreSQL

## Что реализовано

- Модели: User (role admin/user), Topic, Goal (topicId, userId, targetValue, deadline), ProgressEntry (goalId, value, comment, timestamp), RefreshToken.
- JWT access/refresh: refresh хранится в HttpOnly cookie, ротация; повторное использование отозванного refresh отзывает все сессии пользователя.
- Роли и доступы: admin полный доступ; user видит и правит свои цели/прогресс, читает темы.
- Валидация: Zod на входящих данных.
- Безопасность: helmet, CORS с credentials, bcrypt для паролей.
- Логирование ошибок (централизованный error handler).

## Переменные окружения (.env)

- DATABASE_URL — строка подключения PostgreSQL
- PORT — порт API (по умолчанию 3000)
- CORS_ORIGIN — список origins через запятую (например, <http://localhost:5173>)
- JWT_ACCESS_SECRET, JWT_REFRESH_SECRET — секреты ≥32 символов
- JWT_ACCESS_TTL — срок access (например, 15m)
- JWT_REFRESH_TTL — срок refresh (например, 7d)

## Установка и запуск (локально)

```bash
npm install
cp .env.example .env           # заполнить значения
npm run prisma:migrate -w backend   # prisma migrate dev
npm run prisma:seed -w backend      # сид с тестовыми данными
npm run dev -w backend             # старт dev
```

- Healthcheck: GET <http://localhost:3000/health> → { "status": "ok" }

## Запуск миграций/студии

- Migrate: `npm run prisma:migrate -w backend`
- Generate client: `npm run prisma:generate -w backend`
- Prisma Studio: `npm run prisma:studio -w backend`

## Seed (dev)

- <admin@example.com> / Admin123!
- <ivan@example.com> / User123!
- <maria@example.com> / User456!

## Эндпоинты и права

- /auth/register — регистрация, ставит refresh-cookie, возвращает access
- /auth/login — логин
- /auth/refresh — ротация refresh → новый access
- /auth/logout — отзыв refresh, очистка cookie
- /users/me — профиль текущего пользователя
- /topics — GET все/по id (user/admin); POST/PUT/DELETE (admin)
- /goals — GET с фильтрами userId/topicId (user видит только свои); POST (admin назначает); PUT (owner: name/description/deadline; admin: любые поля); DELETE (admin)
- /progress — GET (user свои, admin все, фильтры goalId/from/to/limit/offset); POST/PUT/DELETE (owner или admin)
- /reports — GET /reports/user/:userId (self или admin); GET /reports/topic/:topicId (admin)
- Ошибки: 401 — нет/просрочен access; 403 — нет прав/не владелец.

## Примеры (PowerShell)

```powershell
$sess = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# Register
Invoke-RestMethod -Method Post -Uri http://localhost:3000/auth/register -ContentType "application/json" -Body '{"username":"demo","email":"demo@example.com","password":"Demo1234!"}' -WebSession $sess

# Login
$login = Invoke-RestMethod -Method Post -Uri http://localhost:3000/auth/login -ContentType "application/json" -Body '{"email":"admin@example.com","password":"Admin123!"}' -WebSession $sess
$access = $login.data.accessToken

# Protected request
Invoke-RestMethod -Method Get -Uri http://localhost:3000/users/me -Headers @{ Authorization = "Bearer $access" }

# Refresh (reuse cookie from $sess)
$refresh = Invoke-RestMethod -Method Post -Uri http://localhost:3000/auth/refresh -WebSession $sess
$access = $refresh.data.accessToken

# Logout
Invoke-RestMethod -Method Post -Uri http://localhost:3000/auth/logout -WebSession $sess
```

### Быстрая проверка истечения access

- Поставьте JWT_ACCESS_TTL коротким (например, 30s) в .env, перезапустите backend.
- После истечения access любой защищённый запрос вызовет refresh (HttpOnly cookie), вернётся новый access.
- После logout refresh-cookie удаляется, повторный /auth/refresh вернёт 401.
