# Курсовой проект «Веб-Технологии» — Вариант 40

**Заявки «Да, я в деле»** — система для приёма и обработки заявок через настраиваемые формы с трекингом статусов и ролями пользователей.

## Описание проекта

Full-stack приложение для управления заявками:

- Пользователи заполняют заявки по шаблонным формам
- Модераторы и администраторы управляют статусами заявок
- Администраторы создают формы и статусы
- JWT аутентификация (access + refresh tokens с ротацией)
- Роли: admin, moderator, user

## Стек технологий

**Frontend:**

- React 18 + TypeScript
- Vite
- React Router v7
- React Hook Form + Zod
- CSS modules

**Backend:**

- Node.js 20+
- Express + TypeScript
- PostgreSQL + Prisma ORM
- JWT (jsonwebtoken)
- Pino (структурированные логи)

## Требования

- Node.js 20 или выше
- pnpm 8.15+ (установить: `npm install -g pnpm`)
- PostgreSQL 14+ (запущен и доступен)

## Быстрый старт

### 1. Установка зависимостей

```bash
pnpm install
```

### 2. Настройка backend

Создайте файл `apps/server/.env` (пример ниже):

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/coursework_db?schema=public"

# JWT Secrets (генерируйте случайные строки для production!)
JWT_ACCESS_SECRET="dev_access_secret_change_in_prod"
JWT_REFRESH_SECRET="dev_refresh_secret_change_in_prod"

# JWT TTL (время жизни токенов)
JWT_ACCESS_TTL="15m"
JWT_REFRESH_TTL="7d"

# CORS
CORS_ORIGIN="http://localhost:5173"

# Server
SERVER_PORT=3000
NODE_ENV=development
```

### 3. Инициализация базы данных

```bash
# Генерация Prisma клиента
pnpm --filter @app/server prisma:generate

# Применение миграций
pnpm --filter @app/server prisma:migrate

# Заполнение тестовыми данными (опционально)
pnpm --filter @app/server prisma:seed
```

### 4. Настройка frontend

Создайте файл `apps/web/.env`:

```env
VITE_API_BASE_URL=http://localhost:3000
```

### 5. Запуск приложения

**Запустить всё одной командой:**

```bash
pnpm dev
```

Это запустит:

- Backend: <http://localhost:3000>
- Frontend: <http://localhost:5173>

**Или запускать раздельно (в разных терминалах):**

```bash
# Terminal 1 - Backend
pnpm dev:server

# Terminal 2 - Frontend
pnpm dev:web
```

## Проверка работоспособности

### 1. Регистрация

Откройте <http://localhost:5173> → кликните «Регистрация»:

- Email: `test@example.com`
- Имя: `testuser`
- Пароль: `Test123!`

### 2. Вход

После регистрации произойдёт автоматический вход. При повторном заходе используйте созданные учётные данные.

### 3. Основной сценарий

**Для обычного пользователя:**

1. Перейдите в раздел «Заявки»
2. Нажмите «Новая заявка»
3. Выберите форму и заполните поля
4. Сохраните черновик или отправьте на рассмотрение
5. Просмотрите статус заявки

**Для администратора (используйте seed-данные):**

1. Войдите как `admin@example.com` / `admin123!`
2. Создайте новую форму в разделе «Формы»
3. Настройте статусы в разделе «Статусы»
4. Просмотрите все заявки и измените их статусы

### 4. Проверка JWT refresh

Access token истекает через 15 минут (по умолчанию). При любом защищённом запросе после истечения:

- Frontend автоматически вызовет `POST /auth/refresh` с HttpOnly cookie

## Тестирование

### Unit и Integration тесты (Backend)

Сервер покрыт unit и integration тестами с использованием Vitest:

```bash
# Запустить все тесты backend
pnpm --filter @app/server test

# Запустить тесты в watch-режиме
pnpm --filter @app/server test:watch

# Запустить тесты с coverage
pnpm --filter @app/server test:coverage
```

**Покрытие:**

- Unit-тесты для утилит (hash, jwt, pagination)
- Unit-тесты для middleware (auth, authorize, errorHandler)
- Integration-тесты для API эндпоинтов (auth, applications, forms, statuses)

### E2E тесты (Frontend + Backend)

Приложение покрыто E2E тестами с использованием Playwright:

```bash
# Перед запуском убедитесь, что backend и frontend запущены:
# Terminal 1: pnpm dev:server
# Terminal 2: pnpm dev:web

# Запустить E2E тесты
pnpm --filter @app/web test:e2e

# Запустить в UI-режиме
pnpm --filter @app/web test:e2e:ui

# Запустить в debug-режиме
pnpm --filter @app/web test:e2e:debug
```

**Покрытие (57 тестов):**

- Аутентификация (регистрация, вход, выход, валидация)
- Роли и права доступа (user, moderator, admin)
- CRUD операции (заявки, формы, статусы)
- Навигация и защищённые маршруты
- Полные пользовательские сценарии (workflows)

**Важно:** E2E тесты требуют, чтобы база данных была заполнена seed-данными:

```bash
pnpm --filter @app/server prisma:seed
```

- Получит новый access token
- Повторит исходный запрос
- Пользователь не заметит разрыва сессии

### 5. Выход

Кликните кнопку выхода в шапке:

- Refresh token отзывается на сервере
- HttpOnly cookie очищается
- Дальнейшие попытки refresh вернут 401

## Структура проекта

```
task_02/
├── apps/
│   ├── server/          # Backend (Express + Prisma)
│   │   ├── src/         # Исходники TypeScript
│   │   ├── prisma/      # Схема БД, миграции, seed
│   │   └── README.md    # Подробная документация backend
│   └── web/             # Frontend (React + Vite)
│       ├── src/         # Компоненты, страницы, API клиент
│       └── README.md    # Подробная документация frontend
├── packages/            # Общие пакеты (utils, ui)
├── final_acceptance_report.md # Итоговый отчёт приёмки
├── task_01/             # Требования и спецификации
├── package.json         # Корневой package.json с общими скриптами
└── pnpm-workspace.yaml  # Конфигурация монорепозитория
```

## Тестовые пользователи (seed-данные)

После выполнения `prisma:seed` доступны следующие аккаунты:

| Email                    | Пароль       | Роль      |
|--------------------------|--------------|-----------|
| <admin@example.com>        | admin123!    | admin     |
| <moderator@example.com>    | moderator123!| moderator |
| <user@example.com>         | user123!     | user      |
| <demo@example.com>         | demo123!     | user      |
| <analytics@example.com>    | student123!  | user      |
| <content@example.com>      | author123!   | user      |

## Health checks

- **Backend health:** <http://localhost:3000/health>
- **Backend readiness:** <http://localhost:3000/ready> (проверяет подключение к БД)

## Docker

Приложение полностью контейнеризировано и готово к деплою.

### Что нужно

- Docker 24+
- Docker Compose 2.20+

### Быстрый старт (Production)

```bash
# 1. Собрать образы
pnpm docker:build

# 2. Запустить стек
pnpm docker:up

# 3. Открыть в браузере
# Frontend: http://localhost
# Backend:  http://localhost:3000
```

Для остановки:

```bash
pnpm docker:down
```

### Все команды Docker

```bash
# Production режим
pnpm docker:build      # Собрать все образы
pnpm docker:up         # Запустить все сервисы в фоне
pnpm docker:down       # Остановить и удалить контейнеры
pnpm docker:logs       # Просмотр логов всех сервисов

# Development режим (с hot reload)
pnpm docker:dev        # Запустить dev-окружение
pnpm docker:dev:down   # Остановить dev-окружение

# Альтернативные команды (без pnpm)
docker compose build           # Собрать образы
docker compose up -d           # Запустить в фоне
docker compose ps              # Статус контейнеров
docker compose logs -f server  # Логи конкретного сервиса
docker compose down            # Остановить стек
```

### Доступные URL после запуска

**Production режим (`pnpm docker:up`):**

- **Frontend:** <http://localhost> (порт 80)
- **Backend:** <http://localhost:3000>
- **Health check:** <http://localhost:3000/health>

Если при переходе на <http://localhost> видите `404 Not Found nginx`, чаще всего порт `80` занят (например, Docker Desktop Kubernetes ingress). В этом случае запустите web на другом порту:

```bash
# PowerShell
$env:WEB_PORT=8080; pnpm docker:up

# cmd
set WEB_PORT=8080
pnpm docker:up
```

И откройте <http://localhost:8080>.

**Development режим (`pnpm docker:dev`):**

- **Frontend:** <http://localhost:5173> (с hot reload)
- **Backend:** <http://localhost:3000>
- **PostgreSQL:** localhost:5432 (доступна для локальных инструментов)
- **Redis:** localhost:6379

### Переменные окружения для Docker

По проектным правилам **не используем корневой `.env`**. Docker Compose уже содержит безопасные дефолты (через `${VAR:-default}`), а при необходимости значения можно передать через переменные окружения системы.

Примеры (PowerShell):

```powershell
$env:POSTGRES_USER="app_user"
$env:POSTGRES_PASSWORD="app_password"
$env:POSTGRES_DB="app_db"
$env:JWT_ACCESS_SECRET="change-me-in-production"
$env:JWT_REFRESH_SECRET="change-me-in-production"
$env:VITE_API_BASE_URL="http://localhost:3000"
$env:WEB_PORT="80"
pnpm docker:up
```

### Запуск в Docker (development mode)

Development версия с hot reload и volume mounts:

```bash
# Запустить dev-окружение
pnpm docker:dev

# Остановить
pnpm docker:dev:down
```

В dev-режиме:

- **Frontend:** <http://localhost:5173>
- **Backend:** <http://localhost:3000>
- **PostgreSQL:** localhost:5432 (доступен для локальных инструментов)
- **Redis:** localhost:6379
- Hot reload для изменений в исходном коде
- Node.js debugger на порту 9229

### Структура Docker

- **Server Dockerfile** ([apps/server/Dockerfile](apps/server/Dockerfile)): multi-stage build с pnpm и Prisma
- **Web Dockerfile** ([apps/web/Dockerfile](apps/web/Dockerfile)): multi-stage build + nginx
- **nginx.conf** ([apps/web/nginx.conf](apps/web/nginx.conf)): SPA fallback, gzip, security headers
- **docker-compose.yml**: production-like конфигурация
- **docker-compose.dev.yml**: development конфигурация
- **.dockerignore**: исключает ненужные файлы из образов

### Сервисы Docker Compose

- **postgres**: PostgreSQL 16 с persistent volume
- **redis**: Redis 7 для кэширования (готов к использованию)
- **server**: Backend API с health checks
- **web**: Frontend nginx с оптимизированными статическими файлами

### Проверка Docker deployment

```bash
# Проверить работу backend
curl http://localhost:3000/health

# Проверить readiness (БД + Redis)
curl http://localhost:3000/ready

# Проверить frontend
curl http://localhost

# Посмотреть логи конкретного сервиса
docker compose logs -f server
docker compose logs -f web
docker compose logs -f postgres

# Проверить статус контейнеров
docker compose ps
```

### Troubleshooting Docker

**Образы слишком большие:**

- Используются multi-stage builds для минимизации размера
- Production образы не содержат dev dependencies
- Проверьте размер: `docker images | grep app`

**Ошибки при сборке:**

```bash
# Очистить кэш Docker
docker builder prune -a

# Пересобрать без кэша
docker compose build --no-cache
```

**Контейнер server не стартует:**

- Проверьте логи: `docker compose logs server`
- Убедитесь, что PostgreSQL готов к приёму подключений (healthcheck)
- Проверьте DATABASE_URL в переменных окружения

**База данных пустая после запуска:**

```bash
# Выполнить миграции внутри контейнера
docker compose exec server pnpm prisma migrate deploy

# Заполнить тестовыми данными
docker compose exec server pnpm prisma db seed
```

## Дополнительные команды

```bash
# Сборка production
pnpm build

# Открыть Prisma Studio (GUI для БД)
pnpm --filter @app/server prisma:studio
```

## Kubernetes Deployment

- Требования: kubectl с поддержкой `-k`, доступ к кластеру (minikube/kind/облако), nginx ingress controller, образы `server` и `web` в доступном registry.
- Структура: base манифесты в [k8s/base](k8s/base) (namespace, Deployments, Services, ConfigMap/Secret, PVC, Ingress, HPA) и оверлеи [k8s/overlays/dev](k8s/overlays/dev), [k8s/overlays/prod](k8s/overlays/prod).
- Применение:
  - Dev: `pnpm k8s:apply:dev` (namespace app-dev), статус `pnpm k8s:status:dev`, удаление `pnpm k8s:delete:dev`.
  - Prod: `pnpm k8s:apply:prod` (namespace app-prod), статус `pnpm k8s:status:prod`, удаление `pnpm k8s:delete:prod`.
- Ingress: базовый хост app.local, правила `/api` → backend (реврайт до корня), `/` → frontend. Обновите хосты в патчах [dev](k8s/overlays/dev/patches/ingress-host.yaml) и [prod](k8s/overlays/prod/patches/ingress-host.yaml); при необходимости включите TLS блок в [k8s/base/ingress.yaml](k8s/base/ingress.yaml).
- Секреты: базовые [k8s/base/server/secret.yaml](k8s/base/server/secret.yaml) и [k8s/base/postgres/secret.yaml](k8s/base/postgres/secret.yaml) содержат заглушки. Для prod создайте `k8s/overlays/prod/secrets.yaml` по шаблону [k8s/overlays/prod/secrets.example.yaml](k8s/overlays/prod/secrets.example.yaml) или используйте SealedSecrets/ExternalSecrets (`secrets.yaml` уже в .gitignore).
- Хранилище: PVC для Postgres [k8s/base/postgres/pvc.yaml](k8s/base/postgres/pvc.yaml) и Redis [k8s/base/redis/pvc.yaml](k8s/base/redis/pvc.yaml) подключаются в соответствующих Deployments.
- Масштабирование и ресурсы: HPA для backend в [k8s/base/server/hpa.yaml](k8s/base/server/hpa.yaml); ручное — `kubectl scale deployment/server --replicas=N -n <ns>`. Патчи ресурсов лежат в [k8s/overlays/dev/patches](k8s/overlays/dev/patches) и [k8s/overlays/prod/patches](k8s/overlays/prod/patches).
- Troubleshooting: `kubectl describe pod <name> -n <ns>`, `kubectl logs -f deployment/server -n <ns>`, `kubectl get ingress -n <ns>`, проверяйте события и readiness/liveness probes (`/health`, `/ready`).

## CI/CD

![CI](https://github.com/brstu/WT-AC-2025-CourseWorks/actions/workflows/ci.yml/badge.svg)

Пайплайн GitHub Actions в [.github/workflows/ci.yml](.github/workflows/ci.yml) выполняет полный цикл: lint → unit → integration → e2e → сборка и пуш Docker-образов в GHCR (для пушей в main). Конфигурация использует кэширование pnpm и Docker Buildx (GHA cache) для ускорения.

- Триггеры: push в main и develop, pull request в main; сборка образов выполняется только на push в main.
- Стадии: lint (tsc lint/typecheck для backend и frontend), unit (Vitest), integration (PostgreSQL + Redis сервисы, Prisma migrate), e2e (Playwright с seed и wait-on), build (Buildx, метаданные тэгов sha/branch, web build с `VITE_API_BASE_URL`).
- Секреты/переменные: `GITHUB_TOKEN` (по умолчанию), `CODECOV_TOKEN` (опционально для покрытия), `VITE_API_BASE_URL` как Actions variable для фронтенд-билда.
- Артефакты: отчёт Playwright загружается при падении e2e; cobertura lcov отправляется в Codecov (fail_ci_if_error=false).
- Registry: образы пушатся в `ghcr.io/${repo}-server` и `ghcr.io/${repo}-web` с тэгами `sha` и `branch`.
- Обновление зависимостей: Dependabot настроен в [.github/dependabot.yml](.github/dependabot.yml) (npm, docker, github-actions, weekly).

## Реализованные бонусы

MVP реализован. Дополнительно реализовано:

- Документация API (OpenAPI + Swagger UI)
- Тестирование (Vitest + Playwright)
- Контейнеризация (Docker + Docker Compose)
- Kubernetes манифесты
- CI/CD пайплайн (GitHub Actions)
- Наблюдаемость (Prometheus, Redis кэш)

Подробности реализации в документации каждого приложения:

- [Backend README](apps/server/README.md)
- [Frontend README](apps/web/README.md)

## Troubleshooting

**Ошибка подключения к БД:**

- Проверьте, что PostgreSQL запущен
- Убедитесь, что `DATABASE_URL` корректен в `apps/server/.env`

**CORS ошибки:**

- Убедитесь, что `CORS_ORIGIN` в `apps/server/.env` включает `http://localhost:5173`

**Access token истекает слишком быстро (для отладки refresh):**

- Установите `JWT_ACCESS_TTL=1m` в `apps/server/.env` для тестирования автоматического обновления

**Проблемы с pnpm:**

- Если используете PowerShell и возникают ошибки политики выполнения, используйте `pnpm.cmd` вместо `pnpm`
