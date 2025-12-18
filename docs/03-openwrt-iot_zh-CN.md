# OpenWrt 与 IoT 支持 / OpenWrt & IoT Support

> 🇺🇸 **English Version: [Click here for the English Documentation](./03-openwrt-iot.md)**

## OpenWrt Support / OpenWrt 支持

OraSRS 支持 OpenWrt 路由器和 IoT 设备防护，为嵌入式设备提供轻量级威胁情报。

**快速安装 / Quick Installation:**

```bash
# 方法1: 使用 curl 一键安装 (推荐)
curl -fsSL https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/install-openwrt.sh | sh
```

**管理命令 / Management Commands:**

```bash
# 查询 IP / Query IP
orasrs-cli query 1.2.3.4

# 查看状态 / Check Status
/etc/init.d/orasrs status
```

## 🛡️ OraSRS IoT Shield (物联网护盾)

对于无法修改固件的摄像头、传感器等设备，OraSRS 提供"透明清洗层"方案：
- **原理**: 在网关部署 OraSRS + Nginx，实行"先查询后放行"。
- **效果**: 隐藏服务入口，利用全球威胁情报保护终端安全。

**IoT 透明防护 / IoT Transparent Protection:**

OraSRS 可以在不修改 IoT 设备配置的情况下，通过网关层面拦截和检测威胁：

```
IoT 设备 (摄像头/传感器/智能家居)
    ↓
OpenWrt 路由器 + OraSRS (透明检测)
    ↓ 风险评分 < 80: 放行
    ↓ 风险评分 ≥ 80: 拦截
互联网
```

**威胁情报源 / Threat Intelligence Sources:**

专门针对 IoT 设备的威胁数据：
- **URLhaus** - IoT 恶意软件分发 URL（Mirai, Mozi等）
- **ThreatFox** - IoT 僵尸网络 C2 指标
- **Feodo Tracker** - 僵尸网络 C2 服务器

**LuCI Web 界面 / LuCI Web Interface:**

安装后访问：`http://your-router-ip/cgi-bin/luci/admin/services/orasrs`

<img src="images/luci-orasrs-status.png" alt="LuCI Interface" width="600"/>

**配置示例 / Configuration Example:**

```
config orasrs 'main'
    option enabled '1'
    option api_endpoint 'https://api.orasrs.net'
    option sync_interval '3600'
    option cache_size '1000'
    option log_level 'info'

config iot_shield 'main'
    option enabled '1'              # 启用 IoT Shield
    option shield_mode 'block'      # monitor 或 block
    option iot_network '192.168.2.0/24'  # IoT 设备网段
    option protected_ports '80 443 1883 8883'  # 受保护端口
    option auto_block '1'
    option block_threshold '80'     # 风险阈值
```

**支持的 IoT 设备类型 / Supported IoT Device Types:**
- 📷 IP 摄像头 / IP cameras
- 🏠 智能家居设备 / Smart home devices  
- 🔌 智能插座 / Smart plugs
- 🌡️ 传感器 / Sensors
- 🔊 智能音箱 / Smart speakers
- 🏭 工业控制器（PLC/SCADA）/ Industrial controllers

**相关文档 / Related Documentation:**
- [OpenWrt Client Guide / OpenWrt 客户端完整指南](../OPENWRT_CLIENT_GUIDE.md)
- [T0-T3 Defense Mechanisms / T0-T3 防御机制详解](../OPENWRT_T0_T3_MECHANISMS.md)
- [IoT Shield Design / IoT 护盾设计](../IOT_SHIELD.md)
