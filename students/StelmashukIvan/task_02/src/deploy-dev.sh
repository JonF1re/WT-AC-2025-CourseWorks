#!/bin/bash

echo "Building Docker images..."
docker build -t smart-home-server:dev ./apps/server
docker build -t smart-home-web:dev ./apps/web

echo "Setting up Kubernetes context..."
kubectl config use-context docker-desktop

echo "Creating namespace..."
kubectl create namespace smart-home-dev --dry-run=client -o yaml | kubectl apply -f -

echo "Applying secrets..."
kubectl apply -f k8s/secrets/dev-secrets.yaml

echo "Deploying with kustomize..."
kubectl apply -k k8s/overlays/dev

echo "Waiting for pods to be ready..."
kubectl wait --for=condition=ready pod -l app=server -n smart-home-dev --timeout=300s
kubectl wait --for=condition=ready pod -l app=web -n smart-home-dev --timeout=300s

echo "Deployment completed!"
echo ""
echo "To access the application:"
echo "  kubectl port-forward service/web 8080:80 -n smart-home-dev"
echo "  Then open http://localhost:8080"
echo ""
echo "To view logs:"
echo "  kubectl logs -f deployment/server -n smart-home-dev"
echo "  kubectl logs -f deployment/web -n smart-home-dev"