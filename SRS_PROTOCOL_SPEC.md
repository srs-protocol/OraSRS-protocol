# OraSRS (Oracle Security Root Service) 协议规范

## 概述

OraSRS (Oracle Security Root Service) 是一个咨询式风险评分服务，旨在为互联网安全决策提供权威参考。与传统的阻断式防火墙不同，OraSRS 提供风险评估和建议，由客户端自主决定是否执行相应措施。

## 设计原则

### 1. 咨询式服务模式
- **错误设计**: OraSRS 返回 `{ action: "BLOCK" }`
- **正确设计**: OraSRS 返回 `{ risk_score: 0.92, evidence: ["ddos_bot", "scan_24h"] }`
- **客户端强制执行** → **客户端自主决策是否拦截**

> 类比：OraSRS 是信用评分机构（如 FICO），不是法院。客户端（如银行）自己决定是否采取行动。

### 2. 内置多重保护机制

#### (1) 分级响应策略
```json
{
  "ip": "1.2.3.4",
  "risk_level": "medium",
  "recommendations": {
    "public_services": "allow_with_captcha",
    "banking": "require_mfa",
    "admin_panel": "block"
  }
}
```
- 不对所有服务一刀切
- 关键服务（如医疗、政府）默认放行

#### (2) 自动衰减与申诉通道
- 风险分随时间衰减（如 24 小时后降级）
- 提供公开申诉接口：
```
POST /orasrs/v1/appeal
{ "ip": "1.2.3.4", "proof": "we_fixed_the_botnet" }
```

#### (3) 透明化与可审计
- 所有标记记录上链（或公开日志）
- 提供 `GET /orasrs/v1/explain?ip=1.2.3.4` 返回决策依据

### 3. 公共服务豁免原则

在 OraSRS 策略中硬编码关键公共服务白名单，永不拦截：

| 服务类型 | 示例域名/IP |
|---------|------------|
| 政府 | .gov, .mil, 国家税务/社保 IP 段 |
| 医疗 | 医院官网、急救系统 |
| 金融基础设施 | SWIFT、央行支付系统 |
| 基础通信 | DNS 根服务器、NTP 池 |

## 增强型共识与质押机制

### 三层架构设计

#### 全局根网络层
- **共识算法**: Tendermint Core 或 HotStuff (BFT)
- **节点数量**: 21个共识节点（奇数，便于BFT投票）
- **容错能力**: ≤ ⌊(n-1)/3⌋ = 6个恶意节点
- **最小质押门槛**: ≥ 10,000 ORA（或等值法币）
- **质押锁定期**: ≥ 7天
- **罚没机制**: 作恶行为100%罚没；离线>24h扣5%/天

#### 分区共识层
- **共识算法**: PBFT变种
- **节点数量**: ≤ 50个节点
- **容错能力**: ≤ 16个恶意节点
- **功能**: 局部共识、缓存挑战执行、资源配额管理

#### 边缘缓存层
- **质押门槛**: ≥ 100 ORA（小额质押）
- **功能**: 可验证缓存证明、接受任意挑战
- **缓存有效期**: 5分钟
- **挑战阈值**: 3个独立节点

### 身份与准入机制

#### 双因子准入
| 准入层级 | 要求 | 实现方式 |
|---------|------|----------|
| L1：法律身份 | 企业营业执照 + 区块链服务备案号 | 对接国家网信办备案系统API |
| L2：技术凭证 | 通过OraSRS节点能力测试 | 自动化测试套件 + 人工复核 |

#### 合规要求
- 节点运营方需完成企业实名认证 + 区块链备案（依据《区块链信息服务管理规定》第9条）
- 质押地址绑定备案主体
- 支持CA机构签发的数字证书（如CFCA）作为L2凭证，符合《电子签名法》

### 动态声誉系统

```python
# 伪代码：声誉评分 = 基础分 + 行为加权
def calculate_reputation(node):
    base = 100
    # 在线率（权重 30%）
    uptime_score = min(1.0, node.uptime / 0.95) * 30
    # 验证正确率（权重 40%）
    accuracy_score = node.correct_validations / node.total_validations * 40
    # 挑战响应速度（权重 20%）
    latency_score = max(0, 20 - node.avg_challenge_response_ms / 10)
    # 社区贡献（权重 10%）
    contribution_score = node.submitted_threat_intel_count * 0.1
    
    return base + uptime_score + accuracy_score + latency_score + contribution_score
```

#### 声誉应用规则
- 声誉 < 80：禁止参与共识，仅可作边缘缓存节点
- 声誉 > 120：降低质押门槛20%，提高收益分成
- 声誉连续7天 < 60：自动触发节点剔除流程

#### 治理对齐
- 声誉算法由技术指导委员会每季度审计，防止中心化操控

### 缓存挑战机制
- **触发条件**: 缓存数据 > 5分钟 或 被3个独立节点质疑
- **验证流程**: 向根层提交默克尔证明 + 时间戳
- **奖惩机制**: 挑战成功 → 缓存节点罚没50%保证金，挑战者获80%奖励

## API 端点

### 风险查询
```
GET /orasrs/v1/query?ip={ip}&domain={domain}
```

**请求示例**:
```
GET /orasrs/v1/query?ip=1.2.3.4
Accept: application/json
```

**响应格式**:
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

### 批量查询
```
POST /orasrs/v1/bulk-query
```

### 快速查询
```
GET /orasrs/v1/lookup/{indicator}
```

### 申诉接口
```
POST /orasrs/v1/appeal
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
GET /orasrs/v1/explain?ip={ip}
```

### 节点管理接口
```
POST /orasrs/v1/node/stake          # 节点质押
GET /orasrs/v1/node/status/{id}     # 获取节点状态
POST /orasrs/v1/node/challenge      # 提交节点挑战
GET /orasrs/v1/architecture/status  # 获取架构状态
```

### GDPR/CCPA数据删除
```
DELETE /orasrs/v1/data?ip_hash={hash}
```

## 法律与合规设计

### 1. 明确免责声明
在 API 响应头加入：
```
X-OraSRS-Disclaimer: This is advisory only. Final decision rests with the client.
```

### 2. 遵循 GDPR/CCPA
- 不存储原始 IP，只存哈希
- 提供 DELETE 接口

### 3. 社区治理
- 技术委员会 = 7席（3企业 + 2高校 + 2社区）
- 升级提案需 ≥5票通过
- 设立紧急熔断权（2/3委员可暂停协议）

### 4. 数据安全与国产化适配
- 国密加密：SM4加密风险评估结果
- 数据不出境：所有节点部署于中国大陆境内
- 日志脱敏：IP地址哈希后存储（SHA3-256 + Salt）
- 支持长安链或FISCO BCOS，支持国密SM2/SM3

## 实现特点

1. **去中心化**: 基于节点联邦学习的威胁情报 + 三层共识架构
2. **隐私优先**: 差分隐私保护，本地数据处理，IP地址脱敏
3. **开源可验证**: 完全开源，全球审计，国密算法支持
4. **标准兼容**: 支持STIX/TAXII、RPZ等开放标准
5. **安全激励**: 质押机制、声誉系统、挑战奖励
6. **合规可信**: 企业认证、区块链备案、合规监管

## 集成指南

客户端应:

1. 查询OraSRS获取风险评分
2. 根据自身策略和OraSRS建议做出最终决策
3. 记录决策日志用于审计
4. 提供反馈以改进OraSRS模型
5. 遵守API速率限制，使用认证密钥

## 责任声明

OraSRS仅提供风险评估和建议，最终的安全决策由客户端做出。OraSRS不承担因客户端执行决策而导致的任何后果。

## 性能目标
- 边缘层P95响应时间 ≤ 15ms
- 支持 ≥ 50个共识节点
- TPS ≥ 1000（测试网）

## 国密算法集成规范

### 1. 支持的国密算法
- **SM2**: 椭圆曲线公钥密码算法，用于数字签名和密钥交换
- **SM3**: 密码杂凑算法，用于消息摘要和数据完整性校验
- **SM4**: 分组密码算法，用于数据加密

### 2. 质押合约中的国密算法应用
- **节点身份验证**: 使用SM2进行数字签名验证
- **数据完整性**: 使用SM3进行哈希计算
- **数据隐私**: 使用SM4进行敏感数据加密

### 3. 国密算法部署要求
- 合约需部署在支持国密算法的国产联盟链上（如长安链、FISCO BCOS）
- 节点需使用国密算法生成和管理密钥对
- 所有签名和哈希操作均使用国密算法

### 4. 合规性要求
- 符合《密码法》要求
- 通过国家密码管理局认证
- 满足等保三级要求
- 数据不出境，境内部署