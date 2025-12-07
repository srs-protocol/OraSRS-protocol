# OraSRS 公开许可链用户端

OraSRS用户端是一个"公开许可链"(Public Permissioned Chain)架构的完整实现，包含节点端严格限制和用户端开放接入的"内紧外松"设计。

## 架构特性

### 节点端（议会模式）
- **准入控制**：只有经过认证的可信机构（安全公司、高校、政府部门）才能运行节点
- **共识参与**：只有认证节点才能参与共识和记账
- **治理权力**：认证节点拥有治理投票权

### 用户端（市民模式）
- **开放接入**：任何企业或个人都可以下载Agent作为数据消费者或贡献者
- **积分系统**：通过OraPoints积分防止垃圾数据和DDoS攻击
- **声誉权重**：不同用户的数据具有不同可信度权重

## 系统要求

- Geth (Go Ethereum) 客户端
- Node.js (版本 >= 14)
- npm
- bash (用于启动脚本)
- Docker (可选，用于API网关)

## 快速开始

### 1. 启动用户端

```bash
# 启动公开许可链并部署所有合约
./start-user-client.sh
```

该脚本将：
- 启动OraSRS私有链节点
- 自动部署所有合约（包含节点注册和积分系统）
- 启动API网关（如果Docker可用）
- 显示部署结果

### 2. 停止用户端

```bash
# 停止所有服务
./stop-user-client.sh
```

## 部署的合约

运行后将部署以下合约：

1. **OraSRSToken** - ORA代币合约
2. **ThreatIntelligenceCoordination** - 威胁情报协调合约
3. **OraSRSGovernance** - 治理合约
4. **NodeRegistry** - 节点注册和管理合约
5. **OraPoints** - 积分系统合约
6. **EnhancedThreatVerification** - 威胁验证合约
7. **ThreatIntelSync** - 跨链威胁情报同步合约
8. **FaucetUpgradeable** - 水龙头合约

## 网络配置

- **网络ID**: 8888
- **原生代币**: ORA (交易费用)
- **节点端点**: http://localhost:8545
- **API网关端点**: http://localhost:8081 (推荐使用)
- **区块时间**: 1秒
- **Gas价格**: 1 wei

## "内紧外松"架构实现

### 节点准入控制 (NodeRegistry)
```solidity
// 节点必须注册并通过治理委员会批准
function registerNode(...) external
function approveNode(address _nodeAddress) external onlyGovernance
```

### 用户积分系统 (OraPoints)
- 新用户注册获得10积分
- 提交威胁情报消耗1积分
- 验证通过奖励5积分
- 提交虚假数据扣除3积分

### API网关保护 (Nginx)
- API密钥认证
- 速率限制 (每秒5次请求)
- DDoS防护
- 读写操作分离

## 与Agent集成

### 通过API网关（推荐）
```javascript
// 使用API网关和密钥
const web3 = new Web3('http://localhost:8080');
web3.currentProvider.headers = { 'API-Key': 'your_api_key' };
```

### 直接连接节点（仅认证节点）
```javascript
// 直接连接到节点（需要认证）
const web3 = new Web3('http://localhost:8545');
```

## 治理流程

### 添加认证节点
1. 节点运营商向NodeRegistry合约申请注册
2. 治理委员会审核并批准节点
3. 节点获得验证权限

### 管理用户积分
```javascript
// 治理员可以批量分发积分
await oraPoints.batchDistribute([addresses], [amounts]);
```

## 与监控系统集成

私有链支持与以下系统集成：

- **Splunk**: 通过API接收威胁情报数据
- **Grafana**: 监控节点和合约状态
- **自定义监控**: 通过事件日志监控网络状态

## 混合层级架构

当私有链运行稳定后，可通过跨链桥接入以太坊生态：

- **资产上链**: 在Optimism/Ethereum上部署OraSRSToken
- **数据映射**: 通过跨链桥实现公私链资产双向流通

## 配置

可以通过 `user-config.json` 文件自定义配置：

```json
{
  "network": {
    "chainId": 8888,
    "rpcUrl": "http://localhost:8545",
    "blockTime": 1,
    "nativeToken": "ORA"
  },
  "contracts": {
    "deployTimeout": 30000,
    "gasLimit": 8000000,
    "gasPrice": 1
  },
  "permissionedChain": {
    "enableAPIGateway": true,
    "rateLimit": 5,
    "initialPoints": 10
  }
}
```

## Agent注册流程

1. 下载OraSRS Agent
2. 启动时生成公私钥对
3. 调用`registerAndClaim()`获取初始积分
4. 使用积分提交威胁情报
5. 通过验证获得奖励，作恶被惩罚

## 故障排除

如果遇到问题，请尝试：

1. 确保Geth已正确安装
2. 检查8545和8080端口是否被占用
3. 查看控制台输出的错误信息
4. 确保Docker服务正在运行（如果使用API网关）

## 维护

- 定期备份 `./data/orasrs-chain` 目录
- 监控节点运行状态
- 根据需要调整合约参数
- 管理认证节点列表
- 维护用户积分系统