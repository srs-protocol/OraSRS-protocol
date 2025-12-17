#!/bin/bash

# ============================================================================
# Hardhat 服务快速部署脚本
# ============================================================================
# 自动安装和配置 Hardhat 节点服务及健康监控
# ============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}  Hardhat 服务快速部署${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# 检查 root 权限
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}错误: 此脚本需要 root 权限${NC}"
   echo "请使用: sudo $0"
   exit 1
fi

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# 1. 安装服务
echo -e "${GREEN}[1/5]${NC} 安装 Hardhat 服务..."
bash "$SCRIPT_DIR/manage-hardhat-service.sh" install

# 2. 启动 Hardhat 节点
echo ""
echo -e "${GREEN}[2/5]${NC} 启动 Hardhat 节点..."
systemctl start hardhat-node.service
sleep 5

# 3. 检查服务状态
echo ""
echo -e "${GREEN}[3/5]${NC} 检查服务状态..."
if systemctl is-active --quiet hardhat-node.service; then
    echo -e "${GREEN}✓ Hardhat 节点运行正常${NC}"
else
    echo -e "${RED}✗ Hardhat 节点启动失败${NC}"
    journalctl -u hardhat-node.service -n 20 --no-pager
    exit 1
fi

# 4. 启动健康监控
echo ""
echo -e "${GREEN}[4/5]${NC} 启动健康监控..."
systemctl start hardhat-health-monitor.service
sleep 3

if systemctl is-active --quiet hardhat-health-monitor.service; then
    echo -e "${GREEN}✓ 健康监控运行正常${NC}"
else
    echo -e "${YELLOW}⚠ 健康监控启动失败（可选功能）${NC}"
fi

# 5. 执行健康检查
echo ""
echo -e "${GREEN}[5/5]${NC} 执行健康检查..."
bash "$SCRIPT_DIR/hardhat-health-monitor.sh" test

# 完成
echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${GREEN}✓ 部署完成！${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo "服务信息:"
echo "  • Hardhat RPC: http://127.0.0.1:8545"
echo "  • Chain ID: 31337 (Hardhat 本地链)"
echo ""
echo "管理命令:"
echo "  • 查看状态: sudo systemctl status hardhat-node"
echo "  • 查看日志: sudo journalctl -u hardhat-node -f"
echo "  • 重启服务: sudo systemctl restart hardhat-node"
echo ""
echo "监控命令:"
echo "  • 查看监控: sudo systemctl status hardhat-health-monitor"
echo "  • 监控日志: sudo tail -f /var/log/hardhat-monitor.log"
echo "  • 健康检查: sudo bash $SCRIPT_DIR/hardhat-health-monitor.sh test"
echo ""
echo -e "${GREEN}提示: 服务已设置为开机自启，系统重启后自动运行${NC}"
echo ""
