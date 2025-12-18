# OraSRS Protocol

[![DOI](https://img.shields.io/badge/DOI-10.31224%2F5985-blue)](https://doi.org/10.31224/5985)
[![License](https://img.shields.io/badge/License-Apache%202.0-green.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/srs-protocol/OraSRS-protocol)](https://github.com/srs-protocol/OraSRS-protocol/releases)
[![IETF Draft](https://img.shields.io/badge/IETF-Active_Draft-blue)](https://datatracker.ietf.org/doc/draft-luo-orasrs-decentralized-threat-signaling/00/)

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

### ⚠️ Activation & Verification (Important)

Currently, for the OpenWrt client, you need to manually activate the firewall rules after installation:

```bash
# 1. Load the firewall rules
sh /etc/firewall.user

# 2. Restart firewall to apply changes
/etc/init.d/firewall restart
```
## Documentation

For detailed information, please refer to the [documentation directory](docs/):

*   [**Getting Started**](docs/01-getting-started.md)
*   [**User Guide**](docs/02-user-guide.md)
*   [**OpenWrt & IoT**](docs/03-openwrt-iot.md)
*   [**Architecture**](docs/04-architecture.md)
*   [**Integrations**](docs/05-integrations.md)
*   [**Academic & Performance**](docs/06-academic-perf.md)
