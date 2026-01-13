# ---------- build stage ----------
    FROM node:20-slim AS builder

    WORKDIR /app
    
    RUN npm install -g pnpm@9.15.0
    
    COPY package.json pnpm-lock.yaml* ./
    RUN pnpm install
    
    COPY . .
    RUN pnpm build
    
    # ---------- production stage ----------
    FROM nginx:alpine
    
    COPY --from=builder /app/dist /usr/share/nginx/html
    
    EXPOSE 80
    CMD ["nginx", "-g", "daemon off;"]
    