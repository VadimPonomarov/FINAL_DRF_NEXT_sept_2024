# =============================================================================
# STANDARD PRODUCTION DOCKERFILE FOR NEXT.JS
# Uses npm run build + npm run start for reliable data loading
# =============================================================================

FROM node:18-alpine AS base

# Set UTF-8 locale and encoding
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
ENV PYTHONIOENCODING=utf-8

WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat

# Set UTF-8 locale for this stage
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies with caching and optimizations
RUN npm ci --legacy-peer-deps --cache /tmp/.npm --prefer-offline --no-audit

# =============================================================================
# Builder stage - build the application
# =============================================================================
FROM base AS builder

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files
COPY . .

# Clean any existing build/cache artifacts to avoid stale assets
# This prevents issues with static generation of error pages
RUN rm -rf .next node_modules/.cache || true

# Build the application
# Set environment variables to prevent static generation issues
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Force UTF-8 encoding for build process
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
ENV PYTHONIOENCODING=utf-8
# Build-time arguments to inject required env during Next.js build
ARG BACKEND_URL
ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXTAUTH_URL
ARG NEXTAUTH_URL_INTERNAL
ARG IS_DOCKER
ARG NEXT_PUBLIC_IS_DOCKER
ARG NEXT_DISABLE_DEVTOOLS
ARG NEXT_RUNTIME
ARG LANG
ARG LC_ALL

# Export build-time args as ENV so Next sees them at build
ENV BACKEND_URL=${BACKEND_URL}
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}
ENV NEXTAUTH_URL=${NEXTAUTH_URL}
ENV NEXTAUTH_URL_INTERNAL=${NEXTAUTH_URL_INTERNAL}
ENV IS_DOCKER=${IS_DOCKER}
ENV NEXT_PUBLIC_IS_DOCKER=${NEXT_PUBLIC_IS_DOCKER}
ENV NEXT_DISABLE_DEVTOOLS=${NEXT_DISABLE_DEVTOOLS}
ENV NEXT_RUNTIME=${NEXT_RUNTIME}
# Override locale from build args if provided
ENV LANG=${LANG:-C.UTF-8}
ENV LC_ALL=${LC_ALL:-C.UTF-8}
# Force dynamic rendering for error pages (404, 500, etc.)
# This prevents Html component import errors during build
ENV NEXT_PRIVATE_STANDALONE=false
RUN npm run build

# =============================================================================
# Production runner - standard build (NOT standalone)
# =============================================================================
FROM base AS runner

# Install runtime dependencies
RUN apk add --no-cache curl dumb-init

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy node_modules from deps (includes all dependencies needed for npm start)
COPY --from=deps /app/node_modules ./node_modules

# Copy built application and necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/package.json ./package.json

# Change ownership - optimize for large .next directory
RUN chown -R nextjs:nodejs /app/.next /app/public /app/node_modules /app/next.config.js /app/package.json || true

# Switch to non-root user
USER nextjs

EXPOSE 3000

# Production environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1
# Force UTF-8 encoding for runtime
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Use npm start (standard Next.js production server)
CMD ["npm", "start"]


