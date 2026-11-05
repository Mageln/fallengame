#!/usr/bin/env bash
# Expose code-server through the E2B-exempt envd port without a traffic token.
# Usage: sudo bash tools/vscode/ingress.sh on|off|status
set -euo pipefail

CHAIN=PREROUTING
RULE=(-i eth0 -p tcp --dport 49983 -j REDIRECT --to-ports 49984 -m comment --comment arena-vscode-bypass)

case "${1:-status}" in
  on)
    iptables -t nat -C $CHAIN "${RULE[@]}" 2>/dev/null || iptables -t nat -A $CHAIN "${RULE[@]}"
    echo "ingress ON"
    ;;
  off)
    while iptables -t nat -C $CHAIN "${RULE[@]}" 2>/dev/null; do
      iptables -t nat -D $CHAIN "${RULE[@]}"
    done
    echo "ingress OFF"
    ;;
  status)
    iptables -t nat -S $CHAIN
    ;;
  *) echo "usage: $0 on|off|status" >&2; exit 1 ;;
esac
