# User Guide

> 🇨🇳 **中文用户：[点击这里查看中文文档 (Chinese Documentation)](./02-user-guide_zh-CN.md)**

## 🛠️ Client Tools

### CLI Usage

OraSRS provides a powerful command-line interface for management and querying.

```bash
# Query an IP with pretty output (default)
orasrs-cli query 45.135.193.0

# Query with JSON output
orasrs-cli query 45.135.193.0 --format json

# Report a threat (requires private key)
orasrs-cli report 1.2.3.4 --reason "Phishing" --private-key <YOUR_KEY>

# Manually sync threat data from blockchain
orasrs-cli sync

# Force full sync (not incremental)
orasrs-cli sync --force

# Cache management
orasrs-cli cache status   # View cache status
orasrs-cli cache clear    # Clear cache
orasrs-cli cache rebuild  # Rebuild cache

# Whitelist management
orasrs-cli whitelist add 1.2.3.4      # Add to whitelist
orasrs-cli whitelist remove 1.2.3.4   # Remove from whitelist
orasrs-cli whitelist list             # List all

# Kernel Acceleration Management (eBPF)
orasrs-cli kernel                    # View kernel acceleration status
orasrs-cli kernel --detailed         # View detailed statistics
orasrs-cli kernel-sync               # Manually sync threat data to kernel
```

### CLI Output Example

**Pretty Format** (`--format pretty`, default):

```
🔍 Querying IP: 45.135.193.0

Threat Intelligence:
  Risk Score: 75/100
  Risk Level: High
  Threat Type: Botnet C2 (Suspected)
  Source: Local Cache (Abuse.ch)
  First Seen: 2025-12-10
  Active: Yes

Source: Test Protocol Chain
Cached: Yes
📌 Note: OraSRS provides risk assessment only. Blocking decisions should be based on your business policies.
```

## 🧩 Client SDK

Developers can use the OraSRS client to integrate threat intelligence into their applications.

**Installation:**

```bash
git clone https://github.com/srs-protocol/OraSRS-protocol.git
cd OraSRS-protocol
npm install
node orasrs-simple-client.js
```

**Basic Usage:**

```javascript
// Query IP via HTTP API
const response = await fetch('http://localhost:3006/orasrs/v1/query?ip=45.135.193.0');
const data = await response.json();

console.log(data.response.risk_score);
console.log(data.response.risk_level);
```

**Full Documentation:**

- [SDK Usage Guide](../SDK_USAGE_GUIDE.md)
- [API Reference](../api.md)

## 💻 OraSRS Lite Client (Desktop)

The OraSRS Lite Client is a desktop application built on the Tauri framework (Rust + Frontend), designed for resource-constrained environments.

**Features**:
- **Incremental Updates** - Syncs only the latest threat intelligence.
- **TTL Expiration** - Automatically clears expired threat data.
- **Silent Mode** - Runs silently by default.
- **Cross-Platform Support** - Windows, macOS, Linux.

### Quick Start
```bash
git clone https://github.com/srs-protocol/orasrs-protocol.git
cd orasrs-protocol/orasrs-lite-client
npm install
npm run tauri dev
```

## 🧩 Client Libraries
- [Client Implementation Guide](../CLIENT_IMPLEMENTATION_GUIDE.md)
- Node.js: `npm install @SRA-client`
