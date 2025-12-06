#!/bin/bash

# OraSRS 混合L2架构真实测试网部署脚本
# 使用Alchemy API部署到OP Sepolia和Sepolia测试网

set -e

echo "=================================================="
echo "    OraSRS 混合L2架构 - 真实测试网部署"
echo "=================================================="

# 检查是否设置了必要的环境变量
if [ -z "$ALCHEMY_API_KEY" ]; then
    echo "错误: 未设置 ALCHEMY_API_KEY 环境变量"
    echo "请设置: export ALCHEMY_API_KEY='your_alchemy_api_key'"
    exit 1
fi

if [ -z "$PRIVATE_KEY" ]; then
    echo "错误: 未设置 PRIVATE_KEY 环境变量"
    echo "请设置: export PRIVATE_KEY='your_wallet_private_key'"
    exit 1
fi

# 创建 .env 文件
cat > .env << EOF
ALCHEMY_API_KEY=$ALCHEMY_API_KEY
PRIVATE_KEY=$PRIVATE_KEY

OPTIMISM_SEPOLIA_URL="https://opt-sepolia.g.alchemy.com/v2/\$ALCHEMY_API_KEY"
ETHEREUM_SEPOLIA_URL="https://eth-sepolia.g.alchemy.com/v2/\$ALCHEMY_API_KEY"

# Etherscan API 密钥 (可选)
ETHERSCAN_API_KEY=$ETHERSCAN_API_KEY
OPTIMISTIC_ETHERSCAN_API_KEY=$OPTIMISTIC_ETHERSCAN_API_KEY
EOF

echo "✓ 环境变量配置完成"

# 检查必要工具
echo "检查必要工具..."
if ! command -v npm &> /dev/null; then
    echo "错误: npm 未安装"
    exit 1
fi

if ! command -v npx &> /dev/null; then
    echo "错误: npx 未安装"
    exit 1
fi

# 安装依赖
echo "安装必要依赖..."
npm install @nomiclabs/hardhat-ethers ethers @nomiclabs/hardhat-verify dotenv --save-dev

# 编译合约
echo "编译合约..."
npx hardhat compile

# 检查钱包余额
echo "检查钱包余额..."
DEPLOYER_ADDRESS=$(npx hardhat run scripts/get-address.js --network opsepolia 2>/dev/null || echo "unknown")

# 部署到OP Sepolia
echo "部署到 OP Sepolia 测试网..."
npx hardhat run scripts/deploy-to-testnet.js --network opsepolia

# 部署到Sepolia
echo "部署到 Sepolia 测试网..."
npx hardhat run scripts/deploy-to-testnet.js --network sepolia

echo ""
echo "=================================================="
echo "部署完成!"
echo "合约已部署到 OP Sepolia 和 Sepolia 测试网"
echo "部署详情请查看 deployments/ 目录"
echo ""
echo "下一步操作:"
echo "1. 验证合约是否正常工作"
echo "2. 测试跨链通信功能"
echo "3. 准备生产环境部署"
echo "=================================================="

# 清理临时文件
rm -f .env.tmp