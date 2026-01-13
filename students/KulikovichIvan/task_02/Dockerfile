# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Устанавливаем системные зависимости
# hadolint ignore=DL3008,DL3015
RUN apt-get update && apt-get install -y curl=7.88.1-10+deb12u7 gcc=4:12.2.0-3 --no-install-recommends \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Копируем requirements и устанавливаем зависимости
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируем исходный код
COPY . .

# Создаем пользователя для безопасности
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Экспонируем порт
EXPOSE 8000

# Команда запуска
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]