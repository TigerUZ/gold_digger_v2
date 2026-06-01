#!/bin/sh
set -e

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "ERROR: .env missing in $(pwd)"
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  echo "ERROR: docker compose not found"
  exit 1
fi

$COMPOSE up -d --build --remove-orphans
docker image prune -f
$COMPOSE ps
