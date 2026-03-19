FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
COPY packages/domain/package.json ./packages/domain/
COPY packages/event-store/package.json ./packages/event-store/
COPY packages/command-service/package.json ./packages/command-service/
COPY prisma/schema.prisma ./prisma/
RUN npm ci --workspace=packages/command-service --include-workspace-root

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/domain/node_modules ./packages/domain/node_modules
COPY --from=deps /app/packages/event-store/node_modules ./packages/event-store/node_modules
COPY --from=deps /app/packages/command-service/node_modules ./packages/command-service/node_modules
COPY . .
RUN npx prisma generate --schema=prisma/schema.prisma
RUN npm run build --workspace=packages/domain
RUN npm run build --workspace=packages/event-store
RUN npm run build --workspace=packages/command-service

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/packages/command-service/dist ./packages/command-service/dist
COPY --from=builder /app/packages/command-service/package.json ./packages/command-service/
COPY --from=builder /app/packages/domain/dist ./packages/domain/dist
COPY --from=builder /app/packages/domain/package.json ./packages/domain/
COPY --from=builder /app/packages/event-store/dist ./packages/event-store/dist
COPY --from=builder /app/packages/event-store/package.json ./packages/event-store/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001
CMD ["node", "packages/command-service/dist/server.js"]
