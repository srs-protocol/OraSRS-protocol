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

## 🧪 Performance Testing Tools
- [One-Click Performance Test Script](../scripts/tools/run-performance-test.sh)
- [IP Performance Test Script](../test/test-ip-performance-advanced.js)
- [Precision and Sybil Test Script](../test/precision-sybil-test.js)
- [Economic Model Simulation Script](../economic-simulation.js)
- [Performance Test Report](../results/oraSRS-client-performance-report.json)
- [Performance Test Guide](performance/PERFORMANCE_TEST_GUIDE.md)
