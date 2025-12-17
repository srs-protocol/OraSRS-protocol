# OraSRS Protocol
[![DOI](https://img.shields.io/badge/DOI-10.31224%2F5985-blue)](https://doi.org/10.31224/5985)
[![License](https://img.shields.io/badge/License-Apache%202.0-green.svg)](LICENSE)

> ⚠️ **测试阶段声明**: 本项目处于 Beta 测试阶段，部分功能（如出站审查）默认为监控模式。详见 [免责声明](#-测试阶段免责声明)。

> 🔒 **威胁情报源声明**: 在测试阶段，OraSRS 集成了以下开源威胁情报源作为高危 IP 名单补充：
> - [Spamhaus DROP](https://www.spamhaus.org/drop/) - 已确认僵尸网络控制节点
> - [DShield](https://www.dshield.org/) - 恶意扫描活动源
> - [Abuse.ch Feodo Tracker](https://feodotracker.abuse.ch/) - C2 命令控制服务器
> 
> 这些数据源**每日自动更新**（北京时间 00:00），通过 Merkle Tree 验证确保数据完整性。客户端支持**增量差分同步**，带宽消耗降低 96%。
> 
> **生产环境建议**: 部署前请根据实际业务需求评估这些数据源，并配置本地白名单以避免误拦截。

> 🌐 **测试节点地域政策**: OraSRS Alpha 测试目前仅面向中国大陆以外的节点开放。中国开发者可部署私有网络。详见 [Alpha 测试政策](ALPHA_TESTING.md)。

> 📄 **学术关联**: 本 Alpha 实现基于论文 [*OraSRS: A Compliant and Lightweight Decentralized Threat Intelligence Protocol with Time-Bounded Risk Enforcement*](https://doi.org/10.31224/5985) 中的协议设计。**注意**: 代码库中包含若干**实验性扩展模块**（如 eBPF 出站过滤、HVAP 框架、IoT Shield），其设计与实现**超前于当前论文版本**，属于协议 v3.0 的探索性研究，**尚未纳入正式规范**。

OraSRS (Oracle Security Root Service) 是一个咨询式风险评分服务，为 IP 和域名提供风险评估。OraSRS 与传统的威胁情报服务不同，它不直接阻断流量，而是提供风险评分供客户端参考。

## 项目概述

OraSRS (Oracle Security Root Service) 是一个咨询式风险评分服务，为 IP 和域名提供风险评估。OraSRS 与传统的威胁情报服务不同，它不直接阻断流量，而是提供风险评分供客户端参考。

- **咨询式服务**：OraSRS 是信用报告机构（如 FICO），而不是法院。客户端自己决定是否采取行动。
- **透明性**：所有决策依据都对客户端透明。
- **可审计性**：所有评估过程可以追溯和审计。
- **合规性**：符合 GDPR、CCPA 和中国网络安全法要求。
- **区块链集成**：所有威胁情报记录在 OraSRS 协议链上，提供透明和不可篡改的验证机制。
- **三层架构**：边缘层、共识层、智能层的三层共识架构。
- **智能同步**：增量差分同步系统，带宽消耗降低 96%（5KB vs 132KB）。

## 核心价值主张

1. **咨询式服务模型**：OraSRS 提供建议而非直接阻断命令
2. **多层次证据**：基于多源证据的风险评估
3. **透明可审计**：所有评估过程可追溯
4. **合规隐私**：严格遵守全球隐私法规
5. **声誉机制**：基于节点声誉的去中心化治理
6. **区块链验证**：通过长安链技术实现多方共识和验证
7. **去重逻辑**：防止重复威胁报告的时间窗口机制
8. **国密算法**：支持 SM2/SM3/SM4 国密算法
9. **智能缓存**：O(1) 精确 IP 查询 + O(n) CIDR 最长前缀匹配
10. **增量同步**：每日差分更新，最小化带宽消耗
11. **三层架构**：边缘层、共识层、智能层的去中心化威胁检测网络
12. **动态风控**：基于风险评分的自适应封禁时长机制

## 🚀 部署模式与资源需求 / Deployment Modes

OraSRS 提供三种灵活的部署模式，以适应从云服务器到 IoT 设备的各种环境：

| 模式 | 适用场景 | 内存需求 | 核心组件 | 功能 |
|------|----------|----------|----------|------|
| **完整管理节点 (Full)** | 云服务器、网关 | ~90 MB | Node.js + eBPF | 完整 API、区块链交互、可视化、CLI |
| **混合模式 (Hybrid)** | 边缘网关、路由器 | ~30 MB | Python + eBPF | 核心防护、有限 API、自动同步 |
| **原生边缘代理 (Edge)** | IoT 设备、传感器 | **< 5 MB** | Native C + eBPF | 仅核心防护、被动更新、极致轻量 |

**注意**: 论文中提到的 "<5MB" 内存指标特指 **原生边缘代理 (Native Edge Agent)** 模式。默认安装脚本会自动检测设备内存并推荐合适的模式。

### 📊 性能基准测试与复现 / Performance Benchmark & Reproduction

为确保透明度，我们提供了自动化脚本以复现上述性能指标。以下是基于 v2.1.0 版本的实测数据：

**1. 运行基准测试脚本**:
```bash
# 完整客户端 & Python 代理测试
./benchmark-kernel-acceleration.sh

# 原生 C 代理内存验证
./verify-native-agent.sh
```

**2. 实测日志摘要 (2025-12-17)**:

**A. 完整管理节点 (Full Client)**
```
ℹ️  OraSRS 进程 PID: 79594
CPU 使用率: 0.2 %
内存使用: 98.03 MB
✅ 内存使用正常 (< 100MB)
```

**B. 混合模式代理 (Python Agent)**
```
ℹ️  Starting lightweight agent...
✅ Agent started successfully (PID: 99036)
Agent Memory: 23.70 MB
✅ Lightweight agent memory usage is optimized (< 30MB)
```

**C. 原生边缘代理 (Native Agent)**
```
=== OraSRS Native Agent Memory Verification ===
[*] Measuring memory footprint...
PID: 99214
RSS: 1.25 MB
✅ MEMORY TARGET ACHIEVED: 1.25MB < 5MB
```

> **结论**: 原生 C 代理 (1.25 MB) 成功满足论文中 "< 5MB" 的资源约束要求。

**🔗 相关文件链接**:

| 文件 | 说明 | 链接 |
|------|------|------|
| `benchmark-kernel-acceleration.sh` | 综合性能基准测试脚本 | [查看源码](benchmark-kernel-acceleration.sh) |
| `verify-native-agent.sh` | 原生代理内存验证脚本 | [查看源码](verify-native-agent.sh) |
| `src/agent/native_edge_agent.c` | 原生代理 C 源码 | [查看源码](src/agent/native_edge_agent.c) |
| `orasrs-edge-agent.py` | Python 轻量代理源码 | [查看源码](orasrs-edge-agent.py) |
| `docs/MEMORY_USAGE_EXPLANATION.md` | 详细内存分析报告 | [查看文档](docs/MEMORY_USAGE_EXPLANATION.md) |

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

**详细声明请参阅 [NOTICE](NOTICE) 文件。**

## 📚 学术出版物 / Academic Publications

本项目的核心协议设计基于学术论文（**预印本已发布**）：

**论文标题**: *OraSRS: A Compliant and Lightweight Decentralized Threat Intelligence Protocol with Time-Bounded Risk Enforcement*

**作者**: Luo ZiQian [![ORCID](https://img.shields.io/badge/ORCID-0009--0008--8644--8717-green)](https://orcid.org/0009-0008-8644-8717)

**状态**: 预印本已发布  
**DOI**: [10.31224/5985](https://doi.org/10.31224/5985)  
**发布平台**: Engineering Archive

**摘要**: 本文提出了一种轻量级去中心化威胁情报协议，通过"先风控后查询"机制、动态封禁叠加和本地-链上协同决策，实现了对零日攻击的主动防御。协议采用三层架构（边缘层、共识层、智能层），支持国密算法，满足 GDPR/CCPA/等保 2.0 合规要求。

**实验性扩展** (v3.0 探索性研究，超出论文范围):
- eBPF 出站流量审查 (Egress Protection)
- 高价值资产保护框架 (HVAP)
- 物联网护盾 (IoT Shield)
- Wazuh 安全平台集成
- 去中心化治理机制
- 客户端投票系统

这些扩展功能基于论文的核心设计原则，但属于协议 v3.0 的前沿研究方向，尚未纳入正式规范。

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

**APA 格式**:
```
Luo, Z. (2025). OraSRS: A Compliant and Lightweight Decentralized Threat Intelligence Protocol with Time-Bounded Risk Enforcement. Engineering Archive. https://doi.org/10.31224/5985
```

## 一键安装 (Linux)

使用以下命令一键安装 OraSRS Linux 客户端：

```bash
curl -fsSL https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/install-orasrs-client.sh | bash
```

或

```bash
wget -O - https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/install-orasrs-client.sh | bash
```

### 管理命令 (使用 OraSRS CLI)

我们推荐使用 `orasrs-cli` 工具来管理客户端：

```bash
# 查看客户端状态
orasrs-cli status

# 运行初始化向导
orasrs-cli init

# 查询 IP 风险评分（中文友好格式）
orasrs-cli query 45.135.193.0

# 查询 IP（JSON 格式）
orasrs-cli query 45.135.193.0 --format json

# 手动同步威胁情报
orasrs-cli sync

# 强制完整同步
orasrs-cli sync --force

# 查看缓存状态
orasrs-cli cache status

# 清空缓存
orasrs-cli cache clear

# 重建缓存
orasrs-cli cache rebuild

# 查看统计信息
orasrs-cli stats

# 管理白名单
orasrs-cli whitelist add 1.2.3.4
orasrs-cli whitelist remove 1.2.3.4
orasrs-cli whitelist list

# 查看配置
orasrs-cli config

# 查看日志
orasrs-cli logs

# 运行系统测试
orasrs-cli test

# 内核加速管理 (eBPF)
orasrs-cli kernel                    # 查看内核加速状态
orasrs-cli kernel --detailed         # 查看详细统计信息
orasrs-cli kernel-sync               # 手动同步威胁数据到内核
```

### CLI 输出格式示例 / CLI Output Example

**中文友好格式**（`--format pretty`，默认）：

```
🔍 查询 IP: 45.135.193.0

威胁情报:
  风险评分: 75/100
  风险等级: 高
  威胁类型: Botnet C2 (推测)
  数据来源: Local Cache (Abuse.ch)
  首次出现: 2025-12-10
  持续活跃: Yes

来源：测试协议链
缓存：是
📌 注意: OraSRS 仅提供风险评估，是否阻断请结合业务策略决定。
```

**JSON 格式**（`--format json`）：

```json
{
  "query": { "ip": "45.135.193.0" },
  "response": {
    "risk_score": 75,
    "risk_level": "High",
    "threat_types": ["Botnet C2"],
    "source": "Local Cache (Abuse.ch)",
    "cached": true,
    "first_seen": "2025-12-10T00:00:00Z",
    "timestamp": "2025-12-15T12:00:00Z"
  }
}
```

### 传统服务管理命令

```bash
# 启动服务
sudo systemctl start orasrs-client

# 停止服务
sudo systemctl stop orasrs-client

# 重启服务
sudo systemctl restart orasrs-client

# 查看服务状态
sudo systemctl status orasrs-client
```

## 浏览器扩展

我们还提供浏览器扩展插件，可直接从浏览器保护您的网络安全：

- 支持 Chrome 和 Firefox
- 实时威胁防护
- 基于 OraSRS 协议链的去中心化威胁情报
- 隐私保护设计



## 🛠️ Client Tools / 客户端工具

### CLI Usage / CLI 使用

OraSRS provides a powerful command-line interface for management and querying.
OraSRS 提供强大的命令行界面用于管理和查询。

```bash
# Query an IP with pretty output (default)
# 查询 IP（中文友好格式，默认）
orasrs-cli query 45.135.193.0

# Query with JSON output
# 查询并返回 JSON 格式
orasrs-cli query 45.135.193.0 --format json

# Report a threat (requires private key)
# 报告威胁（需要私钥）
orasrs-cli report 1.2.3.4 --reason "Phishing" --private-key <YOUR_KEY>

# Manually sync threat data from blockchain
# 手动从区块链同步威胁数据
orasrs-cli sync

# Force full sync (not incremental)
# 强制完整同步（非增量）
orasrs-cli sync --force

# Cache management
# 缓存管理
orasrs-cli cache status   # View cache status / 查看缓存状态
orasrs-cli cache clear    # Clear cache / 清空缓存
orasrs-cli cache rebuild  # Rebuild cache / 重建缓存

# Whitelist management
# 白名单管理
orasrs-cli whitelist add 1.2.3.4      # Add to whitelist / 添加到白名单
orasrs-cli whitelist remove 1.2.3.4   # Remove from whitelist / 从白名单移除
orasrs-cli whitelist list             # 列出所有
```

### Client SDK / 客户端 SDK

Developers can use the OraSRS client to integrate threat intelligence into their applications.
开发者可以使用 OraSRS 客户端将威胁情报集成到应用中。

**安装 / Installation:**

```bash
# Clone the repository / 克隆仓库
git clone https://github.com/srs-protocol/OraSRS-protocol.git
cd OraSRS-protocol

# Install dependencies / 安装依赖
npm install

# Start the OraSRS service / 启动 OraSRS 服务
node orasrs-simple-client.js
```

**或使用一键安装脚本 / Or use the one-click installation script:**

```bash
# For Linux systems / Linux 系统
curl -fsSL https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/orasrs-lite-client/scripts/install.sh | sudo bash

# The service will be available at / 服务将在以下地址可用
# http://localhost:3006
```

**基本用法 / Basic Usage:**

```javascript
// Query IP via HTTP API / 通过 HTTP API 查询 IP
const response = await fetch('http://localhost:3006/orasrs/v1/query?ip=45.135.193.0');
const data = await response.json();

console.log(data.response.risk_score);
console.log(data.response.risk_level);
console.log(data.response.threat_types);

// Add to whitelist / 添加到白名单
await fetch('http://localhost:3006/orasrs/v1/whitelist/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ip: '192.168.1.100' })
});

// Manual sync / 手动同步
await fetch('http://localhost:3006/orasrs/v1/sync', { method: 'POST' });

// Get cache status / 获取缓存状态
const cacheStatus = await fetch('http://localhost:3006/orasrs/v1/cache/status');
const cache = await cacheStatus.json();
```


**完整文档 / Full Documentation:**

- [SDK Usage Guide / SDK 使用指南](SDK_USAGE_GUIDE.md)
- [API Reference / API 参考](api.md)

### OpenWrt Support / OpenWrt 支持

OraSRS supports OpenWrt for IoT/Router protection, providing lightweight threat intelligence for embedded devices.
OraSRS 支持 OpenWrt 路由器和 IoT 设备防护，为嵌入式设备提供轻量级威胁情报。

**快速安装 / Quick Installation:**

```bash
# 方法1: 使用 curl 一键安装 (推荐)
# Method 1: Use curl one-click installation (Recommended)
curl -fsSL https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/install-openwrt.sh | sh

# 方法2: 使用 wget 下载脚本
# Method 2: Use wget to download script
wget https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/install-openwrt.sh
sh install-openwrt.sh
```

**管理命令 / Management Commands:**

```bash
# 查询 IP / Query IP
orasrs-cli query 1.2.3.4

# 查看状态 / Check Status
/etc/init.d/orasrs status
```


**核心特性 / Core Features:**

- ✅ **超低内存占用（< 50MB）** / Ultra-low memory footprint (< 50MB)
- ✅ **SQLite 缓存** - 节省 RAM / SQLite-based caching saves RAM
- ✅ **透明代理模式** / Transparent proxy mode for IoT protection
- ✅ **IoT 专用威胁情报** / IoT-specific threat intelligence (Mirai, Mozi, etc.)
- ✅ **LuCI Web 界面** / LuCI web interface for easy management
- ✅ **自动缓存同步** / Automatic cache synchronization
- ✅ **防火墙集成（ipset/iptables/nftables）** / Firewall integration
- ✅ **多架构支持** / Supports ARM/MIPS/ARM64/x86 architectures

**IoT 透明防护 / IoT Transparent Protection:**

OraSRS 可以在不修改 IoT 设备配置的情况下，通过网关层面拦截和检测威胁：

```
IoT 设备 (摄像头/传感器/智能家居)
    ↓
OpenWrt 路由器 + OraSRS (透明检测)
    ↓ 风险评分 < 80: 放行
    ↓ 风险评分 ≥ 80: 拦截
互联网
```

**威胁情报源 / Threat Intelligence Sources:**

专门针对 IoT 设备的威胁数据：

- **URLhaus** - IoT 恶意软件分发 URL（Mirai, Mozi等）
- **ThreatFox** - IoT 僵尸网络 C2 指标
- **Feodo Tracker** - 僵尸网络 C2 服务器
- 自动更新频率：每小时

**LuCI Web 界面 / LuCI Web Interface:**

安装后访问：`http://your-router-ip/cgi-bin/luci/admin/services/orasrs`

<img src="docs/images/luci-orasrs-status.png" alt="LuCI Interface" width="600"/>

**配置示例 / Configuration Example:**

```
config orasrs 'main'
    option enabled '1'
    option api_endpoint 'https://api.orasrs.net'
    option sync_interval '3600'
    option cache_size '1000'
    option log_level 'info'

config iot_shield 'main'
    option enabled '1'              # 启用 IoT Shield
    option shield_mode 'block'      # monitor 或 block
    option iot_network '192.168.2.0/24'  # IoT 设备网段
    option protected_ports '80 443 1883 8883'  # 受保护端口
    option auto_block '1'
    option block_threshold '80'     # 风险阈值
```

**服务管理 / Service Management:**

```bash
# 启动/停止/重启服务
/etc/init.d/orasrs start|stop|restart

# 查看状态
/etc/init.d/orasrs status

# 启用透明代理
/usr/lib/orasrs/transparent-proxy.sh start

# CLI 工具
orasrs-cli query 1.2.3.4
orasrs-cli sync
orasrs-cli cache status
```

**支持的 IoT 设备类型 / Supported IoT Device Types:**

- 📷 IP 摄像头 / IP cameras
- 🏠 智能家居设备 / Smart home devices  
- 🔌 智能插座 / Smart plugs
- 🌡️ 传感器 / Sensors
- 🔊 智能音箱 / Smart speakers
- 🏭 工业控制器（PLC/SCADA）/ Industrial controllers

**完整文档 / Full Documentation:**

- [OpenWrt Installation Guide / OpenWrt 安装指南](OPENWRT_INSTALLATION_GUIDE.md)
- [IoT Deployment Guide / IoT 部署指南](IOT_DEPLOYMENT_GUIDE.md)
- [Transparent Proxy Setup / 透明代理设置](TRANSPARENT_PROXY_SETUP.md)
- [IoT Shield Design / IoT 护盾设计](IOT_SHIELD.md)

## ✨ 增强功能 / Enhanced Features
- **三层去中心化架构 / Three-Tier Decentralized Architecture**: 超轻量边缘代理 + 多链可信存证 + 威胁情报协调网络 / Ultra-lightweight Edge Agent + Multi-chain
- **轻量级质押机制**: 基于行为的动态声誉评分，无需经济质押 / Behavior-based dynamic reputation scoring, no economic staking required
- **BFT 共识算法 / BFT Consensus Algorithm**: 支持多链部署，区域化合规 / Multi-chain deployment support, regional compliance
- **国产化支持 / Localization Support**: 支持国密算法（SM2/SM3/SM4），适配长安链 / Supports Chinese national cryptography (SM2/SM3/SM4), compatible with ChainMaker
- **合规治理 / Compliance Governance**: 自动区域合规引擎，满足GDPR/CCPA/等保2.0 / Automatic regional compliance engine, compliant with GDPR/CCPA/Cybersecurity Protection Level 2.0
- **SecurityRiskAssessment v2.0 协调防御 / SecurityRiskAssessment v2.0 Coordinated Defense**: 全球轻量级主动防御协调框架 / Global Lightweight Proactive Defense Coordination Framework
- **SecurityRiskAssessment Agent**: 超轻量级威胁检测代理，< 5MB内存占用 / Ultra-lightweight threat detection agent with < 5MB memory footprint
- **简化的网络架构 / Simplified Network Architecture**: 移除了复杂的P2P设置，采用更高效的客户端-服务器模式 / Removed complex P2P setup,采用 more efficient client-server model
- **威胁情报集成 / Threat Intelligence Integration**: 实时威胁情报收集、验证和共享 / Real-time threat intelligence collection, verification and sharing
- **边缘缓存层 / Edge Cache Layer**: 小额质押缓存节点，提高查询性能 / Low-stake cache nodes for improved query performance
- **智能路由 / Smart Routing**: 基于地理位置和合规要求的智能路由 / Intelligent routing based on geographic location and compliance requirements

## 📚 协议规范 / Protocol Specifications
- [v0.1 规范文档 / v0.1 Specification Document](SRS_PROTOCOL_SPEC.md)（中文/英文 / Chinese/English）
- [SecurityRiskAssessment v2.0 威胁情报协议 / SecurityRiskAssessment v2.0 Threat Intelligence Protocol](OraSRS_v2.0_Threat_Intelligence_Protocol.md)（中英双语 / Chinese-English）
- [共识参数白皮书 / Consensus Parameters Whitepaper](CONSENSUS_PARAMETERS_WHITEPAPER.md)
- [国密算法集成指南 / SM Cryptography Integration Guide](SM_CRYPTO_INTEGRATION.md)
- [设计哲学 / Design Philosophy](docs/design.md)

## 📖 文档索引 / Documentation Index
- [应用指南 / Application Guide](APPLICATION_GUIDE.md)
- [API 接口 / API Interface](api.md)
- [威胁情报系统文档 / Threat Intelligence System](docs/QUICKSTART.md) **NEW!**

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
✅ 威胁情报聚合与验证
```

### 性能指标
| 指标 | 值 |
|------|-----|
| 查询时间 | < 2ms |
| 内存占用 | ~2MB |
| 完整数据 | 132KB |
| 每日差分 | 1-5KB |
| 月带宽/客户端 | ~618KB |
| 威胁检测延迟 | < 100ms |
| 共识验证时间 | < 500ms |

### 快速开始
```bash
# 运行 Oracle（每日 00:00 自动）
python3 oracle/threat_oracle.py

# 测试查询
node threat-data-loader.js

# 设置定时任务
sudo crontab -e
# 添加: 0 0 * * * /home/Great/SRS-Protocol/scripts/oracle-cron.sh
```

📚 **完整文档**: [威胁情报系统指南](docs/QUICKSTART.md)

## 🧩 智能合约 / Smart Contracts
- [威胁情报协调合约 / Threat Intelligence Coordination Contract](contracts/ThreatIntelligenceCoordination.sol)
- [优化威胁注册表 / Optimized Threat Registry](contracts/OptimizedThreatRegistry.sol) **NEW!**
- [OraSRS治理合约 / OraSRS Governance Contract](contracts/OraSRSGovernance.sol)
- [风险计算器合约 / Risk Calculator Contract](contracts/IPRiskCalculator.sol)

## 🔒 安全测试 / Security Testing
- [安全测试指南 / Security Testing Guide](SECURITY_TESTING_GUIDE.md)
- [安全测试脚本 / Security Testing Script](test-security.sh)
- [安全测试合约 / Security Testing Contract](test/SRA-security.t.sol)
- [安全配置文件 / Security Configuration File](security-config.json)
- [安全分析报告 / Security Analysis Report](SECURITY_ANALYSIS_REPORT.md)

## 🚀 部署方案 / Deployment Solutions
- [SecurityRiskAssessment独立区块链网络 / SecurityRiskAssessment Standalone Blockchain Network](#start-SRA-network) **(推荐)**
- [OraSRS私有链 (Hardhat+Geth) / OraSRS Private Chain (Hardhat+Geth)](#start-orasrs-chain) **(开发环境)**
- [长安链部署技术方案 / ChainMaker Deployment Technical Solution](CHAINMAKER_DEPLOYMENT_PLAN.md)
- [ChainMaker 迁移指南 / ChainMaker Migration Guide](CHAINMAKER_MIGRATION_GUIDE.md)
- [ChainMaker 安全测试 / ChainMaker Security Testing](CHAINMAKER_SECURITY_TESTING.md)

### 方式 1: 一键安装/更新 (推荐)

我们提供了一个一键安装脚本，支持 Ubuntu/Debian/CentOS 等主流 Linux 发行版。该脚本会自动安装依赖、配置服务并启动客户端。

```bash
curl -fsSL https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/install-orasrs-client.sh | bash
```

此命令也用于**更新客户端**。如果客户端已安装，运行此命令将自动拉取最新代码并重启服务。

### 方式 2: Wazuh + OraSRS 集成安装 (高级安全)

如果您希望将 OraSRS 集成到 Wazuh 安全平台，实现自动威胁阻断：

```bash
curl -fsSL https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/install-wazuh-orasrs.sh | bash
```

此脚本将：
1. 安装/更新 OraSRS 客户端（限制为本地访问）。
2. 安装 Wazuh Agent。

**工作原理 (先风控后查询):**
- **Wazuh 发现威胁**: 触发集成脚本调用 OraSRS 接口 `/v1/threats/process`。
- **OraSRS 决策**:
  - **白名单**: 直接放行。
  - **动态风控**: 根据威胁等级计算封禁时长（高危 3天，严重 7天，默认 24小时）。
  - **本地/链上协同**: 优先查询本地缓存（若命中则叠加时长），其次查询链上数据（若命中则最大封禁）。
  - **新威胁**: 写入本地缓存并异步上报链上。
- **Active Response**: Wazuh 根据 OraSRS 返回的指令执行 `firewall-drop`。

### 🛡️ 高价值资产保护 (HVAP) 配置

针对 SSH/MySQL 等关键服务，启用基于 OraSRS 评分的动态访问控制：

1. **安装 PAM 模块** (已包含在上述脚本中)
2. **启用 SSH 保护**:
   编辑 `/etc/pam.d/sshd`，在文件顶部添加：
   ```bash
   auth required pam_exec.so /opt/orasrs/pam/pam_orasrs.py
   ```
   这将拦截高风险 IP (Score >= 80) 的登录尝试，有效防御 0-day 攻击探测。

**HVAP 防御逻辑:**
- **L1 (Score < 40)**: 正常放行。
- **L2 (40 <= Score < 80)**: 警告/建议 MFA。
- **L3 (Score >= 80)**: **直接拦截** (拒绝访问)。

**应急响应 (人工确认):**
若需临时放行被误拦的 IP，管理员可调用临时白名单接口：
```bash
curl -X POST http://127.0.0.1:3006/orasrs/v1/whitelist/temp \
  -H "Content-Type: application/json" \
  -d '{"ip":"1.2.3.4", "duration":300}'
```
此操作将允许该 IP 在 5 分钟内绕过 HVAP 拦截。

### 🛡️ OraSRS IoT Shield (物联网护盾)

对于无法修改固件的摄像头、传感器等设备，OraSRS 提供"透明清洗层"方案：
- **原理**: 在网关部署 OraSRS + Nginx，实行"先查询后放行"。
- **效果**: 隐藏服务入口，利用全球威胁情报保护终端安全。
- **文档**: [查看详细配置指南](IOT_SHIELD.md)

### 方式 3: 手动安装 (Docker)

## 🔐 ChainMaker 合约 / ChainMaker Contract
- [ChainMaker 合约代码 / ChainMaker Contract Code](chainmaker-contract/sracontract/sracontract.go)
- [威胁情报扩展 / Threat Intelligence Extensions](chainmaker-contract/sracontract/extra_methods.go)
- [安全测试代码 / Security Test Code](chainmaker-contract/security_test.go)
- [安全测试报告 / Security Test Report](CHAINMAKER_CONTRACT_SECURITY_REPORT.md)
- [合约创建总结 / Contract Creation Summary](CHAINMAKER_CONTRACT_SUMMARY.md)
- [构建测试脚本 / Build and Test Script](build-and-test.sh)

## 🧪 性能测试 / Performance Testing
- [一键性能测试脚本 / One-Click Performance Test Script](run-performance-test.sh)
- [IP性能测试脚本 / IP Performance Test Script](test-ip-performance-advanced.js)
- [精度和抗女巫测试脚本 / Precision and Sybil Resistance Test Script](precision-sybil-test.js) - 精度/召回率和抗女巫攻击能力测试
- [经济模型仿真脚本 / Economic Model Simulation Script](economic-simulation.js) - 代币经济学和攻击成本收益分析
- [性能测试报告 / Performance Test Report](oraSRS-client-performance-report.json)
- [性能测试指南 / Performance Test Guide](PERFORMANCE_TEST_GUIDE.md)

## 🔒 安全说明 / Security Notes
为了安全考虑，系统实施了以下保护措施：
- **速率限制**: 每个IP每秒最多20个请求 (`limit_req_zone $binary_remote_addr zone=rpc_limit:10m rate=20r/s;`)
- **连接限制**: 每个IP最多10个并发连接 (`limit_conn_zone $binary_remote_addr zone=addr_limit:10m;`)
- **去重逻辑**: 防止重复威胁报告的时间窗口机制
- **威胁情报验证**: 所有威胁情报需经共识层验证
- **国密算法**: 使用SM2/SM3/SM4算法确保数据安全
- **三层架构**: 边缘层快速检测 + 共识层验证 + 智能层威胁聚合
- **注**: 日志里使用的都是模拟ip，云测试日志因为网络宽带，反代限制，WAF等的问题可能有一些偏差。

## 📊 测试日志 / Test Logs
标准的测试日志已保存在 `logs/` 目录中，供审稿人审查：
- [性能测试日志 / Performance Test Log](logs/sample-performance-test.log)
- [访问日志样本 / Access Log Sample](logs/sample-access.log)

## 🤖 SecurityRiskAssessment Agent
- [Agent 架构设计 / Agent Architecture Design](SRA-agent/agent-architecture.md)
- [使用指南 / Usage Guide](SRA-agent/USAGE.md)
- [源代码 / Source Code](SRA-agent/src/)
- [配置示例 / Configuration Examples](SRA-agent/config.example.toml)

## 💻 OraSRS 轻量级客户端 / OraSRS Lite Client
OraSRS轻量级客户端是一个基于Tauri框架（Rust + 前端）构建的桌面应用，专为资源受限环境设计，具有以下特性：
- **增量更新** - 仅同步最新威胁情报，减少网络流量和存储占用
- **TTL过期淘汰** - 自动清理过期威胁数据，防止规则库无限膨胀
- **静默模式** - 默认静默运行，仅在高危威胁时弹窗提醒
- **跨平台支持** - 支持Windows、macOS和Linux桌面系统
- **OpenWrt集成** - 提供128MB内存路由器的精简模块
- **Nginx集成** - 支持在Web服务器层面进行威胁过滤

### 快速启动 / Quick Start
```bash
# 克隆仓库
git clone https://github.com/srs-protocol/orasrs-protocol.git
cd orasrs-protocol/orasrs-lite-client

# 安装依赖
npm install

# 启动开发模式
npm run tauri dev

# 构建发布版本
npm run tauri build
```

### 功能特性 / Features
- **威胁情报订阅** - 实时同步区块链上的威胁情报
- **自动阻断** - 根据威胁等级自动阻断恶意IP
- **日志自动标记** - 自动为日志库中的IP标记威胁等级
- **Nginx集成** - 提供Nginx threat-check模块
- **OpenWrt支持** - 专为路由器优化的轻量级实现

## 🧩 客户端库 / Client Libraries
- [客户端实现指南 / Client Implementation Guide](CLIENT_IMPLEMENTATION_GUIDE.md)
- Node.js: `npm install @SRA-client`
- Python: `pip install SRA-client`

## 🌐 使用场景 / Use Cases
- 边缘防火墙（pfSense, OPNsense）/ Edge Firewalls (pfSense, OPNsense)
- Web 应用防火墙（WAF）/ Web Application Firewalls (WAF)
- IoT/工业控制系统 / IoT/Industrial Control Systems
- 去中心化网络节点（Web3）/ Decentralized Network Nodes (Web3)
- 政务链、工业链、金融链风险评估 / Government chains, industrial chains, financial chain risk assessment

## 🛡️ 安全与隐私 / Security and Privacy
- IP 匿名化处理 / IP Anonymization Processing
- 不收集原始日志 / No Raw Log Collection
- 公共服务豁免机制 / Public Service Exemption Mechanism
- 国密算法加密 / Chinese National Cryptography Encryption
- 抗量子算法支持 / Post-Quantum Algorithm Support
- 混合加密方案 / Hybrid Encryption Schemes
- 数据不出境（中国大陆）/ Data Does Not Leave (Mainland China)
- 威胁情报去重机制 / Threat Intelligence Deduplication Mechanism
- 三层架构威胁验证 / Three-Tier Threat Verification

## 🤝 贡献与社区 / Contribution and Community
- 提问或建议：[GitHub Discussions](https://github.com/SRS协议/SRA-protocol/discussions)
- Ask questions or make suggestions: [GitHub Discussions](https://github.com/SRS协议/SRA-protocol/discussions)

## 🛡️ 商标声明 / Trademark Statement
"SecurityRiskAssessment" and "Open & Advisory Risk Scoring Service" are trademarks of SecurityRiskAssessment Protocol. 
You may use them only to refer to the official protocol. 
Modified implementations must use a different name.

## 🚀 启动SecurityRiskAssessment独立区块链网络 / Start SecurityRiskAssessment Standalone Blockchain Network

### 快速启动 / Quick Start
```bash
# 启动SecurityRiskAssessment区块链网络
./start-SRA-network.sh

# 查看网络状态
docker-compose ps

# 查看节点日志
docker-compose logs -f SRA-node-1
```

### 网络特性 / Network Features
- **无质押注册** - 任何节点都可以轻松加入网络，无需经济质押
- **三层架构** - 超轻量边缘代理 + 多链可信存证 + 威胁情报协调网络
- **国密支持** - 内置SM2/SM3/SM4国密算法支持
- **实时威胁同步** - 秒级全球威胁情报同步
- **合规设计** - 自动满足GDPR/CCPA/等保2.0合规要求
- **可扩展性** - 预留跨链接口，用户多时可接入跨链网络
- **P2P威胁共享** - 基于libp2p gossipsub的威胁情报共享网络

### API接口 / API Endpoints
- 节点1 API: `http://localhost:8081`
- 节点2 API: `http://localhost:8082` 
- 节点3 API: `http://localhost:8083`
- 监控面板: `http://localhost:3000` (admin/admin123)

### 智能合约方法 / Smart Contract Methods
- `registerNode` - 节点注册（无质押要求）
- `submitThreatReport` - 提交威胁报告
- `verifyThreatReport` - 验证威胁报告
- `getGlobalThreatList` - 获取全局威胁列表
- `updateReputation` - 更新节点声誉
- `submitThreatIntel` - 提交威胁情报
- `getThreatIntel` - 获取威胁情报
- `updateThreatScore` - 更新威胁评分

## 🛠️ 启动OraSRS私有链 (Hardhat+Geth) / Start OraSRS Private Chain (Hardhat+Geth)

### 快速启动 / Quick Start
```bash
# 启动OraSRS基于Hardhat和Geth的私有链
./start-orasrs-chain.sh

# 区块链节点信息
RPC端点: http://localhost:8545
Chain ID: 8888
```

### 网络特性 / Network Features
- **开发环境** - 专为开发和测试设计的私有链
- **快速出块** - 1秒一个块，提高开发效率
- **兼容以太坊** - 完全兼容以太坊工具链
- **api.orasrs.net** - 在开发环境中，api.orasrs.net指向本地Hardhat节点
- **智能合约** - 支持OraSRS协议的全部智能合约功能

### API接口 / API Endpoints
- **RPC端点**: `http://localhost:8545` (本地开发)
- **公网API端点**: `https://api.OraSRS.net` (通过反向代理访问本地Hardhat节点)
- **Chain ID**: `8888`
- **监控**: 通过RPC端点进行

### 开发说明 / Development Notes
- `api.OraSRS.net` 通过反向代理将请求转发到本地Hardhat节点
- 所有智能合约都可以通过公网API访问
- 已部署的合约:
  - **IPRiskCalculator**: `0x0165878A594ca255338adfa4d48449f69242Eb8F`
  - **ThreatStats**: `0xa513E6E4b8f2a923D98304ec87F64353C4D5C853`
  - **OraSRSReader**: `0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6`
  - **ThreatIntelligenceCoordination**: `0x5FC8d32690cc91D4c39d9d3abcBD16989F875707`
  - **OraSRSToken (ORA)**: `0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1`
  - **FaucetUpgradeable**: `0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE`
  - **OraSRSGovernance**: `0x3Aa5ebB10DC797CAC828524e59A333d0A371443c`
  - **NodeRegistry**: `0xc6e7DF5E7b4f2A278906862b61205850344D4e7d`
  - **SimpleSecurityActionContract**: `0x59b670e9fA9D0A427751Af201D676719a970857b`
- 开发者可以使用标准以太坊工具与该链交互

### 合约注册表 (Contract Registry)
为了解决开发过程中合约地址频繁变化的问题，我们引入了 **Contract Registry**。
- **固定地址**: `0x5FbDB2315678afecb367f032d93F642f64180aa3` (本地测试Hardhat环境)
- **功能**: 客户端只需连接此固定地址，即可查询所有其他合约的最新地址。
- **使用方法**:
  1. 启动本地节点: `npx hardhat node`
  2. 部署合约: `npx hardhat run deploy/deploy-registry-and-all.js --network localhost`
  3. 客户端自动通过注册表解析合约地址，无需手动配置。

## ⚠️ 测试阶段免责声明

**OraSRS 协议及其客户端目前处于 Beta 测试阶段。**

### 功能限制
- **出站审查模块** (Egress Inspection) 默认运行在"监控模式 (Monitor Mode)"
- 不会实际阻断网络连接，除非用户手动在配置中开启"强制模式 (Enforce Mode)"
- 详细设计请参阅 [出站保护设计文档](EGRESS_PROTECTION_DESIGN.md)

### 风险提示
开启内核级熔断 (eBPF) 可能会在特定的内核版本或网络环境下导致：
- 系统不稳定
- 网络延迟增加
- 业务中断
- 误拦截合法流量

### 责任豁免
开发者不对因使用本软件（包括但不限于误拦截、系统崩溃、数据丢失）造成的任何直接或间接损失承担责任。

**用户应在非生产环境中充分测试后再行部署。**

### 治理权
在测试期间，为了维护网络安全，开发者保留以下权利：

#### 日常维护权限（24 小时时间锁）
- 修改评分算法参数
- 升级合约逻辑
- 移除误报的风控 IP
- 版本迭代

#### 紧急权限（立即生效）
- 暂停协议运行
- 冻结特定功能
- 紧急数据恢复

**所有开发者操作均记录在链上，可公开审计。**

### 测试期配置
```yaml
# 默认配置
egress_protection:
  enabled: true
  mode: "monitor"  # 仅记录，不阻断
  max_block_duration: 3600  # 最长封禁 1 小时
```

### 如何参与测试
1. 在非生产环境部署
2. 启用审计日志记录
3. 报告误报和 Bug 到 [GitHub Issues](https://github.com/srs-protocol/OraSRS-protocol/issues)
4. 参与社区讨论和改进建议

## 📄 许可证 / License
本项目采用 [Apache License 2.0](LICENSE) 开源。
This project is open source under the [Apache License 2.0](LICENSE).
