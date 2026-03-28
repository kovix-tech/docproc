FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace root files for pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY services/registry/package.json ./services/registry/

# Install deps
RUN corepack enable && pnpm install --frozen-lockfile

# Copy source and build
COPY services/registry/ ./services/registry/
RUN cd services/registry && pnpm build

FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/services/registry/dist ./dist
COPY --from=builder /app/services/registry/node_modules ./node_modules

EXPOSE 3001
CMD ["node", "dist/main"]
