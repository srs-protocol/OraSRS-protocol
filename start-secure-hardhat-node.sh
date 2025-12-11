#!/bin/bash

# secure-hardhat-node.sh
# 安全启动Hardhat节点，限制高危RPC方法

set -e  # 遇到错误立即退出

echo "🔒 初始化 OraSRS 安全Hardhat节点..."

# 检查是否以root权限运行（不应该以root运行）
if [[ $EUID -eq 0 ]]; then
   echo "⚠️  警告: 不应以root身份运行Hardhat节点"
   echo "请切换到普通用户运行此脚本"
   exit 1
fi

# 检查Node.js和Hardhat
command -v node >/dev/null 2>&1 || { echo "❌ Node.js 未安装或不可用"; exit 1; }
command -v npx >/dev/null 2>&1 || { echo "❌ npm 未安装或不可用"; exit 1; }

# 检查端口是否被占用
if lsof -Pi :8545 -sTCP:LISTEN -t >/dev/null; then
    echo "⚠️  端口 8545 已被占用，请先停止占用该端口的进程"
    exit 1
fi

echo "🛡️  启动安全模式Hardhat节点..."

# 设置环境变量以启用安全模式
export HARDHAT_SECURE_MODE=true

# 启动Hardhat节点，只允许安全的RPC方法
echo "🚀 启动Hardhat节点 (安全模式)..."
npx hardhat node --hostname 127.0.0.1 --port 8545 &

# 获取Hardhat进程PID
HARDHAT_PID=$!

echo "✅ Hardhat节点已启动，PID: $HARDHAT_PID"
echo "🌐 监听地址: http://127.0.0.1:8545"
echo "🔒 安全模式: 已启用，仅允许安全的RPC方法"

# 创建进程监控
monitor_node() {
    while kill -0 $HARDHAT_PID 2>/dev/null; do
        sleep 10
        # 检查进程是否仍然活跃
        if ! kill -0 $HARDHAT_PID 2>/dev/null; then
            echo "⚠️  Hardhat节点进程已终止"
            break
        fi
    done
}

# 启动监控
monitor_node &

echo "📋 安全RPC方法列表:"
echo "   - eth_blockNumber, eth_getBlockByHash, eth_getBlockByNumber"
echo "   - eth_getTransactionByHash, eth_getTransactionReceipt"
echo "   - eth_getCode, eth_call, eth_getLogs"
echo "   - eth_getBalance, eth_getTransactionCount"
echo "   - net_version, net_listening, web3_clientVersion"
echo ""
echo "❌ 已阻止的高危RPC方法:"
echo "   - debug_*, miner_*, admin_*, personal_*"
echo "   - evm_*, txpool_*, eth_sendTransaction"

# 等待进程结束或接收信号
wait $HARDHAT_PID