# Multi-stage build for monorepo with pnpm

# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /repo

# Install OpenSSL for Prisma
# hadolint ignore=DL3018
RUN apk add --no-cache openssl \
    && corepack enable

# Copy monorepo configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/ ./apps/
COPY packages/ ./packages/

# Install all dependencies (including dev dependencies for build),
# build server and generate Prisma client
RUN pnpm install --frozen-lockfile \
    && pnpm -C apps/server build \
    && pnpm -C apps/server prisma generate

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /repo

# Install OpenSSL for Prisma and curl for healthchecks
# hadolint ignore=DL3018
RUN apk add --no-cache openssl curl \
    && corepack enable

ENV NODE_ENV=production

# Copy entire monorepo structure from builder
COPY --from=builder /repo /repo

# Copy entrypoint script
COPY apps/server/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Set working directory to server app
WORKDIR /repo/apps/server

# Expose port
EXPOSE 3000

# Use entrypoint for migrations + start
ENTRYPOINT ["docker-entrypoint.sh"]
