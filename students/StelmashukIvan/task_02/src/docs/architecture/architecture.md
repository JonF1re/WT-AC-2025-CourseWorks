# Архитектура проекта

## Обзор

Full-stack приложение для мониторинга показаний устройств умного дома.

**Вариант:** 38 — Датчики «Умный дом lite» 🏠

---

## Технологический стек

### Frontend (apps/web/)

- **Framework:** React 18 + TypeScript
- **Routing:** React Router v6
- **Styling:** CSS

### Backend (apps/server/)

- **Runtime:** Node.js 18+
- **Framework:** Express.js + TypeScript
- **ORM:** Prisma
- **Database:** PostgreSQL 14
- **Cache:** Redis 7
- **Auth:** JWT (jsonwebtoken)
- **Security:** Helmet, CORS
- **Metrics:** prom-client (Prometheus)

### DevOps

- **Containerization:** Docker, Docker Compose
- **Orchestration:** Kubernetes (Minikube/Cloud)
- **CI/CD:** GitHub Actions
- **Testing:** Jest, Playwright

---

## Архитектура приложения

```text
┌─────────────────────────────────────────────────────────────┐
│                         Client (Browser)                    │
│                    React SPA (Port 80)                      │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP/REST
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend API (Port 3000)                  │
│                      Express.js + JWT                       │
├─────────────────────────────────────────────────────────────┤
│  Middleware: auth, validation, logging, metrics             │
└───────┬──────────────────────┬──────────────────────────────┘
        │                      │
        ▼                      ▼
┌──────────────┐      ┌──────────────┐
│  PostgreSQL  │      │    Redis     │
│   (Port 5432)│      │  (Port 6379) │
│              │      │              │
│  - Users     │      │  - Cache     │
│  - Metrics   │      │  - Sessions  │
│  - Devices   │      │              │
│  - Alerts    │      │              │
└──────────────┘      └──────────────┘
```

---

## Структура данных (Database Schema)

### User

```prisma
model User {
  id            String   @id @default(uuid()) @db.Uuid
  username      String   @unique
  password_hash String
  role          String   // enum: admin, user
  devices       Device[]
  tickets       Ticket[]

  @@map("users")
}
```

### Device

```prisma
model Device {
  id          String   @id @default(uuid()) @db.Uuid
  name        String
  description String?
  location    String?
  type        String?
  owner_id    String   @db.Uuid
  owner       User     @relation(fields: [owner_id], references: [id], onDelete: Cascade)
  metrics     Metric[]
  tickets     Ticket[]

  @@map("devices")
}
```

### Metric

```prisma
model Metric {
  id        String      @id @default(uuid()) @db.Uuid
  device_id String      @db.Uuid
  device    Device      @relation(fields: [device_id], references: [id], onDelete: Cascade)
  name      String
  unit      String
  readings  Reading[]
  alerts    Alert[]
  alertRules AlertRule[]

  @@map("metrics")
}
```

### Reading

```prisma
model Reading {
  id         String   @id @default(uuid()) @db.Uuid
  metric_id  String   @db.Uuid
  metric     Metric   @relation(fields: [metric_id], references: [id], onDelete: Cascade)
  timestamp  DateTime @db.Timestamp(6)
  value      Float
  alerts     Alert[]

  @@map("readings")
}
```

### Alert

```prisma
model Alert {
  id         String   @id @default(uuid()) @db.Uuid
  metric_id  String   @db.Uuid
  metric     Metric   @relation(fields: [metric_id], references: [id], onDelete: Cascade)
  reading_id String?  @db.Uuid
  reading    Reading? @relation(fields: [reading_id], references: [id])
  level      String   // enum: info, warning, critical
  status     String   // enum: new, acknowledged, closed
  threshold  Float?
  message    String
  created_at DateTime @default(now()) @db.Timestamp(6)

  @@map("alerts")
}
```

### Ticket

```prisma
model Ticket {
  id            String  @id @default(uuid()) @db.Uuid
  type          String  // enum: add, edit, delete
  status        String
  object        String? // enum: user, device, metric
  comment       String? @db.Text
  requester_id  String  @db.Uuid
  requester     User    @relation(fields: [requester_id], references: [id])
  device_id     String? @db.Uuid
  device        Device? @relation(fields: [device_id], references: [id])

  @@map("tickets")
}
```

### AlertRule

```prisma
model AlertRule {
  id                String  @id @default(uuid()) @db.Uuid
  metric_id         String  @db.Uuid
  metric            Metric  @relation(fields: [metric_id], references: [id], onDelete: Cascade)
  condition         String  // e.g., ">", "<", "=="
  threshold         Float
  level             String  // info, warning, critical
  message_template  String

  @@map("alert_rules")
}
```

---

## API Endpoints

### Authentication

- POST /auth/register – Регистрация пользователя
- POST /auth/login – Вход по логину и паролю

### Users

- GET /users – Список пользователей (admin only, с фильтрацией и пагинацией)
- POST /users – Создать пользователя (admin only)
- GET /users/:id – Получить данные пользователя
- PUT /users/:id – Обновить пользователя (admin или владелец)
- DELETE /users/:id – Удалить пользователя (admin only)
- POST /users/create-user – Создать пользователя с ролью `user` (admin only)

### Devices

- GET /devices – Список устройств (с пагинацией и фильтрацией)
- POST /devices – Создать устройство (auth, проверка владельца/admin)
- GET /devices/:id – Получить устройство с метриками
- PUT /devices/:id – Обновить устройство (auth + ownership/admin)
- DELETE /devices/:id – Удалить устройство (auth + ownership/admin)

### Metrics

- GET /metrics – Список метрик (с пагинацией, фильтрацией, include device)
- POST /metrics – Создать метрику (auth + ownership/admin)
- GET /metrics/:id – Получить метрику (include device)
- PUT /metrics/:id – Обновить метрику (auth + ownership/admin)
- DELETE /metrics/:id – Удалить метрику (auth + ownership/admin)
- POST /readings – Добавить показания (auth, проверка доступа)
- GET /metrics/:id/readings – Получить показания метрики (с фильтрацией, кеширование)

### Alerts

- GET /alerts – Список алертов (с пагинацией, фильтрацией, кеширование)
- POST /alerts – Создать алерт (admin only)
- POST /alerts/:id/close – Закрыть алерт (auth + ownership/admin)
- POST /alerts/:id/ack – Подтвердить алерт (auth + ownership/admin)

#### Alert Rules

- GET /alerts/rules – Список правил алертов (с пагинацией, кеширование)
- POST /alerts/rules – Создать правило (admin only)
- GET /alerts/rules/:id – Получить правило
- PUT /alerts/rules/:id – Обновить правило (admin only)
- DELETE /alerts/rules/:id – Удалить правило (admin only)

### Tickets

- GET /tickets – Список тикетов (с пагинацией, кеширование)
- POST /tickets – Создать тикет (auth)
- GET /tickets/:id – Получить тикет
- PUT /tickets/:id – Обновить тикет (admin only)
- DELETE /tickets/:id – Удалить тикет (admin only)

### Dashboards

- GET /dashboards/home/:homeId/metrics-summary – Сводка по метрикам и алертам для дома

### System

- GET /system/logs – Логи системы (admin only, с пагинацией)
- GET /health – Проверка состояния сервераЫ

---

## Авторизация и безопасность

### JWT Authentication

- **Header:** `Authorization: Bearer <token>`
- **Payload:** `{ id: number, role: string }`

### Роли

- **user:** Может просматривать устройства, метрики, алерты (свои), подтверждать просмотр алертов
- **admin:** Полный доступ + управление пользователями

### Middleware Chain

```text
Request → CORS → Helmet → JSON Parser → Auth Middleware → Route Handler
```

---

## Observability

### Метрики (Prometheus)

- `http_requests_total` - Счетчик HTTP запросов
- `http_request_duration_ms` - Длительность HTTP запросов в миллисекундах
- `websocket_connections_total` - Текущее количество активных WebSocket соединений
- `alerts_active` - Текущее количество активных алертов (с меткой уровня)
- **Endpoint:** GET /metrics

---

## Deployment

### Docker Compose (Local)

```yaml
services:
  - postgres
  - redis
  - grafana
  - promteus
  - backend (apps/server)
  - frontend (apps/web)
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

1. **lint-and-test** – Линтинг и unit/integration тесты (Backend + Frontend), запуск E2E тестов (Playwright)
2. **build-and-push** – Сборка и публикация Docker образов (Server и Web) в GitHub Container Registry

---

## Файловая структура

```text
root/
├── apps/
│   ├── server/              # Backend (Express + Prisma)
│   │   ├── src/
│   │   ├── tests/      
│   │   ├── prisma/      
│   │   ├── Dockerfile
│   │   └── package.json
│   └── web/                 # Frontend (React)
│       ├── src/
│       ├── e2e/
│       ├── Dockerfile
│       └── package.json
├── docs/                    # Документация
├── k8s/                     # Kubernetes манифесты
│   └── base/                
├── .github/workflows/       # CI/CD конфигурация
├── docker-compose.yaml      # Локальная разработка
└── README.md                # Главный README
```

---

## Принятые архитектурные решения

### 1. TypeScript везде

**Почему:** Типобезопасность, лучший DX, меньше ошибок

### 2. Prisma ORM

**Почему:** Type-safe запросы, автогенерация типов, миграции

### 3. Redis для кэша

**Почему:** Снижение нагрузки на БД, быстрый доступ к часто запрашиваемым данным

### 4. JWT для аутентификации

**Почему:** Stateless, масштабируемость, стандартный подход для REST API

### 5. Prometheus метрики

**Почему:** Стандарт для мониторинга в K8s, легкая интеграция

### 6. Docker + Kubernetes

**Почему:** Портируемость, масштабируемость, industry standard

---
