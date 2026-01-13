# Kubernetes Deployment Testing Guide

## Цель тестирования

Проверить, что все Kubernetes манифесты корректны и приложение успешно деплоится в локальный кластер.

## Предварительные требования

1. **Установлен kubectl** (версия 1.27+)
2. **Запущен локальный кластер** (minikube / kind / Docker Desktop с K8s)
3. **Установлен nginx-ingress контроллер**
4. **Собраны Docker образы**: `task_02-server:latest` и `task_02-web:latest`
5. **Настроен hosts файл** с записью `127.0.0.1 app-dev.local` (или IP minikube)

## Проверка готовности окружения

```powershell
# 1. Kubectl установлен и работает
kubectl version --client

# 2. Кластер доступен
kubectl cluster-info

# 3. Nginx-ingress запущен
kubectl get pods -n ingress-nginx

# 4. Образы собраны
docker images | Select-String "task_02"

# Ожидаемый результат:
# task_02-server   latest
# task_02-web      latest
```

## Шаги тестирования

### 1. Загрузка образов в кластер (если minikube/kind)

```powershell
# Для minikube:
minikube image load task_02-server:latest
minikube image load task_02-web:latest

# Для kind:
kind load docker-image task_02-server:latest --name coursework
kind load docker-image task_02-web:latest --name coursework

# Для Docker Desktop: пропустить этот шаг
```

### 2. Валидация манифестов

```powershell
# Проверка синтаксиса без применения
kubectl apply -k k8s/overlays/dev --dry-run=client

# Ожидаемый результат: список ресурсов без ошибок
```

**Возможные ошибки на этом этапе:**

- `error: unable to recognize` → синтаксическая ошибка в YAML
- `error: no matches for kind` → проблема с apiVersion

### 3. Деплой в dev окружение

```powershell
# Применить манифесты
pnpm k8s:apply:dev

# ИЛИ напрямую:
kubectl apply -k k8s/overlays/dev

# Ожидаемый результат:
# namespace/app-dev created
# configmap/server-config created
# secret/server-secrets created
# deployment.apps/server created
# ...
```

### 4. Мониторинг запуска подов

```powershell
# Смотреть статус подов в реальном времени
kubectl get pods -n app-dev --watch

# Ожидаемый результат (через 30-60 секунд):
# NAME                        READY   STATUS    RESTARTS   AGE
# postgres-xxxxx              1/1     Running   0          45s
# redis-xxxxx                 1/1     Running   0          45s
# server-xxxxx                1/1     Running   0          40s
# web-xxxxx                   1/1     Running   0          40s

# (нажмите Ctrl+C для выхода)
```

**Возможные проблемы:**

- `ImagePullBackOff` → образы не загружены в кластер (вернитесь к шагу 1)
- `CrashLoopBackOff` → под запускается и падает (смотрите логи)
- `Pending` долго → проблемы с PVC или ресурсами

### 5. Проверка логов

```powershell
# Логи postgres (должен быть готов к приёму подключений)
kubectl logs deployment/postgres -n app-dev | Select-String -Pattern "ready"

# Ожидаемый результат: "database system is ready to accept connections"

# Логи server (должен запуститься без ошибок)
kubectl logs deployment/server -n app-dev

# Ожидаемый результат: "Server listening on port 3000" (или аналогичное)
```

**Типичные ошибки в логах server:**

- `Error: connect ECONNREFUSED postgres:5432` → postgres ещё не готов (подождать)
- `Error: getaddrinfo ENOTFOUND postgres` → проблема с Service или DNS
- `JWT_ACCESS_SECRET is required` → проблема с Secret

### 6. Проверка сервисов

```powershell
# Список всех сервисов
kubectl get svc -n app-dev

# Ожидаемый результат:
# NAME       TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)
# postgres   ClusterIP   10.x.x.x        <none>        5432/TCP
# redis      ClusterIP   10.x.x.x        <none>        6379/TCP
# server     ClusterIP   10.x.x.x        <none>        3000/TCP
# web        ClusterIP   10.x.x.x        <none>        80/TCP
```

### 7. Проверка health endpoints через port-forward

```powershell
# Пробросить порт server (оставить запущенным)
kubectl port-forward -n app-dev svc/server 3000:3000

# В другом терминале:
curl http://localhost:3000/health

# Ожидаемый результат:
# {"status":"ok","timestamp":"2026-01-08T..."}

curl http://localhost:3000/ready

# Ожидаемый результат:
# {"status":"ready","checks":{"database":"ok"}}
```

### 8. Проверка Ingress

```powershell
# Статус ingress
kubectl get ingress -n app-dev

# Ожидаемый результат:
# NAME          CLASS   HOSTS           ADDRESS       PORTS   AGE
# app-ingress   nginx   app-dev.local   192.168.x.x   80      2m

# Детали ingress
kubectl describe ingress app-ingress -n app-dev

# Проверить, что Rules настроены:
# - Host: app-dev.local
# - Path: /api → server:3000
# - Path: / → web:80
```

### 9. Проверка через браузер/curl

```powershell
# Backend health через ingress
curl http://app-dev.local/api/health

# Ожидаемый результат:
# {"status":"ok","timestamp":"2026-01-08T..."}

# Frontend (должна вернуться HTML страница)
curl http://app-dev.local

# Ожидаемый результат: HTML код с <!DOCTYPE html>
```

**Если ingress не работает:**

```powershell
# 1. Проверить hosts файл (должна быть запись app-dev.local)
Get-Content C:\Windows\System32\drivers\etc\hosts | Select-String "app-dev"

# 2. Узнать IP для minikube
minikube ip

# 3. Проверить nginx-ingress
kubectl get pods -n ingress-nginx
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

### 10. Проверка БД и миграций

```powershell
# Зайти в под server
kubectl exec -it -n app-dev deployment/server -- sh

# Внутри пода:
# Проверить подключение к БД
node -e "require('./dist/src/lib/prisma.js').prisma.\$queryRaw\`SELECT 1\`.then(() => console.log('DB OK'))"

# Применить миграции (если нужно)
npx prisma migrate deploy

# Выйти
exit
```

### 11. Проверка масштабирования (HPA)

```powershell
# Статус HPA
kubectl get hpa -n app-dev

# Ожидаемый результат:
# NAME         REFERENCE           TARGETS   MINPODS   MAXPODS   REPLICAS
# server-hpa   Deployment/server   0%/70%    2         5         2

# Если TARGETS показывает <unknown>, нужен metrics-server:
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

## Критерии успешного тестирования

**✅ Тест пройден, если:**

1. Все поды в статусе `Running` и `Ready 1/1`
2. `curl http://app-dev.local/api/health` возвращает `{"status":"ok"}`
3. `curl http://app-dev.local/api/ready` возвращает `{"status":"ready","checks":{"database":"ok"}}`
4. Frontend доступен по `http://app-dev.local` (возвращает HTML)
5. Логи server не содержат ошибок подключения к БД
6. Ingress в статусе с назначенным ADDRESS

**❌ Тест НЕ пройден, если:**

- Любой под в статусе `CrashLoopBackOff`, `ImagePullBackOff`, `Error`
- Health endpoints недоступны через ingress
- Server не может подключиться к postgres (ошибки в логах)
- Ingress не имеет ADDRESS или Rules некорректны

## Очистка после тестирования

```powershell
# Удалить всё dev окружение
pnpm k8s:delete:dev

# ИЛИ напрямую:
kubectl delete namespace app-dev

# Проверить, что удалено
kubectl get namespaces | Select-String "app-dev"
# Не должно быть результата
```

## Известные проблемы и решения

### Проблема: Поды postgres в CrashLoopBackOff

**Причина:** Проблема с PVC или volumes

**Решение:**

```powershell
kubectl delete pvc postgres-pvc -n app-dev
pnpm k8s:delete:dev
pnpm k8s:apply:dev
```

### Проблема: Server не стартует с ошибкой "Cannot find module"

**Причина:** Образ собран некорректно или устарел

**Решение:**

```powershell
# Пересобрать образ
pnpm docker:build

# Перезагрузить в кластер (для minikube/kind)
minikube image load task_02-server:latest

# Удалить и пересоздать deployment
kubectl rollout restart deployment/server -n app-dev
```

### Проблема: Ingress не отвечает (connection refused)

**Причина:** nginx-ingress не установлен или не готов

**Решение:**

```powershell
# Установить nginx-ingress (для kind)
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# Подождать готовности
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=90s
```

### Проблема: "x509: certificate signed by unknown authority"

**Причина:** Проблема с самоподписанными сертификатами в кластере

**Решение:**

```powershell
# Добавить флаг для kubectl
kubectl apply -k k8s/overlays/dev --insecure-skip-tls-verify
```

## Контрольные вопросы для нейроагента

После тестирования ответь на вопросы:

1. Все ли поды запустились успешно?
2. Работают ли health endpoints (/health, /ready)?
3. Доступен ли backend через ingress (app-dev.local/api/health)?
4. Доступен ли frontend через ingress (app-dev.local)?
5. Есть ли ошибки в логах server или postgres?
6. Все ли сервисы имеют корректные ClusterIP?
7. Настроен ли ingress с правильными rules?
8. HPA показывает корректные метрики?

### Результат проверки

Если на все вопросы ответ "да" → манифесты корректны ✅

Если есть "нет" → укажи конкретную проблему и приложи логи/describe подов ❌

---

## Быстрый старт для Docker Desktop

Если вы используете Docker Desktop с включённым Kubernetes:

### 1. Переключение контекста

```powershell
# Проверить текущий контекст
kubectl config get-contexts

# Переключиться на docker-desktop
kubectl config use-context docker-desktop

# Проверить кластер
kubectl cluster-info
```

### 2. Сборка образов

```powershell
cd path/to/task_02

# Собрать образы (Docker Desktop использует их автоматически)
docker compose build
```

### 3. Установка Ingress Controller

```powershell
# Установить nginx-ingress
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.9.5/deploy/static/provider/cloud/deploy.yaml

# Подождать готовности (30-60 секунд)
kubectl get pods -n ingress-nginx --watch
```

### 4. Установка Metrics Server (для HPA)

```powershell
# Установить metrics-server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Патч для работы с Docker Desktop (kubelet без TLS)
kubectl patch deployment metrics-server -n kube-system --type=json -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'
```

### 5. Деплой приложения (base окружение)

```powershell
# Применить базовую конфигурацию
kubectl apply -k k8s/base

# Проверить статус подов
kubectl get pods -n app --watch
```

### 6. Тестирование через Ingress

Ingress в Docker Desktop доступен на `localhost:80`. Используйте заголовок Host для обращения:

```powershell
# Health check
Invoke-RestMethod -Uri "http://localhost/api/health" -Headers @{Host="app.local"} -Method GET

# Ready check
Invoke-RestMethod -Uri "http://localhost/api/ready" -Headers @{Host="app.local"} -Method GET

# Frontend
Invoke-WebRequest -Uri "http://localhost/" -Headers @{Host="app.local"} -UseBasicParsing
```

### 7. Опционально: настройка hosts файла

Для удобного доступа через браузер добавьте в `C:\Windows\System32\drivers\etc\hosts`:

```
127.0.0.1 app.local
```

После этого можно открыть `http://app.local` в браузере.

---

## Последнее успешное тестирование

**Дата:** 2026-01-08

**Окружение:** Docker Desktop с Kubernetes 1.31

**Результаты:**

| Компонент | Статус | Детали |
|-----------|--------|--------|
| postgres | ✅ Running | 1/1, PVC Bound |
| redis | ✅ Running | 1/1, PVC Bound |
| server (x2) | ✅ Running | 2/2, health OK |
| web (x2) | ✅ Running | 2/2 |
| Ingress | ✅ Configured | localhost:80 |
| HPA | ✅ Working | cpu: 1-14%/70% |
| Metrics | ✅ Available | kubectl top pods работает |

**Протестированные endpoints:**

- `GET /api/health` → `{"status":"ok"}` ✅
- `GET /api/ready` → `{"status":"ready","checks":{"database":"ok"}}` ✅
- `POST /api/auth/register` → успешная регистрация ✅
- `POST /api/auth/login` → JWT токен получен ✅
- `GET /` (frontend) → HTTP 200, HTML ✅

**Вывод:** Все Kubernetes манифесты корректны и приложение полностью функционально в кластере.
