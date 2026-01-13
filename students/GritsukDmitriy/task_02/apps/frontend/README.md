# Frontend — Roadmaps MVP

React SPA для варианта 24 «Как стать джуном»: дорожные карты, шаги, ресурсы, прогресс.

## Стек

- React 18 + TypeScript
- Vite
- react-router-dom
- react-hook-form + zod

## Требования

- Node.js 18+
- Настроенный backend (<http://localhost:4000> по умолчанию) с включённым CORS `credentials: true`

## Настройка и запуск

1) Установить зависимости из корня: `npm install`.
2) Создать `apps/frontend/.env` (если нужно переопределить адрес API):

```
VITE_API_BASE_URL=http://localhost:4000
```

1) Запустить dev-сервер:

```
npm run dev -w frontend
```

Приложение будет доступно на <http://localhost:5173>. Можно также стартовать обе части сразу через `npm run dev` в корне.

## Как работает аутентификация

- Login/Register вызывают `/auth/login` или `/auth/register`; backend ставит HttpOnly refresh-cookie и возвращает access token.
- Access хранится в памяти (AuthContext), refresh — только в cookie.
- Все запросы выполняются с `credentials: 'include'`; `apiFetch` автоматически добавляет `Authorization: Bearer <access>`.
- При 401 фронт отправляет `POST /auth/refresh` с cookie, сохраняет новый access и повторяет исходный запрос. Если refresh недействителен — сессия сбрасывается, пользователь переходит на логин.

## Основные страницы и доступ

- `/login`, `/register` — публичные
- `/` — список дорожных карт (авторизованные)
- `/roadmaps/:id` — детали + прогресс (авторизованные)
- `/roadmaps/new`, `/roadmaps/:id/edit`, `/roadmaps/:id/steps/new`, `/roadmaps/:id/steps/:stepId/edit` — админ
- `/admin/users` — управление пользователями (админ)

## Возможности

- Регистрация, вход, выход
- Просмотр дорожных карт, шагов, ресурсов
- Отметка выполненных шагов и отображение прогресса
- CRUD для дорожных карт/шагов/ресурсов и управление пользователями (роль admin)

## Тестовые учётные записи (после seed backend)

- admin / Admin123!
- jane / User123!
- john / User234!

## Структура

```
src/
├── api/           # клиенты к backend (fetch + авто-refresh)
├── components/    # переиспользуемые элементы UI
├── context/       # AuthContext
├── pages/         # страницы и формы
├── styles/        # глобальные стили
├── types/         # типы данных
├── App.tsx        # маршрутизация
└── main.tsx       # точка входа
```
