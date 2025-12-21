# OraSRS Protocol

[![DOI](https://img.shields.io/badge/DOI-10.31224%2F5985-blue)](https://doi.org/10.31224/5985)
[![License](https://img.shields.io/badge/License-Apache%202.0-green.svg)](LICENSE)
[![Release](https://img.shields.io/badge/Release-v3.3.6_FINAL-red)](https://github.com/srs-protocol/OraSRS-protocol/releases)
[![IETF Draft](https://img.shields.io/badge/IETF-draft--01-blue)](https://datatracker.ietf.org/doc/draft-luo-orasrs-decentralized-threat-signaling/)

> 🇺🇸 **English Version: [Click here for the English README](./README.md)**

> **🎯 项目已结项 | Project Concluded**
>
> **性能目标达成:** 0.001ms 查询延迟 | 4000万 PPS 缓解能力  
> **最终版本:** v3.3.6 - 不再提供后续更新  
> **协议已标准化:** IETF draft-luo-orasrs-decentralized-threat-signaling-01
>
> *创新源于拔网线，真理定格于 v3.3.6。*  
> *Innovation born from pulling the cable, truth crystallized in v3.3.6.*
>
> 📹 **测试视频 / Test Video**: [OraSRS v3.3.6 部署与性能测试](https://www.youtube.com/watch?v=yNBE58Og1cg)

### 🛡️ OraSRS (Oracle Security Root Service)

OraSRS 起初是一个咨询式风险评分服务，用于为 IP 和域名提供威胁评估。在当前公开的最终版本 (v3.3.6) 中，项目重点已经收敛为两部分：

- **T0 内核级本地防御引擎 (OraSRS-Core)**：
  这是项目的核心交付物。专为资源受限设备（如 512MB 内存的 OpenWrt 路由器）设计，利用 eBPF/Netfilter 在内核层实现亚毫秒级入站限速、状态耗尽防护与 C2 外连阻断。
  
- **可选的风险查询接口 (Advisory Risk Interface)**：
  为上层系统提供“咨询式”威胁评分，用于辅助策略决策，而非强制阻断。

*注：链上共识与全栈评分体系在早期 PoC 中已经探索过，但在 v3.3.6 最终版中不再作为必选组件，仅保留为协议设计参考。*

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
⚠️物理边界警告与逻辑闭环声明 （v3.3.6 FINAL）
“逻辑验证已达巅峰，物理资源已触红线。”

1. 逻辑验证：生存协议化的可行性 ✅
v3.3.6 证明了 DTSP 协议逻辑链条的严密性：只要能通过可验证的信令标识/令牌完成“生存协议化”，系统就能在逻辑层面将高熵攻击流量与低熵可信流量分离，并对高风险主体执行确定性的处置（丢弃/限速/熔断）。结论：只要能识别 DTSP 信令身份，系统就知道“该处置谁”。这个逻辑是“大脑”，在 v3.3.6 中已完成闭环验证。

2. 物理反思：关于“抗不住”的终极真相 🛠️
在 4 个终端发起极限攻击时，系统出现 SSH 断连与响应卡死。这并非理念错误，而是物理预算的透支（典型表现为链路饱和或 PPS/softirq 预算耗尽）：瓶颈定位：512MB 设备无法承载用户态参与判决带来的繁重上下文切换（context switching）与 softirq 排队（softirq queueing）。 现实肉搏：高性能防火墙的共同方向从来都不是“更聪明的分析”，而是更靠前的执行。业界通常使用 ASIC/FPGA 硬件数据面，或采用 eBPF/XDP 将决策下沉至更早的数据路径。 价值定格：他们依赖昂贵硬件或云基础设施；而我是在一台 512MB 路由器上，用通用 CPU 与用户态逻辑完成了“路线可行性”的肉搏验证——证明了逻辑的绝对成立。

3. 架构结论：防御前移的必经之路 🚀
v3.3.6 的“抗不住”反向证明：要跨越更高强度的物理轰炸，防御必须进一步前移： 生存的代价：在 512MB 的物理极限下，若不将更多关键处置逻辑下沉到更早的数据面（例如 XDP/eBPF 或等价硬件数据面），任何涉及用户态高频参与的防御，在极端 PPS/softirq 压力下最终都会被“排队风暴”淹没。定格真理：v3.3.6 留下了“防御逻辑”的灵魂图纸，它证明路是通的。至于 3 终端以上的物理围攻，那是后期需要将逻辑“硬化/下沉化”才能跨越的工程鸿沟。

🧩 架构设计与历史组件
T0 本地防御（核心/主动）
基于 eBPF 的高频数据包过滤器，独立运行于边缘设备内核中。在实测中，即便在累计 4,000 万个随机源 SYN 攻击包的持续冲击下，仍能保证管理通道存活（SSH + ping 0% 丢包、系统可用）。

可选的分布式账本集成 （Experimental / Historical）
在早期 PoC 阶段，OraSRS 曾使用协议链将部分威胁情报上链，以探索不可篡改审计与多方共识的可能性。

注意：在 v3.3.6 最终版中，这一部分被标记为实验性研究方向，不再由本仓库提供公共链节点或 RPC 服务。

核心价值主张
防御平权：让低端硬件（如 512MB 路由器）也拥有对抗大规模 DDoS 的基本能力，而不是只能拔网线或依赖昂贵云清洗。
内核卸载：通过 eBPF 将决策下沉至内核，实测查询延迟约 0.001ms，远优于预期目标的 0.04ms。
可验证性设计：协议在设计上兼容通过分布式账本等手段实现多方共识和验证，但当前公开实现仅包含 T0 本地防御核心，分发/共识层留给后续研究者和厂商自建。
🚀 最新更新（v3.3.6 最终版）— 项目完成
T0 内核防御模块完成终版验证：

极限生存测试：在 512MB OpenWrt 设备上，经受约 20 分钟、累计约 4,000 万个随机源 SYN 洪水攻击数据包;
业务连续性：攻击期间，SSH 管理连接与 始终保持 0% 丢包，系统响应流畅;ping 8.8.8.8
内核加速基准：在 Linux 环境的内核加速性能基准测试中，eBPF 查询延迟低至 0.001 ms。
T2/T3 模块 （去中心化共识）：⚠️实验性 / 默认禁用

早期用于探索基于链的威胁分发与共识，目前代码仅作为研究参考；
默认禁用以确保最大稳定性与可预期行为；
理论上可以在 中启用用于本地实验，但不提供任何支持，也不再提供任何公共 RPC / 协议链服务;user-config.json
如需分发/共识能力，建议基于 DTSP 协议规范自行实现适合自身场景的后端（中心化数据库、联盟链、内部总控服务等）。
企业/联盟链集成： 为保持简洁，公开版本已禁用 T2/T3 共识层。需要基于 DTSP 标准实现节点间威胁信令、全球信誉同步或联盟链集成的组织，请参阅协议规范或联系作者进行架构咨询。

👨 💻 开发者注 / 开发者注
🧾 开发者结语 / 开发者关闭
“创新源于拔网线，真理定格于 v3.3.6。”

v3.3.6 是 OraSRS / DTSP-T0 的“初号机”：我用最小的资源约束，把最关键的一件事做成了可复现的事实——
在上游链路未被物理打满的前提下，状态耗尽型攻击不应再把边缘设备打到失联。

我也诚实记录了物理边界：当多终端并发将带宽/PPS/softirq预算压到红线时，任何依赖高频用户态参与的防御都会面临调度与排队风暴。
这不是逻辑的失败，而是物理预算的提醒：要跨越更高强度，需要更早的数据面执行（XDP/eBPF 或等价硬件数据面）。

因此，本项目以 v3.3.6 作为公开基线版本结项封存：
我定格“灵魂（Logic）”，把“肉身（Performance）”的进化留给后来者。
T2/T3 作为进阶协同层保留在规范中，等待真正需要的人在现实部署与互作中继续填充。 业界通常使用 ASIC/FPGA 硬件数据面，或采用 eBPF/XDP 将决策下沉至更早的数据路径; 而我在 512MB 的物理极限下完成了这条路线的可行性验证，并将其写成开放协议与可复现基线——这就是“安全协议化”。

如果你想推动这条路线：

复现、对比、实现第二版本；
把 DTSP-T0 写进 QA/采购验收;
或实现 T2/T3 的联盟/共识后端——
请引用 IETF 草案与 DOI，并用数据说话。

—— Luo ZiQian（OraSRS / DTSP作者）

引用格式 （BibTeX）：

@article{luo2025orasrs,
  title={OraSRS: A Compliant and Lightweight Decentralized Threat Intelligence Protocol with Time-Bounded Risk Enforcement},
  author={Luo, ZiQian},
  year={2025},
  doi={10.31224/5985},
  url={https://doi.org/10.31224/5985},
  publisher={Engineering Archive},
  note={Preprint. Code available at: https://github.com/srs-protocol/OraSRS-protocol}
}
