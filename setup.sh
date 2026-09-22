#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="docker-compose.prod.yml"
cd "$ROOT_DIR"

log() { printf '\n[setup] %s\n' "$*"; }
fail() { printf '\n[setup] ERROR: %s\n' "$*" >&2; exit 1; }

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  printf '%s\n' \
    'Usage: ./setup.sh' \
    '' \
    'Build và khởi động Content Manager production bằng Docker Compose.' \
    'Script tự tạo .env nếu chưa có, nhưng không ghi đè secret đã cấu hình.'
  exit 0
fi

command -v docker >/dev/null 2>&1 || fail "Chưa cài Docker. Cài Docker Engine + Docker Compose rồi chạy lại."
docker compose version >/dev/null 2>&1 || fail "Docker Compose plugin chưa sẵn sàng."

if [ ! -f .env ]; then
  [ -f .env.example ] || fail "Thiếu .env.example."
  cp .env.example .env
  chmod 600 .env
  NEW_ENV=1
else
  NEW_ENV=0
fi

chmod 600 .env

if [ "$NEW_ENV" -eq 1 ]; then
  log "Đã tạo .env mới từ .env.example. Hãy kiểm tra các giá trị trước khi deploy."
fi

if grep -qE '^NEXT_PUBLIC_APP_URL="?http://localhost' .env; then
  printf '\n[setup] WARNING: NEXT_PUBLIC_APP_URL đang là localhost. Hãy sửa thành domain HTTPS sau khi deploy.\n'
fi

log "Build và khởi động production containers"
docker compose -f "$COMPOSE_FILE" up -d --build

log "Kiểm tra trạng thái"
docker compose -f "$COMPOSE_FILE" ps

printf '\n[setup] Deploy hoàn tất.\n'
printf '    Xem log:      docker compose -f %s logs -f app\n' "$COMPOSE_FILE"
printf '    Dừng app:     docker compose -f %s down\n' "$COMPOSE_FILE"
printf '    Không dùng:   docker compose -f %s down -v (sẽ xóa database)\n' "$COMPOSE_FILE"
