# Decentralized Threat Signaling Protocol (DTSP) Specification

[![DOI](https://img.shields.io/badge/DOI-10.31224%2F5985-blue)](https://doi.org/10.31224/5985)
[![IETF Draft](https://img.shields.io/badge/IETF-Active_Draft-blue)](https://datatracker.ietf.org/doc/draft-luo-orasrs-decentralized-threat-signaling/00/)

> **Academic Citation**: Luo, Z. (2025). *OraSRS: A Compliant and Lightweight Decentralized Threat Intelligence Protocol with Time-Bounded Risk Enforcement.* Engineering Archive. https://doi.org/10.31224/5985

---

## Abstract

The Decentralized Threat Signaling Protocol (DTSP) defines a layered architecture (T0-T3) for threat detection, verification, and response in resource-constrained environments. This specification describes the communication logic between layers, signaling formats, and cryptographic verification mechanisms.

## Table of Contents

1. [Introduction](#1-introduction)
2. [Architecture Overview](#2-architecture-overview)
3. [T0-T3 Layer Communication](#3-t0-t3-layer-communication)
4. [DTSP Signaling Format](#4-dtsp-signaling-format)
5. [Merkle Tree Verification](#5-merkle-tree-verification)
6. [Security Considerations](#6-security-considerations)
7. [Implementation Guidelines](#7-implementation-guidelines)

---

## 1. Introduction

### 1.1 Purpose

DTSP provides a standardized protocol for:
- **Local threat detection** (T0) without external dependencies
- **Distributed threat intelligence sharing** (T2) across nodes
- **Consensus-based threat verification** (T3) using blockchain
- **Efficient data synchronization** using Merkle Trees

### 1.2 Design Principles

1. **Survivability First**: T0 must function independently
2. **Progressive Enhancement**: T2/T3 are optional layers
3. **Resource Efficiency**: Optimized for 512MB devices
4. **Cryptographic Verifiability**: All threat data is verifiable

---

## 2. Architecture Overview

### 2.1 Layer Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│  T3: Global Consensus (Blockchain)                      │
│  - Immutable threat records                             │
│  - Multi-node verification                              │
│  - Merkle root storage                                  │
└─────────────────────────────────────────────────────────┘
                          ▲
                          │ (Optional)
                          │
┌─────────────────────────────────────────────────────────┐
│  T2: Distribution Layer (P2P Network)                   │
│  - Threat intelligence synchronization                  │
│  - Peer-to-peer gossip protocol                         │
│  - Regional compliance routing                          │
└─────────────────────────────────────────────────────────┘
                          ▲
                          │ (Optional)
                          │
┌─────────────────────────────────────────────────────────┐
│  T1: Local Intelligence (User Space)                    │
│  - Threat data aggregation                              │
│  - Local cache management                               │
│  - API endpoints                                        │
└─────────────────────────────────────────────────────────┘
                          ▲
                          │ (Always Active)
                          │
┌─────────────────────────────────────────────────────────┐
│  T0: Kernel Enforcement (eBPF/Netfilter)                │
│  - Packet filtering                                     │
│  - Connection tracking                                  │
│  - Rate limiting                                        │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Layer Responsibilities

| Layer | Function | Dependency | Resource |
|-------|----------|------------|----------|
| T0 | Kernel-level enforcement | None | < 5 MB |
| T1 | Local threat intelligence | T0 | < 30 MB |
| T2 | P2P threat distribution | T0, T1 | < 100 MB |
| T3 | Blockchain consensus | T0, T1, T2 | Variable |

---

## 3. T0-T3 Layer Communication

### 3.1 T0 ↔ T1 Communication

**Protocol**: Shared memory / eBPF maps

**T0 → T1 (Threat Events)**:
```c
struct threat_event {
    __u32 src_ip;           // Source IP address
    __u16 src_port;         // Source port
    __u8  threat_level;     // 0-100 risk score
    __u64 timestamp;        // Event timestamp
    __u32 packet_count;     // Packets in time window
    __u8  action;           // 0=allow, 1=block, 2=challenge
};
```

**T1 → T0 (Policy Updates)**:
```c
struct policy_update {
    __u32 ip_address;       // Target IP
    __u8  action;           // Action to take
    __u32 duration;         // Ban duration (seconds)
    __u64 expires_at;       // Expiration timestamp
};
```

**Communication Flow**:
1. T0 detects suspicious traffic pattern
2. T0 writes `threat_event` to eBPF map
3. T1 reads events from map (polling or ring buffer)
4. T1 queries T2/T3 for threat intelligence
5. T1 writes `policy_update` back to T0
6. T0 enforces policy at kernel level

---

### 3.2 T1 ↔ T2 Communication

**Protocol**: HTTP/HTTPS REST API or gRPC

**Threat Query Request** (T1 → T2):
```json
{
  "version": "1.0",
  "query_type": "threat_lookup",
  "indicators": [
    {
      "type": "ipv4",
      "value": "192.0.2.1"
    }
  ],
  "requester_id": "node-abc123",
  "timestamp": "2025-12-19T03:00:00Z"
}
```

**Threat Query Response** (T2 → T1):
```json
{
  "version": "1.0",
  "query_id": "q-xyz789",
  "results": [
    {
      "indicator": "192.0.2.1",
      "risk_score": 85,
      "threat_types": ["ddos_bot", "scanner"],
      "first_seen": "2025-12-18T10:00:00Z",
      "last_seen": "2025-12-19T02:30:00Z",
      "confidence": 0.92,
      "sources": ["node-def456", "node-ghi789"],
      "merkle_proof": "0x1a2b3c..."
    }
  ],
  "timestamp": "2025-12-19T03:00:01Z"
}
```

**Threat Report Submission** (T1 → T2):
```json
{
  "version": "1.0",
  "report_type": "new_threat",
  "indicator": {
    "type": "ipv4",
    "value": "192.0.2.1"
  },
  "threat_data": {
    "threat_type": "syn_flood",
    "severity": "high",
    "packet_count": 10000,
    "duration": 300,
    "evidence_hash": "sha256:abc123..."
  },
  "reporter_id": "node-abc123",
  "signature": "0x4d5e6f...",
  "timestamp": "2025-12-19T03:00:00Z"
}
```

---

### 3.3 T2 ↔ T3 Communication

**Protocol**: Blockchain RPC (JSON-RPC 2.0)

**Submit Threat to Blockchain** (T2 → T3):
```json
{
  "jsonrpc": "2.0",
  "method": "threat_submit",
  "params": {
    "threat_id": "threat_192.0.2.1_1734573600",
    "ip_address": "192.0.2.1",
    "risk_score": 85,
    "threat_type": 0,
    "evidence_hash": "0x1a2b3c4d...",
    "reporter": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "signature": "0x4d5e6f7g...",
    "merkle_root": "0x9a8b7c6d..."
  },
  "id": 1
}
```

**Query Blockchain for Threat** (T2 → T3):
```json
{
  "jsonrpc": "2.0",
  "method": "threat_query",
  "params": {
    "ip_address": "192.0.2.1"
  },
  "id": 2
}
```

**Blockchain Response**:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "exists": true,
    "threat_id": "threat_192.0.2.1_1734573600",
    "risk_score": 85,
    "verification_count": 5,
    "block_number": 12345,
    "merkle_root": "0x9a8b7c6d...",
    "timestamp": 1734573600
  },
  "id": 2
}
```

---

## 4. DTSP Signaling Format

### 4.1 Message Structure

All DTSP messages follow this base structure:

```json
{
  "dtsp_version": "1.0",
  "message_type": "threat_signal|query|response|update",
  "message_id": "uuid-v4",
  "timestamp": "ISO8601",
  "sender": {
    "node_id": "string",
    "public_key": "hex",
    "signature": "hex"
  },
  "payload": {},
  "metadata": {}
}
```

### 4.2 Threat Signal Message

```json
{
  "dtsp_version": "1.0",
  "message_type": "threat_signal",
  "message_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-19T03:00:00Z",
  "sender": {
    "node_id": "node-abc123",
    "public_key": "0x04a1b2c3...",
    "signature": "0x1a2b3c4d..."
  },
  "payload": {
    "threat": {
      "indicator_type": "ipv4",
      "indicator_value": "192.0.2.1",
      "risk_score": 85,
      "threat_types": ["ddos_bot"],
      "evidence": {
        "packet_count": 10000,
        "syn_ratio": 0.95,
        "duration_seconds": 300,
        "target_ports": [80, 443]
      },
      "evidence_hash": "sha256:abc123...",
      "first_observed": "2025-12-19T02:55:00Z"
    },
    "action_recommended": "block",
    "confidence": 0.92,
    "ttl": 86400
  },
  "metadata": {
    "region": "us-west",
    "compliance_tags": ["gdpr"],
    "priority": "high"
  }
}
```

### 4.3 Query Message

```json
{
  "dtsp_version": "1.0",
  "message_type": "query",
  "message_id": "660e8400-e29b-41d4-a716-446655440001",
  "timestamp": "2025-12-19T03:00:00Z",
  "sender": {
    "node_id": "node-xyz789",
    "public_key": "0x05b2c3d4...",
    "signature": "0x2b3c4d5e..."
  },
  "payload": {
    "query_type": "threat_lookup",
    "indicators": [
      {
        "type": "ipv4",
        "value": "192.0.2.1"
      }
    ],
    "include_merkle_proof": true,
    "max_age_seconds": 3600
  },
  "metadata": {
    "cache_preference": "fresh"
  }
}
```

### 4.4 Response Message

```json
{
  "dtsp_version": "1.0",
  "message_type": "response",
  "message_id": "770e8400-e29b-41d4-a716-446655440002",
  "in_reply_to": "660e8400-e29b-41d4-a716-446655440001",
  "timestamp": "2025-12-19T03:00:01Z",
  "sender": {
    "node_id": "node-abc123",
    "public_key": "0x04a1b2c3...",
    "signature": "0x3c4d5e6f..."
  },
  "payload": {
    "results": [
      {
        "indicator": "192.0.2.1",
        "found": true,
        "risk_score": 85,
        "threat_types": ["ddos_bot"],
        "verification_count": 5,
        "merkle_proof": {
          "root": "0x9a8b7c6d...",
          "leaf": "0x1a2b3c4d...",
          "siblings": ["0x2b3c4d5e...", "0x3c4d5e6f..."],
          "path": [0, 1, 0]
        },
        "blockchain_ref": {
          "chain_id": 31337,
          "block_number": 12345,
          "tx_hash": "0x4d5e6f7g..."
        }
      }
    ]
  },
  "metadata": {
    "cache_hit": false,
    "query_time_ms": 15
  }
}
```

---

## 5. Merkle Tree Verification

### 5.1 Merkle Tree Structure

DTSP uses Merkle Trees for efficient verification of large threat datasets:

```
                    Root Hash (On-chain)
                   /                    \
            H(AB)                          H(CD)
           /     \                        /     \
       H(A)      H(B)                 H(C)      H(D)
        |         |                    |         |
    Threat1   Threat2              Threat3   Threat4
```

### 5.2 Leaf Node Format

Each threat entry is hashed as a leaf node:

```javascript
function computeLeafHash(threat) {
  const data = {
    ip: threat.ip_address,
    risk_score: threat.risk_score,
    threat_type: threat.threat_type,
    timestamp: threat.timestamp,
    evidence_hash: threat.evidence_hash
  };
  
  // Canonical JSON encoding
  const canonical = JSON.stringify(data, Object.keys(data).sort());
  
  // Keccak256 hash
  return keccak256(canonical);
}
```

### 5.3 Merkle Proof Structure

```json
{
  "merkle_proof": {
    "version": "1.0",
    "root": "0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f",
    "leaf": "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f",
    "leaf_index": 42,
    "total_leaves": 1516,
    "siblings": [
      "0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a",
      "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
      "0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c"
    ],
    "path": [0, 1, 0, 1, 1, 0, 1, 0, 1, 1]
  }
}
```

### 5.4 Verification Algorithm

```python
def verify_merkle_proof(leaf_hash, proof, root_hash):
    """
    Verify a Merkle proof.
    
    Args:
        leaf_hash: Hash of the leaf node
        proof: Merkle proof object
        root_hash: Expected root hash (from blockchain)
    
    Returns:
        bool: True if proof is valid
    """
    current_hash = leaf_hash
    
    for i, sibling in enumerate(proof['siblings']):
        if proof['path'][i] == 0:
            # Current node is left child
            current_hash = keccak256(current_hash + sibling)
        else:
            # Current node is right child
            current_hash = keccak256(sibling + current_hash)
    
    return current_hash == root_hash
```

### 5.5 Incremental Updates

When threat data changes, only affected branches need updating:

```
Update Process:
1. Compute new leaf hash for changed threat
2. Recompute hashes along path to root
3. Submit new root hash to blockchain
4. Distribute Merkle diff to peers

Merkle Diff Format:
{
  "old_root": "0x...",
  "new_root": "0x...",
  "changed_leaves": [
    {
      "index": 42,
      "old_hash": "0x...",
      "new_hash": "0x...",
      "new_data": {...}
    }
  ],
  "updated_siblings": [...]
}
```

---

## 6. Security Considerations

### 6.1 Message Authentication

All DTSP messages MUST be signed:

```javascript
function signMessage(message, privateKey) {
  const payload = JSON.stringify(message.payload);
  const signature = secp256k1.sign(
    keccak256(payload),
    privateKey
  );
  
  message.sender.signature = signature.toString('hex');
  return message;
}
```

### 6.2 Replay Protection

- Each message includes a unique `message_id` (UUID v4)
- Timestamps must be within ±5 minutes of receiver's clock
- Receivers maintain a cache of seen `message_id`s (TTL: 1 hour)

### 6.3 Rate Limiting

- T0: Kernel-level rate limiting (configurable per IP)
- T1: API rate limiting (default: 20 req/s per IP)
- T2: P2P message rate limiting (default: 100 msg/s per peer)
- T3: Blockchain gas limits prevent spam

### 6.4 Privacy Considerations

- IP addresses MAY be hashed before storage (SHA256 + salt)
- Evidence data SHOULD be anonymized
- GDPR/CCPA compliance: Support for data deletion requests
- Regional compliance: Threat data routing based on jurisdiction

---

## 7. Implementation Guidelines

### 7.1 Minimum Viable T0 Implementation

```bash
# eBPF/iptables rules for basic threat blocking
iptables -N orasrs_t0
iptables -A INPUT -j orasrs_t0
iptables -A orasrs_t0 -m set --match-set orasrs_blocklist src -j DROP
iptables -A orasrs_t0 -m connlimit --connlimit-above 100 -j DROP
iptables -A orasrs_t0 -p tcp --syn -m limit --limit 100/s -j ACCEPT
```

### 7.2 T1 Reference Implementation

See: `src/orasrs-simple-client.js`

Key components:
- Local threat cache (in-memory + persistent)
- REST API for threat queries
- Integration with T0 via eBPF maps or iptables
- Optional T2/T3 connectivity

### 7.3 Merkle Tree Library

Recommended: `merkletreejs` (JavaScript) or `rs-merkle` (Rust)

```javascript
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');

// Build tree from threat list
const leaves = threats.map(t => computeLeafHash(t));
const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });

// Get root for blockchain storage
const root = tree.getRoot().toString('hex');

// Generate proof for specific threat
const leaf = computeLeafHash(threat);
const proof = tree.getProof(leaf);
```

### 7.4 Benchmark Standard

Researchers implementing DTSP SHOULD use the reference benchmark:

```bash
./benchmark-kernel-acceleration.sh
```

**Expected Metrics**:
- API Latency: < 50ms (P95)
- eBPF Query: < 0.04ms (average)
- Throughput: > 1000 req/s (concurrent 10-50)
- Memory: < 50MB (for 1500 threats)

**Comparison Guidelines**:
1. Use same hardware specs (or normalize results)
2. Test with same threat dataset size
3. Report P50, P95, P99 latencies
4. Include memory usage over time
5. Document any optimizations applied

---

## 8. IETF Draft Reference

This specification is based on:

**IETF Internet-Draft**: [draft-luo-orasrs-decentralized-threat-signaling-01](https://datatracker.ietf.org/doc/draft-luo-orasrs-decentralized-threat-signaling/00/)

---

## 9. Academic Citation

If you use DTSP in your research, please cite:

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

---

## Appendix A: Message Type Registry

| Message Type | Code | Description |
|--------------|------|-------------|
| threat_signal | 0x01 | New threat detected |
| query | 0x02 | Threat information request |
| response | 0x03 | Query response |
| update | 0x04 | Threat data update |
| revoke | 0x05 | Threat revocation |
| heartbeat | 0x06 | Node liveness signal |

## Appendix B: Threat Type Codes

| Threat Type | Code | Description |
|-------------|------|-------------|
| ddos_bot | 0 | DDoS botnet |
| scanner | 1 | Port scanner |
| brute_force | 2 | Brute force attack |
| c2_server | 3 | Command & control |
| malware_host | 4 | Malware distribution |
| phishing | 5 | Phishing site |

---

**Document Version**: 1.0  
**Last Updated**: 2025-12-19  
**Status**: Draft Specification  
**License**: Apache 2.0
