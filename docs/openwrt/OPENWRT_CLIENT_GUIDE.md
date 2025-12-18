# OraSRS OpenWrt Client - Complete User Guide

## 目录

1. [简介](#简介)
2. [快速开始](#快速开始)
3. [安装部署](#安装部署)
4. [配置说明](#配置说明)
5. [功能特性](#功能特性)
6. [命令参考](#命令参考)
7. [故障排查](#故障排查)
8. [性能优化](#性能优化)
9. [安全建议](#安全建议)
10. [常见问题](#常见问题)

---

## 简介

OraSRS OpenWrt Client 是专为 OpenWrt 路由器和 IoT 设备设计的轻量级威胁防护客户端，提供从本地到全球的多层次安全防护。

### 核心特性

- ✅ **轻量级**: 内存占用 < 10 MB
- ✅ **高性能**: 支持千万级数据包处理
- ✅ **多层防御**: T0-T3 分层架构
- ✅ **离线模式**: 支持完全离线运行
- ✅ **自动更新**: 威胁情报自动同步
- ✅ **零配置**: 开箱即用

### 系统要求

| 组件 | 最低要求 | 推荐配置 |
|------|---------|---------|
| 内存 | 128 MB | 512 MB+ |
| 存储 | 10 MB | 50 MB+ |
| CPU | 单核 | 双核+ |
| 系统 | OpenWrt 21.02+ | OpenWrt 23.05+ |

---

## 快速开始

### 一键安装

```bash
# 下载并执行安装脚本
curl -H 'Cache-Control: no-cache' -fsSL \
  https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/install-openwrt.sh | sh
```

### 验证安装

```bash
# 检查服务状态
/etc/init.d/orasrs status

# 查看防火墙规则
iptables -nvL INPUT | grep orasrs

# 测试 API
curl http://localhost:3006/health
```

### 快速测试

```bash
# 查询 IP 风险
curl 'http://localhost:3006/query?ip=8.8.8.8'

# 查看统计信息
curl http://localhost:3006/stats

# 查看威胁缓存
sqlite3 /var/lib/orasrs/cache.db "SELECT COUNT(*) FROM threats"
```

---

## 安装部署

### 方法 1: 自动安装（推荐）

```bash
# 标准安装
curl -fsSL https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/install-openwrt.sh | sh

# 指定安装模式
curl -fsSL https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/install-openwrt.sh | sh -s -- --mode edge

# 离线安装（预先下载脚本）
wget https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/install-openwrt.sh
chmod +x install-openwrt.sh
./install-openwrt.sh
```

### 方法 2: 手动安装

```bash
# 1. 安装依赖
opkg update
opkg install ipset iptables curl node

# 2. 下载客户端
mkdir -p /usr/lib/orasrs
wget -O /usr/lib/orasrs/orasrs-lite.js \
  https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/openwrt/orasrs-client/orasrs-lite.js

# 3. 设置权限
chmod +x /usr/lib/orasrs/orasrs-lite.js

# 4. 创建配置
cat > /etc/config/orasrs << EOF
config orasrs 'main'
    option enabled '1'
    option mode 'edge'
EOF

# 5. 创建服务
cat > /etc/init.d/orasrs << 'EOF'
#!/bin/sh /etc/rc.common
START=99
STOP=10

start() {
    node /usr/lib/orasrs/orasrs-lite.js &
}

stop() {
    killall node
}
EOF

chmod +x /etc/init.d/orasrs

# 6. 启动服务
/etc/init.d/orasrs enable
/etc/init.d/orasrs start
```

### 安装模式选择

**Edge 模式** (极简模式):
- 内存占用: < 5 MB
- 适用场景: 低配设备 (< 512MB)
- 功能: T0 + T3

**Hybrid 模式** (混合模式):
- 内存占用: < 10 MB
- 适用场景: 中配设备 (512MB - 1GB)
- 功能: T0 + T1 + T3

**Full 模式** (完整模式):
- 内存占用: < 20 MB
- 适用场景: 高配设备 (> 1GB)
- 功能: T0 + T1 + T2 + T3

---

## 配置说明

### UCI 配置文件

配置文件位置: `/etc/config/orasrs`

```bash
config orasrs 'main'
    # 基础配置
    option enabled '1'
    option mode 'edge'  # edge, hybrid, full
    option log_level 'info'  # debug, info, warn, error
    
    # 区块链配置
    option blockchain_endpoints 'https://api.orasrs.net http://127.0.0.1:8545'
    option sync_interval '3600'  # 同步间隔（秒）
    option cache_ttl '86400'  # 缓存有效期（秒）
    
    # T0 本地防御
    option limit_rate '20/s'  # 速率限制
    option limit_burst '50'  # 突发缓冲
    
    # T1 信誉评分
    option reputation_enabled '1'
    option low_risk_threshold '30'
    option medium_risk_threshold '60'
    option high_risk_threshold '80'
    
    # T2 节点共识
    option p2p_enabled '0'  # 默认禁用
    option p2p_port '9000'
    
    # T3 全球共识
    option public_feeds_enabled '1'
    option fallback_to_cache '1'
    option offline_mode 'auto'  # auto, enabled, disabled
    
    # 性能优化
    option cache_size '1000'
    option max_connections '100'
```

### 配置管理命令

```bash
# 查看配置
uci show orasrs

# 修改配置
uci set orasrs.main.sync_interval='7200'
uci commit orasrs

# 重启服务应用配置
/etc/init.d/orasrs restart

# 恢复默认配置
rm /etc/config/orasrs
/etc/init.d/orasrs restart
```

---

## 功能特性

### 1. 多层防御架构

详见 [OPENWRT_T0_T3_MECHANISMS.md](OPENWRT_T0_T3_MECHANISMS.md)

### 2. 智能威胁同步

**同步策略**:
```
优先级 1: 区块链端点
  ├─ https://api.orasrs.net
  └─ http://127.0.0.1:8545 (本地 Hardhat)
    ↓ 失败
优先级 2: 公共威胁源
  ├─ Feodo Tracker
  └─ EmergingThreats
    ↓ 失败
优先级 3: 本地缓存
  └─ SQLite 数据库
```

**同步日志示例**:
```
[INFO] Starting threat sync from blockchain...
[INFO] Trying blockchain endpoint: https://api.orasrs.net
[INFO] ✓ Updated 1523 threats from Blockchain
[INFO] ✓ Blockchain sync successful
```

### 3. 离线模式

当所有远程源不可用时，自动切换到离线模式：

```
[WARN] Blockchain unavailable, falling back to public feeds...
[ERROR] Public feed sync failed: Network unreachable
[WARN] ⚠ Offline mode: Using cached threat data
[INFO] Cached threats: 1523
```

### 4. API 服务

**端点列表**:

| 端点 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/stats` | GET | 统计信息 |
| `/query?ip=<IP>` | GET | 查询 IP 风险 |
| `/sync` | POST | 手动触发同步 |

**使用示例**:
```bash
# 健康检查
curl http://localhost:3006/health
# 响应: {"status":"healthy","uptime":3600}

# 查询 IP
curl 'http://localhost:3006/query?ip=1.2.3.4'
# 响应: {"ip":"1.2.3.4","risk_score":85,"risk_level":"high","should_block":true}

# 查看统计
curl http://localhost:3006/stats
# 响应: {"totalQueries":1234,"cacheHits":890,"cacheMisses":344}
```

---

## 命令参考

### 服务管理

```bash
# 启动服务
/etc/init.d/orasrs start

# 停止服务
/etc/init.d/orasrs stop

# 重启服务
/etc/init.d/orasrs restart

# 查看状态
/etc/init.d/orasrs status

# 启用开机自启
/etc/init.d/orasrs enable

# 禁用开机自启
/etc/init.d/orasrs disable
```

### 日志查看

```bash
# 实时日志
tail -f /var/log/orasrs.log

# 最近日志
tail -50 /var/log/orasrs.log

# 搜索错误
grep ERROR /var/log/orasrs.log

# 系统日志
logread | grep ORASRS
```

### 数据库操作

```bash
# 查看威胁数量
sqlite3 /var/lib/orasrs/cache.db "SELECT COUNT(*) FROM threats"

# 查看威胁来源
sqlite3 /var/lib/orasrs/cache.db "SELECT source, COUNT(*) FROM threats GROUP BY source"

# 查看最近威胁
sqlite3 /var/lib/orasrs/cache.db "SELECT ip, risk_score, source FROM threats ORDER BY last_seen DESC LIMIT 10"

# 清理过期威胁
sqlite3 /var/lib/orasrs/cache.db "DELETE FROM threats WHERE expires_at < strftime('%s', 'now')"

# 导出威胁列表
sqlite3 /var/lib/orasrs/cache.db "SELECT ip FROM threats" > /tmp/threat_ips.txt
```

### 防火墙管理

```bash
# 查看 OraSRS 规则
iptables -nvL INPUT | grep orasrs

# 查看 ipset
ipset list orasrs_threats

# 手动添加 IP 到黑名单
ipset add orasrs_threats 1.2.3.4

# 手动删除 IP
ipset del orasrs_threats 1.2.3.4

# 重新加载防火墙
/etc/init.d/firewall restart
```

---

## 故障排查

### 问题 1: 服务无法启动

**症状**: `/etc/init.d/orasrs start` 失败

**检查步骤**:
```bash
# 1. 检查 Node.js
node --version

# 2. 检查文件权限
ls -lh /usr/lib/orasrs/orasrs-lite.js

# 3. 手动启动测试
node /usr/lib/orasrs/orasrs-lite.js

# 4. 查看错误日志
tail -50 /var/log/orasrs.log
```

**解决方案**:
```bash
# 重新安装 Node.js
opkg update
opkg install node

# 修复权限
chmod +x /usr/lib/orasrs/orasrs-lite.js

# 重新安装客户端
curl -fsSL https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/install-openwrt.sh | sh
```

### 问题 2: 无法同步威胁情报

**症状**: 日志显示同步失败

**检查步骤**:
```bash
# 1. 测试网络连接
ping -c 3 api.orasrs.net

# 2. 测试 HTTPS
curl -I https://api.orasrs.net

# 3. 查看同步日志
grep "sync" /var/log/orasrs.log

# 4. 手动触发同步
killall -USR1 node
```

**解决方案**:
```bash
# 检查 DNS
nslookup api.orasrs.net

# 检查防火墙
iptables -nvL OUTPUT

# 使用本地 Hardhat 节点
uci set orasrs.main.blockchain_endpoints='http://127.0.0.1:8545'
uci commit orasrs
/etc/init.d/orasrs restart
```

### 问题 3: 内存不足

**症状**: 设备卡顿或服务崩溃

**检查步骤**:
```bash
# 查看内存使用
free -h

# 查看进程内存
ps aux | grep orasrs

# 查看缓存大小
du -sh /var/lib/orasrs
```

**解决方案**:
```bash
# 减少缓存大小
uci set orasrs.main.cache_size='500'

# 禁用 T1/T2
uci set orasrs.main.reputation_enabled='0'
uci set orasrs.main.p2p_enabled='0'

# 增加同步间隔
uci set orasrs.main.sync_interval='7200'

# 应用配置
uci commit orasrs
/etc/init.d/orasrs restart
```

### 问题 4: 误报/误杀

**症状**: 合法 IP 被阻断

**检查步骤**:
```bash
# 查询 IP 风险
curl 'http://localhost:3006/query?ip=<IP>'

# 查看 ipset
ipset list orasrs_threats | grep <IP>

# 查看数据库
sqlite3 /var/lib/orasrs/cache.db "SELECT * FROM threats WHERE ip='<IP>'"
```

**解决方案**:
```bash
# 从 ipset 删除
ipset del orasrs_threats <IP>

# 从数据库删除
sqlite3 /var/lib/orasrs/cache.db "DELETE FROM threats WHERE ip='<IP>'"

# 添加到白名单
sqlite3 /var/lib/orasrs/cache.db "INSERT INTO whitelist (ip) VALUES ('<IP>')"

# 重启服务
/etc/init.d/orasrs restart
```

---

## 性能优化

### 低配设备优化 (< 512MB)

```bash
# 使用 Edge 模式
uci set orasrs.main.mode='edge'

# 禁用高级功能
uci set orasrs.main.reputation_enabled='0'
uci set orasrs.main.p2p_enabled='0'

# 减少缓存
uci set orasrs.main.cache_size='500'

# 增加同步间隔
uci set orasrs.main.sync_interval='7200'

# 应用配置
uci commit orasrs
/etc/init.d/orasrs restart
```

### 中配设备优化 (512MB - 1GB)

```bash
# 使用 Hybrid 模式
uci set orasrs.main.mode='hybrid'

# 启用 T1，禁用 T2
uci set orasrs.main.reputation_enabled='1'
uci set orasrs.main.p2p_enabled='0'

# 标准缓存
uci set orasrs.main.cache_size='1000'

# 标准同步间隔
uci set orasrs.main.sync_interval='3600'

# 应用配置
uci commit orasrs
/etc/init.d/orasrs restart
```

### 高配设备优化 (> 1GB)

```bash
# 使用 Full 模式
uci set orasrs.main.mode='full'

# 启用所有功能
uci set orasrs.main.reputation_enabled='1'
uci set orasrs.main.p2p_enabled='1'

# 增大缓存
uci set orasrs.main.cache_size='5000'

# 缩短同步间隔
uci set orasrs.main.sync_interval='1800'

# 应用配置
uci commit orasrs
/etc/init.d/orasrs restart
```

---

## 安全建议

### 1. 限制管理端口访问

```bash
# 仅允许本地访问
iptables -A INPUT -p tcp --dport 3006 -s 127.0.0.1 -j ACCEPT
iptables -A INPUT -p tcp --dport 3006 -j DROP

# 或允许特定网段
iptables -A INPUT -p tcp --dport 3006 -s 192.168.1.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 3006 -j DROP
```

### 2. 启用日志轮转

```bash
cat > /etc/logrotate.d/orasrs << EOF
/var/log/orasrs.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
}
EOF
```

### 3. 定期备份

```bash
# 备份配置和数据
tar -czf /tmp/orasrs-backup-$(date +%Y%m%d).tar.gz \
  /etc/config/orasrs \
  /var/lib/orasrs

# 恢复备份
tar -xzf /tmp/orasrs-backup-20251218.tar.gz -C /
/etc/init.d/orasrs restart
```

### 4. 监控告警

```bash
# 创建监控脚本
cat > /usr/bin/orasrs-monitor << 'EOF'
#!/bin/sh
if ! /etc/init.d/orasrs status > /dev/null; then
    logger -t ORASRS "Service down, restarting..."
    /etc/init.d/orasrs restart
fi
EOF

chmod +x /usr/bin/orasrs-monitor

# 添加到 cron
echo "*/5 * * * * /usr/bin/orasrs-monitor" >> /etc/crontabs/root
/etc/init.d/cron restart
```

---

## 常见问题

### Q1: OraSRS 会影响网络性能吗？

**A**: 不会。OraSRS 使用内核级 iptables/ipset，处理延迟 < 1ms，CPU 占用 < 5%。

### Q2: 支持 IPv6 吗？

**A**: 当前版本主要支持 IPv4。IPv6 支持计划在未来版本中添加。

### Q3: 如何添加自定义威胁源？

**A**: 编辑 `/usr/lib/orasrs/orasrs-lite.js`，在 `syncFromPublicFeeds()` 函数中添加新的威胁源 URL。

### Q4: 可以完全离线运行吗？

**A**: 可以。设置 `offline_mode='enabled'`，系统将仅使用本地缓存。

### Q5: 如何卸载？

**A**:
```bash
/etc/init.d/orasrs stop
/etc/init.d/orasrs disable
rm -rf /usr/lib/orasrs
rm -rf /var/lib/orasrs
rm /etc/config/orasrs
rm /etc/init.d/orasrs
rm /var/log/orasrs.log
```

### Q6: 支持哪些 OpenWrt 版本？

**A**: 支持 OpenWrt 21.02 及以上版本。推荐使用 23.05+。

### Q7: 如何更新到最新版本？

**A**:
```bash
# 备份配置
cp /etc/config/orasrs /tmp/orasrs.bak

# 重新安装
curl -fsSL https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/install-openwrt.sh | sh

# 恢复配置
cp /tmp/orasrs.bak /etc/config/orasrs
/etc/init.d/orasrs restart
```

---

## 相关文档

- [T0-T3 防御机制详解](OPENWRT_T0_T3_MECHANISMS.md)
- [T3 模块优化文档](OPENWRT_T3_OPTIMIZATION.md)
- [部署指南](OPENWRT_DEPLOYMENT_GUIDE.md)
- [快速参考](../../docs/guides/QUICK_DEPLOY_REFERENCE.md)

---

## 技术支持

- **GitHub**: https://github.com/srs-protocol/OraSRS-protocol
- **Issues**: https://github.com/srs-protocol/OraSRS-protocol/issues
- **文档**: https://github.com/srs-protocol/OraSRS-protocol/tree/lite-client

---

**最后更新**: 2025-12-18  
**版本**: v3.3.0
