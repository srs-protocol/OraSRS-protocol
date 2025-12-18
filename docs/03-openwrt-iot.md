# OpenWrt & IoT Support

> 🇨🇳 **中文用户：[点击这里查看中文文档 (Chinese Documentation)](./03-openwrt-iot_zh-CN.md)**

## OpenWrt Support

OraSRS supports OpenWrt routers and IoT devices, providing lightweight threat intelligence for embedded devices.

**Quick Installation:**

```bash
# Method 1: One-click installation via curl (Recommended)
curl -fsSL https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/install-openwrt.sh | sh
```
目前的 OpenWrt 客户端版本安装后，需要您手动执行以下命令来激活防火墙规则：

```bash
# 1. 加载防火墙规则
sh /etc/firewall.user

# 2. 重启防火墙以应用更改
/etc/init.d/firewall restart
```
验证 OraSRS 是否正在保护您的设备：
```bash
iptables -nvL orasrs_chain
```
**Management Commands:**

```bash
# Query IP
orasrs-cli query 1.2.3.4

# Check Status
/etc/init.d/orasrs status
```

## 🛡️ OraSRS IoT Shield

For devices where firmware cannot be modified (e.g., cameras, sensors), OraSRS provides a "Transparent Scrubbing Layer" solution:
- **Principle**: Deploy OraSRS + Nginx at the gateway to implement "Query then Forward".
- **Effect**: Hides service entry points and protects terminals using global threat intelligence.

**IoT Transparent Protection:**

OraSRS can intercept and detect threats at the gateway level without modifying IoT device configurations:

```
IoT Device (Camera/Sensor/Smart Home)
    ↓
OpenWrt Router + OraSRS (Transparent Inspection)
    ↓ Risk Score < 80: Allow
    ↓ Risk Score ≥ 80: Block
Internet
```

**Threat Intelligence Sources:**

Threat data specifically targeting IoT devices:
- **URLhaus** - IoT malware distribution URLs (Mirai, Mozi, etc.)
- **ThreatFox** - IoT Botnet C2 indicators
- **Feodo Tracker** - Botnet C2 servers

**LuCI Web Interface:**

After installation, access: `http://your-router-ip/cgi-bin/luci/admin/services/orasrs`

<img src="images/luci-orasrs-status.png" alt="LuCI Interface" width="600"/>

**Configuration Example:**

```
config orasrs 'main'
    option enabled '1'
    option api_endpoint 'https://api.orasrs.net'
    option sync_interval '3600'
    option cache_size '1000'
    option log_level 'info'

config iot_shield 'main'
    option enabled '1'              # Enable IoT Shield
    option shield_mode 'block'      # monitor or block
    option iot_network '192.168.2.0/24'  # IoT device subnet
    option protected_ports '80 443 1883 8883'  # Protected ports
    option auto_block '1'
    option block_threshold '80'     # Risk threshold
```

**Supported IoT Device Types:**
- 📷 IP cameras
- 🏠 Smart home devices
- 🔌 Smart plugs
- 🌡️ Sensors
- 🔊 Smart speakers
- 🏭 Industrial controllers (PLC/SCADA)

**Related Documentation:**
- [OpenWrt Client Guide](../OPENWRT_CLIENT_GUIDE.md)
- [T0-T3 Defense Mechanisms](../OPENWRT_T0_T3_MECHANISMS.md)
- [IoT Shield Design](../IOT_SHIELD.md)
