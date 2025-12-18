# OraSRS 协议网络部署指南（抗量子版）

## 部署概述

本指南详细说明如何将抗量子版的OraSRS协议合约部署到目标网络。此版本使用抗量子算法作为主要加密机制，为未来量子计算威胁提供安全保障。

## 部署前准备

### 1. 环境要求
- Foundry (Forge) 工具链
- Node.js 16+
- 目标网络的RPC端点
- 部署账户的私钥

### 2. 安装依赖
```bash
# 安装Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# 安装项目依赖
npm install
```

### 3. 环境变量配置
创建 `.env` 文件并配置以下变量：
```env
PRIVATE_KEY=your_private_key_here
RPC_URL=https://your-target-network-rpc.com
ETHERSCAN_API_KEY=your_etherscan_api_key  # 如需要验证合约
```

## 部署步骤

### 1. 合约编译
```bash
forge compile
```

### 2. 本地测试
```bash
forge test
```

### 3. 部署到目标网络
```bash
# 部署抗量子版合约
forge script script/DeployOraSRSPQ.s.sol:DeployOraSRSPQ --rpc-url $RPC_URL --broadcast --verify
```

## 部署的合约

### 1. ThreatEvidencePQ.sol
- **功能**: 威胁证据存证合约（抗量子版）
- **主要特性**:
  - 使用抗量子算法进行签名验证
  - 防重放攻击机制
  - 节点注册和质押机制

### 2. ThreatIntelligenceCoordinationPQ.sol
- **功能**: 威胁情报协调合约（抗量子版）
- **主要特性**:
  - 使用抗量子算法进行数据验证
  - 节点信誉管理系统
  - 全局威胁情报协调

## 部署后配置

### 1. 验证合约
部署完成后，使用以下命令验证合约：
```bash
forge verify-contract <CONTRACT_ADDRESS> contracts/ThreatEvidencePQ.sol:ThreatEvidencePQ --etherscan-api-key $ETHERSCAN_API_KEY
forge verify-contract <CONTRACT_ADDRESS> contracts/ThreatIntelligenceCoordinationPQ.sol:ThreatIntelligenceCoordinationPQ --etherscan-api-key $ETHERSCAN_API_KEY
```

### 2. 初始化治理
部署后需要执行以下初始化操作：
- 添加初始验证节点
- 设置合约参数
- 激活合约功能

## 安全注意事项

1. **私钥安全**: 确保部署私钥安全，部署后考虑更换
2. **参数验证**: 部署后验证合约参数是否正确设置
3. **监控**: 部署后密切监控合约活动
4. **升级机制**: 如有升级机制，确保安全验证

## 网络配置

根据目标网络调整以下参数：
- gas 限制
- gas 价格
- 部署地址
- 验证器地址

## 故障排除

### 常见问题
1. **部署失败**: 检查账户余额和gas价格
2. **验证失败**: 检查合约源代码、编译器版本和构造函数参数
3. **合约功能异常**: 确认所有依赖地址正确配置

## 版本管理

- 当前版本: 1.0.0 (抗量子版)
- 兼容性: 向后兼容现有接口
- 升级路径: 从国密版到抗量子版

## 支持

如需部署支持，请联系 OraSRS 核心团队或参考官方文档。

---
部署时间: $(date)
部署者: $USER