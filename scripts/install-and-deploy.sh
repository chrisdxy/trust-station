#!/bin/bash

# ============================================
# 正道驿站 - 云服务器完整部署脚本
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  正道驿站 - 云服务器完整部署脚本${NC}"
echo -e "${GREEN}========================================${NC}"

# 1. 安装 Node.js 24.x
echo -e "${GREEN}[1/7] 安装 Node.js 24.x...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
    apt-get install -y nodejs
else
    echo -e "${YELLOW}Node.js 已安装: $(node -v)${NC}"
fi

# 2. 安装 pnpm
echo -e "${GREEN}[2/7] 安装 pnpm...${NC}"
if ! command -v pnpm &> /dev/null; then
    npm install -g pnpm
else
    echo -e "${YELLOW}pnpm 已安装: $(pnpm -v)${NC}"
fi

# 3. 安装 Nginx 和 Certbot
echo -e "${GREEN}[3/7] 安装 Nginx 和 HTTPS...${NC}"
apt-get install -y nginx certbot python3-certbot-nginx

# 4. 验证版本
echo -e "${GREEN}[4/7] 验证环境...${NC}"
echo -e "  Node.js: $(node -v)"
echo -e "  pnpm: $(pnpm -v)"
echo -e "  Nginx: $(nginx -v 2>&1)"

# 5. 安装项目依赖
echo -e "${GREEN}[5/7] 安装项目依赖...${NC}"
pnpm install

# 6. 构建项目
echo -e "${GREEN}[6/7] 构建项目...${NC}"
pnpm build

# 7. 配置 Nginx
echo -e "${GREEN}[7/7] 配置 Nginx...${NC}"

# 创建 Nginx 配置
cat > /etc/nginx/sites-available/zhengdao << 'EOF'
server {
    listen 80;
    server_name myfriends.vip www.myfriends.vip;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name myfriends.vip www.myfriends.vip;

    ssl_certificate /etc/letsencrypt/live/myfriends.vip/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/myfriends.vip/privkey.pem;

    client_max_body_size 100M;
    root /root;
    index index.html;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# 启用配置
ln -sf /etc/nginx/sites-available/zhengdao /etc/nginx/sites-enabled/zhengdao
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# 申请 SSL 证书（如果需要）
# certbot --nginx -d myfriends.vip -d www.myfriends.vip

# 启动服务
echo -e "${GREEN}启动服务...${NC}"
pkill -f "next start" 2>/dev/null || true
sleep 2
nohup bash -c 'PORT=3000 npx next start -p 3000' > server.log 2>&1 &
sleep 3

# 验证
if curl -s -o /dev/null -w "%{http_code}" https://myfriends.vip | grep -q "200"; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  部署成功！${NC}"
    echo -e "${GREEN}  网站地址: https://myfriends.vip${NC}"
    echo -e "${GREEN}  管理后台: https://myfriends.vip/admin/login${NC}"
    echo -e "${GREEN}========================================${NC}"
else
    echo -e "${YELLOW}服务可能正在启动，请稍后检查: curl https://myfriends.vip${NC}"
fi
