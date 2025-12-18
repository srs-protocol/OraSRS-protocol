# SecurityRiskAssessment v2.0 API 接口文档 - V2.0.1
# SecurityRiskAssessment v2.0 API Interface Documentation - V2.0.1

## 1. API 基础信息
## 1. API Basic Information

- **API 版本**: v2.0.1
- **API Version**: v2.0.1
- **基础 URL**: `https://api.OraSRS.net` (通过反向代理访问本地Hardhat节点)
- **Base URL**: `https://api.OraSRS.net` (Accessing local Hardhat node via reverse proxy)
- **内容类型**: `application/json`
- **Content Type**: `application/json`
- **认证方式**: API Key + 国密算法签名
- **Authentication**: API Key + SM Algorithm Signature
- **区块链集成**: 所有威胁情报记录在OraSRS协议链上
- **Blockchain Integration**: All threat intelligence recorded on OraSRS protocol chain
- **去重逻辑**: 防止重复威胁报告的时间窗口机制
- **Deduplication Logic**: Time window mechanism to prevent duplicate threat reports
- **说明**: `api.OraSRS.net` 通过反向代理将请求转发到本地Hardhat节点，Chain ID为8888。所有智能合约都可以通过此公网API访问。
- **Note**: `api.OraSRS.net` forwards requests to local Hardhat node via reverse proxy, Chain ID is 8888. All smart contracts are accessible through this public API.

## 2. 认证 (Authentication)

所有 API 请求都需要在请求头中包含以下信息：

```http
Authorization: Bearer {your_api_key}
X-SecurityRiskAssessment-Signature: {sm2_signature}
X-SecurityRiskAssessment-Timestamp: {timestamp}
X-SecurityRiskAssessment-Nonce: {random_nonce}
```

## 3. 威胁情报 API (Threat Intelligence API)

### 3.1 提交威胁报告 (Submit Threat Report)
- **端点 / Endpoint**: `POST /threats/submit`
- **描述 / Description**: 向 SecurityRiskAssessment 网络提交威胁证据
- **Description**: Submit threat evidence to the SecurityRiskAssessment network

#### 请求参数 (Request Parameters)
```json
{
  "threatType": "DDoS|Malware|Phishing|BruteForce|SuspiciousConnection|AnomalousBehavior|IoCMatch",
  "sourceIP": "string",
  "targetIP": "string",
  "threatLevel": "Info|Warning|Critical|Emergency",
  "context": "string",
  "evidenceHash": "string",
  "geolocation": "string",
  "networkFlow": "string",
  "complianceTag": "string",
  "region": "string"
}
```

#### 示例请求 (Example Request)
```bash
curl -X POST "https://api.SRA.example.com/api/v2/threats/submit" \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "threatType": "DDoS",
    "sourceIP": "192.168.1.100",
    "targetIP": "10.0.0.1",
    "threatLevel": "Critical",
    "context": "SYN flood attack detected",
    "evidenceHash": "sm3_hash_value",
    "geolocation": "Shanghai, China",
    "networkFlow": "TCP SYN flood",
    "complianceTag": "GDPR_v2.1",
    "region": "EU"
  }'
```

#### 响应 (Response)
```json
{
  "success": true,
  "data": {
    "threatId": "threat_192.168.1.100_1623456789",
    "timestamp": 1623456789,
    "status": "pending_verification"
  },
  "message": "Threat report submitted successfully"
}
```

### 3.2 查询威胁报告 (Query Threat Report)
- **端点 / Endpoint**: `GET /threats/{threatId}`
- **描述 / Description**: 根据 ID 查询特定威胁报告
- **Description**: Query a specific threat report by ID

#### 示例请求 (Example Request)
```bash
curl -X GET "https://api.SRA.example.com/api/v2/threats/threat_192.168.1.100_1623456789" \
  -H "Authorization: Bearer your_api_key"
```

#### 响应 (Response)
```json
{
  "success": true,
  "data": {
    "id": "threat_192.168.1.100_1623456789",
    "timestamp": 1623456789,
    "sourceIP": "192.168.1.100",
    "targetIP": "10.0.0.1",
    "threatType": "DDoS",
    "threatLevel": "Critical",
    "context": "SYN flood attack detected",
    "evidenceHash": "sm3_hash_value",
    "geolocation": "Shanghai, China",
    "networkFlow": "TCP SYN flood",
    "agentID": "agent-001",
    "verified": true,
    "verificationCount": 5,
    "complianceTag": "GDPR_v2.1",
    "region": "EU"
  },
  "message": "Threat report retrieved successfully"
}
```

### 3.3 验证威胁报告 (Verify Threat Report)
- **端点 / Endpoint**: `POST /threats/{threatId}/verify`
- **描述 / Description**: 验证特定威胁报告
- **Description**: Verify a specific threat report

#### 请求参数 (Request Parameters)
```json
{
  "verdict": true,
  "confidence": 0.9,
  "justification": "string"
}
```

#### 示例请求 (Example Request)
```bash
curl -X POST "https://api.SRA.example.com/api/v2/threats/threat_192.168.1.100_1623456789/verify" \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "verdict": true,
    "confidence": 0.9,
    "justification": "Confirmed by multiple sources"
  }'
```

### 3.4 获取全局威胁列表 (Get Global Threat List)
- **端点 / Endpoint**: `GET /threats/global`
- **描述 / Description**: 获取全局威胁列表
- **Description**: Get the global threat list

#### 查询参数 (Query Parameters)
- `limit`: 限制返回结果数量 (Limit number of results returned)
- `offset`: 偏移量 (Offset)
- `threatLevel`: 过滤威胁级别 (Filter by threat level)
- `region`: 过滤区域 (Filter by region)

#### 示例请求 (Example Request)
```bash
curl -X GET "https://api.SRA.example.com/api/v2/threats/global?limit=10&threatLevel=Critical" \
  -H "Authorization: Bearer your_api_key"
```

## 4. 区块链威胁证据合约 API (Blockchain Threat Evidence Contract API)

### 4.1 提交威胁证据到区块链 (Submit Threat Evidence to Blockchain)
- **端点 / Endpoint**: `POST /blockchain/submit`
- **描述 / Description**: 将威胁证据提交到区块链进行不可篡改存储
- **Description**: Submit threat evidence to blockchain for immutable storage

#### 请求参数 (Request Parameters)
```json
{
  "reportData": {
    "threatType": 0,
    "sourceIP": "string",
    "targetIP": "string", 
    "threatLevel": 2,
    "context": "string",
    "evidenceHash": "string",
    "geolocation": "string"
  },
  "nonce": 123456
}
```

### 4.2 获取链上威胁证据 (Get On-chain Threat Evidence)
- **端点 / Endpoint**: `GET /blockchain/threats/{threatId}`
- **描述 / Description**: 从区块链获取威胁证据
- **Description**: Get threat evidence from blockchain

## 5. 代理管理 API (Agent Management API)

### 5.1 获取代理状态 (Get Agent Status)
- **端点 / Endpoint**: `GET /agent/status`
- **描述 / Description**: 获取当前代理状态
- **Description**: Get current agent status

#### 示例响应 (Example Response)
```json
{
  "success": true,
  "data": {
    "agentId": "agent-001",
    "version": "2.0.0",
    "uptime": 86400,
    "threatCount": 150,
    "reputation": 0.95,
    "memoryUsage": 2048576,
    "cpuUsage": 15.5,
    "networkUsage": 10485760,
    "lastThreatReport": 1623456789,
    "networkConnected": true,
    "complianceMode": "GDPR"
  }
}
```

### 5.2 更新代理配置 (Update Agent Configuration)
- **端点 / Endpoint**: `POST /agent/config`
- **描述 / Description**: 更新代理配置
- **Description**: Update agent configuration

## 6. 合规 API (Compliance API)

### 6.1 验证合规状态 (Verify Compliance Status)
- **端点 / Endpoint**: `POST /compliance/verify`
- **描述 / Description**: 验证请求是否符合合规要求
- **Description**: Verify if request complies with compliance requirements

#### 请求参数 (Request Parameters)
```json
{
  "data": "string",
  "region": "EU|China|Global",
  "dataTypes": ["threat_intel", "network_flow", "anonymized_data"]
}
```

## 7. 错误码 (Error Codes)

| 错误码 / Code | 描述 / Description |
|---------------|---------------------|
| 200 | 成功 / Success |
| 400 | 请求参数错误 / Bad Request |
| 401 | 未授权 / Unauthorized |
| 403 | 禁止访问 / Forbidden |
| 404 | 资源未找到 / Not Found |
| 429 | 请求过于频繁 / Too Many Requests |
| 500 | 服务器内部错误 / Internal Server Error |
| 503 | 服务不可用 / Service Unavailable |

## 8. 限流 (Rate Limiting)

API 实施以下限流策略：
- 每分钟最多 1000 个请求
- 每小时最多 50000 个请求
- 每天最多 1000000 个请求

API implements the following rate limiting:
- Maximum 1,000 requests per minute
- Maximum 50,000 requests per hour
- Maximum 1,000,000 requests per day

## 9. 国密算法集成 (SM Algorithm Integration)

API 支持国密算法进行数据加密和签名：
- SM2: 数字签名和密钥交换
- SM3: 哈希算法
- SM4: 块密码

API supports Chinese national cryptographic algorithms:
- SM2: Digital signature and key exchange
- SM3: Hash algorithm
- SM4: Block cipher

---

## 10. 内核加速 API (Kernel Acceleration API)

### 10.1 获取内核加速状态 (Get Kernel Acceleration Status)

- **端点 / Endpoint**: `GET /orasrs/v1/kernel/stats`
- **描述 / Description**: 获取 eBPF 内核加速基本状态
- **Description**: Get basic eBPF kernel acceleration status

#### 示例请求 (Example Request)
```bash
curl -X GET "http://localhost:3006/orasrs/v1/kernel/stats"
```

#### 响应 (Response)
```json
{
  "success": true,
  "kernel_acceleration": {
    "enabled": true,
    "mode": "monitor",
    "interface": "eth0",
    "cacheSize": 1234,
    "riskThreshold": 80,
    "totalPackets": 10000,
    "highRiskHits": 50,
    "blockedPackets": 30,
    "allowedPackets": 9970,
    "status": "running"
  }
}
```

### 10.2 获取详细统计信息 (Get Detailed Statistics)

- **端点 / Endpoint**: `GET /orasrs/v1/kernel/stats/detailed`
- **描述 / Description**: 获取详细的性能和统计信息
- **Description**: Get detailed performance and statistics

#### 示例请求 (Example Request)
```bash
curl -X GET "http://localhost:3006/orasrs/v1/kernel/stats/detailed"
```

#### 响应 (Response)
```json
{
  "success": true,
  "kernel_acceleration": {
    "enabled": true,
    "mode": "monitor",
    "interface": "eth0",
    "cacheSize": 1234,
    "riskThreshold": 80,
    "totalPackets": 10000,
    "highRiskHits": 50,
    "blockedPackets": 30,
    "allowedPackets": 9970,
    "performance": {
      "avgQueryLatency": 0.001,
      "peakTPS": 15000,
      "memoryUsage": 45.2
    },
    "riskDistribution": {
      "low": 8000,
      "medium": 1500,
      "high": 450,
      "critical": 50
    },
    "uptime": 86400,
    "status": "running"
  }
}
```

### 10.3 更新内核配置 (Update Kernel Configuration)

- **端点 / Endpoint**: `POST /orasrs/v1/kernel/config`
- **描述 / Description**: 动态更新内核加速配置（无需重启）
- **Description**: Dynamically update kernel acceleration configuration (no restart required)

#### 请求参数 (Request Parameters)
```json
{
  "mode": "monitor|enforce|disabled",
  "riskThreshold": 80,
  "cacheUpdateInterval": 300000
}
```

#### 示例请求 (Example Request)
```bash
curl -X POST "http://localhost:3006/orasrs/v1/kernel/config" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "enforce",
    "riskThreshold": 90
  }'
```

#### 响应 (Response)
```json
{
  "success": true,
  "message": "Configuration updated successfully",
  "changes": [
    "mode: monitor → enforce",
    "riskThreshold: 80 → 90"
  ]
}
```

### 10.4 手动同步威胁数据 (Manual Threat Sync)

- **端点 / Endpoint**: `POST /orasrs/v1/kernel/sync`
- **描述 / Description**: 手动同步威胁数据到内核 BPF Map
- **Description**: Manually sync threat data to kernel BPF Map

#### 示例请求 (Example Request)
```bash
curl -X POST "http://localhost:3006/orasrs/v1/kernel/sync"
```

#### 响应 (Response)
```json
{
  "success": true,
  "message": "Threats synced to kernel successfully"
}
```

### 10.5 配置参数说明 (Configuration Parameters)

| 参数 / Parameter | 类型 / Type | 默认值 / Default | 说明 / Description |
|------------------|-------------|------------------|---------------------|
| `mode` | string | "monitor" | 运行模式: monitor (监控), enforce (强制), disabled (禁用) |
| `interface` | string | "eth0" | 网络接口名称 |
| `riskThreshold` | number | 80 | 风险阈值 (0-100) |
| `cacheUpdateInterval` | number | 300000 | 缓存更新间隔 (毫秒) |

### 10.6 模式说明 (Mode Description)

#### Monitor 模式
- **功能**: 记录所有高风险连接，不阻断
- **用途**: 测试、调试、数据收集
- **性能**: 无额外开销
- **安全**: 无服务中断风险

#### Enforce 模式
- **功能**: 实时阻断高风险连接
- **用途**: 生产环境保护
- **性能**: < 0.04ms 额外延迟
- **安全**: 需要配置白名单

#### Disabled 模式
- **功能**: 禁用 eBPF 加速
- **用途**: 故障排查、降级
- **性能**: 回退到纯缓存模式
- **安全**: 无内核级保护

---

## 11. 性能指标 (Performance Metrics)

### 11.1 内核加速性能

| 指标 / Metric | 目标值 / Target | 实际值 / Actual |
|---------------|-----------------|-----------------|
| 查询延迟 / Query Latency | < 0.04ms | ~0.001ms |
| 吞吐量 / Throughput | > 10,000 TPS | ~15,000 TPS |
| 内存使用 / Memory Usage | < 50MB | ~45MB |
| CPU 使用 / CPU Usage | < 5% | ~2% |

### 11.2 API 响应时间

| 端点 / Endpoint | 平均响应时间 / Avg Response Time |
|-----------------|----------------------------------|
| `/orasrs/v1/kernel/stats` | < 10ms |
| `/orasrs/v1/kernel/stats/detailed` | < 20ms |
| `/orasrs/v1/kernel/config` | < 50ms |
| `/orasrs/v1/kernel/sync` | < 100ms |

---

## 12. 使用示例 (Usage Examples)

### 12.1 完整工作流程

```bash
# 1. 检查内核加速状态
curl http://localhost:3006/orasrs/v1/kernel/stats

# 2. 切换到 enforce 模式
curl -X POST http://localhost:3006/orasrs/v1/kernel/config \
  -H "Content-Type: application/json" \
  -d '{"mode": "enforce"}'

# 3. 调整风险阈值
curl -X POST http://localhost:3006/orasrs/v1/kernel/config \
  -H "Content-Type: application/json" \
  -d '{"riskThreshold": 90}'

# 4. 手动同步威胁数据
curl -X POST http://localhost:3006/orasrs/v1/kernel/sync

# 5. 查看详细统计
curl http://localhost:3006/orasrs/v1/kernel/stats/detailed
```

### 12.2 监控脚本示例

```bash
#!/bin/bash
# 监控内核加速状态

while true; do
  # 获取统计信息
  stats=$(curl -s http://localhost:3006/orasrs/v1/kernel/stats/detailed)
  
  # 提取关键指标
  blocked=$(echo $stats | jq '.kernel_acceleration.blockedPackets')
  total=$(echo $stats | jq '.kernel_acceleration.totalPackets')
  
  # 计算阻断率
  if [ "$total" -gt 0 ]; then
    rate=$(echo "scale=2; $blocked * 100 / $total" | bc)
    echo "$(date): Blocked: $blocked/$total ($rate%)"
    
    # 告警: 阻断率 > 5%
    if (( $(echo "$rate > 5" | bc -l) )); then
      echo "WARNING: High block rate detected!"
    fi
  fi
  
  sleep 60
done
```

---

## 13. 错误处理 (Error Handling)

### 13.1 内核加速错误码

| 错误码 / Code | 描述 / Description | 解决方案 / Solution |
|---------------|---------------------|---------------------|
| 404 | eBPF 未启用 | 检查配置文件，启用 egressProtection |
| 400 | 无效的模式 | 使用 monitor, enforce, 或 disabled |
| 500 | 内核加速失败 | 检查 BCC 安装和内核版本 |

### 13.2 错误响应示例

```json
{
  "success": false,
  "error": "eBPF kernel acceleration is not enabled",
  "message": "Please enable egressProtection in configuration"
}
```

---

## 14. 安全建议 (Security Recommendations)

1. **API 访问控制**:
   - 限制 API 访问为 localhost (127.0.0.1)
   - 使用防火墙保护
   - 启用 HTTPS (生产环境)

2. **配置管理**:
   - 使用强密码保护配置文件
   - 定期备份配置
   - 审计配置变更

3. **监控告警**:
   - 监控阻断率
   - 监控性能指标
   - 设置告警阈值

---

## 15. 版本历史 (Version History)

| 版本 / Version | 日期 / Date | 更新内容 / Changes |
|----------------|-------------|---------------------|
| 2.1.0 | 2025-12-16 | 添加内核加速 API |
| 2.0.1 | 2025-12-15 | 更新威胁情报 API |
| 2.0.0 | 2025-12-14 | 初始版本 |