#!/bin/bash

# OraSRS 抗量子版部署脚本

set -e  # 遇到错误时退出

echo "🚀 开始部署 OraSRS 协议网络（抗量子版）..."

# 检查环境变量
if [ -z "$PRIVATE_KEY" ] || [ -z "$RPC_URL" ]; then
    echo "❌ 请设置 PRIVATE_KEY 和 RPC_URL 环境变量"
    echo "使用方法: PRIVATE_KEY=your_key RPC_URL=your_rpc_url bash deploy-pq.sh"
    exit 1
fi

echo "✅ 环境变量检查通过"

# 编译合约
echo "🔨 编译合约..."
forge compile

# 运行测试
echo "🧪 运行测试..."
forge test

# 部署合约
echo "📤 部署合约到目标网络..."
forge script script/DeployOraSRSPQ.s.sol:DeployOraSRSPQ --rpc-url $RPC_URL --broadcast --legacy

# 提示验证合约
echo "🔍 部署完成！如需验证合约，请运行："
echo "forge verify-contract <CONTRACT_ADDRESS> contracts/ThreatEvidencePQ.sol:ThreatEvidencePQ --etherscan-api-key <ETHERSCAN_API_KEY>"
echo "forge verify-contract <CONTRACT_ADDRESS> contracts/ThreatIntelligenceCoordinationPQ.sol:ThreatIntelligenceCoordinationPQ --etherscan-api-key <ETHERSCAN_API_KEY>"

echo "✅ OraSRS 抗量子版合约部署完成！"