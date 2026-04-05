#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 /absolute/or/relative/path/to/backup.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"

if [[ ! -f "${BACKUP_FILE}" ]]; then
  echo "Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
STACK_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

gunzip -c "${BACKUP_FILE}" | docker compose \
  --env-file "${STACK_DIR}/.env" \
  -f "${STACK_DIR}/docker-compose.yml" \
  exec -T postgres sh -lc 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'

echo "Restore completed from: ${BACKUP_FILE}"
