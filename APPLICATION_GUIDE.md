# OraSRS 增强版应用指南

本指南说明如何使用 OraSRS 协议的增强功能，包括共识机制、质押、声誉系统等。

## 1. 初始化 SRS 引擎

```javascript
const SRSEngine = require('./srs-engine');

// 初始化带增强功能的 SRS 引擎
const srsEngine = new SRSEngine({
  consensus: {
    minStakeAmount: 10000,      // 最小质押门槛: 10,000 ORA
    maxConsensusNodes: 21,      // 最大共识节点数: 21
    stakeLockPeriod: 7 * 24 * 60 * 60 * 1000, // 质押锁定期: 7天
    slashPenaltyRate: 1.0,      // 作恶罚没比例: 100%
    offlinePenaltyRate: 0.05    // 离线罚没比例: 5%/天
  },
  governance: {
    emergencyPowers: true       // 启用紧急熔断权
  },
  security: {
    useSM2: false,
    useSM3: false,
    useSM4: true,              // 启用SM4加密
    dataLocation: 'CN'         // 数据存储在中国
  },
  edgeCache: {
    minStakeAmount: 100,        // 边缘节点最小质押: 100 ORA
    cacheTTL: 5 * 60 * 1000,   // 缓存有效期: 5分钟
    challengeThreshold: 3       // 挑战阈值: 3个节点
  }
});
```

## 2. 节点质押与管理

### 2.1 共识节点质押

```javascript
// 共识节点质押
const identityInfo = {
  businessLicense: "91110000000000000X",  // 营业执照号
  blockchainFilingNumber: "京网信备XXX号",  // 区块链备案号
  passedNodeTest: true,                    // 通过节点能力测试
};

try {
  const result = srsEngine.stake(
    'node-abc123',           // 节点ID
    15000,                   // 质押金额 (ORA)
    identityInfo             // 身份信息
  );
  console.log('质押成功:', result);
} catch (error) {
  console.error('质押失败:', error.message);
}
```

### 2.2 边缘缓存节点质押

```javascript
// 边缘缓存节点质押
try {
  const result = srsEngine.stakeEdgeNode(
    'edge-node-xyz789',      // 边缘节点ID
    500,                     // 质押金额 (ORA)
    { location: 'Beijing', type: 'cache' }  // 节点信息
  );
  console.log('边缘节点质押成功:', result);
} catch (error) {
  console.error('边缘节点质押失败:', error.message);
}
```

## 3. 声誉系统

### 3.1 更新节点声誉

```javascript
// 更新节点声誉
const performanceData = {
  uptime: 0.98,                    // 在线率
  correct: true,                   // 验证是否正确
  challengeResponseTime: 150,      // 挑战响应时间(ms)
  submittedThreatIntel: true       // 提交威胁情报
};

const newReputation = srsEngine.updateNodeReputation('node-abc123', performanceData);
console.log(`节点声誉更新为: ${newReputation}`);
```

### 3.2 获取节点状态

```javascript
// 获取节点状态
const nodeStatus = srsEngine.getNodeStatus('node-abc123');
console.log('节点状态:', nodeStatus);
```

## 4. 治理机制

### 4.1 添加治理委员会成员

```javascript
// 添加企业席位成员
const enterpriseMember = {
  name: 'Tech Corp Ltd.',
  type: 'enterprise',             // enterprise, academia, community
  qualification: '区块链技术服务提供商',
  expertise: '网络安全与共识算法'
};

srsEngine.addGovernanceMember('member-001', enterpriseMember);
```

### 4.2 创建和投票提案

```javascript
// 创建升级提案
srsEngine.createGovernanceProposal(
  'upgrade-proposal-001',
  '共识算法升级',
  '将共识算法从PBFT升级为HotStuff',
  'member-001',
  'standard'  // standard, emergency
);

// 开始投票
srsEngine.startProposalVoting('upgrade-proposal-001');

// 委员会成员投票
srsEngine.committeeVote('member-001', 'upgrade-proposal-001', 'yes');
```

### 4.3 紧急熔断

```javascript
// 触发紧急熔断（需要2/3以上委员同意）
const haltResult = srsEngine.emergencyHalt('检测到51%攻击');
console.log('紧急熔断结果:', haltResult);
```

## 5. 缓存与挑战机制

### 5.1 缓存操作

```javascript
// 设置边缘缓存
srsEngine.setEdgeCache('ip-risk-1.2.3.4', riskAssessmentData, 'edge-node-xyz789');

// 获取边缘缓存
const cachedResult = srsEngine.getFromEdgeCache('ip-risk-1.2.3.4');
```

### 5.2 提交缓存挑战

```javascript
// 提交缓存挑战
srsEngine.submitCacheChallenge(
  'challenge-001',
  'ip-risk-1.2.3.4',      // 目标缓存键
  'node-validator-555',    // 挑战者ID
  '数据过期且不一致'       // 挑战理由
);

// 其他节点支持挑战
srsEngine.addChallengeSupport('challenge-001', 'node-validator-666');
srsEngine.addChallengeSupport('challenge-001', 'node-validator-777');
```

## 6. 三层架构操作

### 6.1 初始化架构

```javascript
// 初始化三层架构
await srsEngine.initializeArchitecture();
```

### 6.2 查询处理（通过三层架构）

```javascript
// 通过三层架构处理查询（自动使用边缘缓存并回退到根网络）
const riskAssessment = await srsEngine.processQueryThroughArchitecture('1.2.3.4', 'example.com');
console.log('风险评估结果:', riskAssessment);
```

### 6.3 架构状态监控

```javascript
// 获取架构状态
const status = srsEngine.getArchitectureStatus();
console.log('架构状态:', status);

// 系统健康检查
const health = srsEngine.architectureHealthCheck();
console.log('健康检查结果:', health);

// 执行跨层审计
const auditReport = await srsEngine.performCrossLayerAudit();
console.log('跨层审计报告:', auditReport);
```

## 7. 安全与合规

### 7.1 数据加密

```javascript
// 使用SM4加密敏感数据
const encrypted = srsEngine.encryptWithSM4(sensitiveData, encryptionKey);
console.log('加密结果:', encrypted);

// 数据脱敏
const sanitized = srsEngine.sanitizeData(userData);
console.log('脱敏后数据:', sanitized);
```

### 7.2 合规报告

```javascript
// 生成合规报告
const complianceReport = srsEngine.generateComplianceReport();
console.log('合规报告:', complianceReport);
```

## 8. 风险评估API

### 8.1 基础风险评估

```javascript
// 使用增强版风险评估
const riskAssessment = await srsEngine.getRiskAssessment('1.2.3.4', 'example.com');
console.log('风险评估结果:', riskAssessment);
```

### 8.2 申诉处理

```javascript
// 提交申诉
const appealResult = await srsEngine.processAppeal('1.2.3.4', '我们已经解决了机器人问题');
console.log('申诉结果:', appealResult);
```

## 9. 性能监控

```javascript
// 运行边缘缓存维护任务
srsEngine.runEdgeCacheMaintenance();

// 获取联邦学习状态
const fedStatus = srsEngine.getFederationStatus();
console.log('联邦学习状态:', fedStatus);
```

## 10. 跨链适配器

OraSRS 增强版支持多种区块链网络的适配：

- 政务链：蚂蚁链（FAIR 协议）
- 工业链：浪潮云洲链
- 金融链：BCOS

适配器实现示例：

```javascript
// 适配器注册（概念性）
const adapterRegistry = {
  register: (blockchainName, adapterImplementation) => {
    // 注册跨链适配器
  },
  
  executeCrossChainQuery: (blockchain, query) => {
    // 执行跨链查询
  }
};

## 11. 国密算法合约集成

### 11.1 部署国密质押合约

国密版质押合约需要部署在支持国密算法的国产联盟链上（如长安链、FISCO BCOS）：

```javascript
// 连接到支持国密算法的链
const web3 = new Web3('http://chainmaker-node:8545'); // 或其他国密链端点

// 部署合约
const stakingContract = new web3.eth.Contract(OrasrsStakingGmContract.abi);
const deployedContract = await stakingContract
  .deploy({ 
    data: OrasrsStakingGmContract.bytecode,
    arguments: [governanceCommitteeAddress]
  })
  .send({ from: deployerAddress, gas: 6000000 });
```

### 11.2 节点质押（国密签名版）

```javascript
// 使用国密算法生成签名
const nodeId = 'node-abc123';
const amount = web3.utils.toWei('15000', 'ether');
const nodeType = 0; // 0=根层, 1=分区层, 2=边缘层

// 准备质押数据
const stakeData = {
  nodeId: nodeId,
  amount: amount,
  nodeType: nodeType,
  businessLicenseHash: sm3Hash(licenseNumber),
  filingNumberHash: sm3Hash(filingNumber),
  timestamp: Date.now()
};

// 使用SM2生成签名
const sm3HashValue = sm3(JSON.stringify(stakeData));
const sm2Signature = generateSm2Signature(sm3HashValue, privateKey);

// 提交质押交易
const result = await deployedContract.methods
  .stakeWithGmSign(
    nodeId,
    amount,
    sm2Signature,
    sm3HashValue,
    Date.now(), // nonce
    sm3Hash(licenseNumber),
    sm3Hash(filingNumber),
    nodeType
  )
  .send({ from: nodeAddress, value: amount });

console.log('质押交易结果:', result);
```

### 11.3 验证节点信息

```javascript
// 获取节点信息
const nodeInfo = await deployedContract.methods
  .getNodeInfo(nodeAddress)
  .call();

console.log('节点信息:', nodeInfo);

// 获取共识节点列表
const consensusNodes = await deployedContract.methods
  .getConsensusNodes()
  .call();

console.log('共识节点列表:', consensusNodes);
```

### 11.4 挑战与验证

```javascript
// 提交缓存挑战
await deployedContract.methods
  .submitCacheChallenge(
    cacheKey,
    '数据过期或不一致',
    challengeData
  )
  .send({ from: challengerAddress });

// 验证挑战结果（仅授权验证器可调用）
await deployedContract.methods
  .resolveChallenge(
    cacheKey,
    challengedNodeAddress,
    true, // 挑战是否成功
    [challenger1, challenger2, challenger3]
  )
  .send({ from: validatorAddress });
```

### 11.5 声誉系统集成

```javascript
// 更新节点声誉（仅授权验证器可调用）
await deployedContract.methods
  .updateReputation(nodeAddress, reputationDelta)
  .send({ from: validatorAddress });

// 获取合约统计信息
const stats = await deployedContract.methods
  .getContractStats()
  .call();

console.log('合约统计:', stats);
```

### 11.6 提取质押金

```javascript
// 申请提取质押金
await deployedContract.methods
  .requestWithdrawal(withdrawalAmount)
  .send({ from: nodeAddress });

// 执行提取（锁定期后）
await deployedContract.methods
  .withdraw()
  .send({ from: nodeAddress });
```