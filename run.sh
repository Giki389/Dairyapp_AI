cd /app/diary-app

# 复制配置文件
cp .z-ai-config /etc/.z-ai-config

# 启动服务
node node_modules/next/dist/bin/next start -p 3000
