# OraSRS IoT Deployment Guide
# OraSRS IoT 部署指南

## 概述 / Overview

OraSRS IoT Shield 为物联网设备提供透明的威胁情报保护。无需修改 IoT 设备配置，通过网关层面的流量拦截和威胁检测，保护智能家居、工业传感器、IP 摄像头等设备免受僵尸网络和恶意软件攻击。

**核心特性：**
- ✅ 透明代理 - 无需修改IoT设备
- ✅ 专用威胁情报 - 针对 Mirai, Mozi 等 IoT 僵尸网络
- ✅ 轻量级设计 - 适用于资源受限的路由器
- ✅ 实时保护 - 毫秒级威胁检测
- ✅ Web 管理界面 - LuCI 集成

## 系统要求 / System Requirements

### 硬件要求

**最低配置:**
- CPU: 400MHz+ MIPS/ARM处理器
- RAM: 64MB（建议 128MB+）
- Flash: 16MB（建议 32MB+）
- 网络: 支持 iptables/nftables

**推荐配置:**
- CPU: 800MHz+ 双核处理器
- RAM: 256MB+
- Flash: 64MB+

### 支持的平台

- **OpenWrt**: 19.07 或更高版本
- **OpnSense**: 21.x 或更高版本
- **pfSense**: 2.5+ (实验性)

### 支持的架构

- MIPS (ar71xx, ath79, mt7621, ramips)
- ARM (armv7, armv8/aarch64)
- x86_64

## OpenWrt 安装 / OpenWrt Installation

### 方式 1: 从软件源安装（推荐）

```bash
# 添加 OraSRS 软件源
echo "src/gz orasrs https://packages.orasrs.net/openwrt" >> /etc/opkg/customfeeds.conf

# 更新软件包列表
opkg update

# 安装 OraSRS 客户端
opkg install orasrs-client

# 安装成功后，访问 LuCI 界面
# http://your-router-ip/cgi-bin/luci/admin/services/orasrs
```

### 方式 2: 手动安装 IPK 包

```bash
# 下载对应架构的 IPK 包
# 例如：MIPS 架构
wget https://github.com/srs-protocol/OraSRS-protocol/releases/download/v2.1.0/orasrs-client_2.1.0-1_mipsel_24kc.ipk

# 安装
opkg install orasrs-client_2.1.0-1_mipsel_24kc.ipk

# 启动服务
/etc/init.d/orasrs start
/etc/init.d/orasrs enable
```

### 方式 3: 从源码编译

```bash
# 克隆 OraSRS 仓库到 OpenWrt SDK
cd openwrt/package
git clone https://github.com/srs-protocol/OraSRS-protocol.git orasrs

# 编译
cd ../
make package/orasrs/compile V=s

# 安装生成的 IPK
opkg install bin/packages/*/orasrs/orasrs-client_*.ipk
```

## 配置 / Configuration

### 基本配置

编辑 `/etc/config/orasrs`:

```
config orasrs 'main'
    option enabled '1'
    option api_endpoint 'https://api.orasrs.net'
    option sync_interval '3600'
    option log_level 'info'

config iot_shield 'main'
    option enabled '1'
    option shield_mode 'monitor'  # monitor 或 block
    option iot_network '192.168.2.0/24'
    option protected_ports '80 443 1883 8883'
    option block_threshold '80'
```

### 使用 LuCI Web 界面配置

1. 登录 LuCI: `http://router-ip/cgi-bin/luci`
2. 导航到: **Services** → **OraSRS IoT Shield**
3. 配置以下选项:

**基本设置:**
- 启用 OraSRS
- API 端点（默认即可）
- 同步间隔（3600秒 = 1小时）

**IoT Shield 设置:**
- 启用 IoT Shield
- 保护模式:
  - **Monitor Only**: 仅监控和记录（推荐首次部署）
  - **Block Mode**: 主动拦截威胁
- IoT 网络 CIDR: 填写 IoT 设备所在网段
- 受保护端口: 默认包含 HTTP(80), HTTPS(443), MQTT(1883, 8883)
- 拦截阈值: 风险评分超过此值将被拦截（默认80）

4. 点击 **Save & Apply**

## 透明代理模式 / Transparent Proxy Mode

### 工作原理

```
IoT 设备 → 路由器（OraSRS 检查）→ 互联网
            ↓
      风险评分 >= 80 → 拦截
      风险评分 < 80  → 放行
```

### 启用透明代理

**方式 1: 通过 LuCI 界面**

1. Services → OraSRS IoT Shield
2. 启用 "IoT Shield"
3. 选择 "Block Mode"
4. 配置 IoT 网络范围
5. Save & Apply

**方式 2: 通过命令行**

```bash
# 编辑配置
uci set orasrs.iot_shield.enabled='1'
uci set orasrs.iot_shield.shield_mode='block'
uci set orasrs.iot_shield.iot_network='192.168.2.0/24'
uci commit orasrs

# 重启服务
/etc/init.d/orasrs restart

# 启动透明代理
/usr/lib/orasrs/transparent-proxy.sh start
```

### 验证透明代理

```bash
# 检查状态
/usr/lib/orasrs/transparent-proxy.sh status

# 查看 iptables 规则
iptables -t nat -L ORASRS_FILTER -n -v
iptables -t filter -L ORASRS_FILTER -n -v

# 查看 ipset
ipset list orasrs-whitelist
ipset list orasrs-blacklist
```

## IoT 威胁情报源 / IoT Threat Intelligence Sources

OraSRS 自动收集和更新以下 IoT 特定威胁源：

### 数据源

1. **URLhaus (Abuse.ch)**
   - IoT 恶意软件分发 URL
   - Mirai, Mozi, Gafgyt 变种
   - 自动更新频率: 每小时

2. **ThreatFox (Abuse.ch)**
   - IoT 僵尸网络 C2 指标
   - 实时 IoT 恶意软件追踪
   - 自动更新频率: 每小时

3. **Feodo Tracker**
   - 僵尸网络 C2 服务器
   - 包含某些 IoT 变种
   - 自动更新频率: 每6小时

### 手动同步威胁情报

```bash
# 通过 CLI
orasrs-cli sync --force

# 通过 API
curl -X POST http://127.0.0.1:3006/sync

# 通过 LuCI 界面
# Services → OraSRS → Status → "Sync Now" 按钮
```

### 本地威胁情报收集

在路由器上运行（如果安装了 Python）：

```bash
python3 /usr/lib/orasrs/iot_threat_sources.py --output /tmp/iot-threats.json
```

## 网络拓扑示例 / Network Topology Examples

### 场景 1: 家庭智能设备保护

```
Internet
   ↓
OpenWrt 路由器 (OraSRS)
   ↓
├── VLAN 1: 家庭设备 (192.168.1.0/24)  [不受保护]
└── VLAN 2: IoT 设备 (192.168.2.0/24)  [OraSRS 保护]
         ├── 智能摄像头
         ├── 智能音箱
         ├── 智能插座
         └── 传感器
```

配置:
```bash
uci set orasrs.iot_shield.iot_network='192.168.2.0/24'
uci commit orasrs
```

### 场景 2: 工业 IoT 保护

```
Internet
   ↓
OpnSense 防火墙 (OraSRS)
   ↓
├── 办公网络 (10.0.1.0/24)     [不受保护]
└── 工业网络 (10.0.10.0/24)    [OraSRS 保护]
         ├── PLC 控制器
         ├── 工业传感器
         ├── HMI 面板
         └── 网关设备
```

## 性能调优 / Performance Tuning

### 低配设备优化（32-64MB RAM）

```bash
uci set orasrs.performance.max_memory_mb='10'
uci set orasrs.performance.cache_ttl='43200'    # 12 hours
uci set orasrs.performance.compact_mode='1'
uci set orasrs.main.cache_size='200'
uci set orasrs.main.sync_interval='7200'         # 2 hours
uci commit orasrs
```

### 高配设备优化（256MB+ RAM）

```bash
uci set orasrs.performance.max_memory_mb='50'
uci set orasrs.main.cache_size='5000'
uci set orasrs.main.sync_interval='1800'         # 30 minutes
uci commit orasrs
```

### 降低 CPU 占用

```bash
# 减少日志级别
uci set orasrs.main.log_level='error'

# 增加同步间隔
uci set orasrs.main.sync_interval='7200'

uci commit orasrs
/etc/init.d/orasrs restart
```

## 监控和日志 / Monitoring and Logs

### 查看实时日志

```bash
# 系统日志
logread -f | grep orasrs

# OraSRS 专用日志
tail -f /var/log/orasrs.log

# 通过 LuCI
# Services → OraSRS → Logs
```

### 监控拦截统计

```bash
# CLI
orasrs-cli stats

# API
curl http://127.0.0.1:3006/stats

# LuCI 界面
# Services → OraSRS → Status
```

### 导出威胁报告

```bash
# 导出最近检测到的威胁
sqlite3 /var/lib/orasrs/cache.db \
  "SELECT ip, risk_score, threat_type, last_seen FROM threats ORDER BY last_seen DESC LIMIT 100;" \
  -header -csv > /tmp/threats-report.csv
```

## 白名单管理 / Whitelist Management

### 添加可信 IP/网段

```bash
# 通过 CLI
orasrs-cli whitelist add 8.8.8.8
orasrs-cli whitelist add 1.1.1.0/24

# 通过 API
curl -X POST http://127.0.0.1:3006/whitelist \
  -H "Content-Type: application/json" \
  -d '{"ip": "8.8.8.8", "reason": "Google DNS"}'

# 通过 LuCI
# Services → OraSRS → Whitelist → Add
```

### 查看白名单

```bash
orasrs-cli whitelist list

# 或直接查询数据库
sqlite3 /var/lib/orasrs/cache.db "SELECT * FROM whitelist;"
```

## 故障排除 / Troubleshooting

### 服务无法启动

```bash
# 检查服务状态
/etc/init.d/orasrs status

# 查看详细日志
logread | grep orasrs

# 检查配置
uci show orasrs

# 手动启动查看错误
/usr/lib/orasrs/orasrs-lite.js
```

### 透明代理不工作

```bash
# 检查 iptables 规则
iptables -t nat -L -n -v | grep ORASRS

# 检查 ipset
ipset list orasrs-blacklist

# 重新初始化透明代理
/usr/lib/orasrs/transparent-proxy.sh restart

# 检查端口监听
netstat -tlnp | grep 3006
```

### 内存不足

```bash
# 查看内存使用
free
ps | grep orasrs

# 启用紧凑模式
uci set orasrs.performance.compact_mode='1'
uci set orasrs.main.cache_size='100'
uci commit orasrs
/etc/init.d/orasrs restart
```

### 误拦截问题

```bash
# 临时添加到白名单
orasrs-cli whitelist add <IP_ADDRESS>

# 降低拦截阈值
uci set orasrs.iot_shield.block_threshold='90'
uci commit orasrs

# 切换到监控模式
uci set orasrs.iot_shield.shield_mode='monitor'
uci commit orasrs
/usr/lib/orasrs/transparent-proxy.sh restart
```

## OpnSense 特定说明 / OpnSense Specific Notes

### 安装

OpnSense 使用 FreeBSD 包管理，安装步骤略有不同：

```bash
# 添加仓库
pkg add https://packages.orasrs.net/opnsense/orasrs-client-2.1.0.txz

# 启用服务
sysrc orasrs_enable="YES"
service orasrs start
```

### nftables 支持

OpnSense 23.x+ 使用 nftables：

```bash
# OraSRS 会自动检测并使用 nftables
# 查看规则
nft list table inet orasrs
```

## 安全建议 / Security Recommendations

1. **初始部署使用监控模式**
   ```bash
   uci set orasrs.iot_shield.shield_mode='monitor'
   ```

2. **配置白名单**
   - 添加本地服务器 IP
   - 添加可信云服务提供商
   - 添加 NTP/DNS 服务器

3. **定期检查日志**
   - 查看误报情况
   - 调整拦截阈值

4. **启用告警**
   ```bash
   uci set orasrs.alerts.enabled='1'
   uci set orasrs.alerts.webhook_url='https://your-webhook'
   ```

5. **定期更新**
   ```bash
   opkg update
   opkg upgrade orasrs-client
   ```

## 更多资源 / More Resources

- [主项目 README](../../README.md)
- [OpenWrt 安装指南](OPENWRT_INSTALLATION_GUIDE.md)
- [透明代理设置](IOT_SHIELD.md)
- [IoT Shield 设计](IOT_SHIELD.md)
- [GitHub Issues](https://github.com/srs-protocol/OraSRS-protocol/issues)

## 支持 / Support

- 技术支持: support@orasrs.net
- 社区论坛: https://forum.orasrs.net
- GitHub: https://github.com/srs-protocol/OraSRS-protocol
