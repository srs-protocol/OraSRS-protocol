# OraSRS 混合L2架构操作手册

## 目录
1. [架构概述](#架构概述)
2. [环境准备](#环境准备)
3. [部署步骤](#部署步骤)
4. [合约详解](#合约详解)
5. [跨链通信](#跨链通信)
6. [测试验证](#测试验证)
7. [故障排除](#故障排除)

## 架构概述

OraSRS混合L2架构实现了国内私有OP Stack与海外OP Sepolia测试网之间的安全跨链通信，支持威胁情报同步和治理镜像功能。

### 核心组件
- **ThreatIntelSync.sol**: 跨链威胁情报同步合约
- **GovernanceMirror.sol**: 跨链治理镜像合约
- **LayerZeroEndpointMock.sol**: LayerZero跨链通信端点
- **CrossChainInterfaces.sol**: 跨链通信接口定义

## 环境准备

### 系统要求
- Docker 20.10+
- Node.js 16+
- Git

### 依赖安装
```bash
npm install
```

### 启动双链环境
```bash
docker-compose -f docker-compose.testnet.yml up -d
```

## 部署步骤

### 1. 启动测试网络
```bash
# 启动包含两个区块链节点的环境
docker-compose -f docker-compose.testnet.yml up -d

# 验证服务状态
docker-compose -f docker-compose.testnet.yml ps
```

### 2. 部署合约
```bash
# 运行双链部署脚本
node scripts/dual-chain-deployment.js
```

### 3. 配置LayerZero
```bash
# 配置跨链连接
node scripts/configure-layerzero.js
```

### 4. 验证部署
```bash
# 验证消息流通路
node scripts/validate-message-flow.js
```

## 合约详解

### ThreatIntelSync 合约

#### 主要功能
- `sendThreatIntel()`: 发送威胁情报到目标链
- `lzReceive()`: 接收来自其他链的威胁情报
- `getThreatIntel()`: 查询威胁情报详情
- `quoteSendThreatIntel()`: 估算跨链费用

#### 存储结构
- `threatIntels`: 威胁情报数据
- `processedMessages`: 防重放检查
- `governanceContract`: 治理合约地址

### GovernanceMirror 合约

#### 主要功能
- `createCrossChainProposal()`: 创建跨链治理提案
- `castCrossChainVote()`: 跨链投票
- `lzReceive()`: 接收跨链治理消息
- `getProposal()`: 查询提案详情

## 跨链通信

### 消息流程
1. 用户调用源链合约的发送函数
2. 合约调用LayerZero Endpoint的send方法
3. LayerZero将消息路由到目标链
4. 目标链Endpoint调用合约的lzReceive方法
5. 合约处理并存储接收到的消息

### 安全机制
- 防重放检查 (nonce-based)
- 源链ID验证
- 源地址验证
- 访问控制检查

## 测试验证

### 功能测试
```bash
# 运行端到端演示
node scripts/end-to-end-demo.js
```

### 验证脚本
- `dual-chain-deployment.js`: 双链合约部署
- `configure-layerzero.js`: LayerZero配置
- `validate-message-flow.js`: 消息流验证
- `end-to-end-demo.js`: 端到端演示

## 配置参数

### 链ID配置
- 国内链 (OP Stack): 1001
- 海外界 (OP Sepolia): 1002

### 费用参数
- 估算费用: 0.2 ETH (每条消息)
- 适配器类型: 标准适配器
- Gas限制: 200000

## 故障排除

### 常见问题
1. **合约部署失败**: 检查Docker服务是否正常运行
2. **跨链通信失败**: 验证LayerZero端点地址配置
3. **消息丢失**: 检查防重放机制配置

### 日志检查
```bash
# 查看区块链节点日志
docker-compose -f docker-compose.testnet.yml logs

# 查看特定节点日志
docker-compose -f docker-compose.testnet.yml logs domestic-chain-node
docker-compose -f docker-compose.testnet.yml logs overseas-chain-node
```

## 生产环境部署

### 在真实网络部署的步骤:
1. 部署真实的LayerZero Endpoint v2
2. 在目标链上部署合约
3. 配置跨链路由和权限
4. 进行安全审计
5. 逐步上线并监控

### 安全建议
- 审计所有合约代码
- 实施访问控制策略
- 配置适当的gas限制
- 监控跨链消息流量