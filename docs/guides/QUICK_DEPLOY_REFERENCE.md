# OraSRS OpenWrt T3 模块 - 快速部署参考

## 🚀 一键部署

```bash
# 1. 部署到 OpenWrt 设备
bash deploy-openwrt-t3.sh 192.168.1.1 root 22

# 2. 运行测试验证
bash test-openwrt-t3.sh 192.168.1.1 root 22
```

## 📋 部署前检查清单

- [ ] 确认 OpenWrt 设备 IP 地址
- [ ] 确认 SSH 可以连接
- [ ] 确认设备有足够空间（至少 10MB）
- [ ] 确认设备已安装 Node.js

## 🔧 快速命令

### 部署相关

```bash
# 部署（使用默认 IP: 192.168.1.1）
bash deploy-openwrt-t3.sh

# 部署到指定 IP
bash deploy-openwrt-t3.sh 192.168.10.1

# 测试部署
bash test-openwrt-t3.sh 192.168.10.1
```

### 远程管理

```bash
# SSH 连接
ssh root@192.168.1.1

# 查看日志
ssh root@192.168.1.1 'tail -f /var/log/orasrs.log'

# 重启服务
ssh root@192.168.1.1 '/etc/init.d/orasrs restart'

# 查看状态
ssh root@192.168.1.1 'curl http://localhost:3006/health'
```

### 数据库查询

```bash
# 查看威胁数量
ssh root@192.168.1.1 'sqlite3 /var/lib/orasrs/cache.db "SELECT COUNT(*) FROM threats"'

# 查看威胁来源
ssh root@192.168.1.1 'sqlite3 /var/lib/orasrs/cache.db "SELECT source, COUNT(*) FROM threats GROUP BY source"'

# 查看最近威胁
ssh root@192.168.1.1 'sqlite3 /var/lib/orasrs/cache.db "SELECT ip, risk_score, source FROM threats ORDER BY last_seen DESC LIMIT 10"'
```

## 📊 测试场景

### 场景 1: 正常同步（区块链）

```bash
# 查看同步日志
ssh root@192.168.1.1 'tail -f /var/log/orasrs.log | grep blockchain'
```

**预期**: 看到 "✓ Blockchain sync successful"

### 场景 2: 公共源回退

```bash
# 临时阻止区块链访问（测试用）
ssh root@192.168.1.1 'iptables -A OUTPUT -d api.orasrs.net -j DROP'

# 触发同步
ssh root@192.168.1.1 'killall -USR1 node'

# 查看日志
ssh root@192.168.1.1 'tail -20 /var/log/orasrs.log'

# 恢复网络
ssh root@192.168.1.1 'iptables -D OUTPUT -d api.orasrs.net -j DROP'
```

**预期**: 看到 "falling back to public feeds" 和 "✓ Public feed sync successful"

### 场景 3: 离线模式

```bash
# 断网测试（小心！）
ssh root@192.168.1.1 'ifconfig eth0 down'

# 触发同步
ssh root@192.168.1.1 'killall -USR1 node'

# 查看日志（需要从串口或其他方式）
# 预期: "⚠ Offline mode: Using cached threat data"

# 恢复网络
ssh root@192.168.1.1 'ifconfig eth0 up'
```

## 🔍 故障排查

### 问题: 服务无法启动

```bash
# 检查日志
ssh root@192.168.1.1 'tail -50 /var/log/orasrs.log'

# 检查进程
ssh root@192.168.1.1 'ps | grep orasrs'

# 手动启动测试
ssh root@192.168.1.1 'node /usr/lib/orasrs/orasrs-lite.js'
```

### 问题: 无法连接区块链

```bash
# 测试网络
ssh root@192.168.1.1 'ping -c 3 api.orasrs.net'

# 测试 HTTPS
ssh root@192.168.1.1 'curl -I https://api.orasrs.net'

# 测试本地 Hardhat
ssh root@192.168.1.1 'curl -X POST http://127.0.0.1:8545 -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_blockNumber\",\"params\":[],\"id\":1}"'
```

### 问题: 数据库错误

```bash
# 检查数据库
ssh root@192.168.1.1 'ls -lh /var/lib/orasrs/cache.db'

# 检查完整性
ssh root@192.168.1.1 'sqlite3 /var/lib/orasrs/cache.db "PRAGMA integrity_check"'

# 重建数据库
ssh root@192.168.1.1 'rm /var/lib/orasrs/cache.db && /etc/init.d/orasrs restart'
```

## 📈 性能监控

```bash
# 内存使用
ssh root@192.168.1.1 'free -h'

# 进程信息
ssh root@192.168.1.1 'ps aux | grep orasrs'

# 磁盘使用
ssh root@192.168.1.1 'du -sh /var/lib/orasrs'

# 同步统计
ssh root@192.168.1.1 'grep "sync successful" /var/log/orasrs.log | wc -l'
```

## 🎯 成功指标

部署成功的标志：

- ✅ 测试脚本全部通过
- ✅ 日志中看到 "✓ Blockchain sync successful" 或 "✓ Public feed sync successful"
- ✅ 数据库中有威胁数据（COUNT > 0）
- ✅ API 端点响应正常
- ✅ 进程持续运行

## 📚 相关文档

- 完整部署指南: `OPENWRT_DEPLOYMENT_GUIDE.md`
- T3 优化说明: `OPENWRT_T3_OPTIMIZATION.md`
- Hardhat 守护进程: `HARDHAT_DAEMON_GUIDE.md`

## 🆘 紧急回滚

```bash
# 查找备份
ssh root@192.168.1.1 'ls -lh /usr/lib/orasrs/*.backup.*'

# 恢复备份（替换时间戳）
ssh root@192.168.1.1 'cp /usr/lib/orasrs/orasrs-lite.js.backup.20251218_030000 /usr/lib/orasrs/orasrs-lite.js'

# 重启服务
ssh root@192.168.1.1 '/etc/init.d/orasrs restart'
```

---

**提示**: 将您的 OpenWrt 设备 IP 替换为实际 IP 地址（如 192.168.10.1）
