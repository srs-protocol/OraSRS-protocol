# 学术与性能 / Academic & Performance

> 🇺🇸 **English Version: [Click here for the English Documentation](./06-academic-perf.md)**

## 📚 学术出版物 / Academic Publications

本项目的核心协议设计基于学术论文（**预印本已发布**）：

**论文标题**: *OraSRS: A Compliant and Lightweight Decentralized Threat Intelligence Protocol with Time-Bounded Risk Enforcement*

**作者**: Luo ZiQian [![ORCID](https://img.shields.io/badge/ORCID-0009--0008--8644--8717-green)](https://orcid.org/0009-0008-8644-8717)

**状态**: 预印本已发布  
**DOI**: [10.31224/5985](https://doi.org/10.31224/5985)  
**发布平台**: Engineering Archive

**摘要**: 本文提出了一种轻量级去中心化威胁情报协议，通过"先风控后查询"机制、动态封禁叠加和本地-链上协同决策，实现了对零日攻击的主动防御。协议采用三层架构（边缘层、共识层、智能层），支持国密算法，满足 GDPR/CCPA/等保 2.0 合规要求。

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

## 📊 性能基准测试与复现 / Performance Benchmark & Reproduction

为确保透明度，我们提供了自动化脚本以复现上述性能指标。以下是基于 v2.1.0 版本的实测数据：

**1. 运行基准测试脚本**:
```bash
# 完整客户端 & Python 代理测试
./benchmark-kernel-acceleration.sh

# 原生 C 代理内存验证
./verify-native-agent.sh
```

**2. 实测日志摘要 (2025-12-17 v3.2.0)**:

**A. 完整管理节点 (Full Client - Node.js)**
```
Full Client PID: 721026
Full Client Memory (RSS): 42.45 MB
✅ Full Mode: PASS (< 100MB)
```

**B. 混合模式代理 (Hybrid Agent - Python)**
```
Hybrid Client PID: 720993
Hybrid Client Memory (RSS): 9.13 MB
✅ Hybrid Mode: PASS (< 30MB)
```

**C. 原生边缘代理 (Edge Agent - Shell/nftables)**
```
Edge Client PID: 720928
Edge Client Memory (RSS): 3.88 MB
✅ Edge Mode: PASS (< 5MB)
```

> **结论**: 原生 C 代理 (1.25 MB) 成功满足论文中 "< 5MB" 的资源约束要求。

**🔗 相关文件链接**:

| 文件 | 说明 | 链接 |
|------|------|------|
| `benchmark-kernel-acceleration.sh` | 综合性能基准测试脚本 | [查看源码](../benchmark-kernel-acceleration.sh) |
| `verify-native-agent.sh` | 原生代理内存验证脚本 | [查看源码](../test/verify-native-agent.sh) |
| `src/agent/native_edge_agent.c` | 原生代理 C 源码 | [查看源码](../src/agent/native_edge_agent.c) |
| `orasrs-edge-agent.py` | Python 轻量代理源码 | [查看源码](../src/agent/orasrs-edge-agent.py) |
| `docs/MEMORY_USAGE_EXPLANATION.md` | 详细内存分析报告 | [查看文档](MEMORY_USAGE_EXPLANATION.md) |

### 实战防御报告 / PoC Defense Report

我们对 OpenWrt 客户端进行了极限压力测试，成功抵御了 1700万次 DDoS 攻击。

👉 [阅读完整报告 / Read Full Report](performance/PoC_DEFENSE_REPORT.md)

---

## 🎯 研究者基准测试标准 / Benchmark Standard for Researchers

### 参考基准测试脚本 / Reference Benchmark Script

我们鼓励研究者和实现者使用我们的标准化基准测试脚本作为 DTSP 实现的**对比基线**:

```bash
./benchmark-kernel-acceleration.sh
```

### 为什么使用此基准测试? / Why Use This Benchmark?

1. **可重现性**: 标准化测试方法
2. **可比较性**: 性能声明的通用基线
3. **透明性**: 开源、可审计的测试程序
4. **真实场景**: 测试实际威胁检测场景

### 基准测试指标 / Benchmark Metrics

参考基准测试测量以下指标:

| 指标 | 目标 | 参考结果 (v3.3.6) |
|------|------|-------------------|
| **API 延迟 (P95)** | < 50ms | 19-24ms ✅ |
| **eBPF 查询时间** | < 0.04ms | 0.001ms ✅ (优于目标 40 倍) |
| **吞吐量 (并发 10-50)** | > 1000 req/s | 1162 req/s ✅ |
| **内存占用 (1500 威胁)** | < 50MB | 25.45 MB ✅ |
| **压力测试成功率** | 100% | 100% (38,766 请求) ✅ |

### 如何对比您的实现 / How to Compare Your Implementation

如果您正在实现 DTSP 或类似协议，请:

1. **在可比硬件上运行基准测试**
2. **报告所有指标** (不只是有利的指标)
3. **记录您的环境**:
   - CPU 核心数和型号
   - 可用内存
   - 内核版本
   - eBPF 支持 (是/否)
4. **包含 P50, P95, P99 延迟** (不只是平均值)
5. **使用相同数据集大小测试** (1500+ 威胁条目)
6. **如果使用我们的基准测试，请引用此工作**:

```bibtex
@article{luo2025orasrs,
  title={OraSRS: A Compliant and Lightweight Decentralized Threat Intelligence Protocol with Time-Bounded Risk Enforcement},
  author={Luo, ZiQian},
  year={2025},
  doi={10.31224/5985},
  url={https://doi.org/10.31224/5985},
  publisher={Engineering Archive}
}
```

### 基准测试对比模板 / Benchmark Comparison Template

发布结果时，我们推荐使用此格式:

```markdown
## 性能对比 / Performance Comparison

| 实现 | API 延迟 | eBPF 查询 | 吞吐量 | 内存 |
|------|----------|-----------|--------|------|
| OraSRS (基线) | 24ms | 0.001ms | 1162 req/s | 25MB |
| 您的实现 | Xms | Xms | X req/s | XMB |

**测试环境**: [您的规格]
**数据集大小**: [威胁数量]
**基准测试脚本**: benchmark-kernel-acceleration.sh
```

### 最新基准测试报告 / Latest Benchmark Report

📊 [查看最新基准测试结果](performance/KERNEL_ACCELERATION_BENCHMARK.md) (2025-12-19)

---

## 🧪 性能测试工具 / Performance Testing Tools
- [内核加速性能基准测试报告](performance/KERNEL_ACCELERATION_BENCHMARK.md) - 最新基准测试结果 (2025-12-19)
- [一键性能测试脚本](../scripts/tools/run-performance-test.sh)
- [IP性能测试脚本](../test/test-ip-performance-advanced.js)
- [精度和抗女巫测试脚本](../test/precision-sybil-test.js)
- [经济模型仿真脚本](../economic-simulation.js)
- [性能测试报告](../results/oraSRS-client-performance-report.json)
- [性能测试指南](performance/PERFORMANCE_TEST_GUIDE.md)
