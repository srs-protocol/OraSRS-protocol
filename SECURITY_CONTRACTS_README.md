# OraSRS 安全合约模块

本项目包含三个核心安全合约，用于增强OraSRS协议的安全性和威胁分析能力。

## 合约概述

### 1. IPRiskCalculator.sol - IP风险计算器
纯逻辑合约，定义风险评分算法，不存储任何数据，只负责制定评分标准。

**功能:**
- 定义不同攻击类型的基础分值
- 根据攻击类型、频率计算风险分
- 评估风险等级 (0-3: 安全、可疑、高危、极度危险)

**攻击类型:**
- UNKNOWN: 未知
- BRUTE_FORCE: 暴力破解 (20分)
- DDOS: 拒绝服务 (50分) 
- MALWARE: 恶意软件传播 (80分)
- SCANNING: 端口扫描 (10分)
- PHISHING: 钓鱼节点 (60分)

### 2. ThreatStats.sol - 威胁态势分析合约
用于分析宏观数据，为仪表盘提供数据支持。

**功能:**
- 统计各类攻击类型的发生次数
- 跟踪全网总威胁数
- 记录最高威胁IP及分数
- 提供仪表盘数据查询接口

### 3. OraSRSReader.sol - 高效批量查询合约
客户端专用的"放大镜"合约，允许防火墙等客户端一次查询多个IP。

**功能:**
- 批量查询IP威胁分数和等级
- 过滤高风险IP
- 提供单IP查询接口
- 支持阈值过滤

### 4. ThreatIntelligenceCoordination.sol - 威胁情报协调合约
核心数据存储合约，用于存储和查询威胁情报。

**功能:**
- 存储IP威胁分数
- 管理威胁情报条目
- 提供getThreatScore接口供OraSRSReader调用

## 部署信息

已部署合约地址:

- **IPRiskCalculator**: `0x0165878A594ca255338adfa4d48449f69242Eb8F`
- **ThreatStats**: `0xa513E6E4b8f2a923D98304ec87F64353C4D5C853`
- **OraSRSReader**: `0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6`
- **ThreatIntelligenceCoordination**: `0x5FC8d32690cc91D4c39d9d3abcBD16989F875707`

## 公网API访问

所有合约都可以通过以下公网API端点访问：

**API端点**: `https://api.OraSRS.net`

该端点通过反向代理将请求转发到本地Hardhat节点，使这些合约可以通过公网访问。

### 使用示例（JavaScript）

```javascript
// 使用ethers.js连接到公网API
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://api.OraSRS.net');

// 连接到已部署的合约
const ipRiskCalculator = new ethers.Contract(
  '0x0165878A594ca255338adfa4d48449f69242Eb8F',
  [
    // IPRiskCalculator ABI
    "function calculateRisk(uint256 currentScore, uint8 attackType, uint256 frequency) view returns (uint256 newScore)",
    "function evaluateRiskLevel(uint256 score) view returns (uint8 level)",
    "function baseScores(uint8 attackType) view returns (uint256)"
  ],
  provider
);

// 示例：计算风险分数
// const riskScore = await ipRiskCalculator.calculateRisk(50, 1, 5);
```

### 使用示例（curl）

```bash
# 查询IP风险计算器的函数
curl -X POST https://api.OraSRS.net \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"eth_call",
    "params":[
      {
        "to":"0x0165878A594ca255338adfa4d48449f69242Eb8F",
        "data":"0x..."
      },
      "latest"
    ],
    "id":1
  }'
```

## 部署脚本

### Hardhat部署
```bash
npx hardhat run scripts/deploy-security-contracts.js --network localhost
```

### Foundry部署
```bash
forge script script/DeploySecurityContracts.s.sol:DeploySecurityContracts --fork-url http://127.0.0.1:8545
```

## 使用示例

### 批量查询多个IP
```javascript
// 批量查询IP威胁信息
const ips = ["192.168.1.1", "10.0.0.1", "203.0.113.5"];
const results = await oraSRSReader.checkMultipleIPs(ips, 200); // 阈值200分
```

### 单个IP查询
```javascript
// 查询单个IP信息
const result = await oraSRSReader.checkSingleIP("192.168.1.1", 150);
console.log(`IP: ${result.ipResult}`);
console.log(`分数: ${result.score}`);
console.log(`风险等级: ${result.riskLevel}`);
console.log(`应拦截: ${result.shouldBlock}`);
```

## 合约交互流程

1. **数据更新**: ThreatIntelligenceCoordination存储IP威胁分数
2. **威胁分析**: ThreatStats跟踪总体威胁趋势
3. **计算处理**: IPRiskCalculator提供风险算法
4. **批量查询**: OraSRSReader为客户端提供高效的批量查询服务

这种架构实现了数据与计算的分离，使防火墙等客户端能够高效查询多个IP的威胁信息。