#!/bin/bash

echo "Building and pushing Docker images..."
docker build -t your-registry/smart-home-server:v1.0.0 ./apps/server
docker build -t your-registry/smart-home-web:v1.0.0 ./apps/web
docker push your-registry/smart-home-server:v1.0.0
docker push your-registry/smart-home-web:v1.0.0

echo "Setting up Kubernetes context..."
kubectl config use-context production-cluster

echo "Creating namespace..."
kubectl create namespace smart-home-prod --dry-run=client -o yaml | kubectl apply -f -

echo "Applying secrets..."
kubectl apply -f k8s/secrets/prod-secrets.yaml

echo "Deploying with kustomize..."
kubectl apply -k k8s/overlays/prod

echo "Deployment completed!"
echo ""
echo "To check status:"
echo "  kubectl get all -n smart-home-prod"
echo "  kubectl get ingress -n smart-home-prod"