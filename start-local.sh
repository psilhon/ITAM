#!/bin/bash
# ITAM 本地运行脚本（PM2 管理）
# 用法: ./start-local.sh [dev|start|stop|restart|logs|status|install]

set -e

cd "$(dirname "$0")"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# PM2 配置
PM2_CONFIG="ecosystem.config.js"
APP_NAME="itam-backend"

usage() {
    echo "用法: $0 {dev|start|stop|restart|logs|status|install}"
    echo ""
    echo "命令:"
    echo "  dev     开发模式（前后端分离，热重载）"
    echo "  start   生产模式（PM2 管理后端）"
    echo "  stop    停止服务"
    echo "  restart 重启服务"
    echo "  logs    查看日志 (Ctrl+C 退出)"
    echo "  status  查看状态"
    echo "  install 安装依赖"
    echo ""
    echo "示例:"
    echo "  $0 install  # 首次运行或依赖更新后"
    echo "  $0 dev     # 开发模式"
    echo "  $0 start   # 生产模式"
}

# 检查 PM2
check_pm2() {
    if ! command -v pm2 &> /dev/null; then
        echo -e "${RED}错误: PM2 未安装，请先运行: npm install -g pm2${NC}"
        exit 1
    fi
}

# 检查依赖
check_dependencies() {
    if ! command -v node &> /dev/null; then
        echo -e "${RED}错误: 未找到 Node.js${NC}"
        exit 1
    fi
}

# 安装后端依赖
install_backend() {
    echo -e "${YELLOW}📦 安装后端依赖...${NC}"
    cd backend
    npm install
    npx prisma generate
    cd ..
    echo -e "${GREEN}✅ 后端依赖安装完成${NC}"
}

# 安装前端依赖
install_frontend() {
    echo -e "${YELLOW}📦 安装前端依赖...${NC}"
    cd frontend
    npm install
    cd ..
    echo -e "${GREEN}✅ 前端依赖安装完成${NC}"
}

# 开发模式
run_dev() {
    check_dependencies

    # 确保后端已构建
    if [ ! -d "backend/dist" ]; then
        echo -e "${YELLOW}🔨 构建后端...${NC}"
        cd backend
        npm run build
        cd ..
    fi

    # 停止可能运行的 PM2 实例
    pm2 stop $APP_NAME 2>/dev/null || true

    # 启动后端（开发模式，使用 ts-node-dev）
    echo -e "${YELLOW}🚀 启动后端（开发模式）...${NC}"
    cd backend
    NODE_ENV=development PORT=3001 HOST=127.0.0.1 DATABASE_URL="file:./prisma/dev.db" \
    SERVE_STATIC="false" CORS_ORIGINS="http://localhost:5173,http://127.0.0.1:5173" \
    pm2 start npm --name "$APP_NAME" -- run dev
    cd ..

    # 等待后端启动
    sleep 3

    # 启动前端（开发模式）
    echo -e "${YELLOW}🎨 启动前端（开发模式）...${NC}"
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..

    echo ""
    echo -e "${GREEN}✅ 开发服务已启动${NC}"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${GREEN}🔗 前端地址: http://localhost:5173${NC}"
    echo -e "${GREEN}🔗 后端API:  http://localhost:3001${NC}"
    echo ""
    echo "按 Ctrl+C 停止开发服务"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # 捕获退出信号
    trap "pm2 stop $APP_NAME 2>/dev/null; kill $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

    wait
}

# 生产模式
run_start() {
    check_pm2
    check_dependencies

    # 构建前端
    echo -e "${YELLOW}🔨 构建前端...${NC}"
    cd frontend
    npm run build
    cd ..

    # 部署前端资源
    echo -e "${YELLOW}📁 部署前端资源...${NC}"
    mkdir -p backend/dist/public
    rm -rf backend/dist/public/*
    cp -r frontend/dist/* backend/dist/public/

    # 构建后端
    echo -e "${YELLOW}🔨 构建后端...${NC}"
    cd backend
    npm run build
    cd ..

    # 创建日志目录
    mkdir -p logs

    # 启动服务
    echo -e "${YELLOW}🚀 启动后端（PM2 生产模式）...${NC}"
    pm2 delete $APP_NAME 2>/dev/null || true

    # 创建日志目录
    mkdir -p logs

    # 启动（环境变量在 ecosystem.config.js 中配置）
    pm2 start $PM2_CONFIG

    echo ""
    echo -e "${GREEN}✅ 服务已启动${NC}"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${GREEN}🔗 访问地址: http://localhost:3001${NC}"
    echo ""
    echo "PM2 命令:"
    echo "  pm2 logs $APP_NAME    # 查看日志"
    echo "  pm2 restart $APP_NAME # 重启"
    echo "  pm2 stop $APP_NAME   # 停止"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# PM2 操作
pm2_stop() {
    check_pm2
    pm2 stop $APP_NAME
    echo -e "${GREEN}✅ 服务已停止${NC}"
}

pm2_restart() {
    check_pm2
    pm2 restart $APP_NAME
    echo -e "${GREEN}✅ 服务已重启${NC}"
}

pm2_logs() {
    check_pm2
    pm2 logs $APP_NAME
}

pm2_status() {
    check_pm2
    pm2 list
}

# 安装所有依赖
run_install() {
    check_dependencies
    install_backend
    install_frontend
    echo ""
    echo -e "${GREEN}✅ 所有依赖安装完成！${NC}"
    echo ""
    echo "下一步:"
    echo "  $0 dev   # 开发模式"
    echo "  $0 start # 生产模式"
}

# 主逻辑
case "${1:-}" in
    dev)
        run_dev
        ;;
    start)
        run_start
        ;;
    stop)
        pm2_stop
        ;;
    restart)
        pm2_restart
        ;;
    logs)
        pm2_logs
        ;;
    status)
        pm2_status
        ;;
    install)
        run_install
        ;;
    *)
        usage
        exit 1
        ;;
esac
