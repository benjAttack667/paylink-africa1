#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
STACK_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
BACKUP_DIR="${STACK_DIR}/backups"
TIMESTAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
BACKUP_FILE="${BACKUP_DIR}/postgres-${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

docker compose \
  --env-file "${STACK_DIR}/.env" \
  -f "${STACK_DIR}/docker-compose.yml" \
  exec -T postgres sh -lc 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  | gzip > "${BACKUP_FILE}"

echo "Backup created: ${BACKUP_FILE}"
