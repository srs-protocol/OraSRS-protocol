# OraSRS Protocol (Oracle Security Root Service)
> 一种隐私优先、联邦学习驱动、三层共识架构的安全决策协议。

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![GitHub Discussions](https://img.shields.io/github/discussions/SRS协议/orasrs-protocol)](https://github.com/SRS协议/orasrs-protocol/discussions)

## 🔍 什么是 OraSRS？
OraSRS 是一种轻量、去中心化的安全决策协议。它允许网络设备在面临未知流量时，通过查询权威服务获取风险评估建议，辅助本地策略执行。

> ⚠️ **核心原则**：  
> OraSRS 是 **咨询式服务**（Advisory），不直接阻断流量。最终决策权始终保留在客户端。

## ✨ 增强功能
- **三层共识架构**: 全局根网络层 + 分区共识层 + 边缘缓存层
- **质押与声誉系统**: 最小质押门槛 ≥ 10,000 ORA，动态声誉评分
- **BFT 共识算法**: 支持 Tendermint Core 或 HotStuff，容错 ≤ 6 个恶意节点（21节点网络）
- **国产化支持**: 支持国密算法（SM2/SM3/SM4），适配长安链、FISCO BCOS
- **合规治理**: 企业实名认证、区块链备案、技术委员会治理

## 📚 协议规范
- [v0.1 规范文档](SRS_PROTOCOL_SPEC.md)（中文/英文）
- [共识参数白皮书](CONSENSUS_PARAMETERS_WHITEPAPER.md)
- [国密算法集成指南](SM_CRYPTO_INTEGRATION.md)
- [设计哲学](docs/design.md)
- [应用指南](APPLICATION_GUIDE.md)
- [API 接口](api.md)

## 🧩 智能合约
- [国密版质押合约](contracts/orasrs-staking-gm.sol)
- [国密算法库](contracts/libs/GmSupport.sol)

## 🔒 安全测试
- [安全测试指南](SECURITY_TESTING_GUIDE.md)
- [安全测试脚本](test-security.sh)
- [安全测试合约](test/orasrs-security.t.sol)
- [安全配置文件](security-config.json)
- [安全分析报告](SECURITY_ANALYSIS_REPORT.md)

## 🚀 部署方案
- [长安链部署技术方案](CHAINMAKER_DEPLOYMENT_PLAN.md)
- [ChainMaker 迁移指南](CHAINMAKER_MIGRATION_GUIDE.md)
- [ChainMaker 安全测试](CHAINMAKER_SECURITY_TESTING.md)

## 🔐 ChainMaker 合约
- [ChainMaker 合约代码](chainmaker-contract/orasrs_staking.go)
- [安全测试代码](chainmaker-contract/security_test.go)
- [安全测试报告](CHAINMAKER_CONTRACT_SECURITY_REPORT.md)
- [合约创建总结](CHAINMAKER_CONTRACT_SUMMARY.md)
- [构建测试脚本](build-and-test.sh)

## 🧩 客户端库
- [客户端实现指南](CLIENT_IMPLEMENTATION_GUIDE.md)
- Node.js: `npm install @orasrs-client`
- Python: `pip install orasrs-client`

## 🌐 使用场景
- 边缘防火墙（pfSense, OPNsense）
- Web 应用防火墙（WAF）
- IoT/工业控制系统
- 去中心化网络节点（Web3）
- 政务链、工业链、金融链风险评估

## 🛡️ 安全与隐私
- IP 匿名化处理
- 不收集原始日志
- 公共服务豁免机制
- 国密算法加密
- 数据不出境（中国大陆）

## 🤝 贡献与社区
- 提问或建议：[GitHub Discussions](https://github.com/SRS协议/orasrs-protocol/discussions)
- 提交 PR 或 Issue
- 加入 Telegram 社区（待建）

## 🛡️ 商标声明
"OraSRS" and "Open & Advisory Risk Scoring Service" are trademarks of OraSRS Protocol. 
You may use them only to refer to the official protocol. 
Modified implementations must use a different name.

## 📄 许可证
本项目采用 [Apache License 2.0](LICENSE) 开源。