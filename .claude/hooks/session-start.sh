#!/bin/bash
# SessionStart hook: prepare the dev environment for Claude Code on the web.
# Installs JS dependencies so typecheck / lint / build / tests are runnable.
set -euo pipefail

# Only run automatic setup in Claude Code on the web (remote) sessions so this
# never interferes with a developer's local machine.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

# Activate the repo-pinned package manager (pnpm via package.json
# "packageManager"). Harmless if corepack is unavailable / already enabled.
corepack enable >/dev/null 2>&1 || true

# Install dependencies. Plain `pnpm install` is incremental and benefits from
# the container's cached state across sessions. The "prepare" script runs
# `husky install`, which is a no-op-safe git hook setup. Fall back to invoking
# pnpm through corepack if the shim isn't on PATH.
echo "[session-start] Installing dependencies with pnpm..."
if command -v pnpm >/dev/null 2>&1; then
  pnpm install
else
  corepack pnpm install
fi

echo "[session-start] Dependencies ready."
