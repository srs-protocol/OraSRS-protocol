# OraSRS P2P网络简化说明

## 简化版P2P网络设置

OraSRS支持P2P网络功能，用于分布式威胁情报共享。以下是简化后的设置说明：

### 基本网络启动

```javascript
import { SimpleOraSRSNetwork } from './SimpleOraSRSNetwork.mjs';

// 创建网络实例
const network = new SimpleOraSRSNetwork();

// 启动网络
await network.startNetwork();
```

### 网络功能

#### 1. 威胁情报发布

```javascript
// 发布威胁情报到网络
await network.publishThreatIntel({
  threatType: 'malware',
  sourceIP: '192.168.1.100',
  targetIP: '10.0.0.50',
  severity: 'high',
  description: 'Detected malicious activity'
});
```

#### 2. 节点状态发布

```javascript
// 发布节点状态
await network.publishNodeStatus({
  status: 'online',
  cpu: 25,
  memory: 60,
  network: 'good'
});
```

#### 3. 内容注册

```javascript
// 注册为内容提供者
await network.registerAsProvider('threat-intel-feed-1');
```

### 网络配置

网络节点会自动从区块链获取节点列表并连接，无需复杂的引导节点配置。

### 安全与隐私

- 所有P2P通信使用加密
- 支持国密算法SM2/SM3/SM4
- 自动NAT穿透功能