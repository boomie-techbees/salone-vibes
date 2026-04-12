#!/usr/bin/env bash
# Run API + Vite frontend from repo root in one terminal (Ctrl+C stops both).
# API uses PORT from repo-root .env; frontend is forced to 5173.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

cleanup() {
  for pid in $(jobs -p 2>/dev/null || true); do
    kill "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT INT TERM

echo "Starting API (PORT from .env)…"
pnpm --filter @workspace/api-server run dev &
sleep 5

echo "Starting frontend on http://localhost:5173 …"
PORT=5173 pnpm --filter @workspace/get-am-nice run dev &

wait
