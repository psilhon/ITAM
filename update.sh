#!/bin/bash
# ITAM 系统更新脚本
# 用法: ./update.sh [--skip-backup]
#   --skip-backup  跳过备份（仅在短时间内重复更新时使用）

set -e

cd "$(dirname "$0")"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 是否跳过备份
SKIP_BACKUP=false
if [ "$1" = "--skip-backup" ]; then
    SKIP_BACKUP=true
fi

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  ITAM 系统更新${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 0. 记录更新前状态
echo -e "${YELLOW}📊 步骤 0/5: 记录更新前状态...${NC}"
PRE_VERSION=$(curl -s http://localhost:3001/api/version 2>/dev/null || echo "无法获取")
echo "更新前版本: ${PRE_VERSION}"
echo ""

# 1. 备份当前系统
if [ "$SKIP_BACKUP" = false ]; then
    echo -e "${YELLOW}📦 步骤 1/5: 备份当前系统...${NC}"
    ./backup.sh --verify
    echo ""
else
    echo -e "${YELLOW}📦 步骤 1/5: 跳过备份（--skip-backup）${NC}"
fi

# 2. 停止服务
echo -e "${YELLOW}🛑 步骤 2/5: 停止服务...${NC}"
pm2 stop itam-backend 2>/dev/null || true
sleep 1
echo -e "${GREEN}✅ 服务已停止${NC}"
echo ""

# 3. 执行更新（构建）
echo -e "${YELLOW}🔨 步骤 3/5: 构建并部署...${NC}"
echo "   构建前端..."
cd frontend && npm run build && cd ..
echo "   部署前端..."
mkdir -p backend/dist/public
rm -rf backend/dist/public/*
cp -r frontend/dist/* backend/dist/public/
echo "   构建后端..."
cd backend && npm run build && cd ..
echo -e "${GREEN}✅ 构建完成${NC}"
echo ""

# 4. 启动服务
echo -e "${YELLOW}🚀 步骤 4/5: 启动服务...${NC}"
pm2 delete itam-backend 2>/dev/null || true
mkdir -p logs
pm2 start ecosystem.config.js
sleep 3
echo ""

# 5. 验证（强制）
echo -e "${YELLOW}🔍 步骤 5/5: 功能验证（必须通过）...${NC}"
echo ""

PASS_COUNT=0
FAIL_COUNT=0

# 5.1 API 健康检查
echo -n "  [1/4] API 健康检查: "
API_RESULT=$(curl -s http://localhost:3001/api/health 2>/dev/null || echo "")
if echo "$API_RESULT" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✅ 通过${NC}"
    ((PASS_COUNT++))
else
    echo -e "${RED}❌ 失败${NC}"
    echo "     响应: $API_RESULT"
    ((FAIL_COUNT++))
fi

# 5.2 首页检查
echo -n "  [2/4] 首页访问: "
HOME_RESULT=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/ 2>/dev/null || echo "000")
if [ "$HOME_RESULT" = "200" ]; then
    echo -e "${GREEN}✅ 通过 (HTTP 200)${NC}"
    ((PASS_COUNT++))
else
    echo -e "${RED}❌ 失败 (HTTP ${HOME_RESULT})${NC}"
    ((FAIL_COUNT++))
fi

# 5.3 版本检查
echo -n "  [3/4] 版本接口: "
VERSION=$(curl -s http://localhost:3001/api/version 2>/dev/null || echo "")
if echo "$VERSION" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ 通过${NC}"
    echo "     版本: $VERSION"
    ((PASS_COUNT++))
else
    echo -e "${RED}❌ 失败${NC}"
    echo "     响应: $VERSION"
    ((FAIL_COUNT++))
fi

# 5.4 服务器列表检查
echo -n "  [4/4] 服务器API: "
SERVERS=$(curl -s http://localhost:3001/api/servers 2>/dev/null | head -c 100 || echo "")
if echo "$SERVERS" | grep -q '"success"'; then
    echo -e "${GREEN}✅ 通过${NC}"
    ((PASS_COUNT++))
else
    echo -e "${RED}❌ 失败${NC}"
    echo "     响应: $SERVERS"
    ((FAIL_COUNT++))
fi

# PM2 状态
echo ""
echo -e "${YELLOW}PM2 进程状态:${NC}"
pm2 list

echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  验证结果${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "通过: ${GREEN}${PASS_COUNT}/4${NC}  |  失败: ${RED}${FAIL_COUNT}/4${NC}"
echo ""

# 判断更新是否成功
if [ "$FAIL_COUNT" -eq 0 ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  ✅ 更新成功！${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "访问地址: ${GREEN}http://localhost:3001${NC}"
    echo ""
    echo -e "下一步:"
    echo -e "  1. 访问系统验证功能"
    echo -e "  2. 更新 docs/CHANGELOG.md 记录本次更新"
    echo ""
    exit 0
else
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}  ❌ 更新失败！验证未通过！${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}可能的解决方案:${NC}"
    echo "  1. 检查日志: pm2 logs itam-backend"
    echo "  2. 恢复备份: cp backups/最新日期/database/dev.db backend/prisma/dev.db"
    echo "  3. 重启服务: ./start-local.sh restart"
    echo ""
    exit 1
fi
