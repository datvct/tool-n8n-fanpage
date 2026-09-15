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

random_hex() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "${1:-32}"
  else
    od -An -N "${1:-32}" -tx1 /dev/urandom | tr -d ' \n'
  fi
}

set_env_if_empty() {
  local name="$1" value="$2"
  if ! grep -qE "^${name}=" .env; then
    printf '%s="%s"\n' "$name" "$value" >> .env
  elif grep -qE "^${name}=\"?\"?$" .env; then
    sed -i.bak -E "s|^${name}=.*$|${name}=\"${value}\"|" .env
    rm -f .env.bak
  fi
}

set_env_value() {
  local name="$1" value="$2"
  if grep -qE "^${name}=" .env; then
    sed -i.bak -E "s|^${name}=.*$|${name}=\"${value}\"|" .env
    rm -f .env.bak
  else
    printf '%s="%s"\n' "$name" "$value" >> .env
  fi
}

replace_placeholder() {
  local name="$1" placeholder="$2" value="$3"
  if grep -qE "^${name}=\"?${placeholder}\"?$" .env; then
    set_env_value "$name" "$value"
  fi
}

set_env_if_empty POSTGRES_USER "content_manager"
set_env_if_empty POSTGRES_DB "content_manager"
set_env_if_empty POSTGRES_PASSWORD "$(random_hex 24)"
set_env_if_empty AUTH_SECRET "$(random_hex 32)"
set_env_if_empty APP_ACCESS_PASSWORD "$(random_hex 12)"
set_env_if_empty APP_PORT "3000"

replace_placeholder POSTGRES_PASSWORD "change-this-password" "$(random_hex 24)"
replace_placeholder AUTH_SECRET "generate-a-long-random-secret-epcb" "$(random_hex 32)"
replace_placeholder APP_ACCESS_PASSWORD "epcb2026" "$(random_hex 12)"

chmod 600 .env

if [ "$NEW_ENV" -eq 1 ]; then
  log "Đã tạo .env mới. Mật khẩu đăng nhập APP_ACCESS_PASSWORD đã được sinh tự động."
  printf '    Xem bằng lệnh: grep APP_ACCESS_PASSWORD .env\n'
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
