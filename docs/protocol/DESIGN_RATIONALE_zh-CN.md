# OraSRS 设计原理 / Design Rationale

## 设计原理 / Design Rationale

### 1. 问题背景:从"拔网线"开始

几个月前,我搭建的服务(包括一个 MC 服务器)遭遇持续 DDoS 攻击,  
在一台只有 512MB 内存的设备上,唯一能自救的手段就是——拔网线。

我先后尝试过几条常见思路:

- **云黑名单 / 云安全服务**  
  - 依赖中心化服务,现实网络环境下很难统一部署;  
  - 小型自建服务(个人/小团队)难以长期依赖第三方云清洗。

- **应用层(L7)防护**  
  - 逻辑复杂、开销大;  
  - 对 512MB 这类资源受限设备而言过于沉重,无法作为"生存级"的基础能力。

在这个过程中,我意识到一个更本质的问题:

> **现在的安全能力是"不平等"的——大厂可以买高防,小站长只能拔网线。  
> 但安全本身,不应该是有钱人的特权,而应该是每个人的基本权利。**

所以 OraSRS 最初的动机,不只是"自保",而是:

- 能不能在极低资源的设备上,用协议 + 内核的方式,  
  把"能不能活下去"这一层防御能力,**平权化**、普及化?

---

### 2. 传统规则模型的局限

传统防护普遍依赖:

- 静态规则 / 固定黑名单;
- 事后共识(云端分析后再下发规则);
- 只关注入站,不关注被攻陷后的**出站 C2 外连**。

在随机源 SYN 洪水、0day 利用后外连等场景下,这些做法有几个明显问题:

- 单靠静态规则无法覆盖快速变化的攻击源;
- 云端分析 + 下发存在明显延迟,边缘设备已经被打挂或被接管;
- 缺乏统一协议来表达"威胁信号",不同系统之间无法协同;
- 更重要的是:**这套能力高度中心化,只有买得起服务的人才能用**。

---

### 3. OraSRS 的核心思路:先风控 / 先查询

在这样的背景下,OraSRS 协议的核心设计,不再以"静态规则优先"为中心,而是:

#### 3.1 入站(Inbound):**先风控,后共识**

对入站流量,特别是 SYN 类新建连接,遵循:

1. **T0 本地启发式先行**  
   - 在本地内核层(iptables/ipset 或 eBPF)做限速与特征识别;  
   - 在连接跟踪(conntrack)之前丢弃可疑大规模 SYN,保护 CPU / 内存 / 状态表;
   - 不依赖任何云端服务,**在 512MB 级别设备上也能工作**。

2. **必要时再与 T2/T3 交互**  
   - 只在需要时,将本地观察到的可疑源上报给 T2/T3;  
   - 或从 T2/T3 获取已达成共识的威胁情报,更新本地黑名单。

换句话说:

> **先保证"设备不死"(生存权),再考虑"全局共识";  
> 先让每一个节点在本地就能自保,而不是完全依赖某个"安全中心"。**

#### 3.2 出站(Outbound):**先查询,后放行**

针对出站连接(特别是可能的 C2 外连),遵循:

1. **本地/分布式威胁数据优先**  
   - 对特定目的地址/端口(如可疑 C2 IP/域名)进行优先查询;  
   - 若在本地黑名单或分布式威胁账本中被标记为高危,则直接阻断。

2. **安全默认:不信任 → 不放行**  
   - 对于无法确认可信的目标,宁可阻断,也不默认放行。  

这样可以在设备被 0day 攻破后:

- 阻止其"回连"到僵尸网络控制端(C2);  
- 切断攻击杀伤链(Kill Chain),降低设备沦为肉鸡的概率。

---

### 4. 分层:T0 ～ T3

OraSRS 协议采用 T0～T3 分层模型:

- **T0:本地启发式层(OraSRS‑Core)**  
  - 在内核层实现最小可用的防御引擎;  
  - 负责入站限速、防止状态耗尽;  
  - 实现入站/出站双向阻断的基础能力(包括 C2 外连拦截);  
  - 可**完全独立运行**,不依赖任何链或外部控制平面;  
  - 设计目标之一:**让一台 512MB 设备,也能拥有"可活下去"的防御权利。**

- **T2:分发层(可选)**  
  - 在多个节点之间同步威胁情报;  
  - 可以由厂商/运营者自建(中心化或联盟架构)。

- **T3:共识层(可选 / 实验中)**  
  - 探索使用分布式账本 / 共识系统来维护不可篡改的威胁记录;  
  - 用于跨组织、跨运营商的协同防御;  
  - 当前为研究性质 PoC,不是 T0 本地防御的前置条件。

当前版本中:

- **T0 已经反复实测,达到"可在真实环境中独立使用"的程度**;  
- **T2–T3 部分实现可用,但仍归类为"实验 / 研究中"功能。**

---

### 5. 实测结果与能力边界

在一台 2 vCPU / 512MB RAM 的 OpenWrt 设备上,T0 模块完成了如下测试:

- 攻击方式:随机源 IP SYN Flood(状态耗尽型 DDoS)  
- 持续时间:约 20 分钟  
- 总包数:约 40,000,000(4 千万)  
- 设备状态:
  - SSH 会话全程可用;
  - 持续 ping 8.8.8.8,观察到 **0% 丢包**;
  - CPU 负载与内存占用保持在可控范围内;

结论:

- 在**带宽未被物理打满**的前提下,  
  T0 模块可以将这类随机源 SYN 洪水从"致命问题"降级为"可控风险",  
  设备仍可被远程管理,业务可以继续工作或进行有序降级。

能力边界也非常明确:

> OraSRS‑Core 解决的是 **本地 CPU / 内存 / 状态耗尽** 问题,  
> **不能**解决上游链路被完全打满、ISP 黑洞路由等物理层面问题。  
> 当接入带宽被完全塞满时,需要运营商或上游清洗配合,这超出了本协议的职责范围。

---

### 6. 平权防御:安全是每个人的权利

OraSRS 背后有一个很简单的理念:

> **安全应该是每个人的权利,而不是少数有钱人的特权。**

具体体现为:

- 不要求昂贵硬件,一台 512MB 设备就可以获得协议级的生存能力;
- 不绑定任何特定云厂商或中心化服务,T0 可以本地独立运行;
- 协议与参考实现公开,任何人都可以复现、验证、改进;
- 允许小站长、IoT 厂商、研究者在同一套开放规则下协同防御。

---

### 7. 当前状态与预期方向

- **T0(OraSRS‑Core)**  
  - 已经完成设计与高压测试,可单独部署在 OpenWrt / Linux 等环境;  
  - 适合作为资源受限设备(IoT 网关、家用路由、边缘节点)的本地防御内核。

- **T2–T3(分发与共识)**  
  - 已有 PoC,实现了部分去中心化威胁信令;  
  - 出于合规与复杂度考虑,目前保持"实验可用/不强依赖"的状态;  
  - 欢迎研究者与厂商基于 DTSP 思路,自行探索适合自身场景的实现方式。

OraSRS 从一台被 DDoS 打到只能拔网线的个人服务器起步,  
目标不是打造一个"万能盾牌",而是:

> **在协议和内核这一层,为资源受限设备提供一套尽可能简单、透明、可复现的基础防御能力,  
> 把原本需要拔网线才能应对的 DDoS / C2 问题,变成一个可以被工程化处理的小问题,  
> 让"能不能防住这一层攻击",不再取决于你是不是大厂,而是取决于你愿不愿意运行这套开放协议。**

---

## 引用与署名 / Citation & Attribution

OraSRS 是一个公开的科研项目和开放协议。  
如果你在以下场景中使用了本项目的 **框架、协议设计(T0–T3 架构)、DTSP 思路** 或直接集成了 **OraSRS‑Core (T0)**:

- 在产品 / 固件 / 网关 中集成本项目的防御框架;
- 在论文、报告中使用了本项目的协议设计或实验数据;
- 在自己的系统中实现了兼容 DTSP 的威胁信令;

请在你的 **产品说明书、技术白皮书或学术论文** 中,至少做如下引用和署名。

### 学术引用 / Academic Citation

推荐引用如下预印本(带 DOI)和 IETF 草稿:

**中文:**

> 罗子谦. OraSRS:具有限时风险执行的合规轻量级去中心化威胁情报协议[J/OL]. Engineering Archive, 2025. DOI: 10.31224/5985.  
> IETF Internet‑Draft: Luo, Z. "Decentralized Threat Signaling Protocol (DTSP) using OraSRS", draft‑luo‑orasrs‑decentralized‑threat‑signaling‑00.

**英文:**

> Luo, Z. (2025). *OraSRS: A Compliant and Lightweight Decentralized Threat Intelligence Protocol with Time‑Bounded Risk Enforcement.* Engineering Archive. https://doi.org/10.31224/5985  
> Luo, Z. *Decentralized Threat Signaling Protocol (DTSP) using OraSRS.* IETF Internet‑Draft, draft‑luo‑orasrs‑decentralized‑threat‑signaling‑00.

**BibTeX 示例:**

```bibtex
@article{luo2025orasrs,
  title   = {OraSRS: A Compliant and Lightweight Decentralized Threat Intelligence Protocol with Time-Bounded Risk Enforcement},
  author  = {Luo, ZiQian},
  year    = {2025},
  doi     = {10.31224/5985},
  url     = {https://doi.org/10.31224/5985},
  publisher = {Engineering Archive},
  note    = {Preprint. Code available at: https://github.com/srs-protocol/OraSRS-protocol}
}
```

### 产品说明书中的参考表述 / Suggested Wording for Product Manuals

如果你的产品使用了 OraSRS 的 T0 框架或整体设计,建议在产品说明书或技术文档中加入类似表述:

**中文示例:**

> 本设备的边缘防护能力基于 OraSRS 协议提出的 T0 内核防御设计[罗子谦, 2025],  
> 在资源受限环境下实现了对随机源 SYN 洪水和 C2 外连的本地拦截。

**英文示例:**

> The edge defense capability of this device is based on the T0 kernel defense design of the OraSRS protocol [Luo, 2025],  
> providing local mitigation against random‑source SYN floods and C2 outbound connections on resource‑constrained hardware.

---

## 结语 / Closing Statement

> "The project reaches its zenith not when there is nothing more to add, but when there is nothing more to take away."

OraSRS 的 T0 模块已达成其工程目标:**只要带宽未满,服务即永不宕机**。我们将 T2-T3 置于非激活状态,是为了保护核心协议的纯粹性,并留出足够的空间让未来的研究者去填充。

这是一个普通开发者的谢幕,也是一个新协议标准的开端。

---

## 相关文档 / Related Documentation

- [协议规范 / Protocol Specification](SRS_PROTOCOL_SPEC.md)
- [架构文档 / Architecture](../04-architecture.md)
- [性能测试报告 / Performance Reports](../performance/)
- [IETF Draft](https://datatracker.ietf.org/doc/draft-luo-orasrs-decentralized-threat-signaling/)
