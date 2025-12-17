# 核心架构 / Core Architecture
<img width="1024" height="559" alt="47f4b9dfc9849f605f62647fb0b0f917" src="https://github.com/user-attachments/assets/81492cea-400d-4781-88c1-f88a5390a6c1" />

## 📜 Protocol Specification (协议规范)

OraSRS implements the **Decentralized Threat Signaling Protocol (DTSP)** as defined in the following IETF Internet-Draft:

> **[draft-luo-orasrs-decentralized-threat-signaling-00](https://datatracker.ietf.org/doc/draft-luo-orasrs-decentralized-threat-signaling/)**
>
> * **Title:** Decentralized Threat Signaling Protocol (DTSP) using OraSRS
> * **Status:** Active Internet-Draft
> * **Abstract:** Defines the mechanisms for T0 (Local Heuristics) to T3 (Global Consensus) threat signaling in a decentralized network.

To cite this specification:
```text
Luo, Z. (2025). Decentralized Threat Signaling Protocol (DTSP) using OraSRS. IETF Internet-Draft draft-luo-orasrs-decentralized-threat-signaling-00.
```

## 🏆 原创机制声明 / Original Innovation Declaration

**OraSRS 协议的以下核心机制由 [Luo ZiQian] 于 2025 年首创并开源，受 Apache License 2.0 保护：**

### 核心创新 / Core Innovations

1. **先风控后查询机制 (Risk Control First)**
   - 颠覆传统"检测后阻断"模式，实现"评估后放行"
   - 基于 IP 信誉的主动防御，可拦截零日威胁
   - 首次实现时间：2025-12-14

2. **动态封禁叠加 (Dynamic Ban Duration Stacking)**
   - 根据威胁严重程度自适应计算封禁时长
   - 重复违规者自动延长封禁（本地缓存命中）
   - 全局确认威胁取最大封禁时长（区块链命中）
   - 首次实现时间：2025-12-14

3. **本地-链上协同决策 (Local-Blockchain Collaborative Decision)**
   - 混合架构：本地缓存 + 区块链共识
   - 多层查询策略：白名单 → 本地缓存 → 区块链 → 新威胁
   - 异步区块链上报，保持低延迟
   - 首次实现时间：2025-12-14

4. **高价值资产保护框架 (HVAP)**
   - 基于风险评分的三层防御机制
   - PAM 集成实现系统级保护
   - 应急白名单机制防止误拦
   - 首次实现时间：2025-12-14

5. **物联网护盾 (IoT Shield)**
   - "先查询后放行"网关架构
   - 基于信誉的服务隐藏（隐身防御）
   - 为资源受限设备提供群体智慧
   - 首次实现时间：2025-12-14

**详细声明请参阅 [NOTICE](../NOTICE) 文件。**

## ✨ 增强功能 / Enhanced Features
- **三层去中心化架构**: 超轻量边缘代理 + 多链可信存证 + 威胁情报协调网络
- **轻量级质押机制**: 基于行为的动态声誉评分，无需经济质押
- **BFT 共识算法**: 支持多链部署，区域化合规
- **国产化支持**: 支持国密算法（SM2/SM3/SM4），适配长安链
- **合规治理**: 自动区域合规引擎，满足GDPR/CCPA/等保2.0

## 🛡️ 威胁情报系统 / Threat Intelligence System

OraSRS 集成了生产级威胁情报系统，具有以下特性：

### 数据源
- **Spamhaus DROP** - 已确认僵尸网络（~900 CIDR）
- **DShield** - 恶意扫描活动源
- **Abuse.ch Feodo** - C2 命令控制服务器

### 核心特性
```
✅ 1510+ 威胁条目（实时更新）
✅ O(1) 精确 IP 查询 + O(n) CIDR 最长前缀匹配
✅ Merkle Tree 验证（32 字节链上存储）
✅ 增量差分同步（96% 带宽节省）
✅ 每日自动更新（北京时间 00:00）
✅ 每小时客户端同步
✅ 三层架构威胁检测（边缘-共识-智能层）
```

### 性能指标
| 指标 | 值 |
|------|-----|
| 查询时间 | < 2ms |
| 内存占用 | ~2MB |
| 完整数据 | 132KB |
| 每日差分 | 1-5KB |
| 月带宽/客户端 | ~618KB |

## 📚 协议规范 / Protocol Specifications
- [v0.1 规范文档](../SRS_PROTOCOL_SPEC.md)
- [SecurityRiskAssessment v2.0 威胁情报协议](../OraSRS_v2.0_Threat_Intelligence_Protocol.md)
- [共识参数白皮书](../CONSENSUS_PARAMETERS_WHITEPAPER.md)
- [国密算法集成指南](../SM_CRYPTO_INTEGRATION.md)
- [设计哲学](design.md)

## 🧩 智能合约 / Smart Contracts
- [威胁情报协调合约](../contracts/ThreatIntelligenceCoordination.sol)
- [优化威胁注册表](../contracts/OptimizedThreatRegistry.sol)
- [OraSRS治理合约](../contracts/OraSRSGovernance.sol)
- [风险计算器合约](../contracts/IPRiskCalculator.sol)
