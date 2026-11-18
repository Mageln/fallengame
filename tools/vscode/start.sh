#!/usr/bin/env bash
# Start code-server on the sandbox repo (port 8080).
set -euo pipefail
CS=/home/user/.local/share/code-server
SANDBOX_ID="${E2B_SANDBOX_ID:-}"
if [ -n "$SANDBOX_ID" ]; then
  export VSCODE_PROXY_URI="//{{port}}-${SANDBOX_ID}.e2b.app"
fi
cd "$CS"
exec node out/node/entry.js /home/user/fallengame
