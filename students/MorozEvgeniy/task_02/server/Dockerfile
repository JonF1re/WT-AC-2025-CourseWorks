FROM node:18-slim

WORKDIR /app

RUN npm install -g pnpm@9.15.0

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

COPY . .

RUN pnpm prisma generate

EXPOSE 3000

CMD ["pnpm", "ts-node", "src/server.ts"]
