# OraSRS OpenWrt Plugin Installation Guide
# OraSRS OpenWrt 插件安装指南

## 系统要求 / System Requirements

- OpenWrt 19.07 或更高版本
- 最少 64MB RAM（推荐 128MB+）
- 最少 10MB 可用存储空间
- 支持的架构：arm, arm64, mips, mipsel, x86_64

## 一键安装 / Quick Installation

### 方法 1: 使用 curl（推荐）

```bash
curl -fsSL https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/install-openwrt.sh | sh
```

### 方法 2: 使用 wget

```bash
# 下载安装脚本
wget https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/install-openwrt.sh

# 运行安装
sh install-openwrt.sh
```

## 手动安装 / Manual Installation（等更新）

### 1. 添加软件源 / Add Package Feed

编辑 `/etc/opkg/customfeeds.conf`：

```bash
src/gz orasrs https://packages.orasrs.net/openwrt
```

### 2. 更新软件包列表 / Update Package List

```bash
opkg update
```

### 3. 安装 OraSRS 客户端 / Install OraSRS Client

```bash
opkg install orasrs-client
```

## 配置 / Configuration

### 基本配置 / Basic Configuration

编辑配置文件 `/etc/config/orasrs`：

```
config orasrs 'main'
    option enabled '1'
    option api_endpoint 'https://api.orasrs.net'
    option sync_interval '3600'
    option cache_size '1000'
    option log_level 'info'
    option enable_ipv6 '1'
```

### 配置选项说明 / Configuration Options

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `enabled` | boolean | `1` | 启用/禁用 OraSRS 服务 |
| `api_endpoint` | string | `https://api.orasrs.net` | OraSRS API 端点 |
| `sync_interval` | integer | `3600` | 缓存同步间隔（秒） |
| `cache_size` | integer | `1000` | 最大缓存条目数 |
| `log_level` | string | `info` | 日志级别：debug, info, warn, error |
| `enable_ipv6` | boolean | `1` | 启用 IPv6 支持 |
| `block_mode` | string | `monitor` | 拦截模式：monitor, block |

### 高级配置 / Advanced Configuration

```
config orasrs 'main'
    option enabled '1'
    option api_endpoint 'https://api.orasrs.net'
    option sync_interval '3600'
    option cache_size '1000'
    option log_level 'info'
    
    # 性能优化
    option max_memory_mb '20'
    option cache_ttl '86400'
    
    # 网络设置
    option timeout '10'
    option retry_times '3'
    
    # 白名单
    list whitelist '192.168.1.0/24'
    list whitelist '10.0.0.0/8'
    
    # 威胁阈值
    option block_threshold '80'
    option warn_threshold '60'
```

## 服务管理 / Service Management

### 启动服务 / Start Service

```bash
/etc/init.d/orasrs start
```

### 停止服务 / Stop Service

```bash
/etc/init.d/orasrs stop
```

### 重启服务 / Restart Service

```bash
/etc/init.d/orasrs restart
```

### 查看状态 / Check Status

```bash
/etc/init.d/orasrs status
```

### 启用开机自启 / Enable Auto-start

```bash
/etc/init.d/orasrs enable
```

### 禁用开机自启 / Disable Auto-start

```bash
/etc/init.d/orasrs disable
```

## CLI 工具使用 / CLI Usage

OraSRS 在 OpenWrt 上提供轻量级 CLI 工具：

### 查询 IP / Query IP

```bash
orasrs-cli query 45.135.193.0
```

### 同步缓存 / Sync Cache

```bash
orasrs-cli sync
```

### 查看缓存状态 / View Cache Status

```bash
orasrs-cli cache status
```

### 管理白名单 / Manage Whitelist

```bash
# 添加到白名单
orasrs-cli whitelist add 192.168.1.100

# 从白名单移除
orasrs-cli whitelist remove 192.168.1.100

# 列出白名单
orasrs-cli whitelist list
```

### 查看统计信息 / View Statistics

```bash
orasrs-cli stats
```

## 与防火墙集成 / Firewall Integration

### 方式 1：使用 ipset 动态拦截 / Dynamic Blocking with ipset

编辑 `/etc/firewall.user`：

```bash
#!/bin/sh

# 创建 ipset for OraSRS 威胁 IP
ipset create orasrs-threats hash:net -exist

# 拦截规则
iptables -I FORWARD -m set --match-set orasrs-threats src -j DROP
iptables -I INPUT -m set --match-set orasrs-threats src -j DROP

# OraSRS 会自动更新 ipset
```

应用规则：

```bash
/etc/init.d/firewall restart
```

### 方式 2：使用 UCI 防火墙规则 / UCI Firewall Rules

```bash
# 创建拦截规则
uci add firewall rule
uci set firewall.@rule[-1].name='Block OraSRS Threats'
uci set firewall.@rule[-1].src='wan'
uci set firewall.@rule[-1].target='DROP'
uci set firewall.@rule[-1].enabled='1'

# OraSRS 会动态更新规则集
uci commit firewall
/etc/init.d/firewall restart
```

## IoT 设备保护 / IoT Device Protection

OraSRS 可以保护路由器下的所有 IoT 设备：

### 启用透明防护模式 / Enable Transparent Protection

编辑 `/etc/config/orasrs`：

```
config orasrs 'main'
    option enabled '1'
    option iot_shield '1'          # 启用 IoT 护盾
    option shield_mode 'strict'     # 保护模式：relaxed, normal, strict
    option auto_block '1'           # 自动拦截高危 IP
```

### 受保护的端口 / Protected Ports

OraSRS 默认保护以下常见 IoT 端口：

- SSH: 22
- Telnet: 23
- HTTP: 80, 8080
- HTTPS: 443
- MQTT: 1883, 8883
- 其他可配置端口

配置自定义端口：

```bash
uci add_list orasrs.main.protected_ports='5000'
uci add_list orasrs.main.protected_ports='9000'
uci commit orasrs
```

## 性能优化 / Performance Optimization

### 降低内存占用 / Reduce Memory Usage

```
config orasrs 'main'
    option cache_size '500'        # 减少缓存大小
    option max_memory_mb '10'      # 限制最大内存使用
    option compact_mode '1'        # 启用紧凑模式
```

### 降低 CPU 占用 / Reduce CPU Usage

```
config orasrs 'main'
    option sync_interval '7200'    # 增加同步间隔（2小时）
    option query_cache_ttl '300'   # 查询结果缓存5分钟
```

### 低配设备优化 / Low-spec Device Optimization

对于 32MB RAM 设备：

```
config orasrs 'main'
    option enabled '1'
    option cache_size '200'
    option max_memory_mb '8'
    option compact_mode '1'
    option sync_interval '14400'   # 4小时同步一次
    option log_level 'error'       # 仅记录错误日志
```

## 日志查看 / View Logs

### 实时日志 / Real-time Logs

```bash
logread -f | grep orasrs
```

### 历史日志 / Historical Logs

```bash
cat /var/log/orasrs.log
```

### 日志级别设置 / Log Level Configuration

```bash
uci set orasrs.main.log_level='debug'  # debug, info, warn, error
uci commit orasrs
/etc/init.d/orasrs restart
```

## 监控和告警 / Monitoring and Alerts

### 查看实时威胁 / View Real-time Threats

```bash
orasrs-cli threats detected
```

### 配置邮件告警 / Configure Email Alerts

编辑 `/etc/config/orasrs`：

```
config alerts 'email'
    option enabled '1'
    option smtp_server 'smtp.gmail.com'
    option smtp_port '587'
    option smtp_user 'your@email.com'
    option smtp_pass 'password'
    option alert_threshold '80'    # 风险评分阈值
```

### 配置 Webhook 告警 / Configure Webhook Alerts

```
config alerts 'webhook'
    option enabled '1'
    option url 'https://your-webhook-url.com/alert'
    option alert_threshold '70'
```

## 卸载 / Uninstall

### 完全卸载 / Complete Uninstall

```bash
# 停止服务
/etc/init.d/orasrs stop
/etc/init.d/orasrs disable

# 卸载软件包
opkg remove orasrs-client

# 删除配置文件
rm -rf /etc/config/orasrs
rm -rf /var/lib/orasrs

# 清理防火墙规则
ipset destroy orasrs-threats
```

## 故障排除 / Troubleshooting

### 服务无法启动 / Service Won't Start

检查配置文件语法：

```bash
uci show orasrs
```

查看错误日志：

```bash
logread | grep orasrs | tail -n 50
```

### 内存不足 / Out of Memory

减少缓存大小：

```bash
uci set orasrs.main.cache_size='200'
uci set orasrs.main.max_memory_mb='8'
uci commit orasrs
/etc/init.d/orasrs restart
```

### 同步失败 / Sync Failed

检查网络连接：

```bash
ping api.orasrs.net
```

手动触发同步：

```bash
orasrs-cli sync --force
```

### 误拦截 / False Positives

将 IP 添加到白名单：

```bash
orasrs-cli whitelist add <IP_ADDRESS>
```

或降低拦截阈值：

```bash
uci set orasrs.main.block_threshold='90'
uci commit orasrs
```

## 更新 / Update

### 检查更新 / Check for Updates

```bash
opkg update
opkg list-upgradable | grep orasrs
```

### 升级到最新版本 / Upgrade to Latest Version

```bash
opkg update
opkg upgrade orasrs-client
/etc/init.d/orasrs restart
```

## 安全建议 / Security Recommendations

1. **定期更新**：保持 OraSRS 客户端为最新版本
2. **配置白名单**：添加可信 IP/网段到白名单
3. **监控日志**：定期检查拦截日志，识别误报
4. **备份配置**：定期备份 `/etc/config/orasrs`
5. **测试模式**：生产环境前先在测试环境验证

## 支持和反馈 / Support and Feedback

- GitHub Issues: https://github.com/srs-protocol/OraSRS-protocol/issues
- 技术文档: https://docs.orasrs.net（暂时在git)
- 社区论坛: https://forum.orasrs.net（暂时在git)

## 更多资源 / More Resources

- [主项目 README](../README.md)
- [SDK 使用指南](../SDK_USAGE_GUIDE.md)
- [客户端实现指南](../CLIENT_IMPLEMENTATION_GUIDE.md)
- [IoT Shield 设计文档](../IOT_SHIELD.md)
