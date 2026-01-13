# Roadmaps MVP — Variant 24

Full-stack приложение «Как стать джуном»: дорожные карты, шаги, ресурсы и трекинг прогресса.

## Требования

- Node.js 18+
- npm 10+
- PostgreSQL 14+ (локальный экземпляр)

## Быстрый запуск всей системы (одной командой)

1) Установить зависимости из корня:

```
npm install
```

1) Настроить backend окружение: скопировать [apps/backend/.env.example](apps/backend/.env.example) в `apps/backend/.env` и заполнить `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`, `FRONTEND_ORIGIN`.

2) Применить миграции и сгенерировать Prisma client:

```
npm run prisma:migrate:dev -w backend
```

1) (Опционально) залить тестовые данные для демо:

```
npm run prisma:seed -w backend
```

1) Запустить frontend + backend одной командой:

```
npm run dev
```

Backend поднимется на <http://localhost:4000>, frontend — на <http://localhost:5173>.

## Проверка сценария (register → login → refresh rotation → logout → основной сценарий)

- Регистрация: через UI или `POST /auth/register` — backend ставит HttpOnly refresh-cookie и отдаёт access token.
- Вход: `POST /auth/login` — аналогично, access в ответе, refresh в cookie.
- Обновление access: после истечения access (для ускорения можно выставить `JWT_ACCESS_TTL=1m` в `.env` dev) любое 401 вызовет авто-запрос frontend `POST /auth/refresh` с cookie; новый access сохраняется и UI продолжает работать.
- Выход: кнопка Logout или `POST /auth/logout` — refresh cookie очищается; повторный `POST /auth/refresh` вернёт 401.
- Основной пользовательский путь: авторизоваться → открыть список дорожных карт → зайти в детальную страницу → отметить шаги как выполненные; для администратора дополнительно доступны создание/редактирование дорожных карт, шагов и ресурсов.

## Структура монорепозитория

- apps/backend — Express + Prisma API
- apps/frontend — React + Vite SPA
- task_01 — документация варианта

## Полезные команды

- `npm run dev` — запустить фронт и бэк одновременно
- `npm run dev:backend` / `npm run dev:frontend` — запустить по отдельности
- `npm run prisma:migrate:dev -w backend` — миграции + генерация клиента
- `npm run prisma:seed -w backend` — тестовые данные
- `npm run prisma:studio -w backend` — открыть Prisma Studio

Дополнительно см. [apps/backend/README.md](apps/backend/README.md) и [apps/frontend/README.md](apps/frontend/README.md) за деталями настройки и API.
