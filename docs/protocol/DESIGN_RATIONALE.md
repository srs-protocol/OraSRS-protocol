# OraSRS Design Rationale

## Design Rationale

### 1. Problem Background: Starting from "Pulling the Network Cable"

A few months ago, my self-hosted services (including a Minecraft server) suffered from sustained DDoS attacks.  
On a device with only 512MB of memory, the only means of self-rescue was—pulling the network cable.

I tried several common approaches:

- **Cloud Blacklists / Cloud Security Services**  
  - Rely on centralized services, difficult to deploy uniformly in real-world network environments;  
  - Small self-hosted services (individuals/small teams) cannot sustainably depend on third-party cloud scrubbing.

- **Application Layer (L7) Protection**  
  - Complex logic, high overhead;  
  - Too heavy for resource-constrained devices like 512MB systems, cannot serve as a "survival-level" basic capability.

During this process, I realized a more fundamental issue:

> **Current security capabilities are "unequal"—large companies can buy high-level protection, while small webmasters can only pull the network cable.  
> But security itself should not be a privilege for the wealthy, but a basic right for everyone.**

So the initial motivation for OraSRS was not just "self-protection," but:

- Can we use protocol + kernel approaches on extremely low-resource devices  
  to **democratize** and popularize the defense capability of "being able to survive"?

---

### 2. Limitations of Traditional Rule Models

Traditional protection generally relies on:

- Static rules / fixed blacklists;
- Post-event consensus (cloud analysis then rule distribution);
- Only focusing on inbound traffic, not on **outbound C2 connections** after compromise.

In scenarios like random-source SYN floods and 0-day exploitation with outbound connections, these approaches have several obvious problems:

- Static rules alone cannot cover rapidly changing attack sources;
- Cloud analysis + distribution has significant delays, edge devices are already overwhelmed or compromised;
- Lack of unified protocol to express "threat signals," different systems cannot coordinate;
- More importantly: **This capability is highly centralized, only available to those who can afford the service**.

---

### 3. OraSRS Core Approach: Risk Control First / Query First

Against this background, the core design of the OraSRS protocol no longer centers on "static rules first," but:

#### 3.1 Inbound: **Risk Control First, Consensus Later**

For inbound traffic, especially SYN-type new connections, follow:

1. **T0 Local Heuristics First**  
   - Perform rate limiting and feature recognition at the local kernel layer (iptables/ipset or eBPF);  
   - Drop suspicious large-scale SYN before connection tracking (conntrack), protecting CPU / memory / state tables;
   - Does not depend on any cloud services, **works on 512MB-level devices**.

2. **Interact with T2/T3 Only When Necessary**  
   - Only when needed, report locally observed suspicious sources to T2/T3;  
   - Or obtain consensus threat intelligence from T2/T3 to update local blacklists.

In other words:

> **First ensure "device survival" (right to survive), then consider "global consensus";  
> First let each node self-protect locally, rather than completely depending on a "security center".**

#### 3.2 Outbound: **Query First, Allow Later**

For outbound connections (especially potential C2 connections), follow:

1. **Local/Distributed Threat Data Priority**  
   - Prioritize queries for specific destination addresses/ports (such as suspicious C2 IPs/domains);  
   - If marked as high-risk in local blacklists or distributed threat ledgers, block directly.

2. **Secure Default: Distrust → Deny**  
   - For targets that cannot be confirmed as trusted, prefer blocking over default allowing.  

This way, after a device is compromised by 0-day:

- Prevent it from "calling back" to botnet control endpoints (C2);  
- Cut the attack kill chain, reducing the probability of the device becoming a bot.

---

### 4. Layering: T0 ~ T3

The OraSRS protocol adopts a T0~T3 layered model:

- **T0: Local Heuristics Layer (OraSRS‑Core)**  
  - Implements a minimal viable defense engine at the kernel layer;  
  - Responsible for inbound rate limiting, preventing state exhaustion;  
  - Implements basic bidirectional blocking capabilities for inbound/outbound (including C2 outbound interception);  
  - Can **run completely independently**, without depending on any chain or external control plane;  
  - One design goal: **Let a 512MB device also have the "right to survive" defense capability.**

- **T2: Distribution Layer (Optional)**  
  - Synchronizes threat intelligence among multiple nodes;  
  - Can be self-built by vendors/operators (centralized or consortium architecture).

- **T3: Consensus Layer (Optional / Experimental)**  
  - Explores using distributed ledgers / consensus systems to maintain immutable threat records;  
  - For cross-organization, cross-operator collaborative defense;  
  - Currently a research-nature PoC, not a prerequisite for T0 local defense.

In the current version:

- **T0 has been repeatedly tested and reached "independently usable in real environments"**;  
- **T2–T3 are partially implemented and available, but still classified as "experimental / research" features.**

---

### 5. Test Results and Capability Boundaries

On a 2 vCPU / 512MB RAM OpenWrt device, the T0 module completed the following tests:

- Attack method: Random-source IP SYN Flood (state exhaustion DDoS)  
- Duration: Approximately 20 minutes  
- Total packets: Approximately 40,000,000 (40 million)  
- Device status:
  - SSH session remained available throughout;
  - Continuous ping to 8.8.8.8, observed **0% packet loss**;
  - CPU load and memory usage remained within controllable range;

Conclusion:

- Under the premise that **bandwidth is not physically saturated**,  
  the T0 module can downgrade this type of random-source SYN flood from a "fatal problem" to a "controllable risk",  
  the device can still be remotely managed, and services can continue to work or perform orderly degradation.

Capability boundaries are also very clear:

> OraSRS‑Core solves **local CPU / memory / state exhaustion** problems,  
> **Cannot** solve upstream link saturation, ISP blackhole routing, and other physical-layer issues.  
> When access bandwidth is completely saturated, cooperation from operators or upstream scrubbing is needed, which is beyond the scope of this protocol.

---

### 6. Democratic Defense: Security is Everyone's Right

OraSRS has a simple philosophy behind it:

> **Security should be everyone's right, not a privilege for a few wealthy people.**

Specifically manifested as:

- Does not require expensive hardware, a 512MB device can obtain protocol-level survival capability;
- Not tied to any specific cloud vendor or centralized service, T0 can run independently locally;
- Protocol and reference implementation are open, anyone can reproduce, verify, and improve;
- Allows small webmasters, IoT vendors, and researchers to collaborate in defense under the same open rules.

---

### 7. Current Status and Expected Direction

- **T0 (OraSRS‑Core)**  
  - Design and high-pressure testing completed, can be deployed independently on OpenWrt / Linux environments;  
  - Suitable as a local defense kernel for resource-constrained devices (IoT gateways, home routers, edge nodes).

- **T2–T3 (Distribution and Consensus)**  
  - PoC available, implemented partial decentralized threat signaling;  
  - For compliance and complexity considerations, currently maintained in "experimentally available / not strongly dependent" status;  
  - Researchers and vendors are welcome to explore implementations suitable for their own scenarios based on DTSP ideas.

OraSRS started from a personal server that could only be saved by pulling the network cable when hit by DDoS,  
the goal is not to create an "omnipotent shield," but:

> **At the protocol and kernel layer, provide a set of basic defense capabilities as simple, transparent, and reproducible as possible for resource-constrained devices,  
> Turn DDoS / C2 problems that originally required pulling the network cable into small problems that can be handled by engineering,  
> Make "whether you can defend against this layer of attacks" no longer depend on whether you are a large company, but on whether you are willing to run this open protocol.**

---

## Citation & Attribution

OraSRS is an open research project and open protocol.  
If you have used the **framework, protocol design (T0–T3 architecture), DTSP ideas** of this project or directly integrated **OraSRS‑Core (T0)** in the following scenarios:

- Integrating this project's defense framework in products / firmware / gateways;
- Using this project's protocol design or experimental data in papers or reports;
- Implementing DTSP-compatible threat signaling in your own system;

Please include at least the following citation and attribution in your **product manuals, technical white papers, or academic papers**.

### Academic Citation

Recommended citation of the following preprint (with DOI) and IETF draft:

**Chinese:**

> 罗子谦. OraSRS:具有限时风险执行的合规轻量级去中心化威胁情报协议[J/OL]. Engineering Archive, 2025. DOI: 10.31224/5985.  
> IETF Internet‑Draft: Luo, Z. "Decentralized Threat Signaling Protocol (DTSP) using OraSRS", draft‑luo‑orasrs‑decentralized‑threat‑signaling‑00.

**English:**

> Luo, Z. (2025). *OraSRS: A Compliant and Lightweight Decentralized Threat Intelligence Protocol with Time‑Bounded Risk Enforcement.* Engineering Archive. https://doi.org/10.31224/5985  
> Luo, Z. *Decentralized Threat Signaling Protocol (DTSP) using OraSRS.* IETF Internet‑Draft, draft‑luo‑orasrs‑decentralized‑threat‑signaling‑00.

**BibTeX Example:**

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

### Suggested Wording for Product Manuals

If your product uses OraSRS's T0 framework or overall design, it is recommended to include similar wording in product manuals or technical documentation:

**Chinese Example:**

> 本设备的边缘防护能力基于 OraSRS 协议提出的 T0 内核防御设计[罗子谦, 2025],  
> 在资源受限环境下实现了对随机源 SYN 洪水和 C2 外连的本地拦截。

**English Example:**

> The edge defense capability of this device is based on the T0 kernel defense design of the OraSRS protocol [Luo, 2025],  
> providing local mitigation against random‑source SYN floods and C2 outbound connections on resource‑constrained hardware.

---

## Closing Statement

> "The project reaches its zenith not when there is nothing more to add, but when there is nothing more to take away."

OraSRS's T0 module has achieved its engineering goal: **as long as bandwidth is not saturated, the service will never go down**. We keep T2-T3 in a non-activated state to protect the purity of the core protocol and leave sufficient space for future researchers to fill.

This is the curtain call for an ordinary developer, and the beginning of a new protocol standard.

---

## Related Documentation

- [Protocol Specification](SRS_PROTOCOL_SPEC.md)
- [Architecture Documentation](../04-architecture.md)
- [Performance Test Reports](../performance/)
- [IETF Draft](https://datatracker.ietf.org/doc/draft-luo-orasrs-decentralized-threat-signaling/)
