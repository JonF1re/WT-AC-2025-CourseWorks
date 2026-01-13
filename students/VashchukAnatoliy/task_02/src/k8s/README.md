# Kubernetes Deployment Guide

## Требования

- Kubernetes кластер (minikube, kind, или production кластер)
- kubectl CLI
- kustomize (встроен в kubectl 1.14+)

## Быстрый старт

### 1. Создание namespace и ресурсов

```bash
# Применить все манифесты через kustomize
kubectl apply -k src/k8s/base/

# Или поэтапно:
kubectl apply -f src/k8s/base/namespace.yaml
kubectl apply -f src/k8s/base/configmap.yaml
kubectl apply -f src/k8s/base/secret.yaml
kubectl apply -f src/k8s/base/
```

### 2. Проверка статуса

```bash
# Проверить все ресурсы
kubectl get all -n micro-twitter

# Проверить pods
kubectl get pods -n micro-twitter

# Проверить services
kubectl get svc -n micro-twitter

# Проверить ingress
kubectl get ingress -n micro-twitter
```

### 3. Логи и диагностика

```bash
# Логи backend
kubectl logs -n micro-twitter -l app=backend --tail=100 -f

# Логи frontend
kubectl logs -n micro-twitter -l app=frontend --tail=100 -f

# Логи postgres
kubectl logs -n micro-twitter -l app=postgres --tail=100 -f

# Описание pod для диагностики
kubectl describe pod -n micro-twitter <pod-name>
```

### 4. Доступ к приложению

#### Через port-forward (для разработки)

```bash
# Backend API
kubectl port-forward -n micro-twitter svc/backend 3000:80

# Frontend
kubectl port-forward -n micro-twitter svc/frontend 8080:80
```

#### Через Ingress (требуется Ingress Controller)

```bash
# Установить NGINX Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml

# Добавить в /etc/hosts (Linux/Mac) или C:\Windows\System32\drivers\etc\hosts (Windows):
<INGRESS_IP> micro-twitter.local

# Открыть в браузере:
http://micro-twitter.local
```

### 5. Миграции базы данных

```bash
# Запустить миграции через job
kubectl run -n micro-twitter prisma-migrate \
  --image=micro-twitter-server:latest \
  --restart=Never \
  --command -- npx prisma migrate deploy

# Загрузить seed данные
kubectl run -n micro-twitter prisma-seed \
  --image=micro-twitter-server:latest \
  --restart=Never \
  --command -- npm run prisma:seed
```

## Масштабирование

### Ручное масштабирование

```bash
# Увеличить количество реплик backend
kubectl scale deployment -n micro-twitter backend --replicas=3

# Увеличить количество реплик frontend
kubectl scale deployment -n micro-twitter frontend --replicas=3
```

### Автомасштабирование (HPA)

HPA уже настроен в `k8s/base/hpa.yaml`:
- Backend: 2-5 реплик (CPU 70%, Memory 80%)
- Frontend: 2-5 реплик (CPU 70%)

```bash
# Проверить статус HPA
kubectl get hpa -n micro-twitter

# Детали HPA
kubectl describe hpa -n micro-twitter backend-hpa
```

## Обновление приложения

### Rolling Update

```bash
# Обновить image backend
kubectl set image deployment/backend -n micro-twitter \
  backend=micro-twitter-server:v2

# Обновить image frontend
kubectl set image deployment/frontend -n micro-twitter \
  frontend=micro-twitter-web:v2

# Проверить статус обновления
kubectl rollout status deployment/backend -n micro-twitter
```

### Откат

```bash
# Откатить последнее обновление
kubectl rollout undo deployment/backend -n micro-twitter

# Откатить к конкретной ревизии
kubectl rollout undo deployment/backend -n micro-twitter --to-revision=2

# История ревизий
kubectl rollout history deployment/backend -n micro-twitter
```

## Мониторинг ресурсов

```bash
# CPU и Memory использование
kubectl top nodes
kubectl top pods -n micro-twitter

# События в namespace
kubectl get events -n micro-twitter --sort-by='.lastTimestamp'
```

## Очистка

```bash
# Удалить все ресурсы
kubectl delete -k k8s/base/

# Или удалить namespace (удалит все ресурсы внутри)
kubectl delete namespace micro-twitter
```

## Production рекомендации

1. **Secrets**: Используйте external secrets (e.g., HashiCorp Vault, AWS Secrets Manager)
2. **TLS**: Настройте cert-manager для автоматических SSL сертификатов
3. **Monitoring**: Установите Prometheus + Grafana для мониторинга
4. **Logging**: Настройте EFK/ELK stack для централизованных логов
5. **Backup**: Настройте регулярные бэкапы PostgreSQL (Velero, pg_dump)
6. **Resource Limits**: Точно настройте requests/limits на основе нагрузки
7. **Network Policies**: Настройте NetworkPolicy для изоляции
8. **Pod Security**: Включите PodSecurityAdmission

## Troubleshooting

### Pod не запускается

```bash
kubectl describe pod -n micro-twitter <pod-name>
kubectl logs -n micro-twitter <pod-name> --previous
```

### База данных недоступна

```bash
# Проверить StatefulSet
kubectl get statefulset -n micro-twitter postgres

# Подключиться к PostgreSQL
kubectl exec -it -n micro-twitter postgres-0 -- psql -U postgres -d micro_twitter
```

### Проблемы с Ingress

```bash
# Проверить Ingress Controller
kubectl get pods -n ingress-nginx

# Логи Ingress Controller
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx
```
