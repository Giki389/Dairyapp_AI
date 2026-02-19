#!/bin/bash

# 数据备份策略脚本
# 用于备份日记应用的数据库和重要文件

# 配置变量
APP_DIR="/volume1/web/diary-app"
BACKUP_DIR="/volume1/backup/diary-app"
BACKUP_RETENTION="7"
# 数据库配置（根据实际情况修改）
DB_TYPE="sqlite"
DB_PATH="$APP_DIR/prisma/db.sqlite"
# 或者使用PostgreSQL
# DB_TYPE="postgresql"
# DB_HOST="localhost"
# DB_PORT="5432"
# DB_NAME="diary_app"
# DB_USER="admin"
# DB_PASS="password"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 显示帮助信息
show_help() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  backup        执行备份"
    echo "  restore       恢复备份"
    echo "  list          列出备份"
    echo "  clean         清理过期备份"
    echo "  schedule      设置自动备份"
    echo "  help          显示此帮助信息"
    echo ""
    echo "Examples:"
    echo "  $0 backup     # 执行手动备份"
    echo "  $0 list       # 列出所有备份"
    echo ""
}

# 执行备份
execute_backup() {
    echo "Starting backup..."
    
    # 创建备份文件名
    BACKUP_DATE=$(date +"%Y%m%d_%H%M%S")
    BACKUP_FILE="$BACKUP_DIR/diary-app-backup-$BACKUP_DATE.tar.gz"
    
    # 创建临时备份目录
    TMP_DIR=$(mktemp -d)
    
    # 备份数据库
    echo "Backing up database..."
    if [ "$DB_TYPE" = "sqlite" ]; then
        if [ -f "$DB_PATH" ]; then
            cp "$DB_PATH" "$TMP_DIR/db.sqlite"
        else
            echo "Warning: SQLite database file not found at $DB_PATH"
        fi
    elif [ "$DB_TYPE" = "postgresql" ]; then
        # 备份PostgreSQL数据库
        PGPASSWORD=$DB_PASS pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > "$TMP_DIR/db.sql"
    fi
    
    # 备份配置文件
    echo "Backing up configuration files..."
    if [ -f "$APP_DIR/.env" ]; then
        cp "$APP_DIR/.env" "$TMP_DIR/.env"
    fi
    if [ -f "$APP_DIR/next.config.ts" ]; then
        cp "$APP_DIR/next.config.ts" "$TMP_DIR/"
    fi
    
    # 备份静态文件（如果有）
    echo "Backing up static files..."
    if [ -d "$APP_DIR/public" ]; then
        cp -r "$APP_DIR/public" "$TMP_DIR/"
    fi
    
    # 备份日志文件（可选）
    if [ -d "$APP_DIR/logs" ]; then
        cp -r "$APP_DIR/logs" "$TMP_DIR/"
    fi
    
    # 创建压缩备份文件
    echo "Creating backup archive..."
    cd "$TMP_DIR" && tar -czf "$BACKUP_FILE" *
    
    # 清理临时目录
    rm -rf "$TMP_DIR"
    
    if [ -f "$BACKUP_FILE" ]; then
        echo "Backup completed successfully!"
        echo "Backup file: $BACKUP_FILE"
        echo "Size: $(du -h "$BACKUP_FILE" | cut -f1)"
        
        # 清理过期备份
        clean_old_backups
    else
        echo "Error: Failed to create backup"
        exit 1
    fi
}

# 恢复备份
restore_backup() {
    echo "Starting restore..."
    
    # 列出可用备份
    echo "Available backups:"
    ls -la $BACKUP_DIR/
    
    # 提示用户选择备份文件
    read -p "Enter backup filename to restore: " BACKUP_FILE
    
    if [ ! -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
        echo "Error: Backup file not found"
        exit 1
    fi
    
    # 停止服务
    echo "Stopping diary app service..."
    if [ -f "$APP_DIR/deploy/service-management.sh" ]; then
        "$APP_DIR/deploy/service-management.sh" stop
    fi
    
    # 创建临时恢复目录
    TMP_DIR=$(mktemp -d)
    
    # 解压备份文件
    echo "Extracting backup..."
    tar -xzf "$BACKUP_DIR/$BACKUP_FILE" -C "$TMP_DIR"
    
    # 恢复数据库
    echo "Restoring database..."
    if [ "$DB_TYPE" = "sqlite" ]; then
        if [ -f "$TMP_DIR/db.sqlite" ]; then
            cp "$TMP_DIR/db.sqlite" "$DB_PATH"
        else
            echo "Warning: Database backup not found in archive"
        fi
    elif [ "$DB_TYPE" = "postgresql" ]; then
        if [ -f "$TMP_DIR/db.sql" ]; then
            PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME < "$TMP_DIR/db.sql"
        else
            echo "Warning: Database backup not found in archive"
        fi
    fi
    
    # 恢复配置文件
    echo "Restoring configuration files..."
    if [ -f "$TMP_DIR/.env" ]; then
        cp "$TMP_DIR/.env" "$APP_DIR/"
    fi
    if [ -f "$TMP_DIR/next.config.ts" ]; then
        cp "$TMP_DIR/next.config.ts" "$APP_DIR/"
    fi
    
    # 恢复静态文件
    echo "Restoring static files..."
    if [ -d "$TMP_DIR/public" ]; then
        rm -rf "$APP_DIR/public"
        cp -r "$TMP_DIR/public" "$APP_DIR/"
    fi
    
    # 清理临时目录
    rm -rf "$TMP_DIR"
    
    # 启动服务
    echo "Starting diary app service..."
    if [ -f "$APP_DIR/deploy/service-management.sh" ]; then
        "$APP_DIR/deploy/service-management.sh" start
    fi
    
    echo "Restore completed successfully!"
}

# 列出备份
list_backups() {
    echo "Listing backups..."
    echo ""
    
    if [ -d "$BACKUP_DIR" ]; then
        ls -la $BACKUP_DIR/
        echo ""
        echo "Total backups: $(ls -la $BACKUP_DIR/ | wc -l | awk '{print $1-2}')"
    else
        echo "Error: Backup directory not found"
        exit 1
    fi
}

# 清理过期备份
clean_old_backups() {
    echo "Cleaning old backups..."
    
    # 保留最近N个备份，删除其余的
    if [ -d "$BACKUP_DIR" ]; then
        BACKUP_COUNT=$(ls -la $BACKUP_DIR/ | wc -l | awk '{print $1-2}')
        if [ $BACKUP_COUNT -gt $BACKUP_RETENTION ]; then
            # 按时间排序，删除最旧的备份
            ls -t $BACKUP_DIR/ | tail -n +$((BACKUP_RETENTION+1)) | xargs -I {} rm -f "$BACKUP_DIR/{}"
            echo "Cleaned $(ls -la $BACKUP_DIR/ | wc -l | awk '{print $1-2}') old backups"
        else
            echo "No old backups to clean"
        fi
    fi
}

# 设置自动备份
schedule_backup() {
    echo "Setting up automatic backup..."
    
    # 创建cron作业
    CRON_JOB="0 3 * * * $APP_DIR/deploy/backup-strategy.sh backup >> $APP_DIR/logs/backup.log 2>&1"
    
    # 检测NAS类型
    if [ -f "/usr/syno/bin/synopkg" ]; then
        # Synology NAS
        echo "Synology NAS detected"
        echo "Please add the following cron job via Task Scheduler:"
        echo "Command: $APP_DIR/deploy/backup-strategy.sh backup"
        echo "Schedule: Daily at 3:00 AM"
        echo "Output: $APP_DIR/logs/backup.log"
        
    elif [ -f "/sbin/qpkg_cli" ]; then
        # QNAP NAS
        echo "QNAP NAS detected"
        echo "Please add the following cron job via Control Panel > System > Scheduled Tasks:"
        echo "Command: $APP_DIR/deploy/backup-strategy.sh backup"
        echo "Schedule: Daily at 3:00 AM"
        
    else
        # 其他Linux系统
        echo "Generic Linux system detected"
        
        # 添加到crontab
        (crontab -l 2>/dev/null | grep -v "backup-strategy.sh"; echo "$CRON_JOB") | crontab -
        echo "Automatic backup scheduled: Daily at 3:00 AM"
    fi
    
    echo "Backup schedule configured"
}

# 主函数
main() {
    if [ $# -eq 0 ]; then
        show_help
        exit 0
    fi
    
    case "$1" in
        backup)
            execute_backup
            ;;
        restore)
            restore_backup
            ;;
        list)
            list_backups
            ;;
        clean)
            clean_old_backups
            ;;
        schedule)
            schedule_backup
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
