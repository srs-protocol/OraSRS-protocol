# Academic & Performance

> 🇨🇳 **中文用户：[点击这里查看中文文档 (Chinese Documentation)](./06-academic-perf_zh-CN.md)**

## 📚 Academic Publications

The core protocol design of this project is based on an academic paper (**Preprint Released**):

**Title**: *OraSRS: A Compliant and Lightweight Decentralized Threat Intelligence Protocol with Time-Bounded Risk Enforcement*

**Author**: Luo ZiQian [![ORCID](https://img.shields.io/badge/ORCID-0009--0008--8644--8717-green)](https://orcid.org/0009-0008-8644-8717)

**Status**: Preprint Released
**DOI**: [10.31224/5985](https://doi.org/10.31224/5985)
**Platform**: Engineering Archive

**Abstract**: This paper proposes a lightweight decentralized threat intelligence protocol. Through a "Risk Control First" mechanism, dynamic ban duration stacking, and local-blockchain collaborative decision-making, it achieves proactive defense against zero-day attacks. The protocol adopts a three-layer architecture (Edge, Consensus, Intelligence), supports SM algorithms, and meets GDPR/CCPA/MLPS 2.0 compliance requirements.

**Citation** (BibTeX):
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

## 📊 Performance Benchmark & Reproduction

To ensure transparency, we provide automated scripts to reproduce the above performance metrics. The following data is based on v2.1.0:

**1. Run Benchmark Scripts**:
```bash
# Full Client & Python Agent Test
./benchmark-kernel-acceleration.sh

# Native C Agent Memory Verification
./verify-native-agent.sh
```

**2. Test Log Summary (2025-12-17 v3.2.0)**:

**A. Full Management Node (Full Client - Node.js)**
```
Full Client PID: 721026
Full Client Memory (RSS): 42.45 MB
✅ Full Mode: PASS (< 100MB)
```

**B. Hybrid Mode Agent (Hybrid Agent - Python)**
```
Hybrid Client PID: 720993
Hybrid Client Memory (RSS): 9.13 MB
✅ Hybrid Mode: PASS (< 30MB)
```

**C. Native Edge Agent (Edge Agent - Shell/nftables)**
```
Edge Client PID: 720928
Edge Client Memory (RSS): 3.88 MB
✅ Edge Mode: PASS (< 5MB)
```

> **Conclusion**: The Native C Agent (1.25 MB) successfully meets the "< 5MB" resource constraint requirement mentioned in the paper.

**🔗 Related File Links**:

| File | Description | Link |
|------|-------------|------|
| `benchmark-kernel-acceleration.sh` | Comprehensive Performance Benchmark Script | [View Source](../benchmark-kernel-acceleration.sh) |
| `verify-native-agent.sh` | Native Agent Memory Verification Script | [View Source](../test/verify-native-agent.sh) |
| `src/agent/native_edge_agent.c` | Native Agent C Source | [View Source](../src/agent/native_edge_agent.c) |
| `orasrs-edge-agent.py` | Python Lightweight Agent Source | [View Source](../src/agent/orasrs-edge-agent.py) |
| `docs/MEMORY_USAGE_EXPLANATION.md` | Detailed Memory Analysis Report | [View Doc](MEMORY_USAGE_EXPLANATION.md) |

### PoC Defense Report

We conducted an extreme stress test on the OpenWrt client, successfully mitigating 17 million DDoS attacks.

👉 [Read Full Report](performance/PoC_DEFENSE_REPORT.md)

---

## 🎯 Benchmark Standard for Researchers

### Reference Benchmark Script

We encourage researchers and implementers to use our standardized benchmark script as a **comparison baseline** for DTSP implementations:

```bash
./benchmark-kernel-acceleration.sh
```

### Why Use This Benchmark?

1. **Reproducibility**: Standardized test methodology
2. **Comparability**: Common baseline for performance claims
3. **Transparency**: Open-source, auditable test procedures
4. **Real-world**: Tests actual threat detection scenarios

### Benchmark Metrics

The reference benchmark measures:

| Metric | Target | Reference Result (v3.3.6) |
|--------|--------|---------------------------|
| **API Latency (P95)** | < 50ms | 19-24ms ✅ |
| **eBPF Query Time** | < 0.04ms | 0.001ms ✅ (40x better) |
| **Throughput (Concurrent 10-50)** | > 1000 req/s | 1162 req/s ✅ |
| **Memory Usage (1500 threats)** | < 50MB | 25.45 MB ✅ |
| **Stress Test Success Rate** | 100% | 100% (38,766 requests) ✅ |

### How to Compare Your Implementation

If you're implementing DTSP or a similar protocol, please:

1. **Run the benchmark** on comparable hardware
2. **Report all metrics** (not just favorable ones)
3. **Document your environment**:
   - CPU cores and model
   - Available RAM
   - Kernel version
   - eBPF support (yes/no)
4. **Include P50, P95, P99 latencies** (not just averages)
5. **Test with same dataset size** (1500+ threat entries)
6. **Cite this work** if using our benchmark:

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

### Benchmark Comparison Template

When publishing results, we recommend this format:

```markdown
## Performance Comparison

| Implementation | API Latency | eBPF Query | Throughput | Memory |
|----------------|-------------|------------|------------|--------|
| OraSRS (baseline) | 24ms | 0.001ms | 1162 req/s | 25MB |
| Your Implementation | Xms | Xms | X req/s | XMB |

**Test Environment**: [Your specs]
**Dataset Size**: [Number of threats]
**Benchmark Script**: benchmark-kernel-acceleration.sh
```

### Latest Benchmark Report

📊 [View Latest Benchmark Results](performance/KERNEL_ACCELERATION_BENCHMARK.md) (2025-12-19)

---

## 🧪 Performance Testing Tools
- [Kernel Acceleration Benchmark Report](performance/KERNEL_ACCELERATION_BENCHMARK.md) - Latest benchmark results (2025-12-19)
- [One-Click Performance Test Script](../scripts/tools/run-performance-test.sh)
- [IP Performance Test Script](../test/test-ip-performance-advanced.js)
- [Precision and Sybil Test Script](../test/precision-sybil-test.js)
- [Economic Model Simulation Script](../economic-simulation.js)
- [Performance Test Report](../results/oraSRS-client-performance-report.json)
- [Performance Test Guide](performance/PERFORMANCE_TEST_GUIDE.md)
