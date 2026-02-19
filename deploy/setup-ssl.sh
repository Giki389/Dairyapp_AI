#!/bin/bash

# SSL证书配置脚本
# 适用于NAS服务器，使用Let's Encrypt获取免费证书

# 配置变量
DOMAIN="your-domain.com"
EMAIL="your-email@example.com"
CERT_DIR="/volume1/docker/nginx/certs"

# 创建证书目录
mkdir -p $CERT_DIR

# 安装Certbot（如果未安装）
if ! command -v certbot &> /dev/null; then
    echo "Installing Certbot..."
    # Synology NAS
    if [ -f "/usr/syno/bin/synopkg" ]; then
        echo "Synology NAS detected. Please install Certbot manually via Package Center or Docker."
        echo "Alternatively, use acme.sh:"
        echo "1. SSH to your NAS"
        echo "2. Run: curl https://get.acme.sh | sh"
        echo "3. Then run: ~/.acme.sh/acme.sh --issue --standalone -d $DOMAIN --email $EMAIL"
        exit 1
    # QNAP NAS
    elif [ -f "/sbin/qpkg_cli" ]; then
        echo "QNAP NAS detected. Please install Certbot via Container Station."
        exit 1
    else
        # 其他Linux系统
        apt update && apt install -y certbot
    fi
fi

# 获取证书
echo "Obtaining SSL certificate for $DOMAIN..."
certbot certonly --standalone --preferred-challenges http -d $DOMAIN --email $EMAIL --agree-tos --non-interactive

# 复制证书到指定目录
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $CERT_DIR/
    cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $CERT_DIR/
    chmod 600 $CERT_DIR/privkey.pem
    echo "SSL certificates copied to $CERT_DIR/"
else
    echo "Certificate not found. Please check the error messages above."
    exit 1
fi

# 设置证书自动更新
echo "Setting up automatic certificate renewal..."
(crontab -l 2>/dev/null; echo "0 0 * * * certbot renew --quiet && cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $CERT_DIR/ && cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $CERT_DIR/ && nginx -s reload") | crontab -

echo "SSL certificate setup completed successfully!"
echo "Please update your Nginx configuration with the correct certificate paths."
