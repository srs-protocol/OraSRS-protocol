# OraSRS 私有链部署指南

## 概述
本指南描述了如何在本地启动OraSRS私有链并部署智能合约。

## 系统要求
- Geth (Go Ethereum) 客户端
- Node.js 和 npm
- Docker (可选，用于其他服务)

## 启动私有链

### 方法一：使用本地Geth（推荐）

1. 确保已安装geth：
```bash
# Ubuntu/Debian
sudo apt-get install ethereum

# 或从源码编译
git clone https://github.com/ethereum/go-ethereum
cd go-ethereum
make geth

# 检查安装
geth version
```

2. 启动OraSRS私有链：
```bash
./start-orasrs-chain.sh
```

### 方法二：使用Docker（如果系统支持）

```bash
docker-compose up -d
```

## 部署智能合约

1. 在另一个终端，部署所有合约：
```bash
npx hardhat run scripts/deploy_all.js --network my_private_chain
```

## 架构说明

### 私有链配置
- **网络ID**: 8888
- **原生代币**: ORA
- **区块时间**: 1秒
- **RPC端点**: http://localhost:8545

### 部署的合约
1. **OraSRSToken** - ORA代币合约
2. **ThreatIntelligenceCoordination** - 威胁情报协调合约
3. **OraSRSGovernance** - 治理合约
4. **EnhancedThreatVerification** - 威胁验证合约
5. **ThreatIntelSync** - 跨链威胁情报同步合约
6. **FaucetUpgradeable** - 水龙头合约

## 混合层级架构

当私有链运行稳定后，可通过跨链桥接入以太坊生态：

### 资产上链 (L1/L2)
- 在Optimism/Ethereum上部署OraSRSToken
- 用户在交易所买卖ORA，享受公链流动性

### 数据映射 (Bridging)
- 用户在公链购买ORA -> 锁仓 -> 跨链桥监测 -> 私有网络生成等量ORA积分
- Agent在私有网络赚取ORA积分 -> 提现 -> 跨链桥销毁私有ORA -> 公链释放ORA给用户

## 测试重点

1. **风险评分算法准确性**
2. **多节点（Agent）同时提交数据时的共识效率**
3. **大量数据上链后的存储压力**

## 监控和集成

- Agent <==RPC==> 私有节点 <==API==> Splunk/Grafana
- 与现有安全工具集成

## 故障排除

如果遇到Docker网络错误：
```
Failed to Setup IP tables: Unable to enable ACCEPT OUTGOING rule
```

这通常是iptables配置问题，建议使用本地geth方法。

## 运行状态检查

运行以下命令检查私有链状态：
```bash
node test-private-chain.js
```

## 下一步

1. 启动私有链
2. 部署合约
3. 配置Agent节点
4. 进行压力测试
5. 准备跨链桥接