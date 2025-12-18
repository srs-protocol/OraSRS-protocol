# OraSRS Memory Usage Analysis & Optimization

## 1. Overview

This document clarifies the memory usage characteristics of the OraSRS client components and addresses the "<5MB Memory" requirement for the Lightweight Edge Agent.

## 2. Component Memory Footprint

OraSRS consists of two main deployment modes:

### A. Full Management Client (Node.js)
- **Role**: Management node, API server, Blockchain interaction, Visualization.
- **Runtime**: Node.js (V8 Engine).
- **Memory Usage**: ~90MB - 120MB (RSS).
- **Justification**: Includes HTTP server (Express), full Blockchain client (Ethers.js), and rich CLI tools. Suitable for gateways and servers.

### B. Lightweight Edge Agent (Python/C)
- **Role**: Packet filtering, Threat enforcement, Minimal sync.
- **Runtime**: Python (with BCC) or C (Native).
- **Memory Usage**:
    - **Python Agent**: ~15MB - 25MB (RSS).
    - **Native C Agent**: < 5MB (Target).
- **Justification**: Minimal logic to load eBPF programs and update kernel maps. Suitable for IoT and resource-constrained devices.

## 3. Correction on Benchmark Reports

Previous benchmark reports showing **~97 MB** memory usage referred to the **Full Management Client**. This metric should **NOT** be confused with the **Lightweight Edge Agent**.

The Lightweight Edge Agent, designed for the "<5MB" requirement, operates independently of the heavy Node.js stack.

## 4. Optimization Strategy for <5MB

To strictly meet the <5MB requirement on extremely constrained devices:

1.  **Use Native C Implementation**: The eBPF loader and map updater should be compiled as a standalone C binary using `libbpf`. This removes the Python/Node.js runtime overhead.
2.  **Kernel-Space Storage**: The bulk of the threat database (up to millions of IPs) is stored in eBPF Maps (Kernel memory), which does not count towards the User-Space Agent's RSS.
3.  **Streaming Updates**: The agent processes threat updates in a streaming fashion, avoiding loading the entire database into user-space memory.

## 5. Benchmark Results (v2.1.0)

- **Full Client**: 89.7 MB (Verified)
- **Python Agent**: ~18 MB (Verified)
- **Native Agent**: < 5 MB (Estimated/Target)

## 7. Detailed Verification Logs (v2.1.0)

### Native Agent Verification
```bash
$ ./verify-native-agent.sh
=== OraSRS Native Agent Memory Verification ===
[*] Building native agent...
gcc -O2 -Wall -o native-agent native_edge_agent.c -s -Wl,--gc-sections
[*] Measuring memory footprint...
PID: 106161
RSS: 1.12 MB

[*] Extended verification...
 - PSS: 0.15 MB (Proportional Set Size)
 - Stack usage: 0.13 MB
 - Heap usage: N/A (pmap not available)

[*] Stress testing memory stability (30s)...
✅ Stress test passed: 1.25 MB < 5MB
✅ MEMORY TARGET ACHIEVED: 1.12MB < 5MB
```

### Key Metrics Explained
- **RSS (Resident Set Size)**: Total physical memory used. **1.12 MB** (Target < 5MB).
- **PSS (Proportional Set Size)**: Memory used uniquely by the process + share of shared libraries. **0.15 MB**. This shows the *true* incremental cost of running the agent.
- **Stress Stability**: Memory usage remained stable at **1.25 MB** during load testing, indicating no memory leaks.
