#!/bin/bash

# 服务管理脚本
# 用于在NAS服务器上管理日记应用服务

# 配置变量
APP_DIR="/volume1/web/diary-app"
LOG_DIR="/volume1/web/diary-app/logs"
APP_PORT="3000"
APP_NAME="diary-app"

# 创建日志目录
mkdir -p $LOG_DIR

# 显示帮助信息
show_help() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start         启动服务"
    echo "  stop          停止服务"
    echo "  restart       重启服务"
    echo "  status        查看服务状态"
    echo "  enable        启用开机自启"
    echo "  disable       禁用开机自启"
    echo "  help          显示此帮助信息"
    echo ""
    echo "Examples:"
    echo "  $0 start      # 启动日记应用服务"
    echo "  $0 status     # 查看服务运行状态"
    echo ""
}

# 检查服务是否运行
is_running() {
    if pgrep -f "server.js" | grep -v pgrep > /dev/null; then
        return 0
    else
        return 1
    fi
}

# 启动服务
start_service() {
    echo "Starting $APP_NAME service..."
    
    if is_running; then
        echo "Error: $APP_NAME is already running"
        exit 1
    fi
    
    # 切换到应用目录
    cd $APP_DIR || {
        echo "Error: Could not change to $APP_DIR"
        exit 1
    }
    
    # 启动应用
    NODE_ENV=production node server.js > $LOG_DIR/app.log 2>&1 &
    
    # 等待服务启动
    sleep 3
    
    if is_running; then
        echo "$APP_NAME started successfully on port $APP_PORT"
        echo "Log file: $LOG_DIR/app.log"
    else
        echo "Error: Failed to start $APP_NAME"
        echo "Check log file: $LOG_DIR/app.log"
        exit 1
    fi
}

# 停止服务
stop_service() {
    echo "Stopping $APP_NAME service..."
    
    if ! is_running; then
        echo "Error: $APP_NAME is not running"
        exit 1
    fi
    
    # 查找并终止进程
    pgrep -f "server.js" | grep -v pgrep | xargs kill -9
    
    # 等待进程终止
    sleep 2
    
    if ! is_running; then
        echo "$APP_NAME stopped successfully"
    else
        echo "Error: Failed to stop $APP_NAME"
        exit 1
    fi
}

# 重启服务
restart_service() {
    echo "Restarting $APP_NAME service..."
    stop_service
    sleep 2
    start_service
}

# 查看服务状态
check_status() {
    echo "Checking $APP_NAME status..."
    
    if is_running; then
        echo "$APP_NAME is running on port $APP_PORT"
        echo "Process ID: $(pgrep -f "server.js" | grep -v pgrep)"
        echo "Log file: $LOG_DIR/app.log"
    else
        echo "$APP_NAME is not running"
    fi
}

# 启用开机自启
enable_autostart() {
    echo "Enabling $APP_NAME autostart..."
    
    # 检测NAS类型
    if [ -f "/usr/syno/bin/synopkg" ]; then
        # Synology NAS
        echo "Synology NAS detected"
        
        # 创建启动脚本
        cat > /usr/local/etc/rc.d/S99$APP_NAME.sh << 'EOF'
#!/bin/bash

case $1 in
    start)
        /volume1/web/diary-app/deploy/service-management.sh start
        ;;
    stop)
        /volume1/web/diary-app/deploy/service-management.sh stop
        ;;
    *)
        echo "Usage: $0 {start|stop}"
        exit 1
        ;;
esac
EOF
        
        chmod +x /usr/local/etc/rc.d/S99$APP_NAME.sh
        echo "Autostart enabled for Synology NAS"
        
    elif [ -f "/sbin/qpkg_cli" ]; then
        # QNAP NAS
        echo "QNAP NAS detected"
        echo "Please add the following command to your QTS startup scripts:"
        echo "/volume1/web/diary-app/deploy/service-management.sh start"
        echo "You can do this via Control Panel > System > Hardware > General Settings > Startup Script"
        
    else
        # 其他Linux系统
        echo "Generic Linux system detected"
        
        # 创建systemd服务文件
        cat > /etc/systemd/system/$APP_NAME.service << 'EOF'
[Unit]
Description=Diary App Service
After=network.target

[Service]
Type=simple
WorkingDirectory=/volume1/web/diary-app
ExecStart=/usr/bin/node server.js
Environment=NODE_ENV=production
Restart=always
RestartSec=3
StandardOutput=file:/volume1/web/diary-app/logs/app.log
StandardError=file:/volume1/web/diary-app/logs/app.log

[Install]
WantedBy=multi-user.target
EOF
        
        systemctl daemon-reload
        systemctl enable $APP_NAME.service
        echo "Autostart enabled via systemd"
    fi
    
    echo "Autostart configuration completed"
}

# 禁用开机自启
disable_autostart() {
    echo "Disabling $APP_NAME autostart..."
    
    # 检测NAS类型
    if [ -f "/usr/syno/bin/synopkg" ]; then
        # Synology NAS
        if [ -f "/usr/local/etc/rc.d/S99$APP_NAME.sh" ]; then
            rm /usr/local/etc/rc.d/S99$APP_NAME.sh
            echo "Autostart disabled for Synology NAS"
        else
            echo "Autostart script not found"
        fi
        
    elif [ -f "/sbin/qpkg_cli" ]; then
        # QNAP NAS
        echo "QNAP NAS detected"
        echo "Please remove the startup command from QTS startup scripts"
        echo "You can do this via Control Panel > System > Hardware > General Settings > Startup Script"
        
    else
        # 其他Linux系统
        if systemctl list-unit-files | grep -q "$APP_NAME.service"; then
            systemctl disable $APP_NAME.service
            rm /etc/systemd/system/$APP_NAME.service
            systemctl daemon-reload
            echo "Autostart disabled via systemd"
        else
            echo "Systemd service not found"
        fi
    fi
    
    echo "Autostart disabled"
}

# 主函数
main() {
    if [ $# -eq 0 ]; then
        show_help
        exit 0
    fi
    
    case "$1" in
        start)
            start_service
            ;;
        stop)
            stop_service
            ;;
        restart)
            restart_service
            ;;
        status)
            check_status
            ;;
        enable)
            enable_autostart
            ;;
        disable)
            disable_autostart
            ;;
        help)
            show_help
            ;;
        *)
            echo "Error: Invalid command"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
