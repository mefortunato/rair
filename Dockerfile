# ==============================================================================
# RAIR - Production Multi-Stage Container for Google Cloud Run
# 
# Stage 1: Build the SvelteKit static SPA frontend
# Stage 2: Fast, slim Python 3.14 runner with uv & FastAPI serving API + SPA
# ==============================================================================

# --- Stage 1: Frontend Build Stage ---
FROM node:22-alpine AS frontend-builder
WORKDIR /build

# Copy dependency manifests and install dependencies
COPY frontend/package*.json ./
RUN npm ci || npm install

# Build static single page application (SPA)
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Production Runtime Stage ---
FROM python:3.14-slim AS runner

WORKDIR /app

# Install runtime utilities & curl for healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast, reliable Python dependency installation
RUN pip install --no-cache-dir uv

# Copy and install backend dependencies directly into system environment
COPY backend/pyproject.toml backend/uv.lock* ./backend/
WORKDIR /app/backend
RUN uv pip install --system --no-cache -r pyproject.toml

# Copy backend source code
COPY backend/src ./src
COPY backend/README.md ./

# Copy built frontend static assets from builder stage
COPY --from=frontend-builder /build/build /app/static

# Security: Create non-root user
RUN groupadd -g 10001 rair && \
    useradd -u 10001 -g rair -s /bin/bash -m rair && \
    chown -R rair:rair /app

USER rair

# Google Cloud Run defaults:
# Cloud Run injects PORT (typically 8080) and expects containers to bind to 0.0.0.0
ENV HOST=0.0.0.0 \
    PORT=8080 \
    PYTHONPATH=/app/backend/src \
    STATIC_DIR=/app/static \
    PYTHONUNBUFFERED=1

EXPOSE 8080

# Health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://127.0.0.1:${PORT}/health || exit 1

# Launch uvicorn listening on 0.0.0.0:${PORT}
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT}"]
