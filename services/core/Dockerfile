FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace root files for pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY services/core/package.json ./services/core/

# Install deps
RUN corepack enable && pnpm install --frozen-lockfile

# Copy source and build
COPY services/core/ ./services/core/
RUN cd services/core && pnpm build

FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/services/core/dist ./dist
COPY --from=builder /app/services/core/node_modules ./node_modules

EXPOSE 3002
CMD ["node", "dist/main"]
