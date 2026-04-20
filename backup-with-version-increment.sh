#!/bin/bash
# ITAM 系统备份脚本（自动递增版本）
# 用法: ./backup-with-version-increment.sh [--verify]
# 说明: 此脚本会先递增版本号，然后执行备份
#       适用于自动化备份场景，确保每次备份都有新的版本号

set -e

cd "$(dirname "$0")"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  ITAM 系统备份（自动递增版本）${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 是否验证备份
VERIFY=false
if [ "$1" = "--verify" ]; then
    VERIFY=true
fi

# 1. 递增版本号
echo -e "${YELLOW}📦 步骤 1/2: 递增版本号...${NC}"
if [ -f "increment-version.sh" ]; then
    chmod +x increment-version.sh
    ./increment-version.sh
else
    echo -e "${RED}❌ 错误: 找不到版本递增脚本 increment-version.sh${NC}"
    exit 1
fi

# 等待版本更新生效
echo -e "${YELLOW}⏳ 等待版本更新生效...${NC}"
sleep 3

# 2. 执行备份
echo ""
echo -e "${YELLOW}💾 步骤 2/2: 执行系统备份...${NC}"
echo ""

# 获取最新版本号（从API）
NEW_VERSION=$(curl -s http://localhost:3001/api/version | grep -o '"data":"[^"]*"' | sed 's/"data":"//' | sed 's/"//')

if [ -n "$NEW_VERSION" ]; then
    echo "备份版本: $NEW_VERSION"
    # 调用原始备份脚本，传入验证参数
    if [ "$VERIFY" = true ]; then
        ./backup.sh --verify
    else
        ./backup.sh
    fi
else
    echo -e "${RED}❌ 错误: 无法获取新版本号，备份终止${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  备份完成（版本已递增）！${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📊 总结:"
echo "  1. 版本已递增"
echo "  2. 系统已备份"
echo "  3. 新版本: $NEW_VERSION"
echo ""
echo "💡 提示: 此备份包含版本递增记录，可用于版本跟踪和回滚"
echo ""