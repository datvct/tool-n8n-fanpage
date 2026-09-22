#!/bin/sh
set -eu

max_attempts=60
attempt=1

while :; do
  echo "[app] Applying Prisma schema (attempt ${attempt}/${max_attempts})..."
  if npx prisma db push --skip-generate; then
    break
  fi

  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "[app] Database did not become ready after ${max_attempts} attempts." >&2
    exit 1
  fi

  echo "[app] Database is not ready yet; retrying in 2 seconds..."
  attempt=$((attempt + 1))
  sleep 2
done

exec node server.js
