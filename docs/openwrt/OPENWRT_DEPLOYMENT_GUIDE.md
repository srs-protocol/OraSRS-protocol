# OraSRS OpenWrt T3 模块部署指南

## 快速部署

### 1. 准备工作

**确认信息**:
- OpenWrt 设备 IP 地址（默认: 192.168.1.1）
- SSH 用户名（默认: root）
- SSH 端口（默认: 22）

**检查本地文件**:
```bash
# 确认优化后的文件存在
ls -lh openwrt/orasrs-client/orasrs-lite.js
```

---

### 2. 一键部署

**基本用法**:
```bash
# 使用默认参数 (192.168.1.1, root, 22)
bash deploy-openwrt-t3.sh

# 指定设备 IP
bash deploy-openwrt-t3.sh 192.168.10.1

# 指定完整参数
bash deploy-openwrt-t3.sh 192.168.10.1 root 22
```

**部署流程**:
1. ✅ 备份现有配置
2. ✅ 创建必要目录
3. ✅ 上传优化后的 T3 模块
4. ✅ 设置文件权限
5. ✅ 检查依赖
6. ✅ 重启服务

---

### 3. 测试验证

**运行测试**:
```bash
# 使用默认参数
bash test-openwrt-t3.sh

# 指定设备 IP
bash test-openwrt-t3.sh 192.168.10.1

# 指定完整参数
bash test-openwrt-t3.sh 192.168.10.1 root 22
```

**测试项目**:
- ✅ 服务状态检查
- ✅ 数据库完整性
- ✅ API 端点功能
- ✅ 同步功能
- ✅ 日志记录

---

## 手动部署步骤

如果自动部署脚本无法使用，可以手动执行以下步骤：

### 步骤 1: 连接到 OpenWrt 设备

```bash
ssh root@192.168.1.1
```

### 步骤 2: 备份现有文件

```bash
# 如果已安装旧版本
if [ -f /usr/lib/orasrs/orasrs-lite.js ]; then
    cp /usr/lib/orasrs/orasrs-lite.js /usr/lib/orasrs/orasrs-lite.js.backup.$(date +%Y%m%d_%H%M%S)
fi
```

### 步骤 3: 创建目录

```bash
mkdir -p /usr/lib/orasrs
mkdir -p /var/lib/orasrs
mkdir -p /var/log
```

### 步骤 4: 上传文件

**在本地机器上执行**:
```bash
scp openwrt/orasrs-client/orasrs-lite.js root@192.168.1.1:/usr/lib/orasrs/
```

### 步骤 5: 设置权限

**在 OpenWrt 设备上执行**:
```bash
chmod +x /usr/lib/orasrs/orasrs-lite.js
```

### 步骤 6: 安装依赖（如果需要）

```bash
# 更新包列表
opkg update

# 安装 Node.js
opkg install node

# 安装 curl
opkg install curl

# 安装 SQLite (可选)
opkg install sqlite3-cli
```

### 步骤 7: 启动服务

```bash
# 如果有 init 脚本
/etc/init.d/orasrs restart

# 或手动启动
node /usr/lib/orasrs/orasrs-lite.js &
```

---

## 验证部署

### 1. 检查服务状态

```bash
# 检查进程
ps | grep orasrs-lite

# 检查端口
netstat -tuln | grep 3006
```

### 2. 测试 API

```bash
# 健康检查
curl http://localhost:3006/health

# 查询 IP
curl 'http://localhost:3006/query?ip=8.8.8.8'

# 查看统计
curl http://localhost:3006/stats
```

### 3. 查看日志

```bash
# 实时日志
tail -f /var/log/orasrs.log

# 最近日志
tail -50 /var/log/orasrs.log

# 搜索错误
grep ERROR /var/log/orasrs.log
```

### 4. 检查数据库

```bash
# 查看威胁数量
sqlite3 /var/lib/orasrs/cache.db "SELECT COUNT(*) FROM threats"

# 查看威胁来源
sqlite3 /var/lib/orasrs/cache.db "SELECT source, COUNT(*) FROM threats GROUP BY source"

# 查看最近威胁
sqlite3 /var/lib/orasrs/cache.db "SELECT ip, risk_score, source FROM threats ORDER BY last_seen DESC LIMIT 10"
```

---

## 功能测试

### 测试 1: 区块链同步

**查看日志**:
```bash
tail -f /var/log/orasrs.log | grep -i blockchain
```

**预期输出**:
```
[INFO] Starting threat sync from blockchain...
[INFO] Trying blockchain endpoint: https://api.orasrs.net
[INFO] ✓ Updated 1523 threats from Blockchain
[INFO] ✓ Blockchain sync successful
```

### 测试 2: 公共源回退

**模拟区块链不可用**:
```bash
# 暂时阻止访问区块链端点（仅用于测试）
iptables -A OUTPUT -d api.orasrs.net -j DROP
iptables -A OUTPUT -d 127.0.0.1 -p tcp --dport 8545 -j DROP

# 触发同步
killall -USR1 node

# 查看日志
tail -f /var/log/orasrs.log
```

**预期输出**:
```
[WARN] Blockchain unavailable, falling back to public feeds...
[INFO] Trying public feed: https://feodotracker.abuse.ch/...
[INFO] ✓ Updated 856 threats from Public Feed
[INFO] ✓ Public feed sync successful
```

**恢复网络**:
```bash
iptables -D OUTPUT -d api.orasrs.net -j DROP
iptables -D OUTPUT -d 127.0.0.1 -p tcp --dport 8545 -j DROP
```

### 测试 3: 离线模式

**模拟完全离线**:
```bash
# 断开网络（仅用于测试）
ifconfig eth0 down

# 触发同步
killall -USR1 node

# 查看日志
tail -f /var/log/orasrs.log
```

**预期输出**:
```
[WARN] ⚠ Offline mode: Using cached threat data
[INFO] Cached threats: 1523
```

**恢复网络**:
```bash
ifconfig eth0 up
```

### 测试 4: 指数退避重试

**查看重试日志**:
```bash
grep -i retry /var/log/orasrs.log
```

**预期输出**:
```
[INFO] Retry 1/3 after 1000ms...
[INFO] Retry 2/3 after 2000ms...
[INFO] Retry 3/3 after 4000ms...
```

---

## 性能监控

### 资源使用

```bash
# 内存使用
free -h

# 进程内存
ps aux | grep orasrs-lite

# 磁盘使用
du -sh /var/lib/orasrs
```

### 同步统计

```bash
# 查看同步次数
grep "sync successful" /var/log/orasrs.log | wc -l

# 查看失败次数
grep "sync failed" /var/log/orasrs.log | wc -l

# 查看平均同步时间
grep "sync successful" /var/log/orasrs.log | tail -10
```

---

## 故障排查

### 问题 1: 服务无法启动

**检查**:
```bash
# 查看错误日志
tail -50 /var/log/orasrs.log

# 检查 Node.js
node --version

# 手动启动测试
node /usr/lib/orasrs/orasrs-lite.js
```

### 问题 2: 无法连接区块链

**检查**:
```bash
# 测试网络连接
ping -c 3 api.orasrs.net

# 测试 HTTPS
curl -I https://api.orasrs.net

# 测试本地 Hardhat
curl -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### 问题 3: 数据库错误

**检查**:
```bash
# 检查数据库文件
ls -lh /var/lib/orasrs/cache.db

# 检查数据库完整性
sqlite3 /var/lib/orasrs/cache.db "PRAGMA integrity_check"

# 重建数据库（如果损坏）
rm /var/lib/orasrs/cache.db
/etc/init.d/orasrs restart
```

### 问题 4: 内存不足

**检查**:
```bash
# 查看内存
free -h

# 清理缓存
sync; echo 3 > /proc/sys/vm/drop_caches

# 减少缓存大小（编辑配置）
vi /etc/config/orasrs
# 设置 cache_size = 500
```

---

## 配置优化

### 调整同步间隔

**编辑配置**:
```bash
vi /etc/config/orasrs
```

**修改参数**:
```
config orasrs 'main'
    option sync_interval '7200'  # 2小时同步一次（默认1小时）
```

### 调整缓存大小

```
config orasrs 'main'
    option cache_size '500'  # 减少到500条（默认1000）
```

### 添加自定义端点

```
config orasrs 'main'
    option blockchain_endpoints 'https://api.orasrs.net http://192.168.1.100:8545'
```

---

## 卸载

### 完全卸载

```bash
# 停止服务
/etc/init.d/orasrs stop

# 删除文件
rm -rf /usr/lib/orasrs
rm -rf /var/lib/orasrs
rm -f /var/log/orasrs.log

# 删除配置
rm -f /etc/config/orasrs
rm -f /etc/init.d/orasrs
```

### 仅回滚到旧版本

```bash
# 查找备份
ls -lh /usr/lib/orasrs/*.backup.*

# 恢复备份
cp /usr/lib/orasrs/orasrs-lite.js.backup.20251218_030000 /usr/lib/orasrs/orasrs-lite.js

# 重启服务
/etc/init.d/orasrs restart
```

---

## 下一步

部署成功后，建议：

1. **监控运行** - 观察日志几小时，确保稳定
2. **性能调优** - 根据设备资源调整配置
3. **定期备份** - 备份配置和数据库
4. **更新维护** - 定期检查更新

---

## 支持

如遇问题，请查看：
- 日志文件: `/var/log/orasrs.log`
- 配置文件: `/etc/config/orasrs`
- 数据库: `/var/lib/orasrs/cache.db`

或参考完整文档: `OPENWRT_T3_OPTIMIZATION.md`
