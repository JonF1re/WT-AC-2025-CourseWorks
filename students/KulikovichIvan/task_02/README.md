# Учебные квизы «Проверим быстро»

## Особенности

### Для пользователя (user)

- **Интуитивный интерфейс** – красивый и понятный дизайн
- **Адаптивная верстка** – работает на любых устройствах
- **Таймер квизов** – контроль времени выполнения
- **Мгновенная проверка** – результаты сразу после завершения
- **Подробная аналитика** – прогресс и статистика в реальном времени
- **Достижения и бейджи** – система мотивации
- **Сертификаты** – награды за успешное прохождение
- **Экспорт результатов** – в форматах JSON, CSV

### Для администратора (admin)

- **Визуальный конструктор** – создание квизов без программирования
- **Банки вопросов** – библиотека переиспользуемых вопросов
- **Автоматическая проверка** – экономия времени на проверке
- **Детальная статистика** – анализ успеваемости группы
- **Таблица лидеров** – мотивация студентов
- **Разные типы вопросов** – выбор одного, множественный выбор, сопоставление

### Технические возможности

- **Real-time обновления** – WebSocket для live-статистики
- **Масштабируемость** – Docker и Kubernetes готовность
- **Безопасность** – JWT аутентификация, защита от CSRF
- **Тестирование** – полное покрытие API тестами
- **CI/CD готовность** – легкая интеграция с pipeline
- **RESTful API** – чистая архитектура, OpenAPI документация

### Архитектура

![Архитектура](/img/arch.png)

## Быстрый старт

### Предварительные требования

- Docker и Docker Compose
- Python 3.11+ (для разработки)
- Node.js 18+ (для фронтенда)

### Запуск за 5 минут

```bash
# 1. Клонировать репозиторий
git clone https://github.com/yourusername/quiz-platform.git
cd quiz-platform

# 2. Запустить всю инфраструктуру
docker-compose up -d

# 3. Проверить запущенные сервисы
docker-compose ps

# 4. Открыть приложение
# Фронтенд: http://localhost:5500
# API документация: http://localhost:8000/docs
# Админ-панель: http://localhost:5500 (логин: admin@quiz.com, пароль: admin123)
```

---

## Установка

### Docker (рекомендуется)

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: quizdb
      POSTGRES_USER: quizuser
      POSTGRES_PASSWORD: quizpass
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U quizuser"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  backend:
    build: .
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://quizuser\:quizpass@postgres:5432/quizdb
      REDIS_URL: redis://redis:6379/0
      SECRET_KEY: your-secret-key-change-in-production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    volumes:
      - ./uploads:/app/uploads

  frontend:
    build: ./frontend
    ports:
      - "5500:80"
    depends_on:
      - backend

volumes:
  postgres_data:
  redis_data:
```

### Ручная установка

```bash
# Бэкенд
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

pip install -r requirements.txt

# Настройка окружения
cp .env.example .env
# Отредактируйте .env файл

# Запуск миграций
alembic upgrade head

# Запуск сервера
uvicorn main\:app --reload --host 0.0.0.0 --port 8000

# Фронтенд (в другом терминале)
cd frontend
npm install
npm run serve
```

---

## Конфигурация

Создайте файл `.env`:

```env

# ========================
# Базовые настройки
# ========================
APP_NAME="Quiz Platform"
APP_VERSION="2.0.0"
DEBUG=False
ENVIRONMENT=production

# ========================
# База данных
# ========================
DATABASE_URL=postgresql://user\:password@localhost:5432/quizdb
# Для разработки:
# DATABASE_URL=sqlite:///./quiz.db

# ========================
# Аутентификация
# ========================
SECRET_KEY=your-super-secret-jwt-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
REFRESH_TOKEN_EXPIRE_DAYS=30

# ========================
# CORS
# ========================
ALLOWED_ORIGINS=http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000
ALLOWED_METHODS=GET,POST,PUT,PATCH,DELETE,OPTIONS
ALLOWED_HEADERS=*

# ========================
# WebSocket
# ========================
WEBSOCKET_ENABLED=True
WEBSOCKET_PING_INTERVAL=20
WEBSOCKET_PING_TIMEOUT=30

# ========================
# Экспорт
# ========================
EXPORT_MAX_ROWS=10000
EXPORT_CHUNK_SIZE=1000

# ========================
# Сертификаты
# ========================
CERTIFICATE_TEMPLATE_DIR=./certificate_templates
CERTIFICATE_EXPIRE_DAYS=365

# ========================
# Кэширование
# ========================
REDIS_URL=redis://localhost:6379/0
CACHE_TTL=300

# ========================
# Логирование
# ========================
LOG_LEVEL=INFO
LOG_FORMAT=json
LOG_FILE=logs/app.log

# ========================
# Лимиты
# ========================
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_PERIOD=60
MAX_FILE_SIZE_MB=10
```

---

## API Документация

После запуска доступны:

| Ресурс      | URL                          | Описание                     |
|-------------|-----------------------------|
| Swagger UI  | <http://localhost:8000/docs>  | Интерактивная документация  |
| ReDoc       | <http://localhost:8000/redoc> | Альтернативная документация  |
| Health Check| <http://localhost:8000/health>| Статус сервиса               |

### Основные эндпоинты

- **Аутентификация**

  ```http
  POST /register
  Content-Type: application/json

  {
    "email": "user@example.com",
    "username": "student",
    "full_name": "Иван Иванов",
    "password": "securepassword123"
  }
  ```

- **Квизы**

  ```http
  GET /quizzes
  GET /quizzes/{id}
  POST /admin/quizzes
  POST /attempts/start
  POST /attempts/{id}/submit
  ```

- **Статистика**

  ```http
  GET /users/me/stats
  GET /quizzes/{id}/stats
  GET /admin/stats
  ```

- **Достижения**

  ```http
  GET /achievements/my
  GET /achievements/available
  GET /achievements/leaderboard

  ```

- **Экспорт**

  ```http
  GET /export/results?format=json
  GET /export/results?format=csv
  ```

---

## Пример использования

Создание квиза через API:

```python

import requests

# 1. Аутентификация
response = requests.post("http://localhost:8000/login", json={
    "email": "teacher@university.edu",
    "password": "teacher123"
})
token = response.json()["access_token"]

headers = {"Authorization": f"Bearer {token}"}

# 2. Создание квиза
quiz_data = {
    "title": "Основы Python",
    "description": "Введение в программирование на Python",
    "time_limit_minutes": 30,
    "questions": [
        {
            "text": "Что выведет print(type(5))?",
            "explanation": "type() возвращает тип объекта",
            "points": 2,
            "options": [
                {"text": "<class 'int'>", "is_correct": True},
                {"text": "<class 'str'>", "is_correct": False},
                {"text": "<class 'float'>", "is_correct": False}
            ]
        }
    ]
}

response = requests.post(
    "http://localhost:8000/admin/quizzes",
    json=quiz_data,
    headers=headers
)
print(f"Квиз создан: {response.json()['id']}")
```

---

## 🧪 Тестирование

```bash
# Установка тестовых зависимостей
pip install -r requirements-test.txt

# Запуск всех тестов
pytest -v

# Запуск с покрытием кода
pytest --cov=app --cov-report=html

# Тесты API
pytest tests/test_api.py -v

# Тесты аутентификации
pytest tests/test_auth.py -v

# Тесты производительности
locust -f tests/load_test.py
```

---

## 🐳 Docker и Kubernetes

### Сборка Docker образа

```bash
# Бэкенд
docker build -t quiz-platform-backend\:latest .

# Фронтенд
docker build -t quiz-platform-frontend\:latest -f frontend/Dockerfile .
```

### Запуск в Kubernetes

```bash
kubectl apply -f k8s/
```

### Kubernetes манифесты

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: quiz-platform
  labels:
    app: quiz-platform
spec:
  replicas: 3
  selector:
    matchLabels:
      app: quiz-platform
  template:
    metadata:
      labels:
        app: quiz-platform
    spec:
      containers:
      - name: backend
        image: quiz-platform-backend\:latest
        ports:
        - containerPort: 8000
        envFrom:
        - configMapRef:
            name: quiz-platform-config
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
```

---

## Мониторинг

### Prometheus метрики

```bash
# Эндпоинт метрик
GET /metrics

```

Пример метрик:

quiz_requests_total{method="POST",endpoint="/login",status="200"} 42
quiz_quiz_completions_total{quiz_id="1"} 150
quiz_average_score{quiz_id="1"} 78.5
quiz_active_users 25

### Логирование

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "INFO",
  "service": "quiz-platform",
  "module": "api.quizzes",
  "message": "Quiz completed",
  "user_id": 42,
  "quiz_id": 1,
  "score": 85,
  "duration_seconds": 245,
  "request_id": "abc-123-def-456"
}
```
