# Getting Started

> 🇨🇳 **中文用户：[点击这里查看中文文档 (Chinese Documentation)](./01-getting-started_zh-CN.md)**

## ⚠️ Project Status - Final Version (v3.3.6)

> **Project Concluded**: OraSRS v3.3.6 is the final release, focusing exclusively on T0 kernel-level defense.
> **T0 Only**: This version includes only iptables/ipset-based threat blocking. NO Node.js, blockchain, or T2/T3 features.
> **Threat Intelligence**: Auto-syncs from public feeds (Feodo Tracker + EmergingThreats).
> **Scientific Reference**: DOI 10.31224/5985 | IETF draft-luo-orasrs-decentralized-threat-signaling-01

## 🚀 What Gets Installed

OraSRS v3.3.6 provides a unified T0 kernel defense approach for all platforms:

| Component | Description | Memory Footprint |
|-----------|-------------|------------------|
| **T0 Kernel Defense** | iptables/ipset + SYN flood protection | < 5 MB |
| **Public Threat Feeds** | Auto-sync from Feodo Tracker + EmergingThreats | Included |
| **Management CLI** | Simple bash-based client control | < 1 MB |

**What's NOT Included:**
- ❌ Node.js runtime
- ❌ Blockchain integration (T2/T3)
- ❌ Web API server
- ❌ Database dependencies

## Method 1: One-Click Installation (Linux)

Use the following command to install the OraSRS T0 Linux client:

```bash
curl -fsSL https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/install-orasrs-client.sh | bash
```

Or:

```bash
wget -O - https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/install-orasrs-client.sh | bash
```

### Service Management Commands

```bash
# Start Service
sudo systemctl start orasrs

# Stop Service
sudo systemctl stop orasrs

# Check Service Status
sudo systemctl status orasrs

# View Protection Status
sudo orasrs-client status

# Manual Threat Sync
sudo orasrs-client sync

# Check if IP is blocked
sudo orasrs-client check 1.2.3.4
```

## Method 2: Manual Installation via Git Clone

If you encounter GitHub CDN cache issues with the curl method:

```bash
# Clone repository
cd /tmp
git clone -b lite-client https://github.com/srs-protocol/OraSRS-protocol.git
cd OraSRS-protocol

# Run installation script
sudo bash install-orasrs-client.sh
```

## Verification

After installation, verify that OraSRS is protecting your system:

```bash
# Check iptables rules
sudo iptables -nvL orasrs_chain

# Check loaded threats
sudo ipset list orasrs_threats | head -20

# Test IP lookup
sudo orasrs-client check 8.8.8.8
```

## Configuration

Edit `/etc/orasrs/config` to customize:

```bash
# SYN flood protection rate limit
LIMIT_RATE="20/s"
LIMIT_BURST="50"

# Threat sync interval (seconds)
SYNC_INTERVAL="3600"
```

After changing configuration:
```bash
sudo systemctl reload orasrs
```
