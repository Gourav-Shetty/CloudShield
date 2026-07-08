#!/usr/bin/env bash
# =============================================================================
# CloudShield AI — Full Deployment Script
# =============================================================================
# Run from the project root on the EC2 instance:
#   chmod +x scripts/deploy.sh
#   ./scripts/deploy.sh
# =============================================================================

set -euo pipefail

# ── Colour helpers ───────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Colour

step()  { echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; \
          echo -e "${GREEN}▶  $1${NC}"; \
          echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }
warn()  { echo -e "${YELLOW}⚠  $1${NC}"; }
fail()  { echo -e "${RED}✖  $1${NC}"; exit 1; }

# ── Variables ────────────────────────────────────────────────────────────────
PROJECT_DIR="/home/ubuntu/CloudShield-AI"
NGINX_SRC="$PROJECT_DIR/nginx/cloudshield.conf"
NGINX_DST="/etc/nginx/sites-available/cloudshield.conf"
NGINX_LINK="/etc/nginx/sites-enabled/cloudshield.conf"
PM2_CONFIG="$PROJECT_DIR/pm2/ecosystem.config.js"
AI_SERVICE_UNIT="$PROJECT_DIR/ai-service/cloudshield-ai.service"
SYSTEMD_DST="/etc/systemd/system/cloudshield-ai.service"

cd "$PROJECT_DIR" || fail "Project directory not found: $PROJECT_DIR"

# ═════════════════════════════════════════════════════════════════════════════
# 1. Pull latest code
# ═════════════════════════════════════════════════════════════════════════════
step "1/9  Pulling latest code from Git"
git pull origin main || warn "Git pull failed — continuing with local code"

# ═════════════════════════════════════════════════════════════════════════════
# 2. Install Node.js deps — Employee Portal Backend
# ═════════════════════════════════════════════════════════════════════════════
step "2/9  Installing Employee Portal backend dependencies"
cd "$PROJECT_DIR/employee-portal/backend"
npm ci --production
echo -e "${GREEN}✔  Employee Portal backend deps installed${NC}"

# ═════════════════════════════════════════════════════════════════════════════
# 3. Build Employee Portal Frontend
# ═════════════════════════════════════════════════════════════════════════════
step "3/9  Building Employee Portal frontend"
cd "$PROJECT_DIR/employee-portal/frontend"
npm ci
npm run build
echo -e "${GREEN}✔  Employee Portal frontend built → dist/${NC}"

# ═════════════════════════════════════════════════════════════════════════════
# 4. Install Node.js deps — Monitoring Platform
# ═════════════════════════════════════════════════════════════════════════════
step "4/9  Installing Monitoring Platform dependencies"
cd "$PROJECT_DIR/monitoring-platform"
npm ci --production
echo -e "${GREEN}✔  Monitoring Platform deps installed${NC}"

# ═════════════════════════════════════════════════════════════════════════════
# 5. Build Security Dashboard Frontend
# ═════════════════════════════════════════════════════════════════════════════
step "5/9  Building Security Dashboard frontend"
cd "$PROJECT_DIR/security-dashboard"
npm ci
npm run build
echo -e "${GREEN}✔  Security Dashboard built → dist/${NC}"

# ═════════════════════════════════════════════════════════════════════════════
# 6. Set up Python virtual env & install AI service deps
# ═════════════════════════════════════════════════════════════════════════════
step "6/9  Setting up AI Service (Python)"
cd "$PROJECT_DIR/ai-service"

if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo -e "${GREEN}✔  Virtual environment created${NC}"
fi

source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
echo -e "${GREEN}✔  AI Service Python deps installed${NC}"

# ═════════════════════════════════════════════════════════════════════════════
# 7. Copy Nginx config
# ═════════════════════════════════════════════════════════════════════════════
step "7/9  Configuring Nginx"

sudo cp "$NGINX_SRC" "$NGINX_DST"

# Remove default site if it exists
if [ -f /etc/nginx/sites-enabled/default ]; then
    sudo rm /etc/nginx/sites-enabled/default
    echo -e "${YELLOW}  Removed default Nginx site${NC}"
fi

# Create symlink if it doesn't exist
if [ ! -L "$NGINX_LINK" ]; then
    sudo ln -s "$NGINX_DST" "$NGINX_LINK"
fi

# Test config before reloading
sudo nginx -t || fail "Nginx configuration test failed!"
sudo systemctl reload nginx
echo -e "${GREEN}✔  Nginx configured and reloaded${NC}"

# ═════════════════════════════════════════════════════════════════════════════
# 8. Install systemd unit for AI service & restart
# ═════════════════════════════════════════════════════════════════════════════
step "8/9  Setting up AI Service (systemd)"

sudo cp "$AI_SERVICE_UNIT" "$SYSTEMD_DST"
sudo systemctl daemon-reload
sudo systemctl enable cloudshield-ai
sudo systemctl restart cloudshield-ai
echo -e "${GREEN}✔  AI Service systemd unit installed and started${NC}"

# ═════════════════════════════════════════════════════════════════════════════
# 9. Restart Node.js services with PM2
# ═════════════════════════════════════════════════════════════════════════════
step "9/9  Starting Node.js services with PM2"

cd "$PROJECT_DIR"
pm2 delete all 2>/dev/null || true
pm2 start "$PM2_CONFIG"
pm2 save
echo -e "${GREEN}✔  PM2 services started and saved${NC}"

# ═════════════════════════════════════════════════════════════════════════════
# Final Status
# ═════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅  CLOUDSHIELD AI — DEPLOYMENT COMPLETE${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}── PM2 Status ─────────────────────────────────────${NC}"
pm2 status

echo ""
echo -e "${YELLOW}── AI Service Status ──────────────────────────────${NC}"
sudo systemctl status cloudshield-ai --no-pager -l

echo ""
echo -e "${YELLOW}── Nginx Status ───────────────────────────────────${NC}"
sudo systemctl status nginx --no-pager -l

echo ""
echo -e "${GREEN}Access the application at: http://$(curl -s ifconfig.me 2>/dev/null || echo '<YOUR_EC2_PUBLIC_IP>')${NC}"
echo -e "  Employee Portal:     http://<PUBLIC_IP>/"
echo -e "  Security Dashboard:  http://<PUBLIC_IP>/dashboard/"
echo -e "  Monitoring API:      http://<PUBLIC_IP>/monitor/"
echo -e "  AI Service:          http://<PUBLIC_IP>/ai/"
echo ""
