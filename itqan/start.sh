#!/bin/bash
set -e

echo "🚀 Starting Itqan Production Server..."

# ── Install Python dependencies if needed ────────────────────────
if ! python3 -c "import uvicorn" 2>/dev/null; then
  echo "⏳ Installing Python dependencies..."
  pip install -r backend/requirements.txt --quiet
  echo "✅ Python dependencies installed"
fi

# ── Build frontend if not already built ─────────────────────────
if [ ! -d "frontend/build" ] || [ ! -f "frontend/build/index.html" ]; then
  echo "⏳ Building React frontend..."
  cd frontend
  npm install --legacy-peer-deps --silent
  npm run build
  cd ..
  echo "✅ Frontend built"
else
  echo "✅ Frontend already built"
fi

# ── Find mongod binary ──────────────────────────────────────────
MONGOD_BIN=""
KNOWN_PATH="/nix/store/c3l5axlpfsvn0cj281si9dqvncai0r3n-mongodb-7.0.16/bin/mongod"

if [ -x "$KNOWN_PATH" ]; then
  MONGOD_BIN="$KNOWN_PATH"
elif command -v mongod &>/dev/null; then
  MONGOD_BIN="$(command -v mongod)"
fi

if [ -z "$MONGOD_BIN" ]; then
  echo "❌ mongod not found"
  exit 1
fi

echo "✅ MongoDB: $MONGOD_BIN"

# ── Start MongoDB (skip if already running) ──────────────────────
mkdir -p /tmp/mongodb-data
if ! pgrep -x mongod >/dev/null 2>&1; then
  echo "⏳ Starting MongoDB..."
  "$MONGOD_BIN" \
    --dbpath /tmp/mongodb-data \
    --port 27017 \
    --logpath /tmp/mongod.log \
    --bind_ip 127.0.0.1 \
    --fork
  sleep 5
  echo "✅ MongoDB started"
else
  echo "✅ MongoDB already running"
fi

# ── Find uvicorn ─────────────────────────────────────────────────
UVICORN_BIN=""
if command -v uvicorn &>/dev/null; then
  UVICORN_BIN="uvicorn"
elif [ -x "/home/runner/workspace/.pythonlibs/bin/uvicorn" ]; then
  UVICORN_BIN="/home/runner/workspace/.pythonlibs/bin/uvicorn"
else
  UVICORN_BIN=$(find /home/runner -name "uvicorn" -type f -perm /111 2>/dev/null | head -1)
fi

if [ -z "$UVICORN_BIN" ]; then
  echo "❌ uvicorn not found"
  exit 1
fi

echo "✅ uvicorn: $UVICORN_BIN"

# ── Start backend (serves API + built React frontend) ───────────
cd backend
exec "$UVICORN_BIN" server:app --host 0.0.0.0 --port 5000 --workers 2
