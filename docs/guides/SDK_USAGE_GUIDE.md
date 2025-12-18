# OraSRS Client SDK Usage Guide

## 安装 / Installation

```bash
npm install orasrs-sdk
# or
yarn add orasrs-sdk
```

## 快速开始 / Quick Start

```javascript
import OraSRSClient from 'orasrs-sdk';

// 创建客户端实例
const client = new OraSRSClient({
    apiEndpoint: 'http://localhost:3006',  // OraSRS 客户端地址
    blockchainEndpoint: 'https://api.orasrs.net',  // 区块链 RPC 地址
    timeout: 10000,  // 请求超时时间（毫秒）
    autoCacheManagement: true  // 启用自动缓存同步
});

// 查询 IP 风险评分
const result = await client.query('45.135.193.0');
console.log(result);
```

## API 参考 / API Reference

### 构造函数 / Constructor

```javascript
new OraSRSClient(config)
```

**配置选项：**

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `apiEndpoint` | string | `http://127.0.0.1:3006` | OraSRS 客户端 API 地址 |
| `blockchainEndpoint` | string | `https://api.orasrs.net` | 区块链 RPC 端点 |
| `contractAddress` | string | `undefined` | 威胁情报合约地址（可选） |
| `timeout` | number | `10000` | API 请求超时时间（毫秒） |
| `autoCacheManagement` | boolean | `true` | 是否启用自动缓存同步 |
| `syncInterval` | number | `3600000` | 自动同步间隔（毫秒，默认1小时） |

### 威胁情报查询 / Threat Intelligence Query

#### query(ip, options)

查询 IP 地址的风险评分和威胁情报。

```javascript
// 基本查询
const result = await client.query('45.135.193.0');

// 带选项的查询
const result = await client.query('45.135.193.0', {
    cacheFirst: true  // 优先使用缓存
});

console.log(result);
// {
//   query: { ip: '45.135.193.0' },
//   response: {
//     risk_score: 75,
//     risk_level: '高',
//     threat_types: ['Botnet C2'],
//     source: 'Local Cache (Abuse.ch)',
//     cached: true,
//     first_seen: '2025-12-10T00:00:00Z',
//     ... 
//   }
// }
```

#### batchQuery(ips)

批量查询多个 IP 地址。

```javascript
const results = await client.batchQuery([
    '45.135.193.0',
    '192.0.2.1',
    '198.51.100.1'
]);

results.forEach((result, index) => {
    console.log(`IP ${index + 1}:`, result.response.risk_score);
});
```

### 白名单管理 / Whitelist Management

#### addToWhitelist(ip)

添加 IP 到白名单。

```javascript
await client.addToWhitelist('192.168.1.100');
```

#### removeFromWhitelist(ip)

从白名单移除 IP。

```javascript
await client.removeFromWhitelist('192.168.1.100');
```

#### listWhitelist()

列出所有白名单 IP。

```javascript
const whitelist = await client.listWhitelist();
console.log('Whitelisted IPs:', whitelist);
```

#### checkWhitelist(ip)

检查 IP 是否在白名单中。

```javascript
const isWhitelisted = await client.checkWhitelist('8.8.8.8');
console.log('Is whitelisted:', isWhitelisted);
```

### 缓存管理 / Cache Management

#### getCacheStatus()

获取缓存状态信息。

```javascript
const status = await client.getCacheStatus();
console.log('Cache status:', status);
// {
//   threats: 150,
//   safeIPs: 1000,
//   whitelist: 25,
//   lastUpdate: '2025-12-15T12:00:00Z',
//   syncStatus: { ... }
// }
```

#### clearCache()

清空本地缓存（不包括白名单）。

```javascript
await client.clearCache();
```

#### rebuildCache()

重建缓存：清空现有缓存并从区块链完整同步。

```javascript
const result = await client.rebuildCache();
console.log('Cache rebuilt:', result);
```

#### sync(options)

手动同步威胁情报数据。

```javascript
// 增量同步（默认）
await client.sync();

// 强制完整同步
await client.sync({ force: true });
```

#### stopAutoSync()

停止自动缓存同步。

```javascript
client.stopAutoSync();
```

### 统计信息 / Statistics

#### getStats()

获取客户端统计信息。

```javascript
const stats = await client.getStats();
console.log('Statistics:', stats);
// {
//   totalQueries: 5000,
//   cacheHits: 4500,
//   hitRate: '90%',
//   highRiskCount: 25,
//   ...
// }
```

#### getThreatStats()

获取威胁统计信息（`getStats()` 的别名）。

```javascript
const threatStats = await client.getThreatStats();
```

#### getDetectedThreats()

获取检测到的威胁列表。

```javascript
const threats = await client.getDetectedThreats();
threats.forEach(threat => {
    console.log(`${threat.ip}: ${threat.threat_level}`);
});
```

#### getHealth()

获取客户端健康状态。

```javascript
const health = await client.getHealth();
console.log('Health:', health);
// {
//   status: 'healthy',
//   service: 'OraSRS',
//   blockchainConnection: { connected: true },
//   ...
// }
```

### 威胁报告 / Threat Reporting

#### report(ip, reason, privateKey)

向区块链报告威胁 IP（需要私钥）。

```javascript
const privateKey = process.env.ORASRS_PRIVATE_KEY;
const receipt = await client.report(
    '192.0.2.100',
    'Malware distribution',
    privateKey
);
console.log('Transaction hash:', receipt.transactionHash);
```

## 事件监听 / Event Listeners

SDK 继承自 `EventEmitter`，可以监听以下事件：

### sync-complete

缓存同步完成时触发。

```javascript
client.on('sync-complete', (data) => {
    console.log('Sync completed:', data);
});
```

### sync-error

缓存同步失败时触发。

```javascript
client.on('sync-error', (error) => {
    console.error('Sync failed:', error.message);
});
```

### query

每次查询时触发。

```javascript
client.on('query', ({ ip, result }) => {
    console.log(`Queried ${ip}, risk score: ${result.response.risk_score}`);
});
```

### whitelist-updated

白名单更新时触发。

```javascript
client.on('whitelist-updated', ({ action, ip }) => {
    console.log(`Whitelist ${action}: ${ip}`);
});
```

### cache-cleared

缓存清空时触发。

```javascript
client.on('cache-cleared', (data) => {
    console.log('Cache cleared at:', data.timestamp);
});
```

### cache-rebuilt

缓存重建完成时触发。

```javascript
client.on('cache-rebuilt', (syncResult) => {
    console.log('Cache rebuilt with', syncResult.stats);
});
```

### threat-reported

威胁报告提交成功时触发。

```javascript
client.on('threat-reported', ({ ip, reason, tx }) => {
    console.log(`Threat ${ip} reported, tx: ${tx.transactionHash}`);
});
```

## 高级用法 / Advanced Usage

### 自定义同步间隔

```javascript
const client = new OraSRSClient({
    autoCacheManagement: true,
    syncInterval: 1800000  // 30分钟同步一次
});
```

### 完全手动管理缓存

```javascript
const client = new OraSRSClient({
    autoCacheManagement: false  // 禁用自动同步
});

// 手动控制同步时机
setInterval(async () => {
    try {
        await client.sync();
        console.log('Manual sync completed');
    } catch (error) {
        console.error('Sync failed:', error);
    }
}, 3600000);  // 每小时
```

### 批量白名单管理

```javascript
const trustedIPs = [
    '192.168.1.100',
    '192.168.1.101',
    '192.168.1.102'
];

// 批量添加
for (const ip of trustedIPs) {
    await client.addToWhitelist(ip);
}

// 验证
const whitelist = await client.listWhitelist();
console.log('Current whitelist:', whitelist);
```

### 使用 Promise.all 优化并发查询

```javascript
const ips = ['45.135.193.0', '192.0.2.1', '198.51.100.1'];

// 并发查询
const results = await Promise.all(
    ips.map(ip => client.query(ip))
);

// 或使用 batchQuery 方法
const results = await client.batchQuery(ips);
```

### 监控和告警示例

```javascript
const client = new OraSRSClient();

// 监听所有查询
client.on('query', ({ ip, result }) => {
    const score = result.response.risk_score;
    
    if (score >= 80) {
        console.warn(`⚠️ HIGH RISK IP DETECTED: ${ip} (score: ${score})`);
        // 触发告警系统
        sendAlert({ ip, score, level: 'HIGH' });
    }
});

// 监听同步错误
client.on('sync-error', (error) => {
    console.error('Sync failed, cache may be outdated:', error);
    // 通知运维团队
    notifyOps({ type: 'sync-error', error });
});
```

## 错误处理 / Error Handling

SDK 的所有异步方法都可能抛出错误，建议使用 try-catch：

```javascript
try {
    const result = await client.query('45.135.193.0');
    console.log('Risk score:', result.response.risk_score);
} catch (error) {
    console.error('Query failed:', error.message);
    
    // 根据错误类型处理
    if (error.message.includes('timeout')) {
        console.log('Request timed out, retrying...');
        // 实现重试逻辑
    } else if (error.message.includes('connect')) {
        console.log('Cannot connect to OraSRS client');
        // 回退到离线模式
    }
}
```

## 完整示例 / Complete Example

```javascript
import OraSRSClient from 'orasrs-sdk';

async function main() {
    // 创建客户端
    const client = new OraSRSClient({
        apiEndpoint: 'http://localhost:3006',
        autoCacheManagement: true
    });

    // 设置事件监听
    client.on('sync-complete', () => {
        console.log('✅ Cache synchronized');
    });

    client.on('query', ({ ip, result }) => {
        if (result.response.risk_score >= 70) {
            console.warn(`⚠️ High risk: ${ip}`);
        }
    });

    try {
        // 检查健康状态
        const health = await client.getHealth();
        console.log('Service status:', health.status);

        // 查询威胁情报
        const result = await client.query('45.135.193.0');
        console.log('Risk assessment:', result.response);

        // 管理白名单
        await client.addToWhitelist('192.168.1.100');
        const whitelist = await client.listWhitelist();
        console.log('Whitelist:', whitelist);

        // 获取统计信息
        const stats = await client.getStats();
        console.log('Statistics:', stats);

        // 主动同步
        await client.sync({ force: false });

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        // 清理资源
        client.destroy();
    }
}

main();
```

## 最佳实践 / Best Practices

1. **启用自动缓存同步**：保持威胁情报最新
2. **监听事件**：及时响应高风险威胁
3. **错误处理**：所有 API 调用都应使用 try-catch
4. **批量操作**：使用 `batchQuery` 提高效率
5. **资源清理**：应用退出时调用 `client.destroy()`
6. **缓存优先**：对于高频查询，启用 `cacheFirst` 选项

## 故障排除 / Troubleshooting

### 连接失败

```javascript
const health = await client.getHealth();
if (health.status !== 'healthy') {
    console.error('OraSRS client is not healthy');
}
```

### 同步超时

增加超时时间：

```javascript
const client = new OraSRSClient({
    timeout: 30000  // 30秒
});
```

### 缓存过期

强制重建缓存：

```javascript
await client.rebuildCache();
```

## 更多资源 / More Resources

- [GitHub Repository](https://github.com/srs-protocol/OraSRS-protocol)
- [API Documentation](../api.md)
- [Client Implementation Guide](CLIENT_IMPLEMENTATION_GUIDE.md)
- [Issue Tracker](https://github.com/srs-protocol/OraSRS-protocol/issues)
