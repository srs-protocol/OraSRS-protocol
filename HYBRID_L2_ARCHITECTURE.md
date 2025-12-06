# OraSRS Protocol 混合L2架构

## 概述

OraSRS Protocol v2.0 采用混合L2架构，包含国内私有OP Stack和海外以太坊L2（OP Sepolia测试网），通过LayerZero实现跨链桥接。

## 架构组件

### 1. 测试网部署 (已完成)
- 国内私有OP Stack测试网 (本地:8545/9545)
- 海外OP Sepolia测试网连接
- LayerZero跨链桥接协议

### 2. 跨链合约 (已完成)
- `ThreatIntelSync.sol`: 威胁情报跨链同步合约
- `GovernanceMirror.sol`: 治理功能跨链镜像合约

### 3. 混合Agent (已完成)
- `orasrs-agent/src/hybrid_agent.rs`: 智能路由功能
  - 根据威胁类型自动选择目标链
  - 支持动态切换加密算法（国密/国际）
  - 地理位置和敏感信息路由规则

## 安装和部署

### 环境要求
- Rust 1.70+
- Foundry (Forge/Faucet)
- Docker & Docker Compose
- Node.js 18+

### 部署测试网
```bash
# 部署测试网
./testnet-deployment.sh

# 编译合约
forge build

# 运行测试
forge test
```

### 部署合约到测试网
```bash
# 设置环境变量
export PRIVATE_KEY="your_private_key_here"

# 部署到本地测试网
forge script script/DeployHybridL2.s.sol --rpc-url http://localhost:9545 --broadcast
```

## 功能特性

### 智能路由
- 自动威胁分类和路由
- 威胁级别阈值控制
- 地理位置路由规则
- 敏感信息本地化处理

### 加密算法切换
- 国内模式：SM2/SM3/SM4（中国国密算法）
- 海外模式：ECDSA/Keccak256（国际标准算法）
- 自动模式：根据威胁类型智能选择

### 跨链同步
- 威胁情报双向同步
- 治理提案跨链镜像
- 防重放机制
- 安全验证

## 合约接口

### ThreatIntelSync
- `sendThreatIntel()`: 发送威胁情报到目标链
- `batchSendThreatIntel()`: 批量发送威胁情报
- `getThreatIntel()`: 获取威胁情报详情

### GovernanceMirror
- `createCrossChainProposal()`: 创建跨链治理提案
- `castCrossChainVote()`: 发起跨链投票
- `getProposal()`: 获取提案详情

## Agent配置

```rust
let config = AgentConfig {
    domestic_rpc: "http://localhost:9545".to_string(),
    overseas_rpc: "https://sepolia.optimism.io".to_string(),
    domestic_contract: "0x...".parse()?,
    overseas_contract: "0x...".parse()?,
    crypto_mode: CryptoMode::Auto,
    routing_rules: RoutingRules {
        domestic_threshold: 70,  // 威胁等级>=70则路由到国内
        sensitive_keywords: vec!["sensitive".to_string()],
        geographic_routing: HashMap::new(),
    },
};
```

## 合规性
- 国内部署：符合等保2.0标准
- 海外部署：符合GDPR/CCPA要求
- 数据本地化：敏感信息仅在本地处理
- 跨链传输：加密和验证机制

## 安全特性
- LayerZero跨链安全验证
- 防重放消息机制
- 多层签名验证
- 治理权限分离