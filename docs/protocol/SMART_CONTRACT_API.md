# OraSRS 智能合约 API 接口文档

## 概述

OraSRS协议的智能合约可以通过以下公网API端点访问：

- **API端点**: `https://api.OraSRS.net`
- **链ID**: 8888
- **协议**: Ethereum兼容的JSON-RPC

## 已部署合约

### 1. IPRiskCalculator (IP风险计算器)
- **合约地址**: `0x0165878A594ca255338adfa4d48449f69242Eb8F`
- **功能**: 定义风险评分算法和标准

#### 主要函数
- `calculateRisk(uint256 currentScore, uint8 attackType, uint256 frequency)`: 计算风险分数
- `evaluateRiskLevel(uint256 score)`: 评估风险等级 (0-3)
- `baseScores(uint8 attackType)`: 获取基础分数

#### 使用示例
```bash
# 使用eth_call查询baseScores函数
curl -X POST https://api.OraSRS.net \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"eth_call",
    "params":[
      {
        "to":"0x0165878A594ca255338adfa4d48449f69242Eb8F",
        "data":"0x4af30f8d0000000000000000000000000000000000000000000000000000000000000001"
      },
      "latest"
    ],
    "id":1
  }'
```

### 2. ThreatStats (威胁态势分析)
- **合约地址**: `0xa513E6E4b8f2a923D98304ec87F64353C4D5C853`
- **功能**: 统计宏观威胁数据，为仪表盘提供数据

#### 主要函数
- `totalThreatsDetected()`: 获取总威胁数
- `attackTypeCounts(uint8 attackType)`: 获取特定攻击类型统计数
- `getDashboardStats()`: 获取仪表盘统计数据

### 3. OraSRSReader (高效批量查询)
- **合约地址**: `0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6`
- **功能**: 客户端专用的批量查询接口

#### 主要函数
- `checkMultipleIPs(string[] calldata ips, uint256 threshold)`: 批量查询IP
- `checkSingleIP(string memory ip, uint256 threshold)`: 查询单个IP
- `checkMultipleIPsFiltered(string[] calldata ips, uint256 threshold)`: 过滤高风险IP

### 4. ThreatIntelligenceCoordination (威胁情报协调)
- **合约地址**: `0x5FC8d32690cc91D4c39d9d3abcBD16989F875707`
- **功能**: 核心数据存储，提供威胁情报查询

#### 主要函数
- `getThreatScore(string memory ip)`: 获取IP威胁分数
- `updateThreatScore(string memory ip, uint256 score)`: 更新IP威胁分数
- `isThreatSource(string memory ip)`: 检查IP是否为威胁源

### 5. OraSRSToken (ORA代币)
- **合约地址**: `0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1`
- **功能**: OraSRS协议治理代币 (ORA)

#### 主要函数
- `name()`: 代币名称 ("OraSRS Protocol Token")
- `symbol()`: 代币符号 ("ORA")
- `decimals()`: 代币精度 (18)
- `totalSupply()`: 总供应量 (1亿)
- `balanceOf(address account)`: 查询账户余额
- `transfer(address recipient, uint256 amount)`: 转账
- `mint(address to, uint256 amount)`: 铸造代币 (仅所有者)

### 6. FaucetUpgradeable (水龙头合约)
- **合约地址**: `0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE`
- **功能**: 为测试者提供ORA代币

#### 主要函数
- `oraToken()`: 返回代币合约地址
- `withdrawTokens()`: 领取代币
- `faucetBalance()`: 查询水龙头余额
- `canWithdraw(address account)`: 检查账户是否可以领取
- `timeToNextWithdraw(address account)`: 剩余等待时间
- `depositTokens(uint256 amount)`: 向水龙头充值 (仅所有者)
- `setWithdrawAmount(uint256 newAmount)`: 设置领取数量 (仅所有者)
- `setCooldownPeriod(uint256 newPeriod)`: 设置冷却时间 (仅所有者)

### 7. OraSRSGovernance (治理合约)
- **合约地址**: `0x3Aa5ebB10DC797CAC828524e59A333d0A371443c`
- **功能**: OraSRS协议治理，管理参数和关键决策

#### 主要函数
- `createProposal(string description, ProposalType proposalType, address[] targets, uint256[] values, bytes[] calldatas)`: 创建提案
- `castVote(uint256 proposalId, uint8 support)`: 投票
- `getProposalDetails(uint256 proposalId)`: 获取提案详情
- `state(uint256 proposalId)`: 获取提案状态
- `updateTimelock(address _newTimelock)`: 更新timelock合约地址 (仅所有者)
- `updateThreatIntelligenceCoordination(address _newContract)`: 更新威胁情报协调合约地址 (仅所有者)
- `updateVotingPeriod(uint256 _newVotingPeriod)`: 更新投票期 (仅所有者)
- `updateProposalThreshold(uint256 _newThreshold)`: 更新提案门槛 (仅所有者)
- `updateQuorumPercentage(uint256 _newQuorumPercentage)`: 更新法定人数百分比 (仅所有者)

### 8. NodeRegistry (节点注册合约)
- **合约地址**: `0xc6e7DF5E7b4f2A278906862b61205850344D4e7d`
- **功能**: 管理网络中的节点注册信息

#### 主要函数
- `registerNode(string memory _ip, uint16 _port)`: 注册节点
- `getNodes()`: 获取所有节点信息
- `activeNodes(uint256 index)`: 通过索引获取节点信息

### 9. SimpleSecurityActionContract (安全操作合约)
- **合约地址**: `0x59b670e9fA9D0A427751Af201D676719a970857b`
- **功能**: 简化的安全操作合约，用于管理IP和域名阻断

#### 主要函数
- `blockIP(string memory _ip)`: 阻断IP地址 (仅授权)
- `unblockIP(string memory _ip)`: 解除IP阻断 (仅授权)
- `blockDomain(string memory _domain)`: 阻断域名 (仅授权)
- `unblockDomain(string memory _domain)`: 解除域名阻断 (仅授权)
- `isIPBlocked(string memory _ip)`: 检查IP是否被阻断
- `isDomainBlocked(string memory _domain)`: 检查域名是否被阻断
- `updateGovernanceContract(address _newGovernanceContract)`: 更新治理合约地址 (仅所有者)
- `governanceContract()`: 获取治理合约地址

## JSON-RPC API 使用方法

### 查询合约函数 (eth_call)

```json
{
  "jsonrpc": "2.0",
  "method": "eth_call",
  "params": [
    {
      "to": "CONTRACT_ADDRESS",
      "data": "FUNCTION_SIGNATURE_WITH_PARAMS"
    },
    "latest"
  ],
  "id": 1
}
```

### 获取合约代码 (eth_getCode)

```json
{
  "jsonrpc": "2.0",
  "method": "eth_getCode",
  "params": ["CONTRACT_ADDRESS", "latest"],
  "id": 1
}
```

### 获取区块号 (eth_blockNumber)

```json
{
  "jsonrpc": "2.0",
  "method": "eth_blockNumber",
  "params": [],
  "id": 1
}
```

### 获取账户余额 (eth_getBalance)

```json
{
  "jsonrpc": "2.0",
  "method": "eth_getBalance",
  "params": ["ACCOUNT_ADDRESS", "latest"],
  "id": 1
}
```

## 攻击类型编码

在调用需要攻击类型的函数时，使用以下编码：

- 0: UNKNOWN
- 1: BRUTE_FORCE
- 2: DDOS
- 3: MALWARE
- 4: SCANNING
- 5: PHISHING

## 风险等级定义

- 0: 安全 (分数 < 50)
- 1: 可疑 (分数 50-199)
- 2: 高危 (分数 200-599)
- 3: 极度危险 (分数 ≥ 600)

## 使用示例

### 使用JavaScript/ethers.js

```javascript
import { ethers } from 'ethers';

// 连接到公网API
const provider = new ethers.JsonRpcProvider('https://api.OraSRS.net');

// 创建合约实例
const oraSRSReader = new ethers.Contract(
  '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6',
  [
    "function checkSingleIP(string memory ip, uint256 threshold) view returns (string memory ipResult, uint256 score, uint8 riskLevel, bool shouldBlock)",
    "function checkMultipleIPs(string[] calldata ips, uint256 threshold) view returns ((string ip, uint256 score, uint8 riskLevel, bool shouldBlock)[] memory)"
  ],
  provider
);

// 查询单个IP
const result = await oraSRSReader.checkSingleIP("192.168.1.100", 200);
console.log(`IP: ${result.ipResult}, 分数: ${result.score}, 等级: ${result.riskLevel}, 应拦截: ${result.shouldBlock}`);
```

## 注意事项

1. 所有合约函数调用都是通过JSON-RPC接口进行
2. 只有只读函数（view/pure）可以通过eth_call调用
3. 修改状态的函数需要通过交易发送，可能需要签名和Gas费用
4. API端点提供了完整的Ethereum兼容接口
5. 合约部署在Chain ID为8888的网络上