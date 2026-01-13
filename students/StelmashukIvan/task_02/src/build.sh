#!/bin/bash

echo "Building Docker images..."

cd apps/web
npm run build
docker build -t your-registry/web:latest .
cd ../..

cd apps/server
docker build -t your-registry/server:latest .
cd ../..

echo "Images built successfully!"
echo "To push to registry:"
echo "  docker push your-registry/web:latest"
echo "  docker push your-registry/server:latest"