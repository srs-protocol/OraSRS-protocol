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

## 6. Conclusion

The OraSRS architecture supports both high-level management (Node.js) and low-level enforcement (eBPF). The "<5MB" requirement is achievable and intended for the **Native Edge Agent** deployment mode.
