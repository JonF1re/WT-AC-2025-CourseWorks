# Frontend (React + Vite)

SPA для варианта 14 «До сессии успею»: темы, цели, прогресс, отчёты. JWT access в памяти, refresh в HttpOnly cookie; авто-refresh при 401.

## Стек

- React + TypeScript + Vite
- react-router-dom (маршруты)
- react-hook-form + zod (формы и валидация)
- axios (API-клиент с interceptor для refresh)

## Что реализовано

- Страницы: Login, Register, Dashboard, Topics, Goals, Progress, Reports.
- Auth: access хранится в памяти, refresh в cookie; при 401 выполняется POST /auth/refresh и повтор запроса; logout очищает состояние.
- Роли: admin/user. UI скрывает запрещённые действия (например, CRUD тем и целей — только admin; пользователь правит свои цели ограниченно, прогресс — только свой).
- Списки/формы для тем, целей, прогресса; отчёты по пользователю и по теме (для admin).

## Установка и запуск (dev)

```bash
npm install
cp .env.example .env
# VITE_API_URL указывает на backend (например, http://localhost:3000)
npm run dev
```

## Env

- `VITE_API_URL` — базовый URL API (backend). Должен совпадать с CORS_ORIGIN на backend.

## Маршруты и права

- `/login`, `/register` — публичные
- `/` и `/dashboard` — защищено
- `/topics` — чтение всем; создание/редактирование/удаление только admin
- `/goals` — admin создаёт/удаляет и правит все поля; пользователь видит свои, может менять name/description/deadline
- `/progress` — пользователь видит/редактирует свои записи; admin видит все
- `/reports` — пользовательский отчёт; отчёт по теме доступен admin

## Проверка сценария

1) Register → login (получаем access в памяти и refresh-cookie).
2) Подождать истечения access (поставьте короткий JWT_ACCESS_TTL на backend). Следующий защищённый запрос вызовет /auth/refresh автоматически.
3) Logout — refresh-cookie очищен; последующий запрос с истёкшим access вернёт 401 и не обновится.
4) Основной сценарий: темы → цели → прогресс → отчёты.

## Заметки

- Все запросы выполняются с `withCredentials: true` (axios настроен), чтобы refresh-cookie отправлялся.
- Валидация форм на клиенте через zod: обязательные поля дают понятные сообщения.
