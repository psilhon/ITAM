#!/bin/bash
# ITAM 版本号递增脚本
# 每次备份前调用此脚本自动递增版本号

set -e

cd "$(dirname "$0")"

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}📦 正在递增版本号...${NC}"
echo ""

# 1. 获取当前版本
CURRENT_VERSION_FILE="backend/src/index.ts"
BACKUP_SCRIPT="backup.sh"

if [ ! -f "$CURRENT_VERSION_FILE" ]; then
    echo "❌ 错误: 找不到版本文件 $CURRENT_VERSION_FILE"
    exit 1
fi

if [ ! -f "$BACKUP_SCRIPT" ]; then
    echo "❌ 错误: 找不到备份脚本 $BACKUP_SCRIPT"
    exit 1
fi

# 提取当前版本号
# 查找 "export const APP_VERSION = process.env.APP_VERSION || 'vX.X.X'"
CURRENT_VERSION=$(grep -o "export const APP_VERSION = process\.env\.APP_VERSION || '[^']*'" "$CURRENT_VERSION_FILE" | sed "s/.*|| '\([^']*\)'.*/\1/")
BACKUP_VERSION=$(grep -o "版本号: v[0-9]\+\.[0-9]\+\.[0-9]\+" "$BACKUP_SCRIPT" | sed "s/版本号: //")

if [ -z "$CURRENT_VERSION" ]; then
    echo "❌ 错误: 无法从 $CURRENT_VERSION_FILE 提取当前版本号"
    exit 1
fi

if [ -z "$BACKUP_VERSION" ]; then
    echo "❌ 错误: 无法从 $BACKUP_SCRIPT 提取备份脚本版本号"
    exit 1
fi

echo "当前版本: $CURRENT_VERSION"
echo "备份脚本版本: $BACKUP_VERSION"

# 验证版本号格式
if [[ ! "$CURRENT_VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "❌ 错误: 版本号格式不正确: $CURRENT_VERSION (期望格式: vX.X.X)"
    exit 1
fi

if [[ ! "$BACKUP_VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "❌ 错误: 备份脚本版本号格式不正确: $BACKUP_VERSION (期望格式: vX.X.X)"
    exit 1
fi

# 2. 递增修订号 (patch version)
# 格式: v主版本.次版本.修订号
MAJOR_MINOR=$(echo "$CURRENT_VERSION" | cut -d. -f1-2)
PATCH=$(echo "$CURRENT_VERSION" | cut -d. -f3 | sed 's/v//')
NEW_PATCH=$((PATCH + 1))
NEW_VERSION="${MAJOR_MINOR}.${NEW_PATCH}"

# 3. 检查备份脚本版本是否与当前版本匹配
if [ "$CURRENT_VERSION" != "$BACKUP_VERSION" ]; then
    echo "⚠️  警告: 当前版本($CURRENT_VERSION)与备份脚本版本($BACKUP_VERSION)不一致"
    echo "  使用当前版本($CURRENT_VERSION)作为基准进行递增"
fi

echo "新版本: $NEW_VERSION"

# 4. 更新版本文件
echo -e "${YELLOW}📝 更新版本文件...${NC}"
sed -i '' "s/export const APP_VERSION = process\.env\.APP_VERSION || '${CURRENT_VERSION}'/export const APP_VERSION = process.env.APP_VERSION || '${NEW_VERSION}'/" "$CURRENT_VERSION_FILE"
echo -e "${GREEN}✅ 已更新 $CURRENT_VERSION_FILE${NC}"

# 5. 更新备份脚本中的版本号
echo -e "${YELLOW}📝 更新备份脚本...${NC}"
sed -i '' "s/版本号: ${CURRENT_VERSION}/版本号: ${NEW_VERSION}/" "$BACKUP_SCRIPT"
echo -e "${GREEN}✅ 已更新 $BACKUP_SCRIPT${NC}"

# 6. 重新构建后端
echo -e "${YELLOW}🔨 重新构建后端应用...${NC}"
cd backend
npm run build
cd ..

# 7. 重启服务
echo -e "${YELLOW}🔄 重启服务...${NC}"
pm2 restart itam-backend --silent
sleep 2

# 8. 验证新版本
echo -e "${YELLOW}✅ 验证新版本...${NC}"
VERSION_CHECK=$(curl -s http://localhost:3001/api/version)
if echo "$VERSION_CHECK" | grep -q "\"data\":\"${NEW_VERSION}\""; then
    echo -e "${GREEN}✅ 版本更新成功: $NEW_VERSION${NC}"
else
    echo "❌ 版本验证失败，当前版本为: $VERSION_CHECK"
    exit 1
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  版本递增完成！${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "版本更新: $CURRENT_VERSION → $NEW_VERSION"
echo "请确保下次备份时使用新版本 $NEW_VERSION"
echo ""

# 9. 更新环境变量文件（可选）
ENV_FILE=".env"
if [ -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}📝 更新环境变量文件...${NC}"
    # 如果存在 APP_VERSION 环境变量则更新
    if grep -q "APP_VERSION=" "$ENV_FILE"; then
        sed -i '' "s/APP_VERSION=.*/APP_VERSION=${NEW_VERSION}/" "$ENV_FILE"
        echo -e "${GREEN}✅ 已更新 $ENV_FILE${NC}"
    else
        echo "APP_VERSION 不在环境变量文件中，已跳过"
    fi
fi

exit 0