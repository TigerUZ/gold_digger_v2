#!/bin/sh
set -e

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "ERROR: .env missing in $(pwd)"
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
  LEGACY_COMPOSE=0
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
  LEGACY_COMPOSE=1
else
  echo "ERROR: docker compose not found"
  exit 1
fi

# docker-compose 1.29 + Docker 25+: "recreate" fails with KeyError: ContainerConfig.
# Full down/up avoids recreate; Compose v2 does not need this.
if [ "$LEGACY_COMPOSE" -eq 1 ]; then
  $COMPOSE down --remove-orphans
fi

$COMPOSE up -d --build --remove-orphans
docker image prune -f
$COMPOSE ps
