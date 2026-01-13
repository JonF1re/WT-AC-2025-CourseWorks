# Frontend — «Да, я в деле» (Вариант 40)

SPA-клиент для системы управления заявками, построенный на React + TypeScript + Vite.

## Стек технологий

- **React 18** — библиотека для построения UI
- **TypeScript** — статическая типизация
- **Vite** — сборщик и dev-сервер
- **React Router 7** — клиентский роутинг
- **React Hook Form + Zod** — формы с валидацией
- **Axios/Fetch** — HTTP-клиент
- **Lucide React** — иконки
- **clsx** — утилита для классов

## Требования

- Node.js 18+
- pnpm (рекомендуется) или npm

## Переменные окружения

Создайте файл `.env` в папке `apps/web/`:

```env
# URL API сервера
VITE_API_BASE_URL=http://localhost:3000
```

## Запуск

### Установка зависимостей (из корня монорепо)

```bash
pnpm install
```

### Запуск в режиме разработки

```bash
# Из корня монорепо
pnpm --filter @app/web dev

# Или из папки apps/web
cd apps/web
pnpm dev
```

Приложение будет доступно по адресу: <http://localhost:5173>

### Сборка для production

```bash
pnpm --filter @app/web build
```

### Просмотр production-сборки

```bash
pnpm --filter @app/web preview
```

## Структура проекта

```
src/
├── api/              # API-клиент и запросы к backend
│   ├── client.ts     # HTTP-клиент с авто-refresh токенов
│   ├── auth.ts       # Авторизация (login, register, logout, refresh)
│   ├── applications.ts
│   ├── forms.ts
│   ├── statuses.ts
│   └── attachments.ts
├── components/       # Переиспользуемые компоненты
│   ├── ui/           # Базовые UI-компоненты (Button, Input, Modal, etc.)
│   └── layout/       # Layout-компоненты (Header, MainLayout, etc.)
├── contexts/         # React-контексты
│   └── AuthContext.tsx  # Контекст авторизации
├── hooks/            # Кастомные хуки
│   └── useAsync.ts   # Хук для асинхронных операций
├── pages/            # Страницы приложения
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── ApplicationsPage.tsx
│   ├── ApplicationDetailPage.tsx
│   ├── ApplicationFormPage.tsx
│   ├── FormsPage.tsx
│   ├── FormDetailPage.tsx
│   ├── FormFormPage.tsx
│   ├── StatusesPage.tsx
│   ├── AdminPage.tsx
│   └── NotFoundPage.tsx
├── types/            # TypeScript типы
│   └── index.ts      # DTO, модели, интерфейсы
├── App.tsx           # Главный компонент с роутингом
├── main.tsx          # Точка входа
└── styles.css        # Глобальные стили
```

## Реализованные сценарии

### Авторизация

- **Регистрация** (`/register`) — создание нового аккаунта
- **Вход** (`/login`) — авторизация по email/password
- **Выход** — разлогин с очисткой сессии

### Заявки (Applications)

- **Список заявок** (`/applications`) — просмотр с фильтрацией по статусу и форме
- **Создание заявки** (`/applications/new`) — заполнение динамической формы
- **Просмотр заявки** (`/applications/:id`) — детали, история изменений
- **Редактирование заявки** (`/applications/:id/edit`) — только для черновиков
- **Отправка заявки** — смена статуса с draft на pending
- **Отзыв заявки** — отмена отправленной заявки
- **Удаление заявки** — только для черновиков или admin

### Формы (Forms)

- **Список форм** (`/forms`) — шаблоны для заявок
- **Просмотр формы** (`/forms/:id`) — структура полей
- **Создание формы** (`/forms/new`) — только для admin
- **Редактирование формы** (`/forms/:id/edit`) — только для admin

### Статусы (Statuses)

- **Управление статусами** (`/statuses`) — CRUD для admin
- **Изменение статуса заявки** — доступно для admin/moderator

### Админ-панель

- **Панель управления** (`/admin`) — быстрый доступ к настройкам (только admin)

## Система авторизации

### Как это работает

1. **Access Token** хранится **в памяти** (React state) — НЕ в localStorage/sessionStorage
2. **Refresh Token** хранится **только на сервере** в HttpOnly cookie
3. При 401 ошибке (access токен истёк) автоматически:
   - Выполняется запрос `POST /auth/refresh` с cookie
   - При успехе — повторяется исходный запрос с новым access токеном
   - При ошибке — пользователь разлогинивается

### Безопасность

- Все запросы отправляются с `credentials: 'include'` для работы с HttpOnly cookies
- Access токен короткоживущий (15 минут по умолчанию)
- Refresh токен защищён от XSS атак (HttpOnly cookie)
- При выходе refresh токен отзывается на сервере

## Роли и права доступа

| Роль | Права |
|------|-------|
| **user** | Создание/редактирование/удаление своих заявок (в статусе draft), просмотр форм |
| **moderator** | Просмотр всех заявок, изменение статусов заявок |
| **admin** | Полный доступ: управление формами, статусами, всеми заявками |

## Подготовка к e2e тестам

Все ключевые элементы размечены атрибутами `data-testid`:

- Формы: `login-form`, `register-form`, `application-form`, `form-form`
- Кнопки: `submit-btn`, `create-btn`, `edit-btn`, `delete-btn`, `logout-btn`
- Элементы списков: `item-{id}`
- Сообщения об ошибках: `error-message`
- Индикаторы загрузки: `loading-indicator`

## Тестирование

Приложение покрыто E2E тестами с использованием **Playwright**.

### Предварительные требования

1. **Backend и frontend должны быть запущены:**

```bash
# Terminal 1 - Backend
pnpm --filter @app/server dev

# Terminal 2 - Frontend  
pnpm --filter @app/web dev
```

1. **База данных должна быть заполнена seed-данными:**

```bash
pnpm --filter @app/server prisma:seed
```

Это создаст тестовых пользователей:

- <admin@example.com> / admin123!
- <moderator@example.com> / moderator123!
- <user@example.com> / user123!

### Запуск E2E тестов

```bash
# Запустить все E2E тесты
pnpm test:e2e

# Запустить в UI-режиме (рекомендуется для разработки)
pnpm test:e2e:ui

# Запустить в debug-режиме
pnpm test:e2e:debug

# Запустить конкретный тест-файл
npx playwright test tests/e2e/auth.spec.ts
```

### Структура тестов

```
tests/
├── e2e/
│   ├── global-setup.ts        # Глобальная настройка (проверка серверов)
│   ├── fixtures.ts            # Хелперы и тестовые данные
│   ├── auth.spec.ts           # Аутентификация (10 тестов)
│   ├── applications.spec.ts   # CRUD заявок (8 тестов)
│   ├── roles.spec.ts          # Роли и права (14 тестов)
│   ├── forms-statuses.spec.ts # Формы и статусы (10 тестов)
│   ├── navigation.spec.ts     # Навигация (8 тестов)
│   └── workflows.spec.ts      # Полные сценарии (7 тестов)
└── playwright.config.ts       # Конфигурация Playwright
```

### Покрытие (57 тестов)

**Аутентификация (10 тестов):**

- Вход и выход
- Регистрация новых пользователей
- Валидация форм
- Обработка ошибок

**Роли и права доступа (14 тестов):**

- Проверка доступа user, moderator, admin
- Ограничения по ролям
- Видимость элементов интерфейса

**CRUD операции (18 тестов):**

- Создание, просмотр, редактирование, удаление заявок
- Управление формами (admin)
- Управление статусами (admin)

**Навигация (8 тестов):**

- Маршруты и переходы
- Защищённые страницы
- 404 страница

**Workflows (7 тестов):**

- Полный цикл заявки от создания до одобрения
- Смена статусов
- Отзыв заявок

### Конфигурация

Параметры Playwright задаются в `playwright.config.ts`:

- Браузер: Chromium
- Базовый URL: <http://localhost:5173>
- Timeout: 60 секунд
- Parallel workers: 6
- Retry: 1 раз при падении

### Отчёты и скриншоты

При падении тестов автоматически создаются:

- Скриншоты (test-results/)
- Error context (test-results/*/error-context.md)
- HTML-отчёт: `npx playwright show-report`

## Демонстрация

Для демонстрации преподавателю:

1. Запустите backend (`apps/server`) и frontend (`apps/web`)
2. Зарегистрируйте пользователя или войдите под существующим
3. Создайте заявку на основе активной формы
4. Отправьте заявку на рассмотрение
5. Войдите под admin/moderator для изменения статуса
6. Проверьте историю изменений заявки

### Тестовые учётные данные

Если выполнен seed базы данных:

- **Admin**: <admin@example.com> / admin123!
- **Moderator**: <moderator@example.com> / moderator123!
- **User**: <user@example.com> / user123!
- **Demo**: <demo@example.com> / demo123!

## API Endpoints (покрытие)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/auth/register` | Регистрация |
| POST | `/auth/login` | Вход |
| POST | `/auth/refresh` | Обновление токена |
| POST | `/auth/logout` | Выход |
| GET | `/users/me` | Текущий пользователь |
| GET/POST | `/applications` | Список / Создание заявки |
| GET/PUT/DELETE | `/applications/:id` | CRUD заявки |
| POST | `/applications/:id/submit` | Отправка заявки |
| PUT | `/applications/:id/status` | Изменение статуса |
| POST | `/applications/:id/withdraw` | Отзыв заявки |
| GET/POST | `/forms` | Список / Создание формы |
| GET/PUT/DELETE | `/forms/:id` | CRUD формы |
| GET/POST | `/statuses` | Список / Создание статуса |
| GET/PUT/DELETE | `/statuses/:id` | CRUD статуса |
| GET/POST/DELETE | `/attachments` | Вложения |

## Известные ограничения

1. Загрузка файлов (attachments) реализована на уровне API, но UI для загрузки файлов упрощён
2. Drag-and-drop для полей формы не реализован
3. Темная тема не реализована

## E2E Тестирование (Playwright)

E2E тесты проверяют полный сценарий работы пользователя с приложением.

### Расположение тестов

```
apps/web/tests/e2e/
├── fixtures.ts           # Вспомогательные функции и фикстуры
├── auth.spec.ts          # Тесты авторизации
├── applications.spec.ts  # Тесты работы с заявками
├── forms-statuses.spec.ts # Тесты форм и статусов
├── roles.spec.ts         # Тесты ролей и прав доступа
├── navigation.spec.ts    # Тесты навигации
└── workflows.spec.ts     # Полные workflow сценарии
```

### Предусловия для запуска

- Backend сервер (apps/server) должен быть запущен на `http://localhost:3000`
- БД должна содержать seed-данные
- Chromium установлен (`npx playwright install chromium`)

### Запуск тестов

```bash
# Установка Playwright (один раз)
cd apps/web
npx playwright install chromium

# Запуск всех E2E тестов
pnpm test:e2e

# Запуск с UI (интерактивный режим)
pnpm test:e2e:ui

# Запуск с видимым браузером
pnpm test:e2e:headed

# Отладка тестов
pnpm test:e2e:debug

# Просмотр отчёта
pnpm test:e2e:report
```

### Покрытие тестами

| Файл | Количество тестов | Описание |
|------|-------------------|----------|
| auth.spec.ts | 9 | Логин, регистрация, logout, защита маршрутов |
| applications.spec.ts | 7 | CRUD заявок, отправка, отзыв |
| roles.spec.ts | 11 | Проверка прав user, moderator, admin |
| forms-statuses.spec.ts | 8 | Управление формами и статусами |
| navigation.spec.ts | 7 | Навигация, 404, базовый UI |
| workflows.spec.ts | 6 | Полные сценарии от регистрации до выполнения |

#### Итого

Всего: ~48 тестов

### Настройки Playwright

Файл `playwright.config.ts` настраивает:

- Тестирование только в Chromium
- Автозапуск dev-серверов (web + server)
- Скриншоты при ошибках
- Видеозапись при повторах
- Трейсы для отладки
- Таймауты и ретраи

### Data-testid селекторы

Все тесты используют `data-testid` атрибуты:

| Селектор | Элемент |
|----------|---------|
| `login-form` | Форма входа |
| `register-form` | Форма регистрации |
| `application-form` | Форма заявки |
| `submit-btn` | Кнопка отправки формы |
| `create-btn` | Кнопка создания |
| `view-btn` | Кнопка просмотра |
| `edit-btn` | Кнопка редактирования |
| `delete-btn` | Кнопка удаления |
| `logout-btn` | Кнопка выхода |
| `confirm-btn` | Кнопка подтверждения в диалоге |
| `cancel-btn` | Кнопка отмены в диалоге |
| `submit-app-btn` | Отправка заявки на рассмотрение |
| `withdraw-btn` | Отзыв заявки |
| `item-{id}` | Элемент списка |
| `error-message` | Сообщение об ошибке |
| `loading-indicator` | Индикатор загрузки |
