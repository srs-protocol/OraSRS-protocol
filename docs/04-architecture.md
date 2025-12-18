# Core Architecture

<img width="1024" height="559" alt="47f4b9dfc9849f605f62647fb0b0f917" src="https://github.com/user-attachments/assets/81492cea-400d-4781-88c1-f88a5390a6c1" />

> 🇨🇳 **中文用户：[点击这里查看中文文档 (Chinese Documentation)](./04-architecture_zh-CN.md)**

## 📜 Protocol Specification

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

## 🏆 Original Innovation Declaration

**The following core mechanisms of the OraSRS protocol were first created and open-sourced by [Luo ZiQian] in 2025, protected under the Apache License 2.0:**

### Core Innovations

1. **Risk Control First**
   - Disrupts the traditional "Block after Detection" model, implementing "Allow after Assessment".
   - Proactive defense based on IP reputation, capable of intercepting zero-day threats.
   - First implemented: 2025-12-14

2. **Dynamic Ban Duration Stacking**
   - Adaptively calculates ban duration based on threat severity.
   - Automatically extends bans for repeat offenders (Local Cache Hit).
   - Applies maximum ban duration for globally confirmed threats (Blockchain Hit).
   - First implemented: 2025-12-14

3. **Local-Blockchain Collaborative Decision**
   - Hybrid Architecture: Local Cache + Blockchain Consensus.
   - Multi-layer Query Strategy: Whitelist → Local Cache → Blockchain → New Threat.
   - Asynchronous blockchain reporting to maintain low latency.
   - First implemented: 2025-12-14

4. **High Value Asset Protection Framework (HVAP)**
   - Three-layer defense mechanism based on risk scoring.
   - PAM integration for system-level protection.
   - Emergency whitelist mechanism to prevent false positives.
   - First implemented: 2025-12-14

5. **IoT Shield**
   - "Query then Forward" gateway architecture.
   - Reputation-based service hiding (Stealth Defense).
   - Providing swarm intelligence for resource-constrained devices.
   - First implemented: 2025-12-14

**Please refer to the [NOTICE](../NOTICE) file for the detailed declaration.**

## ✨ Enhanced Features
- **Three-Layer Decentralized Architecture**: Ultra-lightweight Edge Agent + Multi-chain Trusted Storage + Threat Intelligence Coordination Network.
- **Lightweight Staking Mechanism**: Behavior-based dynamic reputation scoring, no economic staking required.
- **BFT Consensus Algorithm**: Supports multi-chain deployment and regional compliance.
- **National Standard Support**: Supports SM algorithms (SM2/SM3/SM4), adapted for ChainMaker.
- **Compliance Governance**: Automatic regional compliance engine, meeting GDPR/CCPA/MLPS 2.0 requirements.

## 🛡️ Threat Intelligence System

OraSRS integrates a production-grade threat intelligence system with the following features:

### Data Sources
- **Spamhaus DROP** - Confirmed Botnets (~900 CIDRs)
- **DShield** - Malicious Scanning Sources
- **Abuse.ch Feodo** - C2 Command & Control Servers

### Core Features
```
✅ 1510+ Threat Entries (Real-time Updates)
✅ O(1) Exact IP Query + O(n) CIDR Longest Prefix Match
✅ Merkle Tree Verification (32-byte On-chain Storage)
✅ Incremental Differential Sync (96% Bandwidth Savings)
✅ Daily Auto-Update (00:00 UTC+8)
✅ Hourly Client Sync
✅ Three-Layer Threat Detection (Edge-Consensus-Intelligence Layers)
```

### Performance Metrics
| Metric | Value |
|--------|-------|
| Query Time | < 2ms |
| Memory Usage | ~2MB |
| Full Data Size | 132KB |
| Daily Diff Size | 1-5KB |
| Monthly Bandwidth/Client | ~618KB |

## 📚 Protocol Specifications
- [v0.1 Specification Document](../SRS_PROTOCOL_SPEC.md)
- [SecurityRiskAssessment v2.0 Threat Intelligence Protocol](../OraSRS_v2.0_Threat_Intelligence_Protocol.md)
- [Consensus Parameters Whitepaper](../CONSENSUS_PARAMETERS_WHITEPAPER.md)
- [SM Crypto Integration Guide](../SM_CRYPTO_INTEGRATION.md)
- [Design Philosophy](design.md)

## 🧩 Smart Contracts
- [Threat Intelligence Coordination Contract](../contracts/ThreatIntelligenceCoordination.sol)
- [Optimized Threat Registry](../contracts/OptimizedThreatRegistry.sol)
- [OraSRS Governance Contract](../contracts/OraSRSGovernance.sol)
- [Risk Calculator Contract](../contracts/IPRiskCalculator.sol)
