# 日记应用NAS部署指南

## 项目概述

本指南详细说明如何在NAS服务器（如Synology、QNAP等）上部署日记应用，包括HTTPS配置、域名设置、服务管理和数据备份等完整流程。

## 系统要求

### NAS服务器要求
- **处理器**: 至少双核CPU
- **内存**: 至少2GB RAM
- **存储空间**: 至少1GB可用空间
- **操作系统**: DSM 6.0+ (Synology) 或 QTS 4.3+ (QNAP)
- **网络**: 固定IP地址，可访问互联网

### 软件依赖
- **Node.js**: v18.0.0 或更高版本
- **Nginx**: 1.18.0 或更高版本
- **Certbot** (可选): 用于获取Let's Encrypt证书

## 部署准备

### 1. 域名配置

1. **购买域名** (如果没有)
   - 推荐使用阿里云、腾讯云、GoDaddy等域名服务商
   - 选择一个易于记忆的域名

2. **DNS解析设置**
   - 在域名服务商的控制面板中，添加A记录指向您的NAS公网IP地址
   - 例如：`diary.your-domain.com` → `您的公网IP`
   - 等待DNS解析生效（通常需要1-24小时）

### 2. 端口转发配置

1. **登录路由器管理界面**
   - 通常访问 `192.168.1.1` 或 `192.168.0.1`

2. **设置端口转发规则**
   - **HTTP**: 外部端口80 → 内部端口80 (NAS IP)
   - **HTTPS**: 外部端口443 → 内部端口443 (NAS IP)
   - **应用端口**: 外部端口3000 → 内部端口3000 (NAS IP) [可选]

3. **保存配置**
   - 不同路由器界面可能有所不同，请参考路由器说明书

### 3. NAS服务器准备

1. **启用SSH服务**
   - **Synology**: 控制面板 → 终端机和SNMP → 启用SSH服务
   - **QNAP**: 控制面板 → 网络服务 → Telnet/SSH → 启用SSH

2. **安装Node.js**
   - **Synology**: Package Center → 搜索并安装Node.js
   - **QNAP**: App Center → 搜索并安装Node.js
   - 或使用Docker容器运行Node.js

3. **安装Nginx**
   - **Synology**: 使用Docker安装Nginx
   - **QNAP**: App Center → 安装Nginx
   - 或使用NAS自带的Web Station

## 部署流程

### 步骤1: 构建项目

1. **本地构建**
   ```bash
   # 进入项目目录
   cd /path/to/diary-app
   
   # 安装依赖
   npm install
   
   # 构建项目
   npm run build
   ```

2. **使用构建脚本**
   ```bash
   # 仅构建
   ./deploy/build-deploy.sh --build
   
   # 完整构建并部署
   ./deploy/build-deploy.sh --full
   ```

### 步骤2: 部署到NAS

1. **手动部署**
   ```bash
   # 复制构建文件到NAS
   rsync -avz --progress .next/standalone/ admin@192.168.1.100:/volume1/web/diary-app/
   ```

2. **使用部署脚本**
   ```bash
   # 配置部署参数
   # 编辑 deploy/build-deploy.sh 中的 NAS_IP 和 NAS_USER
   
   # 执行部署
   ./deploy/build-deploy.sh --deploy
   ```

### 步骤3: 配置Nginx

1. **复制Nginx配置文件**
   ```bash
   # 复制配置文件到NAS
   scp deploy/nas-nginx.conf admin@192.168.1.100:/volume1/docker/nginx/conf.d/
   ```

2. **修改配置文件**
   - 编辑 `/volume1/docker/nginx/conf.d/nas-nginx.conf`
   - 将 `your-domain.com` 替换为您的实际域名
   - 确认证书路径正确

3. **重启Nginx**
   ```bash
   # SSH登录NAS后执行
   nginx -s reload
   ```

### 步骤4: 配置SSL证书

#### 方法A: 使用Let's Encrypt

1. **运行SSL配置脚本**
   ```bash
   # 复制脚本到NAS
   scp deploy/setup-ssl.sh admin@192.168.1.100:/volume1/web/diary-app/deploy/
   
   # SSH登录NAS后执行
   cd /volume1/web/diary-app/deploy
   chmod +x setup-ssl.sh
   ./setup-ssl.sh
   ```

2. **配置自动更新**
   - 脚本会自动设置crontab任务，每3个月更新一次证书

#### 方法B: 使用自签名证书

1. **生成自签名证书**
   ```bash
   # SSH登录NAS后执行
   mkdir -p /volume1/docker/nginx/certs
   cd /volume1/docker/nginx/certs
   
   # 生成私钥
   openssl genrsa -out privkey.pem 2048
   
   # 生成证书请求
   openssl req -new -key privkey.pem -out cert.csr
   
   # 生成自签名证书
   openssl x509 -req -days 365 -in cert.csr -signkey privkey.pem -out fullchain.pem
   ```

2. **注意**
   - 自签名证书会在浏览器中显示安全警告
   - 建议仅用于测试环境

### 步骤5: 启动应用服务

1. **运行服务管理脚本**
   ```bash
   # SSH登录NAS后执行
   cd /volume1/web/diary-app/deploy
   chmod +x service-management.sh
   
   # 启动服务
   ./service-management.sh start
   
   # 启用开机自启
   ./service-management.sh enable
   ```

2. **检查服务状态**
   ```bash
   ./service-management.sh status
   ```

### 步骤6: 配置数据备份

1. **运行备份脚本**
   ```bash
   # SSH登录NAS后执行
   cd /volume1/web/diary-app/deploy
   chmod +x backup-strategy.sh
   
   # 执行手动备份
   ./backup-strategy.sh backup
   
   # 设置自动备份
   ./backup-strategy.sh schedule
   ```

2. **查看备份**
   ```bash
   ./backup-strategy.sh list
   ```

## 配置说明

### 主要配置文件

1. **Nginx配置**
   - 文件: `/volume1/docker/nginx/conf.d/nas-nginx.conf`
   - 配置项: 服务器名称、SSL证书路径、反向代理设置

2. **应用配置**
   - 文件: `/volume1/web/diary-app/.env` (如果需要)
   - 配置项: 数据库连接、API密钥等

3. **备份配置**
   - 文件: `/volume1/web/diary-app/deploy/backup-strategy.sh`
   - 配置项: 备份目录、保留天数、数据库类型

### 环境变量

| 变量名 | 描述 | 默认值 |
|-------|------|-------|
| NODE_ENV | 运行环境 | production |
| PORT | 应用端口 | 3000 |
| DATABASE_URL | 数据库连接字符串 | sqlite://./prisma/db.sqlite |

## 故障排除

### 常见问题

1. **无法访问应用**
   - 检查端口转发是否正确配置
   - 检查Nginx是否运行
   - 检查应用服务是否启动

2. **SSL证书错误**
   - 检查证书文件路径是否正确
   - 检查域名解析是否生效
   - 检查防火墙是否阻止443端口

3. **应用启动失败**
   - 查看日志文件: `/volume1/web/diary-app/logs/app.log`
   - 检查Node.js版本是否兼容
   - 检查端口是否被占用

4. **备份失败**
   - 检查备份目录权限
   - 检查数据库连接
   - 查看备份日志

### 日志文件

- **应用日志**: `/volume1/web/diary-app/logs/app.log`
- **Nginx访问日志**: `/volume1/docker/nginx/logs/diary-access.log`
- **Nginx错误日志**: `/volume1/docker/nginx/logs/diary-error.log`
- **备份日志**: `/volume1/web/diary-app/logs/backup.log`

## 维护指南

### 定期维护

1. **每周检查**
   - 检查服务运行状态
   - 查看日志文件，排查错误
   - 验证备份是否成功

2. **每月维护**
   - 更新Node.js版本
   - 更新Nginx版本
   - 检查SSL证书到期时间

3. **每季度维护**
   - 清理过期日志文件
   - 优化数据库性能
   - 检查存储空间使用情况

### 更新应用

1. **获取最新代码**
   ```bash
   git pull origin main
   ```

2. **重新构建和部署**
   ```bash
   ./deploy/build-deploy.sh --full
   ```

3. **重启服务**
   ```bash
   # SSH登录NAS后执行
   cd /volume1/web/diary-app/deploy
   ./service-management.sh restart
   ```

### 扩展功能

1. **添加监控**
   - 使用Prometheus和Grafana监控应用性能
   - 设置告警通知

2. **使用CDN**
   - 配置Cloudflare等CDN服务
   - 提高静态资源加载速度

3. **多实例部署**
   - 使用负载均衡器
   - 提高应用可用性

## 安全建议

1. **访问控制**
   - 使用强密码
   - 限制SSH登录IP
   - 启用双因素认证

2. **网络安全**
   - 启用防火墙
   - 定期更新系统补丁
   - 关闭不必要的端口

3. **数据安全**
   - 定期备份数据
   - 加密敏感信息
   - 限制数据库访问权限

4. **应用安全**
   - 定期更新依赖包
   - 启用Content Security Policy
   - 防止SQL注入和XSS攻击

## 联系支持

如果遇到部署问题，请参考以下资源：

- **项目文档**: README.md
- **错误日志**: 查看相关日志文件
- **社区支持**: GitHub Issues
- **技术支持**: 联系系统管理员

## 版本历史

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| 1.0 | 2026-02-17 | 初始部署文档 |

---

**部署完成后，请访问: https://your-domain.com**

祝您使用愉快！
