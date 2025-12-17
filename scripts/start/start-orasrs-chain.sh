#!/bin/bash

# 启动OraSRS私有链的脚本
# 注意：需要先安装geth

echo "检查geth是否已安装..."
if ! command -v geth &> /dev/null; then
    echo "错误: geth未安装。请先安装geth。"
    echo "安装方法："
    echo "Ubuntu/Debian: sudo apt-get install ethereum"
    echo "或者从源码编译: https://geth.ethereum.org/downloads/"
    exit 1
fi

echo "创建数据目录..."
mkdir -p ./data/orasrs-chain

# 如果是首次运行，初始化创世块
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
    "ethash": {}
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
echo "RPC端点: http://localhost:8545"
echo "网络ID: 8888"

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
  --dev.period 1

echo "OraSRS私有链节点已停止"
