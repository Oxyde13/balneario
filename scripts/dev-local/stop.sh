#!/usr/bin/env bash
# Desliga o backend local (não apaga o .env.local).
set -uo pipefail
pkill -f "dev-local/gateway.mjs" 2>/dev/null && echo "gateway desligado"
docker rm -f balneario-rest balneario-pg 2>/dev/null >/dev/null && echo "contentores removidos"
exit 0
