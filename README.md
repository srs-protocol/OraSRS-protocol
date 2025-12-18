# OraSRS Protocol

[![DOI](https://img.shields.io/badge/DOI-10.31224%2F5985-blue)](https://doi.org/10.31224/5985)
[![License](https://img.shields.io/badge/License-Apache%202.0-green.svg)](LICENSE)
[![Release](https://img.shields.io/badge/Release-v3.3.6_FINAL-red)](https://github.com/srs-protocol/OraSRS-protocol/releases)
[![IETF Draft](https://img.shields.io/badge/IETF-draft--01-blue)](https://datatracker.ietf.org/doc/draft-luo-orasrs-decentralized-threat-signaling/01/)

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

"The Reference Implementation of the IETF Decentralized Threat Signaling Protocol (DTSP). Achieving data-center-grade DDoS mitigation on resource-constrained IoT edge devices via kernel offloading."

## Key Achievements

✅ **Mitigated 40M+ packets SYN Flood** in a 20-min sustained test.

✅ **Maintained 0% packet loss** for legitimate traffic (Ping/SSH stable).

✅ **Running on 512MB RAM** OpenWrt device.

## Quick Start

One-click installation for Linux/OpenWrt:

```bash
curl -fsSL https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/install-orasrs-client.sh | bash
```

### ⚠️ Activation & Verification (Important)

Currently, for the OpenWrt client, you need to manually activate the firewall rules after installation:

```bash
# 1. Load the firewall rules
sh /etc/firewall.user

# 2. Restart firewall to apply changes
/etc/init.d/firewall restart
```
Verify that OraSRS is protecting your device:

```Bash

iptables -nvL orasrs_chain
```
## 🚧 Project Status

- **T0 Module (Local Enforcement):** ✅ **Stable & Active** (As seen in the demo video)
- **T1-T3 Modules (Decentralized Consensus):** ⚠️ **Experimental / Disabled by Default**
    - *The logic for blockchain querying and risk IP consensus is implemented but currently disabled to ensure client stability on resource-constrained devices.*

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

> [!IMPORTANT]
> **🚧 TESTNET NOTICE & PUBLIC RPC ENDPOINT**
>
> This project is currently in a **High-Frequency Debugging Phase**. The blockchain interaction relies on a custom Hardhat Protocol Chain.
>
> **T2/T3 Modules Status:**
> - **T0 Module (Local Enforcement):** ✅ **Stable & Active** - Fully tested and production-ready
> - **T2/T3 Modules (Decentralized Consensus):** ⚠️ **Experimental / Disabled by Default**
>   - The logic for blockchain querying and risk IP consensus is implemented but **disabled by default** to ensure client stability on resource-constrained devices
>   - To enable T2/T3 for testing, manually configure `t2t3.enabled: true` in `user-config.json` and set the RPC endpoint
>
> **Public RPC for Testing T2/T3:**
> To facilitate testing and issue reproduction, we have exposed a public RPC endpoint connecting to our internal Hardhat testnet:
> - **RPC URL:** `https://api.orasrs.net`
> - **Chain ID:** `31337` (Default Hardhat)
> - **Currency:** ORA (No real value)
>
> **⚠️ DISCLAIMER:**
> 1. **Ephemeral State:** This network may be **reset or rolled back** at any time without notice during development. Data persistence is NOT guaranteed.
> 2. **Test Assets Only:** Do NOT attempt to send real assets (Mainnet ETH/USDT) to addresses on this network. They will be permanently lost.
> 3. **Usage Limit:** This endpoint is strictly for testing OraSRS protocol interactions. Please refrain from high-frequency spamming.
