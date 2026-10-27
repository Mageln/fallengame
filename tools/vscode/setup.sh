#!/usr/bin/env bash
# Bootstrap code-server (VS Code 1.110) inside an Arena/E2B sandbox.
# Only allowed host used: registry.npmjs.org.
set -euo pipefail

CS=/home/user/.local/share/code-server
TARBALL=https://registry.npmjs.org/code-server/-/code-server-4.110.0.tgz
CONFIG=/home/user/.config/code-server/config.yaml

if [ ! -f "$CS/out/node/entry.js" ]; then
  echo ">> Downloading code-server..."
  mkdir -p "$CS" /tmp
  curl -sSL --max-time 300 -o /tmp/code-server-4.110.0.tgz "$TARBALL"
  tar -xzf /tmp/code-server-4.110.0.tgz -C "$CS" --strip-components=1
fi

echo ">> Installing dependencies (postinstall skipped: GitHub releases are blocked)..."
for dir in "$CS" "$CS/lib/vscode" "$CS/lib/vscode/extensions"; do
  (cd "$dir" && npm install --omit=dev --ignore-scripts --no-audit --no-fund --loglevel=error)
done

echo ">> Building native modules against local Node headers..."
(cd "$CS/lib/vscode" && npm_config_nodedir=/usr/local npm rebuild \
  @vscode/deviceid node-pty @parcel/watcher @vscode/spdlog @vscode/native-watchdog \
  --no-audit --no-fund --loglevel=error)

mkdir -p "$CS/lib/vscode/node_modules/@vscode/ripgrep/bin"
ln -sf /usr/bin/rg "$CS/lib/vscode/node_modules/@vscode/ripgrep/bin/rg"

mkdir -p "$(dirname "$CONFIG")"
if [ ! -f "$CONFIG" ]; then
  PW="${VSCODE_PASSWORD:-$(openssl rand -hex 6)}"
  cat > "$CONFIG" <<EOF
bind-addr: 0.0.0.0:8080
auth: password
password: $PW
cert: false
disable-telemetry: true
disable-update-check: true
disable-workspace-trust: true
trusted-origins:
  - "*"
skip-auth-preflight: true
EOF
  echo ">> Password: $PW"
fi

mkdir -p "$CS/User"
cat > "$CS/User/settings.json" <<'EOF'
{
  "telemetry.telemetryLevel": "off",
  "extensions.autoCheckUpdates": false,
  "extensions.autoUpdate": false,
  "update.mode": "none",
  "security.workspace.trust.enabled": false,
  "terminal.integrated.cwd": "/home/user/fallengame",
  "files.autoSave": "afterDelay",
  "files.autoSaveDelay": 1000,
  "workbench.startupEditor": "none",
  "git.autofetch": false
}
EOF

echo ">> Ready. Start with: bash tools/vscode/start.sh"
