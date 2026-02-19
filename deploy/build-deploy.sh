#!/bin/bash

# 构建和部署脚本
# 用于将日记应用构建并部署到NAS服务器

# 配置变量
PROJECT_DIR="$(pwd)"
BUILD_DIR="$PROJECT_DIR/.next/standalone"
NAS_USER="admin"
NAS_IP="192.168.1.100"
NAS_DIR="/volume1/web/diary-app"

# 显示帮助信息
show_help() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --build        仅构建项目"
    echo "  --deploy       仅部署到NAS"
    echo "  --full         完整流程（构建+部署）"
    echo "  --help         显示此帮助信息"
    echo ""
    echo "Examples:"
    echo "  $0 --full      # 构建并部署到NAS"
    echo "  $0 --build     # 仅构建项目"
    echo ""
}

# 安装依赖
install_dependencies() {
    echo "Installing dependencies..."
    if [ -f "$PROJECT_DIR/package.json" ]; then
        npm install
        if [ $? -ne 0 ]; then
            echo "Error: Failed to install dependencies"
            exit 1
        fi
    else
        echo "Error: package.json not found"
        exit 1
    fi
}

# 构建项目
build_project() {
    echo "Building project..."
    if [ -f "$PROJECT_DIR/package.json" ]; then
        npm run build
        if [ $? -ne 0 ]; then
            echo "Error: Failed to build project"
            exit 1
        fi
    else
        echo "Error: package.json not found"
        exit 1
    fi
}

# 部署到NAS
deploy_to_nas() {
    echo "Deploying to NAS..."
    
    # 检查构建目录是否存在
    if [ ! -d "$BUILD_DIR" ]; then
        echo "Error: Build directory not found. Please run build first."
        exit 1
    fi
    
    # 创建NAS目录
    echo "Creating directory on NAS..."
    ssh "$NAS_USER@$NAS_IP" "mkdir -p $NAS_DIR"
    
    # 复制构建文件到NAS
    echo "Copying files to NAS..."
    rsync -avz --progress "$BUILD_DIR/" "$NAS_USER@$NAS_IP:$NAS_DIR/"
    
    if [ $? -eq 0 ]; then
        echo "Deployment completed successfully!"
        echo ""
        echo "Next steps:"
        echo "1. Configure Nginx on your NAS"
        echo "2. Set up SSL certificates"
        echo "3. Start the application on NAS"
        echo "4. Configure port forwarding on your router"
    else
        echo "Error: Failed to deploy to NAS"
        exit 1
    fi
}

# 主函数
main() {
    if [ $# -eq 0 ]; then
        show_help
        exit 0
    fi
    
    case "$1" in
        --build)
            install_dependencies
            build_project
            ;;
        --deploy)
            deploy_to_nas
            ;;
        --full)
            install_dependencies
            build_project
            deploy_to_nas
            ;;
        --help)
            show_help
            ;;
        *)
            echo "Error: Invalid option"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
