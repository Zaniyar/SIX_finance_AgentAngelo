#!/bin/bash
# AgentAngelo production deploy script
# Run on the server: bash deploy.sh
set -e

APP_DIR="/opt/agentangelo"
REPO="https://github.com/Zaniyar/SIX_finance_AgentAngelo.git"

echo "=== AgentAngelo Deploy ==="

# 1. Clone or pull latest
if [ -d "$APP_DIR/.git" ]; then
  echo "→ Pulling latest..."
  git -C "$APP_DIR" pull --ff-only
else
  echo "→ Cloning repo..."
  git clone "$REPO" "$APP_DIR"
fi

cd "$APP_DIR"

# 2. Copy .env (must exist on server already — never committed)
if [ ! -f "$APP_DIR/SIX-Noumena-NTT-Data/demo/.env" ]; then
  echo "ERROR: $APP_DIR/SIX-Noumena-NTT-Data/demo/.env missing — copy it first!"
  exit 1
fi

# 3. Build + start containers (without touching other containers)
echo "→ Building and starting containers..."
docker compose -f docker-compose.prod.yml up -d --build

# 4. nginx config
NGINX_CONF="/etc/nginx/sites-available/agentangelo.finance"
if [ ! -f "$NGINX_CONF" ]; then
  echo "→ Installing nginx config..."
  cp deploy/nginx-agentangelo.conf "$NGINX_CONF"
  ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/agentangelo.finance
  nginx -t && systemctl reload nginx
  echo "→ Getting SSL certificate..."
  certbot --nginx -d agentangelo.finance -d www.agentangelo.finance --non-interactive --agree-tos -m zaniyar.jahany@gmail.com
  nginx -t && systemctl reload nginx
else
  echo "→ nginx config already exists, reloading..."
  nginx -t && systemctl reload nginx
fi

echo ""
echo "✓ Done! https://agentangelo.finance"
echo ""
docker compose -f docker-compose.prod.yml ps
