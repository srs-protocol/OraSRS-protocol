#!/bin/bash

# OraSRS 私有链用户端启动脚本
# 该脚本将启动私有链并自动部署所有合约

set -e  # 遇到错误时退出

echo "==========================================="
echo "    OraSRS 公开许可链用户端启动脚本"
echo "==========================================="
echo "架构: 内紧外松 - 节点端严格限制，用户端开放接入"
echo ""

# 检查依赖
echo "检查依赖..."
if ! command -v geth &> /dev/null; then
    echo "错误: geth未安装。请先安装geth。"
    echo "Ubuntu/Debian: sudo apt-get install ethereum"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "错误: Node.js未安装。请先安装Node.js。"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "错误: npm未安装。请先安装npm。"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "警告: Docker未安装。将使用本地geth模式，如需API网关请安装Docker。"
    USE_DOCKER=false
else
    USE_DOCKER=true
    echo "Docker已安装，将启动API网关。"
fi

echo "依赖检查完成。"

# 创建数据目录
echo "创建数据目录..."
mkdir -p ./data/orasrs-chain

# 检查创世块配置
if [ ! -f ./data/orasrs-chain/genesis.json ]; then
    echo "创建创世块配置..."
    
    # 创建创世块配置文件
    cat > ./data/orasrs-chain/genesis.json << EOF
{
  "config": {
    "chainId": 8888,
    "homesteadBlock": 0,
    "eip150Block": 0,
    "eip155Block": 0,
    "eip158Block": 0,
    "byzantiumBlock": 0,
    "constantinopleBlock": 0,
    "petersburgBlock": 0,
    "istanbulBlock": 0,
    "muirglacierBlock": 0,
    "berlinBlock": 0,
    "londonBlock": 0,
    "terminalTotalDifficulty": 0,
    "terminalTotalDifficultyPassed": true,
    "ethash": {},
    "clique": {
      "period": 1,
      "epoch": 30000
    }
  },
  "nonce": "0x0",
  "timestamp": "0x60c4e2a7",
  "extraData": "0x0000000000000000000000000000000000000000000000000000000000000000f89af85494000000000000000000000000000000000000000094000000000000000000000000000000000000000194000000000000000000000000000000000000000294000000000000000000000000000000000000000380c0010a850400422ca89500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "gasLimit": "0x47b760",
  "difficulty": "0x1",
  "mixHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
  "coinbase": "0x0000000000000000000000000000000000000000",
  "alloc": {
    "0x7eff84d51837862f2d5f0e6c3b180d551be6041f": {
      "balance": "0x200000000000000000000000000000000000000000000000000000000000000"
    },
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266": {
      "balance": "0x200000000000000000000000000000000000000000000000000000000000000"
    }
  },
  "number": "0x0",
  "gasUsed": "0x0",
  "parentHash": "0x0000000000000000000000000000000000000000000000000000000000000000"
}
EOF

    echo "初始化创世块..."
    geth --datadir ./data/orasrs-chain init ./data/orasrs-chain/genesis.json
fi

echo "启动OraSRS私有链节点..."
echo "网络ID: 8888"
echo "RPC端点: http://localhost:8545"

# 在后台启动geth节点
geth \
  --datadir ./data/orasrs-chain \
  --http \
  --http.addr 0.0.0.0 \
  --http.port 8545 \
  --http.api eth,net,web3,personal,miner,admin \
  --http.corsdomain "*" \
  --networkid 8888 \
  --miner.gasprice 1 \
  --miner.etherbase 0x7eff84d51837862f2d5f0e6c3b180d551be6041f \
  --allow-insecure-unlock \
  --rpc.allow-unprotected-txs \
  --dev \
  --dev.period 1 &

GETH_PID=$!
echo "Geth节点已启动，PID: $GETH_PID"

# 等待节点启动
echo "等待节点启动..."
sleep 8

# 检查节点是否正常运行
if ! curl -s http://localhost:8545 -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' > /dev/null 2>&1; then
    echo "错误: 无法连接到Geth节点"
    kill $GETH_PID
    exit 1
fi

echo "节点连接正常，开始部署合约..."

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo "安装项目依赖..."
npm install
fi

# 部署合约
echo "部署OraSRS合约到私有链..."
npx hardhat run scripts/deploy_all.js --network my_private_chain

# 如果Docker可用，启动API网关
if [ "$USE_DOCKER" = true ]; then
    echo "启动API网关以实现访问控制..."
    
    # 创建API密钥文件
    echo '{"api_keys": ["orasrs_demo_key_12345", "orasrs_admin_key_67890"]}' > api_keys.json
    
    # 启动Docker Compose
    if [ -f "docker-compose-permissioned.yml" ]; then
        docker-compose -f docker-compose-permissioned.yml up -d
        echo "✓ API网关已启动，访问端口: http://localhost:8081"
    else
        echo "⚠️  未找到 docker-compose-permissioned.yml，跳过API网关启动"
    fi
fi

echo "==========================================="
echo "    OraSRS 公开许可链启动完成！"
echo "==========================================="
if [ "$USE_DOCKER" = true ] && [ -f "docker-compose-permissioned.yml" ]; then
    echo "✓ API网关端点: http://localhost:8081 (推荐使用)"
    echo "✓ 直接节点端点: http://localhost:8545"
else
    echo "✓ RPC端点: http://localhost:8545"
fi
echo "✓ 网络ID: 8888"
echo "✓ 原生代币: ORA"
echo ""
echo "架构特点:"
echo "✓ 节点端: 通过NodeRegistry实现准入控制"
echo "✓ 用户端: 通过OraPoints积分系统防止垃圾数据"
echo "✓ API网关: 速率限制和API密钥认证"
echo ""
echo "要停止节点，请运行: ./stop-user-client.sh"
echo ""
echo "现在您可以："
echo "1. 认证节点加入网络 (通过NodeRegistry合约)"
echo "2. 用户下载Agent通过API网关交互"
echo "3. 使用积分系统管理用户行为"
echo "4. 通过治理合约管理网络参数"


