# OraSRS Protocol

[![DOI](https://img.shields.io/badge/DOI-10.31224%2F5985-blue)](https://doi.org/10.31224/5985)
[![License](https://img.shields.io/badge/License-Apache%202.0-green.svg)](LICENSE)
[![Release](https://img.shields.io/badge/Release-v3.3.6_FINAL-red)](https://github.com/srs-protocol/OraSRS-protocol/releases)
[![IETF Draft](https://img.shields.io/badge/IETF-draft--01-blue)](https://datatracker.ietf.org/doc/draft-luo-orasrs-decentralized-threat-signaling/)


> **🎯 Project Concluded | 项目已结项**
>
> **Performance Target Met:** 0.001ms Query Latency | 40M PPS Mitigation  
> **Final Version:** v3.3.6 - No further updates will be provided  
> **Protocol Standardized:** IETF draft-luo-orasrs-decentralized-threat-signaling-01
>
> *创新源于拔网线，真理定格于 v3.3.6。*  
> *Innovation born from pulling the cable, truth crystallized in v3.3.6.*

> 🇨🇳 **中文用户：[点击这里查看中文文档 (Chinese Documentation)](./README_zh-CN.md)**

<img width="1589" height="921" alt="a0646081c5604d476c4e38b17e56dcb8" src="https://github.com/user-attachments/assets/51990e27-b6a8-4f6b-bbba-905455c7c446" />

> 📹 **Test Video**: [OraSRS v3.3.6 Deployment & Performance Test](https://www.youtube.com/watch?v=yNBE58Og1cg)

### 🛡️ OraSRS (Oracle Security Root Service)

OraSRS started as an advisory risk scoring service for assessing IP and domain threats. In the current final public release (v3.3.6), the project focus has converged into two parts:

- **T0 Kernel-Level Local Defense Engine (OraSRS-Core)**:
  This is the core deliverable. Designed for resource-constrained devices (e.g., OpenWrt routers with 512MB RAM), utilizing eBPF/Netfilter to achieve sub-millisecond inbound rate limiting, state exhaustion protection, and C2 outbound blocking at the kernel level.
  
- **Optional Advisory Risk Interface**:
  Provides "advisory" threat scores to upper-layer systems for policy decision support, rather than mandatory blocking.

*Note: On-chain consensus and full-stack scoring systems were explored in early PoCs but are no longer mandatory components in the v3.3.6 final release, retained only as protocol design references.*

## Quick Start

One-click installation for Linux/OpenWrt:

```bash
curl -fsSL https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/install-orasrs-client.sh | bash
```

**🔒 What Gets Installed:**
- ✅ **T0 Kernel Defense**: iptables/ipset-based threat blocking + SYN flood protection
- ✅ **Public Threat Feeds**: Auto-sync from Feodo Tracker + EmergingThreats
- ❌ **NO Node.js/Blockchain**: Pure kernel-level defense, no external dependencies
- ❌ **NO T2/T3**: Blockchain and consensus layers disabled (research reference only)

### ⚠️ Activation & Verification (Important)

**For Linux:**
```bash
# Check service status
systemctl status orasrs

# Verify protection is active
orasrs-client status
```

**For OpenWrt:**
Currently, the OpenWrt client requires manual activation of firewall rules after installation:

```bash
# 1. Load the firewall rules
sh /etc/firewall.user

# 2. Restart firewall to apply changes
/etc/init.d/firewall restart
```

**Verify Protection (Both Platforms):**
```bash
iptables -nvL orasrs_chain
```
### 🤖 Version Declaration: The "First‑Unit" (初号机)

**v3.3.6 is the “Logic Validation Completed” release.**  
It marks the definitive milestone where the **DTSP logic loop** was fully closed and validated as a survivability baseline.

Later internal iterations (v5.x) explored deeper kernel‑level “surgical” optimizations (e.g., reducing softirq pressure and tightening L3/L4 decision matrices).  
However, **v3.3.6 remains the “First‑Unit / Truth Baseline”** because:

- It proved **Defense Pre‑positioning** is feasible on **512MB‑class** hardware (survivability first, not luxury).
- It validated the **DTSP signaling/execution model** as a practical baseline for edge/IoT survivability in dense networks.
- **Performance Note (Honest Boundary):** under extreme multi‑source floods (e.g., 4 attacking terminals), v3.3.6 may show SSH jitter or loss due to **OS scheduling / user‑space context switching and softirq queueing**.  
  This is a **physical resource constraint** (bandwidth/PPS/CPU time budget), not a failure of the defense logic.

In short: **v3.3.6 proves the Soul (Logic).** Later versions only optimized the **Body (Performance)**.

### 🧩 Architecture & Historical Components

#### T0 Local Defense (Core / Active)
High-frequency packet filter based on eBPF, running independently in the edge device kernel. Proven to maintain management channel availability (SSH + ping 0% packet loss) even under a sustained attack of ~40 million cumulative random-source SYN packets.

#### Optional Distributed Ledger Integration (Experimental / Historical)
In the early PoC phase, OraSRS used a protocol chain to record some threat intelligence on-chain to explore immutable auditing and multi-party consensus.
> **Note**: In the v3.3.6 final release, this part is marked as an **experimental research direction** and **public chain nodes or RPC services are no longer provided by this repository**.

#### Core Value Proposition
1. **Defense Equity**: Empowering low-end hardware (e.g., 512MB routers) to withstand large-scale DDoS attacks, instead of just unplugging the cable or relying on expensive cloud scrubbing.
2. **Kernel Offloading**: Offloading decisions to the kernel via eBPF, achieving a measured query latency of ~**0.001ms**, far exceeding the 0.04ms target.
3. **Verifiable Design**: The protocol is designed to be compatible with multi-party consensus and verification via distributed ledgers, but the current public implementation only includes the T0 local defense core. The distribution/consensus layer is left for future researchers and vendors to build themselves.

### 🚀 Latest Updates (v3.3.6 Final) — Project Concluded

- **T0 Kernel Defense Module Final Verification Completed**:
  - **Extreme Survival Test**: On a 512MB OpenWrt device, withstood a ~20-minute attack with a cumulative total of ~**40 million random-source SYN flood packets**;
  - **Business Continuity**: During the attack, SSH management connections and `ping 8.8.8.8` maintained **0% packet loss** with smooth system response;
  - **Kernel Acceleration Benchmark**: In Linux environment kernel acceleration benchmarks, eBPF query latency was as low as **0.001 ms**.

- **T2/T3 Modules (Decentralized Consensus): ⚠️ Experimental / Disabled by Default**
  - Early exploration of chain-based threat distribution and consensus, code currently serves as research reference only;
  - Disabled by default to ensure maximum stability and predictable behavior;
  - Can theoretically be enabled in `user-config.json` for local experiments, **but no support is provided, and no public RPC / protocol chain services are offered**;
  - For distribution/consensus capabilities, it is recommended to implement a backend suitable for your scenario (centralized DB, consortium chain, internal control service, etc.) based on the DTSP protocol specification.
  > **Enterprise / Consortium Integration**: The T2/T3 consensus layer is disabled in the public release to ensure simplicity. Organizations requiring inter-node threat signaling, global reputation synchronization, or consortium blockchain integration based on the DTSP standard should reference the protocol specification or contact the author for architectural consulting.

## Documentation

For detailed information, please refer to the [documentation directory](docs/):

*   [**Getting Started**](docs/01-getting-started.md)
*   [**User Guide**](docs/02-user-guide.md)
*   [**OpenWrt & IoT**](docs/03-openwrt-iot.md)
*   [**Architecture**](docs/04-architecture.md)
*   [**DTSP Protocol Specification**](docs/protocol/DTSP_SPECIFICATION.md) - Complete protocol specification with T0-T3 communication logic
*   [**Design Rationale**](docs/protocol/DESIGN_RATIONALE.md) - Philosophy and approach behind OraSRS
*   [**Integrations**](docs/05-integrations.md)
*   [**Academic & Performance**](docs/06-academic-perf.md)

## 👨‍💻 Developer Note

> “Innovation born from pulling the cable, truth crystallized in v3.3.6.”

OraSRS v3.3.6 is more than a tool — it is a **Survival Protocol**.

My philosophy is simple:

1. **Defense Pre‑positioning**  
   Push the battlefield to the very edge (kernel/XDP/early data path).  
   Do not wait for cloud rules, AI verdicts, or human intervention before a device can survive.

2. **Entropy Reduction**  
   Use deterministic logic to wash away the high‑entropy chaos of floods and state exhaustion.  
   If the traffic does not satisfy the physical logic of the system, it should be removed as early as possible.

3. **Protocolized Survival**  
   Survival shouldn’t be an optional configuration or an expensive add‑on.  
   It should be an inherent property of the protocol baseline (DTSP‑T0).

It turns out that if you start from the real problem, you can get things done even with limited resources.  
OraSRS started from a router that had to be unplugged due to DDoS — and ended as a verified protocol baseline that asserts **sovereignty of traffic** at the edge.

—— Z. Luo (OraSRS Protocol Author)
