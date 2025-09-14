# =============================================================================
# OPTIMIZED PRODUCTION DOCKERFILE FOR NEXT.JS
# Multi-stage build for fast deployment
# =============================================================================

# =============================================================================
# STAGE 1: Dependencies
# =============================================================================
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install only production dependencies first (for better caching)
RUN npm ci --only=production --legacy-peer-deps && npm cache clean --force

# =============================================================================
# STAGE 2: Builder
# =============================================================================
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build the application for production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# =============================================================================
# STAGE 3: Runner (Optimized Production)
# =============================================================================
FROM node:18-alpine AS runner
WORKDIR /app

# Install only essential runtime dependencies
RUN apk add --no-cache curl dumb-init

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/package.json ./package.json

# Change ownership to non-root user
RUN chown -R nextjs:nodejs /app

# Switch to non-root user for security
USER nextjs

EXPOSE 3000

# Optimized production environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Use dumb-init for proper signal handling in containers
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]


