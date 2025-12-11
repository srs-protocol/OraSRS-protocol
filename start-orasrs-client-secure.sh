#!/bin/bash

# orasrs-client-secure-start.sh
# 安全启动 OraSRS 客户端的脚本

set -e  # 遇到错误立即退出

echo "🔒 初始化 OraSRS 客户端安全环境..."

# 检查是否以root权限运行（因为需要设置iptables和ipset）
if [[ $EUID -eq 0 ]]; then
   echo "⚠️  警告: 此脚本不应以root身份运行，应使用有适当权限的普通用户"
   echo "建议使用: sudo -u youruser $0"
   exit 1
fi

# 检查必要的工具
command -v docker >/dev/null 2>&1 || { echo "❌ Docker 未安装或不可用"; exit 1; }
command -v ipset >/dev/null 2>&1 || { echo "❌ ipset 未安装"; exit 1; }

# 检查配置文件
if [ ! -f .env ]; then
    echo "⚠️  警告: 未找到 .env 文件，将使用默认配置"
    echo "RPC_URL=https://api.orasrs.net" > .env
    echo "请根据需要编辑 .env 文件"
fi

# 创建必要的 ipset 集合（如果不存在）
echo "🛡️  初始化 ipset 集合..."
sudo ipset create orasrs_blacklist hash:ip timeout 0 maxelem 200000 -exist

# 启动 Docker 容器
echo "🐳 启动 OraSRS 客户端容器..."
docker compose -f docker-compose.client.yml up -d

echo "✅ OraSRS 客户端已启动并运行在安全模式下"
echo "📋 要查看日志，请运行: docker logs -f orasrs-client"
echo "🛑 要停止服务，请运行: docker compose -f docker-compose.client.yml down"

# 定期检查进程状态
check_status() {
    while true; do
        sleep 60
        if ! docker ps | grep -q orasrs-client; then
            echo "⚠️  OraSRS 客户端容器已停止，正在尝试重启..."
            docker compose -f docker-compose.client.yml up -d
        fi
    done
}

# 在后台运行状态检查
check_status &

echo "🔍 持续监控已启动"