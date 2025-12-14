# OraSRS (Oracle Security Root Service) - 最新版本

OraSRS (Oracle Security Root Service) 是一个咨询式风险评分服务，为 IP 和域名提供风险评估。OraSRS 与传统的威胁情报服务不同，它不直接阻断流量，而是提供风险评分供客户端参考。
注：客户端默认[可以自行修改辅助现有的安全软件判断]执行拦截，本地黑名单功能还在测试环节。客户端容易误报（正在优化）。对于这个项目刚刚起步可能有很多缺点，我都在优化
## 项目概述

OraSRS (Oracle Security Root Service) 是一个咨询式风险评分服务，为 IP 和域名提供风险评估。OraSRS 与传统的威胁情报服务不同，它不直接阻断流量，而是提供风险评分供客户端参考。

- **咨询式服务**：OraSRS 是信用报告机构（如 FICO），而不是法院。客户端自己决定是否采取行动。
- **透明性**：所有决策依据都对客户端透明。
- **可审计性**：所有评估过程可以追溯和审计。
- **合规性**：符合 GDPR、CCPA 和中国网络安全法要求。
- **区块链集成**：所有威胁情报记录在 OraSRS 协议链上，提供透明和不可篡改的验证机制。
- **三层架构**：边缘层、共识层、智能层的三层共识架构。

## 核心价值主张

1. **咨询式服务模型**：OraSRS 提供建议而非直接阻断命令
2. **多层次证据**：基于多源证据的风险评估
3. **透明可审计**：所有评估过程可追溯
4. **合规隐私**：严格遵守全球隐私法规
5. **声誉机制**：基于节点声誉的去中心化治理
6. **区块链验证**：通过长安链技术实现多方共识和验证
7. **去重逻辑**：防止重复威胁报告的时间窗口机制
8. **国密算法**：支持 SM2/SM3/SM4 国密算法

## 一键安装 (Linux)

使用以下命令一键安装 OraSRS Linux 客户端：

```bash
curl -fsSL https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/install-orasrs-client.sh | bash
```

或

```bash
wget -O - https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/install-orasrs-client.sh | bash
```

### 安装后管理命令

```bash
# 启动服务
sudo systemctl start orasrs-client

# 停止服务
sudo systemctl stop orasrs-client

# 重启服务
sudo systemctl restart orasrs-client

# 查看服务状态
sudo systemctl status orasrs-client

# 查看实时日志
sudo journalctl -u orasrs-client -f

# 健康检查
curl http://localhost:3006/health

# 风险查询示例
curl 'http://localhost:3006/orasrs/v1/query?ip=8.8.8.8'

# 威胁列表
curl http://localhost:3006/orasrs/v2/threat-list
```

## 浏览器扩展

我们还提供浏览器扩展插件，可直接从浏览器保护您的网络安全：

- 支持 Chrome 和 Firefox
- 实时威胁防护
- 基于 OraSRS 协议链的去中心化威胁情报
- 隐私保护设计

## ✨ 增强功能 / Enhanced Features
- **三层去中心化架构 / Three-Tier Decentralized Architecture**: 超轻量边缘代理 + 多链可信存证 + 威胁情报协调网络 / Ultra-lightweight Edge Agent + Multi-chain Trusted Evidence Storage + Threat Intelligence Coordination Network
- **轻量级质押机制**: 基于行为的动态声誉评分，无需经济质押 / Behavior-based dynamic reputation scoring, no economic staking required
- **BFT 共识算法 / BFT Consensus Algorithm**: 支持多链部署，区域化合规 / Multi-chain deployment support, regional compliance
- **国产化支持 / Localization Support**: 支持国密算法（SM2/SM3/SM4），适配长安链 / Supports Chinese national cryptography (SM2/SM3/SM4), compatible with ChainMaker
- **合规治理 / Compliance Governance**: 自动区域合规引擎，满足GDPR/CCPA/等保2.0 / Automatic regional compliance engine, compliant with GDPR/CCPA/Cybersecurity Protection Level 2.0
- **SecurityRiskAssessment v2.0 协调防御 / SecurityRiskAssessment v2.0 Coordinated Defense**: 全球轻量级主动防御协调框架 / Global Lightweight Proactive Defense Coordination Framework
- **SecurityRiskAssessment Agent**: 超轻量级威胁检测代理，< 5MB内存占用 / Ultra-lightweight threat detection agent with < 5MB memory footprint
- **简化的网络架构 / Simplified Network Architecture**: 移除了复杂的P2P设置，采用更高效的客户端-服务器模式 / Removed complex P2P setup,采用 more efficient client-server model

## 📚 协议规范 / Protocol Specifications
- [v0.1 规范文档 / v0.1 Specification Document](SRS_PROTOCOL_SPEC.md)（中文/英文 / Chinese/English）
- [SecurityRiskAssessment v2.0 威胁情报协议 / SecurityRiskAssessment v2.0 Threat Intelligence Protocol](OraSRS_v2.0_Threat_Intelligence_Protocol.md)（中英双语 / Chinese-English）
- [共识参数白皮书 / Consensus Parameters Whitepaper](CONSENSUS_PARAMETERS_WHITEPAPER.md)
- [国密算法集成指南 / SM Cryptography Integration Guide](SM_CRYPTO_INTEGRATION.md)
- [设计哲学 / Design Philosophy](docs/design.md)
- [应用指南 / Application Guide](APPLICATION_GUIDE.md)
- [API 接口 / API Interface](api.md)

## 🧩 智能合约 / Smart Contracts
- [威胁情报协调合约 / Threat Intelligence Coordination Contract](contracts/ThreatIntelligenceCoordination.sol)
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
-**注**：日志里使用的都是模拟ip，云测试日志因为网络宽带，反代限制，WAF等的问题可能有一些偏差。

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

## 📄 许可证 / License
本项目采用 [Apache License 2.0](LICENSE) 开源。
This project is open source under the [Apache License 2.0](LICENSE).
