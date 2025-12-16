# OraSRS协议实验框架与测试结果

## 概述

本目录包含OraSRS（Oracle Security Root Service）协议的完整实验框架、测试脚本和实验结果。所有内容均符合《Journal of Cybersecurity》期刊标准。

## 文件结构

### LaTeX文档
- `orasrs-paper.tex` - 主论文
- `experimental-methods.tex` - 完整实验Methods部分
- `experimental-framework.tex` - 符合期刊标准的实验框架
- `experiment-report.tex` - 完整实验报告
- `test-results-summary.tex` - 测试结果汇总
- `performance-results-10k.tex` - 10000 IP性能测试结果
- `online-contract-test-results.tex` - 云端合约查询测试结果
- `performance-summary.tex` - 性能测试总结
- `scalability-analysis.tex` - 可扩展性分析
- `orasrs-paper-toc.tex` - 论文目录

### 测试脚本
- `performance-test-10k-ips.js` - 本地10000 IP性能测试
- `online-test-1k-ips-contract-fixed.js` - 云端合约查询测试
- `validate-experimental-scripts.sh` - 实验验证脚本
- `test-experimental-integration.sh` - 整合验证脚本

### 测试日志 (在 logs/ 目录)
- `performance-test-10k-ips-summary-*.json` - 本地性能测试摘要
- `online-test-1k-ips-contract-summary-*.json` - 云端测试摘要
- `performance-test-10k-ips-*.json` - 本地性能测试完整日志
- `online-test-1k-ips-contract-*.json` - 云端测试完整日志

## 实验结果摘要

### 本地性能测试
- **测试规模**: 10,000 IP
- **平均处理时间**: 0.0334ms/IP
- **吞吐量**: 29,940.12 RPS
- **成功率**: 100%

### 云端合约查询测试
- **测试规模**: 1,000 IP
- **平均处理时间**: 102.44ms/IP
- **吞吐量**: 9.76 RPS
- **成功率**: 100%

### 实验验证结果
- **有效性验证**: 本地测试显示28,735.63 RPS处理能力，召回率>98%
- **隐私保护验证**: 实现数据最小化和IP匿名化
- **韧性验证**: 三层架构提供高可用性
- **开销验证**: 延迟<150ms，符合要求

## 隐私保护措施
1. 数据最小化原则
2. IP地址哈希处理
3. 国密算法(SM2/SM3/SM4)加密
4. 公共服务自动豁免机制

## 可扩展性分析
- 理论100,000 IP处理时间: 约2.85小时
- 轻量级节点内存占用: <5MB
- 支持联邦学习机制

## 完整实验Methods
包含以下实验设计要素：
- 网络拓扑配置 (边缘/IoT, 企业LAN, Web微服务)
- 节点角色定义 (生产者/顾问/消费者/治理者)
- 基线对比 (集中式TIP, 联邦TIP, 直接黑名单)
- 实验阶段 (校准, 常规操作, 对抗压力, 波动, 治理)
- 指标体系 (检测, 运营, 隐私, 韧性, 人工效用)
- 部署配置 (Docker Compose, 策略文件, 建议模式)
- 实验脚本 (遥测生成, 指标提取, 风险评分, 消费, 对抗, 指标计算, 编排)
- 可复现性保障 (固定随机种子、版本化制品等)

## 复现说明
所有实验均可通过以下步骤复现:
1. 安装Node.js环境
2. 运行对应的测试脚本
3. 查看logs目录中的测试结果
4. 编译LaTeX文档生成报告
5. 参考validate-experimental-scripts.sh进行完整验证

## 许可证
MIT License - 详见主项目目录