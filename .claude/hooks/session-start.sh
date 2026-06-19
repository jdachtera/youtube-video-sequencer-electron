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

# Activate the repo-pinned package manager (yarn 1.22.x via package.json
# "packageManager"). Harmless if corepack is unavailable / already enabled.
corepack enable >/dev/null 2>&1 || true

# Install dependencies. Plain `yarn install` is incremental and benefits from
# the container's cached state across sessions. The "prepare" script runs
# `husky install`, which is a no-op-safe git hook setup.
echo "[session-start] Installing dependencies with yarn..."
yarn install

echo "[session-start] Dependencies ready."
