#!/bin/sh
set -e

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y ca-certificates curl git

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

apt-get install -y docker-compose-plugin || apt-get install -y docker-compose

systemctl enable docker
systemctl start docker

mkdir -p /opt/gold_digger_v2

echo "Done. Create /opt/gold_digger_v2/.env then run deploy from GitHub Actions or ./scripts/deploy.sh"
