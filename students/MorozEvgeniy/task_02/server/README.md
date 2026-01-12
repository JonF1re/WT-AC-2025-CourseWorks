# 🍝 Recipes API — Server (Backend)

> **Вариант 18** — Backend-часть full-stack приложения  
> «Рецепты: *Что приготовить?*»

REST API для управления рецептами, ингредиентами, планом питания и списком покупок.  
Реализована аутентификация на JWT, роли пользователей, валидация данных и интеграционные тесты.

---

## 🛠 Стек технологий

- Node.js 18
- TypeScript
- Express 5
- PostgreSQL
- Prisma ORM
- JWT (jsonwebtoken)
- Zod — валидация данных
- Vitest + Supertest — интеграционные тесты
- Docker

---

## 📦 Установка и запуск

### 1️⃣ Установка зависимостей

```bash
pnpm install
```

---

### 2️⃣ Переменные окружения

Файл `.env.example`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/recipes

# Auth
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=development
```

---

### 3️⃣ Инициализация базы данных

```bash
pnpm prisma migrate dev
pnpm prisma generate
pnpm prisma db seed
```

---

### 4️⃣ Запуск сервера

```bash
pnpm dev
```

Сервер будет доступен по адресу:  
👉 <http://localhost:3000>

Проверка:

```http
GET /
```

```json
{
  "status": "ok",
  "message": "API is running"
}
```

---

## 🔐 Аутентификация

- Используется JWT
- Токен передаётся в заголовке:

```http
Authorization: Bearer <access_token>
```

- Защищённые роуты используют middleware `auth`

---

## 📚 Основные API-маршруты

### 🔑 Auth

| Метод | URL | Описание |
|------|-----|----------|
| POST | /auth/register | Регистрация |
| POST | /auth/login | Логин |

### 👤 Users

| Метод | URL | Описание |
|------|-----|----------|
| GET | /users/me | Текущий пользователь |

### 🍽 Recipes

| Метод | URL | Описание |
|------|-----|----------|
| GET | /recipes | Список рецептов |
| POST | /recipes | Создание рецепта |
| GET | /recipes/:id | Детали рецепта |
| PUT | /recipes/:id | Редактирование |
| DELETE | /recipes/:id | Удаление |

### 📅 Meal Plan

| Метод | URL | Описание |
|------|-----|----------|
| GET | /mealplan?date=YYYY-MM-DD | План на дату |
| POST | /mealplan | Добавить рецепт |
| DELETE | /mealplan/:id | Удалить |

### 🛒 Shopping List

| Метод | URL | Описание |
|------|-----|----------|
| GET | /shopping | Список покупок |
| POST | /shopping | Добавить товар |
| PUT | /shopping/:id | Отметить купленным |
| DELETE | /shopping/:id | Удалить |

---

## 🗂 Модель данных (Prisma)

Основные сущности:

- User
- Recipe
- Ingredient
- Tag
- MealPlan
- ShoppingItem

Связи:

- Пользователь создаёт рецепты
- Рецепты состоят из ингредиентов
- План питания ссылается на рецепты
- Список покупок агрегируется по ингредиентам

---

## 🧪 Тестирование

```bash
pnpm test
```

Реализованы интеграционные тесты для MealPlan:

- добавление рецепта
- получение плана по дате
- проверка JWT-авторизации

---

## 🐳 Docker

### Сборка образа

```bash
docker build -t recipes-server .
```

### Запуск контейнера

```bash
docker run -p 3000:3000 --env-file .env recipes-server
```

---

## ✅ Реализовано (MVP)

- JWT-аутентификация
- Роли пользователей (admin / user)
- CRUD рецептов
- Планирование питания
- Список покупок
- Валидация данных
- Prisma + миграции
- Интеграционные тесты
- Docker-сборка
