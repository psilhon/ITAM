#!/bin/bash
# ITAM 系统备份脚本
# 用法: ./backup.sh [--increment-version] [--verify]
#   --increment-version  备份前自动递增版本号
#   --verify            备份后验证备份是否可用

set -e

cd "$(dirname "$0")"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 是否验证备份
VERIFY=false
if [ "$1" = "--verify" ]; then
    VERIFY=true
fi

# 是否自动递增版本号
AUTO_INCREMENT_VERSION=false
if [ "$1" = "--increment-version" ] || [ "$2" = "--increment-version" ]; then
    AUTO_INCREMENT_VERSION=true
fi

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  ITAM 系统备份${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 0. 版本递增（仅当需要更新版本号时）
if [ "$AUTO_INCREMENT_VERSION" = "true" ]; then
    echo -e "${YELLOW}⬆️  自动递增版本号...${NC}"
    if [ -f "increment-version.sh" ]; then
        chmod +x increment-version.sh
        ./increment-version.sh
        echo ""
    else
        echo -e "${RED}⚠️  找不到版本递增脚本 increment-version.sh${NC}"
    fi
fi

# 备份目录
BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
BACKUP_PATH="${BACKUP_DIR}/${TIMESTAMP}"

# 创建备份目录
echo -e "${YELLOW}📁 创建备份目录...${NC}"
mkdir -p "${BACKUP_PATH}/database"
mkdir -p "${BACKUP_PATH}/config"
mkdir -p "${BACKUP_PATH}/program/backend/src"
mkdir -p "${BACKUP_PATH}/program/backend/dist"
mkdir -p "${BACKUP_PATH}/program/frontend/src"
mkdir -p "${BACKUP_PATH}/program/frontend/dist"
mkdir -p "${BACKUP_PATH}/scripts"
echo -e "${GREEN}✅ 备份目录: ${BACKUP_PATH}${NC}"
echo ""

# 1. 备份数据库
echo -e "${YELLOW}💾 步骤 1/5: 备份数据库...${NC}"
if [ -f "backend/prisma/dev.db" ]; then
    cp backend/prisma/dev.db "${BACKUP_PATH}/database/dev.db"
    DB_SIZE=$(ls -lh "${BACKUP_PATH}/database/dev.db" | awk '{print $5}')
    echo -e "${GREEN}✅ 数据库已备份 (${DB_SIZE})${NC}"

    # 数据库记录数（表名是 PascalCase）
    SERVER_COUNT=$(sqlite3 "${BACKUP_PATH}/database/dev.db" "SELECT COUNT(*) FROM Server;" 2>/dev/null || echo "0")
    DEVICE_COUNT=$(sqlite3 "${BACKUP_PATH}/database/dev.db" "SELECT COUNT(*) FROM NetworkDevice;" 2>/dev/null || echo "0")
    echo "   服务器: ${SERVER_COUNT} 条"
    echo "   网络设备: ${DEVICE_COUNT} 条"
else
    echo -e "${RED}⚠️  数据库文件不存在${NC}"
fi
echo ""

# 2. 备份配置文件
echo -e "${YELLOW}⚙️  步骤 2/5: 备份配置文件...${NC}"
[ -f "ecosystem.config.js" ] && cp ecosystem.config.js "${BACKUP_PATH}/config/"
[ -f "start-local.sh" ] && cp start-local.sh "${BACKUP_PATH}/config/"
[ -f "package.json" ] && [ -d "backend" ] && cp backend/package.json "${BACKUP_PATH}/config/backend-package.json" 2>/dev/null || true
[ -f "frontend/package.json" ] && cp frontend/package.json "${BACKUP_PATH}/config/frontend-package.json" 2>/dev/null || true
echo -e "${GREEN}✅ 配置文件已备份${NC}"
echo ""

# 3. 备份后端程序
echo -e "${YELLOW}📦 步骤 3/5: 备份后端程序...${NC}"
# 源码
if [ -d "backend/src" ]; then
    cp -r backend/src "${BACKUP_PATH}/program/backend/"
    echo "   后端源码: backend/src"
fi
# 构建产物
if [ -d "backend/dist" ]; then
    cp -r backend/dist "${BACKUP_PATH}/program/backend/"
    echo "   后端构建: backend/dist"
fi
# Prisma
if [ -d "backend/prisma" ]; then
    cp -r backend/prisma/schema.prisma "${BACKUP_PATH}/program/backend/prisma-schema.prisma" 2>/dev/null || true
fi
echo -e "${GREEN}✅ 后端程序已备份${NC}"
echo ""

# 4. 备份前端程序
echo -e "${YELLOW}🎨 步骤 4/5: 备份前端程序...${NC}"
# 源码
if [ -d "frontend/src" ]; then
    cp -r frontend/src "${BACKUP_PATH}/program/frontend/"
    echo "   前端源码: frontend/src"
fi
# 构建产物
if [ -d "frontend/dist" ]; then
    cp -r frontend/dist "${BACKUP_PATH}/program/frontend/"
    echo "   前端构建: frontend/dist"
fi
# 部署的静态文件
if [ -d "backend/dist/public" ]; then
    cp -r backend/dist/public "${BACKUP_PATH}/program/backend-public/"
    echo "   部署文件: backend/dist/public"
fi
echo -e "${GREEN}✅ 前端程序已备份${NC}"
echo ""

# 5. 备份脚本和文档
echo -e "${YELLOW}📝 步骤 5/5: 备份脚本...${NC}"
[ -f "backup.sh" ] && cp backup.sh "${BACKUP_PATH}/scripts/"
[ -f "update.sh" ] && cp update.sh "${BACKUP_PATH}/scripts/"
[ -f "start-local.sh" ] && cp start-local.sh "${BACKUP_PATH}/scripts/"
[ -f "ecosystem.config.js" ] && cp ecosystem.config.js "${BACKUP_PATH}/scripts/"
echo -e "${GREEN}✅ 脚本已备份${NC}"
echo ""

# 创建备份信息
echo -e "${YELLOW}📋 创建备份记录...${NC}"
cat > "${BACKUP_PATH}/info.txt" << EOF
ITAM 备份信息
=============
备份时间: ${TIMESTAMP}
版本号: v4.5.8
主机: $(hostname)
用户: $(whoami)
备份路径: ${BACKUP_PATH}

备份内容:
├── database/
│   └── dev.db
├── config/
│   ├── ecosystem.config.js
│   ├── start-local.sh
│   ├── backend-package.json
│   └── frontend-package.json
├── program/
│   ├── backend/src/
│   ├── backend/dist/
│   ├── backend/prisma-schema.prisma
│   ├── frontend/src/
│   ├── frontend/dist/
│   └── backend-public/
└── scripts/
    ├── backup.sh
    ├── update.sh
    ├── start-local.sh
    └── ecosystem.config.js

数据库记录:
- 服务器: ${SERVER_COUNT:-0} 条
- 网络设备: ${DEVICE_COUNT:-0} 条
（表名采用 PascalCase: Server, NetworkDevice）

PM2 状态:
$(pm2 list 2>/dev/null || echo "PM2 未运行")

文件大小:
$(du -sh "${BACKUP_PATH}" 2>/dev/null || echo "无法计算")
EOF
echo -e "${GREEN}✅ 备份记录已创建${NC}"

# 显示备份结果
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  备份完成！${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "备份位置: ${BACKUP_PATH}"
BACKUP_SIZE=$(du -sh "${BACKUP_PATH}" 2>/dev/null | cut -f1)
echo "备份大小: ${BACKUP_SIZE}"
echo ""

# 验证备份
if [ "$VERIFY" = true ]; then
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}  验证备份...${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    VERIFY_PASS=true

    # 验证数据库
    echo -n "数据库验证: "
    if [ -f "${BACKUP_PATH}/database/dev.db" ]; then
        if sqlite3 "${BACKUP_PATH}/database/dev.db" "SELECT COUNT(*) FROM Server;" >/dev/null 2>&1; then
            SERVER_CNT=$(sqlite3 "${BACKUP_PATH}/database/dev.db" "SELECT COUNT(*) FROM Server;" 2>/dev/null)
            echo -e "${GREEN}✅ 通过 (${SERVER_CNT} 条记录)${NC}"
        else
            echo -e "${RED}❌ 失败${NC}"
            VERIFY_PASS=false
        fi
    else
        echo -e "${RED}⚠️  未找到数据库文件${NC}"
        VERIFY_PASS=false
    fi

    # 验证后端构建
    echo -n "后端构建验证: "
    if [ -f "${BACKUP_PATH}/program/backend/dist/index.js" ]; then
        echo -e "${GREEN}✅ 通过${NC}"
    else
        echo -e "${RED}⚠️  未找到后端构建文件${NC}"
        VERIFY_PASS=false
    fi

    # 验证前端构建
    echo -n "前端构建验证: "
    if [ -f "${BACKUP_PATH}/program/frontend/dist/index.html" ]; then
        echo -e "${GREEN}✅ 通过${NC}"
    else
        echo -e "${RED}⚠️  未找到前端构建文件${NC}"
        VERIFY_PASS=false
    fi

    # 验证配置文件
    echo -n "配置文件验证: "
    if [ -f "${BACKUP_PATH}/config/ecosystem.config.js" ] && [ -f "${BACKUP_PATH}/config/start-local.sh" ]; then
        echo -e "${GREEN}✅ 通过${NC}"
    else
        echo -e "${RED}⚠️  配置文件不完整${NC}"
        VERIFY_PASS=false
    fi

    echo ""
    if [ "$VERIFY_PASS" = true ]; then
        echo -e "${GREEN}✅ 备份验证全部通过！${NC}"
    else
        echo -e "${RED}⚠️  备份验证有问题，请检查${NC}"
    fi
fi

echo ""
echo -e "${GREEN}✅ 备份成功${NC}"
