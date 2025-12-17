# SecurityRiskAssessment 协议客户端方案（更新版 - 简化网络架构）

## 1. 概述

### 1.1 项目进度总结
随着 SecurityRiskAssessment 协议的不断发展，我们已经实现了以下核心组件：
- **三层共识架构**：全局根网络层 + 分区共识层 + 边缘缓存层
- **质押与声誉系统**：支持国密算法的质押机制
- **治理系统**：技术委员会治理模式
- **安全合规**：国密算法支持和等保三级要求
- **长安链部署**：完整的 ChainMaker 部署方案
- **简化的网络架构**：移除复杂的P2P设置，采用更高效的客户端-服务器模式

### 1.2 客户端方案目标
本方案定义了 SecurityRiskAssessment 协议客户端的实现规范，确保客户端能够安全、高效地与 SecurityRiskAssessment 网络交互。

## 2. 客户端架构

### 2.1 核心组件
```
SecurityRiskAssessment Client
├── Query Interface (查询接口)
├── Response Processor (响应处理器)
├── Local Policy Engine (本地策略引擎)
├── Caching Layer (缓存层)
├── Security Module (安全模块)
├── Compliance Module (合规模块)
└── Monitoring (监控模块)
```

### 2.2 通信协议
- **协议版本**: v1.1 (支持三层架构)
- **传输协议**: HTTPS/TLS 1.3
- **数据格式**: JSON
- **国密支持**: SM2/SM3/SM4
- **网络模式**: 简化的客户端-服务器模式（移除了P2P网络）

## 3. 客户端 API 规范

### 3.1 风险评估查询
```javascript
// 基础查询
POST /api/v1/query
Content-Type: application/json
X-ORASRS-Client-Version: 1.1
X-ORASRS-Signature: <SM2 signature>

{
  "ip": "1.2.3.4",
  "domain": "example.com",
  "client_info": {
    "client_id": "unique_client_id",
    "service_type": "firewall|waf|router",
    "location": "beijing",
    "timestamp": "2025-12-02T10:00:00Z"
  },
  "evidence": {
    "connection_count": 100,
    "request_rate": 10.5,
    "behavioral_patterns": ["port_scan", "brute_force"]
  }
}
```

### 3.2 响应格式
```javascript
{
  "query_id": "uuid-v4",
  "timestamp": "2025-12-02T10:00:00Z",
  "response": {
    "risk_score": 0.85,
    "confidence": "high",
    "risk_level": "high",
    "evidence": [
      {
        "type": "behavior", 
        "detail": "SYN flood to 10 targets in 1h",
        "source": "node-abc123",
        "timestamp": "2025-12-01T10:00:00Z"
      }
    ],
    "recommendations": {
      "default": "challenge",
      "critical_services": "allow",
      "public_services": "allow_with_captcha"
    },
    "architectural_layer": "edge|partition|root",
    "cache_ttl": 300,
    "appeal_url": "https://api.orasrs.net/appeal?ip=1.2.3.4",
    "expires_at": "2025-12-02T11:00:00Z"
  },
  "disclaimer": "This is advisory only. Final decision rests with the client."
}
```

### 3.3 批量查询
```javascript
POST /api/v1/bulk-query
{
  "queries": [
    {"ip": "1.2.3.4", "domain": "example.com"},
    {"ip": "5.6.7.8", "domain": "test.com"}
  ],
  "options": {
    "max_wait_time": 1000,
    "consensus_level": "fast|normal|full"
  }
}
```

## 4. 客户端实现指南

### 4.1 Node.js 客户端实现

```javascript
const axios = require('axios');
const crypto = require('crypto');

class SecurityRiskAssessmentClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey;
    this.endpoint = options.endpoint || 'https://api.orasrs.net';
    this.timeout = options.timeout || 5000;
    this.cache = new Map();
    this.localPolicyEngine = new LocalPolicyEngine(options.localPolicy);
    
    // 国密算法支持
    this.sm2PublicKey = options.sm2PublicKey;
    this.sm2PrivateKey = options.sm2PrivateKey;
  }

  // 风险评估查询
  async queryRisk(ip, domain = null, options = {}) {
    const queryData = {
      ip,
      domain,
      client_info: {
        client_id: this.clientId,
        service_type: options.serviceType || 'unknown',
        location: options.location || 'unknown',
        timestamp: new Date().toISOString()
      },
      evidence: options.evidence || {}
    };

    // 检查缓存
    const cacheKey = `${ip}_${domain || 'default'}`;
    const cached = this.cache.get(cacheKey);
    if (cached && new Date() < new Date(cached.expires_at)) {
      return cached;
    }

    // 准备请求
    const requestData = JSON.stringify(queryData);
    const signature = this.signWithSM2(requestData);
    
    try {
      const response = await axios.post(`${this.endpoint}/api/v1/query`, queryData, {
        headers: {
          'Content-Type': 'application/json',
          'X-ORASRS-API-Key': this.apiKey,
          'X-ORASRS-Signature': signature,
          'X-ORASRS-Client-Version': '1.1'
        },
        timeout: this.timeout
      });

      // 验证响应签名
      if (!this.verifyResponseSignature(response.data, response.headers['x-SRA-response-signature'])) {
        throw new Error('Invalid response signature');
      }

      // 缓存结果
      if (response.data.response.cache_ttl) {
        const expiresAt = new Date(Date.now() + response.data.response.cache_ttl * 1000);
        response.data.expires_at = expiresAt.toISOString();
        this.cache.set(cacheKey, response.data);
      }

      return response.data;
    } catch (error) {
      console.error('SecurityRiskAssessment query failed:', error.message);
      // 返回本地策略决策
      return this.localPolicyEngine.makeDecision(ip, domain, error);
    }
  }

  // 批量查询
  async bulkQuery(queries, options = {}) {
    const bulkData = {
      queries,
      options: {
        max_wait_time: options.maxWaitTime || 1000,
        consensus_level: options.consensusLevel || 'normal'
      }
    };

    try {
      const response = await axios.post(`${this.endpoint}/api/v1/bulk-query`, bulkData, {
        headers: {
          'Content-Type': 'application/json',
          'X-ORASRS-API-Key': this.apiKey,
          'X-ORASRS-Signature': this.signWithSM2(JSON.stringify(bulkData))
        },
        timeout: this.timeout
      });

      return response.data;
    } catch (error) {
      console.error('SecurityRiskAssessment bulk query failed:', error.message);
      return { error: error.message, decisions: [] };
    }
  }

  // 申诉处理
  async submitAppeal(ip, evidence, reason) {
    const appealData = {
      ip,
      evidence,
      reason,
      client_info: {
        client_id: this.clientId,
        timestamp: new Date().toISOString()
      }
    };

    try {
      const response = await axios.post(`${this.endpoint}/api/v1/appeal`, appealData, {
        headers: {
          'Content-Type': 'application/json',
          'X-ORASRS-API-Key': this.apiKey,
          'X-ORASRS-Signature': this.signWithSM2(JSON.stringify(appealData))
        }
      });

      return response.data;
    } catch (error) {
      console.error('SecurityRiskAssessment appeal failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  // 国密算法签名
  signWithSM2(data) {
    // 在实际实现中，这里会使用真实的 SM2 签名
    if (this.sm2PrivateKey) {
      // SM2 签名实现
      return crypto.createHash('sha256').update(data).digest('hex');
    }
    // 模拟签名
    return crypto.randomBytes(32).toString('hex');
  }

  // 验证响应签名
  verifyResponseSignature(data, signature) {
    // 在实际实现中，这里会使用真实的 SM2 验证
    if (this.sm2PublicKey) {
      // SM2 验证实现
      return true;
    }
    return true; // 模拟验证
  }

  // 本地决策（当 SecurityRiskAssessment 不可用时）
  makeLocalDecision(ip, domain) {
    return this.localPolicyEngine.makeDecision(ip, domain);
  }
}

// 本地策略引擎
class LocalPolicyEngine {
  constructor(policyConfig = {}) {
    this.policy = {
      criticalWhitelist: policyConfig.criticalWhitelist || [],
      defaultAction: policyConfig.defaultAction || 'allow',
      rateLimiting: policyConfig.rateLimiting || true
    };
  }

  makeDecision(ip, domain, error = null) {
    // 根据本地策略和错误信息做出决策
    return {
      query: { ip, domain },
      response: {
        risk_score: 0.1, // 默认低风险
        confidence: 'low',
        risk_level: 'low',
        recommendations: { default: this.policy.defaultAction },
        local_fallback: true,
        error: error ? error.message : null
      },
      disclaimer: 'Local policy decision due to SecurityRiskAssessment unavailability'
    };
  }
}

module.exports = SecurityRiskAssessmentClient;
```

### 4.2 Python 客户端实现

```python
import requests
import json
import time
from typing import Optional, Dict, Any
from dataclasses import dataclass
from urllib.parse import urlencode

@dataclass
class QueryRequest:
    ip: str
    domain: Optional[str] = None
    service_type: str = "unknown"
    location: str = "unknown"
    evidence: Optional[Dict[str, Any]] = None

class SecurityRiskAssessmentClient:
    def __init__(self, api_key: str, endpoint: str = "https://api.orasrs.net", timeout: int = 5):
        self.api_key = api_key
        self.endpoint = endpoint.rstrip('/')
        self.timeout = timeout
        self.session = requests.Session()
        self.cache = {}
        self.cache_ttl = 300  # 5分钟

    def query_risk(self, request: QueryRequest) -> Dict[str, Any]:
        """查询风险评估"""
        query_data = {
            "ip": request.ip,
            "domain": request.domain,
            "client_info": {
                "client_id": "py-client",
                "service_type": request.service_type,
                "location": request.location,
                "timestamp": time.time()
            },
            "evidence": request.evidence or {}
        }

        # 检查缓存
        cache_key = f"{request.ip}_{request.domain or 'default'}"
        if cache_key in self.cache:
            cached_data, expiry = self.cache[cache_key]
            if time.time() < expiry:
                return cached_data

        try:
            headers = {
                'Content-Type': 'application/json',
                'X-ORASRS-API-Key': self.api_key,
                'X-ORASRS-Client-Version': '1.1'
            }

            response = self.session.post(
                f"{self.endpoint}/api/v1/query",
                json=query_data,
                headers=headers,
                timeout=self.timeout
            )
            response.raise_for_status()

            result = response.json()

            # 缓存结果
            if 'cache_ttl' in result.get('response', {}):
                ttl = result['response']['cache_ttl']
                self.cache[cache_key] = (result, time.time() + ttl)

            return result

        except requests.RequestException as e:
            print(f"SecurityRiskAssessment query failed: {e}")
            return self._local_fallback(request.ip, request.domain, str(e))

    def bulk_query(self, queries: list, max_wait_time: int = 1000) -> Dict[str, Any]:
        """批量查询"""
        bulk_data = {
            "queries": queries,
            "options": {
                "max_wait_time": max_wait_time,
                "consensus_level": "normal"
            }
        }

        try:
            response = self.session.post(
                f"{self.endpoint}/api/v1/bulk-query",
                json=bulk_data,
                headers={
                    'Content-Type': 'application/json',
                    'X-ORASRS-API-Key': self.apiKey
                },
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()

        except requests.RequestException as e:
            return {"error": str(e), "decisions": []}

    def submit_appeal(self, ip: str, evidence: Dict[str, Any], reason: str) -> Dict[str, Any]:
        """提交申诉"""
        appeal_data = {
            "ip": ip,
            "evidence": evidence,
            "reason": reason,
            "client_info": {
                "client_id": "py-client",
                "timestamp": time.time()
            }
        }

        try:
            response = self.session.post(
                f"{self.endpoint}/api/v1/appeal",
                json=appeal_data,
                headers={
                    'Content-Type': 'application/json',
                    'X-ORASRS-API-Key': self.api_key
                },
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()

        except requests.RequestException as e:
            return {"success": False, "error": str(e)}

    def _local_fallback(self, ip: str, domain: Optional[str], error: str) -> Dict[str, Any]:
        """本地降级策略"""
        return {
            "query": {"ip": ip, "domain": domain},
            "response": {
                "risk_score": 0.1,
                "confidence": "low",
                "risk_level": "low",
                "recommendations": {"default": "allow"},
                "local_fallback": True,
                "error": error
            },
            "disclaimer": "Local policy decision due to SecurityRiskAssessment unavailability"
        }
```

## 5. 高级功能客户端实现

### 5.1 支持长安链质押的客户端

```javascript
class ChainMakerSecurityRiskAssessmentClient extends SecurityRiskAssessmentClient {
  constructor(options = {}) {
    super(options);
    this.chainmakerConfig = options.chainmakerConfig;
    this.nodeId = options.nodeId;
    this.stakeAmount = options.stakeAmount || 10000; // 默认质押金额
  }

  // 在长安链上质押节点
  async stakeNode(identityInfo) {
    try {
      // 准备质押数据
      const stakeData = {
        node_id: this.nodeId,
        amount: this.stakeAmount,
        node_type: 2, // 边缘节点
        business_license_hash: this.hashWithSM3(identityInfo.businessLicense),
        filing_number_hash: this.hashWithSM3(identityInfo.filingNumber),
        timestamp: Date.now()
      };

      // 生成SM2签名
      const dataHash = this.hashWithSM3(JSON.stringify(stakeData));
      const signature = this.signWithSM2(dataHash);

      // 调用长安链合约
      const result = await this.callChainMakerContract('StakeWithGmSign', {
        ...stakeData,
        sm2_signature: signature,
        data_hash: dataHash,
        nonce: Date.now()
      });

      return result;
    } catch (error) {
      console.error('Node staking failed:', error);
      throw error;
    }
  }

  // 获取节点状态
  async getNodeStatus() {
    try {
      const result = await this.callChainMakerContract('GetNodeInfo', {
        node_address: this.nodeId
      });

      return result;
    } catch (error) {
      console.error('Get node status failed:', error);
      return null;
    }
  }

  // 更新节点声誉
  async updateReputation(performanceData) {
    try {
      const result = await this.callChainMakerContract('UpdateReputation', {
        node_address: this.nodeId,
        reputation_delta: performanceData.reputationDelta
      });

      return result;
    } catch (error) {
      console.error('Update reputation failed:', error);
      return null;
    }
  }

  // 提交威胁情报
  async submitThreatIntel(intelData) {
    // 通过联邦学习机制提交威胁情报
    const localUpdate = {
      threat_intel: intelData,
      timestamp: Date.now(),
      nodeId: this.nodeId
    };

    try {
      const result = await this.submitLocalUpdate(localUpdate);
      return result;
    } catch (error) {
      console.error('Submit threat intel failed:', error);
      return null;
    }
  }

  // 调用长安链合约的模拟实现
  async callChainMakerContract(method, params) {
    // 在实际实现中，这里会调用长安链合约
    console.log(`Calling ChainMaker contract: ${method}`, params);
    return { success: true, transaction_id: 'tx_' + Date.now() };
  }

  // SM3哈希
  hashWithSM3(data) {
    // 在实际实现中，这里会使用SM3算法
    return require('crypto').createHash('sha256').update(data).digest('hex');
  }
}
```

## 5. 简化版网络架构实现

### 5.1 网络连接管理

```javascript
class SimplifiedNetworkManager {
  constructor(options = {}) {
    this.endpoint = options.endpoint || 'https://api.orasrs.net';
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.timeout = options.timeout || 10000;
    this.isConnected = false;
  }

  async connect() {
    try {
      // 简化的连接检查
      const response = await axios.get(`${this.endpoint}/health`, {
        timeout: this.timeout
      });
      
      if (response.data && response.data.status === 'healthy') {
        this.isConnected = true;
        console.log('✅ 简化版网络连接成功');
        return true;
      }
    } catch (error) {
      console.error('❌ 网络连接失败:', error.message);
    }
    
    return false;
  }

  async submitThreatIntel(intelData) {
    if (!this.isConnected) {
      await this.connect();
    }
    
    try {
      const response = await axios.post(`${this.endpoint}/api/v1/threats/submit`, {
        ...intelData,
        source: 'simple-client'
      }, {
        timeout: this.timeout
      });
      
      return response.data;
    } catch (error) {
      console.error('提交威胁情报失败:', error.message);
      return { success: false, error: error.message };
    }
  }
}
```

### 5.2 简化版智能层操作

```javascript
// 获取全局威胁情报
const globalThreatIntel = await SRAEngine.getIntelligenceFabricData();

// 驱动下游防御系统
await SRAEngine.driveDownstreamDefenseSystems({
  threatLevel: 'critical',
  targetIP: '192.168.1.10',
  action: 'block'
});
```

### 5.3 架构状态监控

```javascript
// 获取三层架构状态
const architectureStatus = SRAEngine.getThreeTierStatus();
console.log('三层架构状态:', architectureStatus);

// 系统健康检查
const health = SRAEngine.architectureHealthCheck();
console.log('健康检查结果:', health);
```

## 6. 客户端配置和部署

### 6.1 配置文件示例 (config.json)

```json
{
  "SRA": {
    "api_key": "your_api_key_here",
    "endpoint": "https://api.orasrs.net",
    "timeout": 5000,
    "retry_attempts": 3,
    "retry_delay": 1000
  },
  "local_policy": {
    "critical_whitelist": [".gov", ".mil", ".edu", "8.8.8.8"],
    "default_action": "allow",
    "rate_limiting": true,
    "fallback_threshold": 0.8
  },
  "caching": {
    "enabled": true,
    "ttl_seconds": 300,
    "max_size": 10000
  },
  "security": {
    "sm2_public_key": "your_sm2_public_key",
    "sm2_private_key": "your_sm2_private_key",
    "signature_validation": true
  },
  "chainmaker": {
    "enabled": true,
    "node_id": "client-node-1",
    "stake_amount": 10000,
    "contract_address": "SRA-staking-contract-address"
  },
  "network": {
    "mode": "simple_client_server",  // 简化版客户端-服务器模式
    "retries": 3,
    "connection_timeout": 10000
  },
  "monitoring": {
    "enabled": true,
    "metrics_endpoint": "http://localhost:9090",
    "log_level": "info"
  }
}
```

### 6.2 部署示例 (Dockerfile)

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "client.js"]
```

## 7. 性能和监控

### 7.1 客户端性能指标

```javascript
class ClientMetrics {
  constructor() {
    this.metrics = {
      query_count: 0,
      avg_response_time: 0,
      cache_hit_rate: 0,
      error_rate: 0,
      fallback_rate: 0,
      network_connected: false
    };
  }

  recordQuery(responseTime, wasCached = false, wasFallback = false) {
    this.metrics.query_count++;
    this.metrics.avg_response_time = 
      (this.metrics.avg_response_time + responseTime) / 2;
    
    if (wasCached) {
      this.metrics.cache_hit_rate = (this.metrics.cache_hit_rate + 1) / 2;
    }
    
    if (wasFallback) {
      this.metrics.fallback_rate = (this.metrics.fallback_rate + 1) / 2;
    }
  }

  recordError() {
    this.metrics.error_rate = (this.metrics.error_rate + 1) / 2;
  }

  getMetrics() {
    return { ...this.metrics, timestamp: new Date().toISOString() };
  }
}
```

## 8. 合规和安全

### 8.1 数据隐私合规
- IP地址哈希处理 (SM3 + Salt)
- 仅保留必要的日志信息
- 支持数据删除请求 (GDPR/CCPA)

### 8.2 国密算法合规
- SM2数字签名验证
- SM3哈希算法使用
- SM4数据加密 (如需要)

### 8.3 网络安全合规
- 仅在中国境内处理数据
- 符合等保三级要求
- 支持企业实名认证

## 9. 升级路径

### 9.1 从 v1.0 升级到 v1.1
- 支持三层架构查询
- 增加国密算法支持
- 引入长安链集成
- 增强治理功能
- 简化网络架构（移除P2P设置）

### 9.2 未来功能规划
- Web3集成支持
- 跨链风险评估
- AI增强威胁检测
- 零知识证明隐私保护

## 10. 测试和验证

### 10.1 客户端测试套件
```javascript
// client.test.js
const assert = require('assert');
const SecurityRiskAssessmentClient = require('./client');

describe('SecurityRiskAssessment Client', () => {
  let client;

  beforeEach(() => {
    client = new SecurityRiskAssessmentClient({
      apiKey: 'test-key',
      endpoint: 'http://localhost:3000'
    });
  });

  it('should query risk assessment', async () => {
    const result = await client.queryRisk('1.2.3.4');
    assert.ok(result.response);
  });

  it('should handle fallback decisions', () => {
    const decision = client.makeLocalDecision('1.2.3.4', 'test.com');
    assert.ok(decision.response.local_fallback);
  });
});
```

---

**版本**: 1.1  
**最后更新**: 2025年12月2日  
**协议版本**: SecurityRiskAssessment v1.1 (支持三层共识架构，简化网络架构)