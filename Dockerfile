# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN pnpm db:generate

# Build the application
RUN pnpm build

# Compile seed script for production
RUN npx tsc prisma/seed.ts --outDir dist --esModuleInterop --skipLibCheck --resolveJsonModule

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install postgresql-client for pg_isready
RUN apk add --no-cache postgresql-client

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Copy prisma schema and config (needed for generate and migrations)
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install production dependencies AND required tools for prisma migrations
# Prisma 7 requires ts-node to load prisma.config.ts
RUN pnpm install --prod --frozen-lockfile && \
    pnpm add -D prisma ts-node typescript && \
    pnpm db:generate

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist

# Copy entrypoint script
COPY scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expose the port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3000}/api/v1/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
