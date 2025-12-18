# Getting Started

> 🇨🇳 **中文用户：[点击这里查看中文文档 (Chinese Documentation)](./01-getting-started_zh-CN.md)**

## ⚠️ Beta Disclaimer

> **Beta Phase**: This project is in Beta. Some features (like egress filtering) default to monitor mode.
> **Threat Intelligence Sources**: During the Beta phase, OraSRS integrates open-source threat intelligence feeds such as Spamhaus DROP, DShield, and Abuse.ch Feodo Tracker.
> **Production Advice**: Please evaluate these data sources against your business needs and configure local whitelists to avoid false positives before deploying in production.
> **Regional Policy**: OraSRS Alpha testing is currently open only to nodes outside of Mainland China.

## 🚀 Deployment Modes & Resource Requirements

OraSRS offers three flexible deployment modes to suit environments ranging from cloud servers to IoT devices:

| Mode | Use Case | Memory Req | Core Components | Features |
|------|----------|------------|-----------------|----------|
| **Full Management Node (Full)** | Cloud Servers, Gateways | ~90 MB | Node.js + eBPF | Full API, Blockchain Interaction, Visualization, CLI |
| **Hybrid Mode (Hybrid)** | Edge Gateways, Routers | ~30 MB | Python + eBPF | Core Protection, Limited API, Auto-Sync |
| **Native Edge Agent (Edge)** | IoT Devices, Sensors | **< 5 MB** | Native C + eBPF | Core Protection Only, Passive Updates, Extremely Lightweight |

**Note**: The "<5MB" memory metric mentioned in the paper specifically refers to the **Native Edge Agent** mode. The default installation script will automatically detect device memory and recommend the appropriate mode.

## Method 1: One-Click Installation (Linux)

Use the following command to install the OraSRS Linux client:

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
sudo systemctl start orasrs-client

# Stop Service
sudo systemctl stop orasrs-client

# Restart Service
sudo systemctl restart orasrs-client

# Check Service Status
sudo systemctl status orasrs-client
```

## Method 3: Manual Installation (Docker)

*(Detailed Docker installation steps to be added)*
