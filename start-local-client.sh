#!/bin/bash

# OraSRS 客户端本地节点连接启动脚本

echo "🚀 启动 OraSRS 客户端 (本地节点模式)..."

# 检查本地节点是否运行
echo "🔍 检查官方节点 https://api.orasrs.net 是否运行..."
if curl -s --connect-timeout 5 https://api.orasrs.net/health > /dev/null; then
  echo "⚠️  官方节点 https://api.orasrs.net 可能未运行"
fi

export ORASRS_BLOCKCHAIN_ENDPOINT="https://api.orasrs.net"
export ORASRS_RPC_URL="https://api.orasrs.net"

echo "🔧 使用本地节点配置启动客户端..."

# 复制本地配置文件
cp local-user-config.json user-config.json

# 启动客户端
node orasrs-simple-client.js

echo "👋 客户端已退出"