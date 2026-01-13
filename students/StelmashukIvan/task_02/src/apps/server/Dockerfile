FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install --no-install-recommends -y \
    openssl=3.0.11-1~deb12u2 \
    ca-certificates=20230311 \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate && \
    npm run build && \
    (cp src/swagger.json dist/src/ 2>/dev/null || true)

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npm run seed && node dist/src/server.js"]