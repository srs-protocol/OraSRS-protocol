# SecurityRiskAssessment (Oracle Security Root Service) 核心协议规范

## 概述 / Overview

SecurityRiskAssessment (Oracle Security Root Service) 是一个咨询式风险评分服务，旨在为互联网安全决策提供权威参考。与传统的阻断式防火墙不同，SecurityRiskAssessment 提供风险评估和建议，由客户端自主决定是否执行相应措施。

## 设计原则 / Design Principles

### 1. 咨询式服务模式 / Advisory Service Model
- **错误设计 / Incorrect Design**: SecurityRiskAssessment 返回 `{ action: "BLOCK" }`
- **正确设计 / Correct Design**: SecurityRiskAssessment 返回 `{ risk_score: 0.92, evidence: ["ddos_bot", "scan_24h"] }`
- **客户端强制执行** → **客户端自主决策是否拦截**
- **Client forced execution** → **Client autonomous decision to intercept or not**

> 类比：SecurityRiskAssessment 是信用评分机构（如 FICO），不是法院。客户端（如银行）自己决定是否采取行动。
> Analogy: SecurityRiskAssessment is a credit rating agency (like FICO), not a court. The client (like a bank) decides whether to take action.

## API 端点 / API Endpoints

### 风险查询 / Risk Query
```
GET /SRA/v1/query?ip={ip}&domain={domain}
```

**请求示例 / Request Example**:
```
GET /SRA/v1/query?ip=1.2.3.4
Accept: application/json
```

**响应格式 / Response Format**:
```json
{
  "query": { "ip": "1.2.3.4" },
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
      "critical_services": "allow"
    },
    "appeal_url": "https://srs.net/appeal?ip=1.2.3.4",
    "expires_at": "2025-12-02T10:00:00Z",
    "disclaimer": "This is advisory only. Final decision rests with the client."
  }
}
```

### SecurityRiskAssessment v2.0 威胁情报端点 / SecurityRiskAssessment v2.0 Threat Intelligence Endpoints

#### 提交威胁报告 / Submit Threat Report
```
POST /SRA/v2/threat-report
```

**请求体 / Request Body**:
```json
{
  "source_ip": "192.168.1.10",
  "target_ip": "10.0.0.5",
  "threat_type": "ddos_attack",
  "threat_level": "critical",
  "context": "SYN flood attack detected",
  "evidence_hash": "a1b2c3d4e5f6...",
  "geolocation": "Shanghai, China",
  "network_flow": "source_port: 1024-65535, dest_port: 80"
}
```

#### 验证威胁报告 / Verify Threat Report
```
POST /SRA/v2/threat-verify
```

**请求体 / Request Body**:
```json
{
  "report_id": "threat_192.168.1.10_1701234567",
  "verdict": "confirm/dispute",
  "evidence": "additional evidence for verification"
}
```

#### 获取威胁报告 / Get Threat Report
```
GET /SRA/v2/threat-report/{report_id}
```

#### 获取全局威胁列表 / Get Global Threat List
```
GET /SRA/v2/threat-list
```

**响应格式 / Response Format**:
```json
{
  "threat_list": [
    {
      "ip": "1.2.3.4",
      "threat_level": "critical",
      "first_seen": "2025-12-01T10:00:00Z",
      "last_seen": "2025-12-01T12:00:00Z",
      "report_count": 15,
      "evidence": [
        {
          "source": "node-abc123",
          "timestamp": "2025-12-01T10:00:00Z",
          "type": "behavior"
        }
      ]
    }
  ],
  "last_update": "2025-12-01T12:00:00Z",
  "total_threats": 125
}
```

### 批量查询
```
POST /SRA/v1/bulk-query
```

### 快速查询
```
GET /SRA/v1/lookup/{indicator}
```

### 申诉接口
```
POST /SRA/v1/appeal
```

**请求体**:
```json
{
  "ip": "1.2.3.4",
  "proof": "explanation_of_legitimate_use"
}
```

### 透明化接口
```
GET /SRA/v1/explain?ip={ip}
```

### 节点管理接口
```
POST /SRA/v1/node/stake          # 节点质押
GET /SRA/v1/node/status/{id}     # 获取节点状态
POST /SRA/v1/node/challenge      # 提交节点挑战
GET /SRA/architecture/status     # 获取架构状态
```

### GDPR/CCPA数据删除
```
DELETE /SRA/v1/data?ip_hash={hash}
```

## 核心数据结构

### 威胁证明数据结构 / Threat Attestation Data Structure
```go
// ThreatAttestation 威胁证明结构
type ThreatAttestation struct {
    ID            string      `json:"id"`               // Unique threat report ID / 唯一威胁报告ID
    Timestamp     int64       `json:"timestamp"`        // Report timestamp / 报告时间戳
    SourceIP      string      `json:"source_ip"`        // Source of threat / 威胁源
    TargetIP      string      `json:"target_ip"`        // Target of threat / 威胁目标
    ThreatType    string      `json:"threat_type"`      // Type of threat / 威胁类型
    ThreatLevel   ThreatLevel `json:"threat_level"`     // Severity level / 严重程度
    Context       string      `json:"context"`          // Additional context / 附加上下文
    AgentID       string      `json:"agent_id"`         // Reporting agent ID / 报告代理ID
    Signature     string      `json:"signature"`        // Digital signature / 数字签名
    EvidenceHash  string      `json:"evidence_hash"`    // Evidence hash / 证据哈希
    Geolocation   string      `json:"geolocation"`      // Geographic location / 地理位置
    NetworkFlow   string      `json:"network_flow"`     // Network traffic flow / 网络流量
    Verified      bool        `json:"verified"`         // Whether threat report is verified / 威胁报告是否已验证
    VerificationCount uint64   `json:"verification_count"` // Number of verifications / 验证次数
    ComplianceTag string      `json:"compliance_tag"`   // Compliance tag for regional requirements / 区域合规标签
    Region        string      `json:"region"`           // Region of origin / 来源区域
}

// ThreatLevel 威胁等级
type ThreatLevel int
const (
    Info ThreatLevel = iota      // Informational / 信息级
    Warning                       // Warning level / 警告级
    Critical                      // Critical level / 严重级
    Emergency                     // Emergency level / 紧急级
)

// ThreatType 威胁类型
type ThreatType int
const (
    DDoS ThreatType = iota        // Distributed Denial of Service / 分布式拒绝服务
    Malware                       // Malware / 恶意软件
    Phishing                      // Phishing / 网络钓鱼
    BruteForce                    // Brute Force / 暴力破解
    SuspiciousConnection          // Suspicious Connection / 可疑连接
    AnomalousBehavior             // Anomalous Behavior / 异常行为
    IoCMatch                      // Indicator of Compromise Match / 威胁指标匹配
)
```

## 责任声明

SecurityRiskAssessment仅提供风险评估和建议，最终的安全决策由客户端做出。SecurityRiskAssessment不承担因客户端执行决策而导致的任何后果。