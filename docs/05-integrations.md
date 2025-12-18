# Advanced Integrations（Reference Study）

> 🇨🇳 **中文用户：[点击这里查看中文文档 (Chinese Documentation)](./05-integrations_zh-CN.md)**

## Wazuh + OraSRS Integration (Advanced Security)

If you wish to integrate OraSRS into the Wazuh security platform for automated threat blocking:

```bash
curl -fsSL https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/install-wazuh-orasrs.sh | bash
```

This script will:
1. Install/Update the OraSRS client (restricted to local access).
2. Install the Wazuh Agent.

**How it Works (Risk Control First):**
- **Wazuh Detects Threat**: Triggers integration script to call OraSRS endpoint `/v1/threats/process`.
- **OraSRS Decision**:
  - **Whitelist**: Allow immediately.
  - **Dynamic Risk Control**: Calculate ban duration based on threat level (High: 3 days, Critical: 7 days, Default: 24 hours).
  - **Local/Chain Collaboration**: Prioritize local cache (stack duration if hit), then query on-chain data (max ban if hit).
  - **New Threat**: Write to local cache and report asynchronously to the blockchain.
- **Active Response**: Wazuh executes `firewall-drop` based on OraSRS instructions.

## 🛡️ High Value Asset Protection (HVAP) Configuration

For critical services like SSH/MySQL, enable dynamic access control based on OraSRS scores:

1. **Install PAM Module** (Included in the script above)
2. **Enable SSH Protection**:
   Edit `/etc/pam.d/sshd` and add the following to the top of the file:
   ```bash
   auth required pam_exec.so /opt/orasrs/pam/pam_orasrs.py
   ```
   This will intercept login attempts from high-risk IPs (Score >= 80), effectively defending against 0-day probes.

**HVAP Defense Logic:**
- **L1 (Score < 40)**: Allow.
- **L2 (40 <= Score < 80)**: Warning / Suggest MFA.
- **L3 (Score >= 80)**: **Block** (Access Denied).

**Emergency Response (Manual Override):**
If you need to temporarily allow a blocked IP, administrators can call the temporary whitelist endpoint:
```bash
curl -X POST http://127.0.0.1:3006/orasrs/v1/whitelist/temp \
  -H "Content-Type: application/json" \
  -d '{"ip":"1.2.3.4", "duration":300}'
```
This will allow the IP to bypass HVAP interception for 5 minutes.

## Browser Extension

We also provide a browser extension to protect your web security directly from the browser:

- Supports Chrome and Firefox
- Real-time threat protection
- Decentralized threat intelligence based on OraSRS protocol chain
- Privacy-preserving design
