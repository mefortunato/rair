#!/usr/bin/env bash
# ==============================================================
# RAIR (Rogue Ascension: Idle Role-playing)
# LOCAL DEVELOPMENT ENVIRONMENT SCRIPT
# ==============================================================
# Runs local MongoDB container, FastAPI backend, and Vite frontend.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${ROOT_DIR}"

# 1. Load variables from root .env if present
if [ -f "${ROOT_DIR}/.env" ]; then
  echo "✓ Loading configuration from .env..."
  set -a
  source <(grep -v '^#' "${ROOT_DIR}/.env" | grep -v '^$')
  set +a
fi

# 2. Local overrides and defaults for development
LOCAL_MONGO_PORT="${MONGO_PORT:-27019}"
export MONGO_URI="${MONGO_URI:-mongodb://127.0.0.1:${LOCAL_MONGO_PORT}}"
export MONGODB_URI="${MONGO_URI}"
export DATABASE_NAME="${DATABASE_NAME:-rair_db}"
export HOST="${HOST:-127.0.0.1}"
export PORT="${PORT:-8001}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
export FRONTEND_URL="http://localhost:${FRONTEND_PORT}"

# 3. Ensure local MongoDB Docker container is running (if Docker is available)
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  echo "📦 Ensuring local MongoDB container is running on port ${LOCAL_MONGO_PORT}..."
  docker compose up -d mongodb
  echo "⚡ Dev Database: ${MONGO_URI} (${DATABASE_NAME})"
else
  echo "⚠️ Docker is not running or unavailable. Backend will use in-memory storage fallback."
fi

# Track child process IDs for graceful shutdown
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  set +e
  # Remove traps to prevent recursive trap execution
  trap - EXIT INT TERM

  echo ""
  echo "🛑 Stopping dev servers..."

  # Terminate frontend process & its child tree
  if [ -n "${FRONTEND_PID}" ] && kill -0 "${FRONTEND_PID}" 2>/dev/null; then
    pkill -TERM -P "${FRONTEND_PID}" 2>/dev/null || true
    kill -TERM "${FRONTEND_PID}" 2>/dev/null || true
  fi

  # Terminate backend process & uvicorn worker tree
  if [ -n "${BACKEND_PID}" ] && kill -0 "${BACKEND_PID}" 2>/dev/null; then
    pkill -TERM -P "${BACKEND_PID}" 2>/dev/null || true
    kill -TERM "${BACKEND_PID}" 2>/dev/null || true
  fi

  # Give processes a moment to terminate gracefully
  sleep 0.5

  # Ensure ports are freed if fuser is installed
  if command -v fuser >/dev/null 2>&1; then
    fuser -k -TERM "${PORT}/tcp" 2>/dev/null || true
    fuser -k -TERM "${FRONTEND_PORT}/tcp" 2>/dev/null || true
    sleep 0.5
    fuser -k -KILL "${PORT}/tcp" 2>/dev/null || true
    fuser -k -KILL "${FRONTEND_PORT}/tcp" 2>/dev/null || true
  fi

  wait "${BACKEND_PID}" 2>/dev/null || true
  wait "${FRONTEND_PID}" 2>/dev/null || true

  echo "✓ Dev servers stopped."
  exit 0
}

trap cleanup EXIT INT TERM

# 4. Clean up any stale processes on the development ports before starting
if command -v fuser >/dev/null 2>&1; then
  fuser -k "${PORT}/tcp" 2>/dev/null || true
  fuser -k "${FRONTEND_PORT}/tcp" 2>/dev/null || true
fi

# 5. Ensure dependencies are installed
if [ ! -d "${ROOT_DIR}/backend/.venv" ]; then
  echo "📦 Initializing backend Python environment with uv..."
  (cd "${ROOT_DIR}/backend" && uv sync)
fi

if [ ! -d "${ROOT_DIR}/frontend/node_modules" ]; then
  echo "📦 Installing frontend npm dependencies..."
  (cd "${ROOT_DIR}/frontend" && npm install)
fi

# 6. Start FastAPI backend with hot reloading
echo "🚀 Starting FastAPI backend on http://${HOST}:${PORT}..."
(cd "${ROOT_DIR}/backend" && uv run uvicorn backend.main:app --reload --host "${HOST}" --port "${PORT}") &
BACKEND_PID=$!

# 7. Start Vite SvelteKit frontend
echo "✨ Starting Vite SvelteKit frontend on http://localhost:${FRONTEND_PORT}..."
(cd "${ROOT_DIR}/frontend" && npm run dev -- --port "${FRONTEND_PORT}") &
FRONTEND_PID=$!

# 8. Wait for background jobs
wait
