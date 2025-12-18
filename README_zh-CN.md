# OraSRS Protocol

[![DOI](https://img.shields.io/badge/DOI-10.31224%2F5985-blue)](https://doi.org/10.31224/5985)
[![License](https://img.shields.io/badge/License-Apache%202.0-green.svg)](LICENSE)
[![Release](https://img.shields.io/badge/Release-v3.3.6_FINAL-red)](https://github.com/srs-protocol/OraSRS-protocol/releases)
[![IETF Draft](https://img.shields.io/badge/IETF-draft--01-blue)](https://datatracker.ietf.org/doc/draft-luo-orasrs-decentralized-threat-signaling/01/)

> 🇺🇸 **English Version: [Click here for the English README](./README.md)**

> **🎯 项目已结项 | Project Concluded**
>
> **性能目标达成:** 0.001ms 查询延迟 | 4000万 PPS 缓解能力  
> **最终版本:** v3.3.6 - 不再提供后续更新  
> **协议已标准化:** IETF draft-luo-orasrs-decentralized-threat-signaling-01
>
> *创新源于拔网线，真理定格于 v3.3.6。*  
> *Innovation born from pulling the cable, truth crystallized in v3.3.6.*

OraSRS (Oracle Security Root Service) 是一个咨询式风险评分服务，为 IP 和域名提供风险评估。OraSRS 与传统的威胁情报服务不同，它不直接阻断流量，而是提供风险评分供客户端参考。

## 📚 文档导航 / Documentation

所有详细文档已移至 `docs/` 目录：

| 文档 | 说明 |
|------|------|
| [**01-快速开始**](docs/01-getting-started_zh-CN.md) | 安装指南、部署模式选择 (Linux/Docker) |
| [**02-用户指南**](docs/02-user-guide_zh-CN.md) | CLI 命令、SDK 使用、桌面客户端 |
| [**03-OpenWrt & IoT**](docs/03-openwrt-iot_zh-CN.md) | OpenWrt 安装、IoT Shield、透明代理 |
| [**04-核心架构**](docs/04-architecture_zh-CN.md) | 协议规范、原创机制、威胁情报系统 |
| [**DTSP 协议规范**](docs/protocol/DTSP_SPECIFICATION.md) | 完整协议规范,包含 T0-T3 通信逻辑 |
| [**设计原理**](docs/protocol/DESIGN_RATIONALE_zh-CN.md) | OraSRS 背后的设计哲学与方法 |
| [**05-高级集成**](docs/05-integrations_zh-CN.md) | Wazuh 集成、HVAP (SSH保护)、浏览器扩展 |
| [**06-学术与性能**](docs/06-academic-perf_zh-CN.md) | 论文引用、性能基准测试、17M抗压报告 |
| [**07-Hardhat 服务**](docs/07-hardhat-service_zh-CN.md) | 本地开发链服务守护进程指南 |

## 项目概述

- **咨询式服务**：OraSRS 是信用报告机构（如 FICO），而不是法院。
- **透明性**：所有决策依据都对客户端透明。
- **可审计性**：所有评估过程可以追溯和审计。
- **区块链集成**：所有威胁情报记录在 OraSRS 协议链上。
- **三层架构**：边缘层、共识层、智能层的三层共识架构。
- **智能同步**：增量差分同步系统，带宽消耗降低 96%。

## 核心价值主张

1. **咨询式服务模型**：OraSRS 提供建议而非直接阻断命令
2. **多层次证据**：基于多源证据的风险评估
3. **透明可审计**：所有评估过程可追溯
4. **合规隐私**：严格遵守全球隐私法规
5. **区块链验证**：通过长安链技术实现多方共识和验证

## 🚀 最新更新 (v3.3.6)

- **客户端威胁情报完全同步**：支持增量差分同步。
- **Linux 支持**：完善的 Linux 客户端和服务守护。
- **OraSRS OpenWrt 客户端**：支持 OpenWrt 23.05+，提供 Hybrid/Edge 模式。
- **T0初步验证完成**：试验性测试部分了从本地防护模块T0 

## 📌 T0 模块状态 / T0 Module Status

**T2/T3 模块状态:**
- **T0 模块(本地执行):** ✅ **生产就绪**
  - 已验证 0.001ms 查询延迟
  - 512MB 设备上 40M PPS 缓解能力
  - 100% 成功率 (38,766 请求, 0 失败)
  - 内存占用: < 50MB (混合模式) 或 < 5MB (原生模式)

- **T2/T3 模块(去中心化共识):** ⚠️ **实验性 / 默认禁用**
  - 可选的基于区块链的共识层
  - 默认禁用以确保最大稳定性
  - 可在 `user-config.json` 中启用用于研究目的

**注意:** 公网 RPC 服务已停止。T0 独立运行，无需外部依赖。

---

**引用格式** (BibTeX):
```bibtex
@article{luo2025orasrs,
  title={OraSRS: A Compliant and Lightweight Decentralized Threat Intelligence Protocol with Time-Bounded Risk Enforcement},
  author={Luo, ZiQian},
  year={2025},
  doi={10.31224/5985},
  url={https://doi.org/10.31224/5985},
  publisher={Engineering Archive},
  note={Preprint. Code available at: https://github.com/srs-protocol/OraSRS-protocol}
}
```
