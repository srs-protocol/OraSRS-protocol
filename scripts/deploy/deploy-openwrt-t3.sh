#!/bin/bash

# ============================================================================
# OraSRS OpenWrt T3 模块部署脚本
# ============================================================================
# 用途: 将优化后的 T3 模块部署到 OpenWrt 设备
# ============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置参数
OPENWRT_HOST="${1:-192.168.1.1}"
OPENWRT_USER="${2:-root}"
OPENWRT_PORT="${3:-22}"

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}  OraSRS OpenWrt T3 模块部署${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo "目标设备: ${OPENWRT_USER}@${OPENWRT_HOST}:${OPENWRT_PORT}"
echo ""

# 检查文件是否存在
if [ ! -f "openwrt/orasrs-client/orasrs-lite.js" ]; then
    echo -e "${RED}错误: 找不到 orasrs-lite.js 文件${NC}"
    exit 1
fi

# 1. 备份现有文件
echo -e "${GREEN}[1/6]${NC} 备份现有配置..."
ssh -p ${OPENWRT_PORT} ${OPENWRT_USER}@${OPENWRT_HOST} "
    if [ -f /usr/lib/orasrs/orasrs-lite.js ]; then
        cp /usr/lib/orasrs/orasrs-lite.js /usr/lib/orasrs/orasrs-lite.js.backup.\$(date +%Y%m%d_%H%M%S)
        echo '✓ 已备份现有文件'
    else
        echo '⚠ 未找到现有文件，跳过备份'
    fi
"

# 2. 创建必要目录
echo ""
echo -e "${GREEN}[2/6]${NC} 创建必要目录..."
ssh -p ${OPENWRT_PORT} ${OPENWRT_USER}@${OPENWRT_HOST} "
    mkdir -p /usr/lib/orasrs
    mkdir -p /var/lib/orasrs
    mkdir -p /var/log
    echo '✓ 目录已创建'
"

# 3. 上传新文件
echo ""
echo -e "${GREEN}[3/6]${NC} 上传优化后的 T3 模块..."
scp -P ${OPENWRT_PORT} openwrt/orasrs-client/orasrs-lite.js ${OPENWRT_USER}@${OPENWRT_HOST}:/usr/lib/orasrs/
echo -e "${GREEN}✓ 文件上传完成${NC}"

# 4. 设置权限
echo ""
echo -e "${GREEN}[4/6]${NC} 设置文件权限..."
ssh -p ${OPENWRT_PORT} ${OPENWRT_USER}@${OPENWRT_HOST} "
    chmod +x /usr/lib/orasrs/orasrs-lite.js
    echo '✓ 权限已设置'
"

# 5. 检查依赖
echo ""
echo -e "${GREEN}[5/6]${NC} 检查依赖..."
ssh -p ${OPENWRT_PORT} ${OPENWRT_USER}@${OPENWRT_HOST} "
    echo '检查 Node.js...'
    if command -v node >/dev/null 2>&1; then
        echo '  ✓ Node.js: '\$(node --version)
    else
        echo '  ✗ Node.js 未安装'
        echo '  安装命令: opkg update && opkg install node'
    fi
    
    echo '检查 SQLite...'
    if command -v sqlite3 >/dev/null 2>&1; then
        echo '  ✓ SQLite: '\$(sqlite3 --version | cut -d' ' -f1)
    else
        echo '  ⚠ SQLite 未安装 (可选)'
    fi
    
    echo '检查 curl...'
    if command -v curl >/dev/null 2>&1; then
        echo '  ✓ curl: 已安装'
    else
        echo '  ✗ curl 未安装'
        echo '  安装命令: opkg install curl'
    fi
"

# 6. 重启服务
echo ""
echo -e "${GREEN}[6/6]${NC} 重启 OraSRS 服务..."
ssh -p ${OPENWRT_PORT} ${OPENWRT_USER}@${OPENWRT_HOST} "
    if [ -f /etc/init.d/orasrs ]; then
        /etc/init.d/orasrs restart
        sleep 3
        echo '✓ 服务已重启'
    else
        echo '⚠ 未找到 OraSRS 服务，请手动启动'
        echo '  启动命令: node /usr/lib/orasrs/orasrs-lite.js &'
    fi
"

# 完成
echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${GREEN}✓ 部署完成！${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo "下一步操作:"
echo "  1. 查看日志: ssh ${OPENWRT_USER}@${OPENWRT_HOST} 'tail -f /var/log/orasrs.log'"
echo "  2. 测试同步: ssh ${OPENWRT_USER}@${OPENWRT_HOST} 'curl http://localhost:3006/health'"
echo "  3. 查看缓存: ssh ${OPENWRT_USER}@${OPENWRT_HOST} 'sqlite3 /var/lib/orasrs/cache.db \"SELECT COUNT(*) FROM threats\"'"
echo ""
echo "测试脚本: bash test-openwrt-t3.sh ${OPENWRT_HOST} ${OPENWRT_USER} ${OPENWRT_PORT}"
echo ""
