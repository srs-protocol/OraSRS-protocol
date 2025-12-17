# OraSRS OpenWrt 防火墙规则 - 快速参考

## 📌 规则优先级顺序

```
1️⃣ 本地回环 (lo) → ACCEPT
2️⃣ 已建立/相关连接 → ACCEPT
   └─ 无效连接 → DROP
3️⃣ 威胁 IP 拦截 (ipset) → DROP ⚠️ 零容忍
   ├─ 必须在 SSH/SYN 防护之前
   └─ 性能优势: O(1) hash 查找
4️⃣ SSH 保护 (三重保障)
   ├─ 已建立连接 → ACCEPT
   ├─ 新连接限速 (4次/60秒) → 超限 DROP
   └─ 正常新连接 → ACCEPT
5️⃣ SYN Flood 防护
   ├─ 正常速率 (20/s, burst 50) → ACCEPT
   └─ 超额 SYN → DROP
6️⃣ ICMP 洪水防护
   ├─ Echo Request (5/s, burst 10) → ACCEPT
   ├─ 超额 Echo Request → DROP
   └─ 必要 ICMP 类型 → ACCEPT
7️⃣ 日志记录 (1/min)
```

## 🔧 配置参数

### UCI 配置路径
```bash
/etc/config/orasrs
```

### 可调参数
| 参数 | 默认值 | 说明 |
|------|--------|------|
| `limit_rate` | `20/s` | SYN 包速率限制 |
| `limit_burst` | `50` | SYN 包突发限制 |
| `sync_interval` | `3600` | 威胁情报同步间隔(秒) |

### 读取配置
```bash
# 查看当前配置
uci show orasrs

# 修改配置
uci set orasrs.main.limit_rate='30/s'
uci set orasrs.main.limit_burst='100'
uci commit orasrs

# 重新加载防火墙
/etc/init.d/firewall reload
```

## 🚨 应急模式

### Harden Mode (严格模式 - 遭受攻击时)
```bash
uci set orasrs.main.limit_rate='5/s'
uci set orasrs.main.limit_burst='10'
uci commit orasrs
/etc/init.d/firewall reload
```

### Relax Mode (宽松模式 - 正常运行时)
```bash
uci set orasrs.main.limit_rate='50/s'
uci set orasrs.main.limit_burst='100'
uci commit orasrs
/etc/init.d/firewall reload
```

### 紧急部署脚本
```bash
# 立即激活防护（无需重启）
sh /root/emergency-defense.sh
```

## 📊 监控命令

### 查看规则状态
```bash
# 查看 OraSRS 链
iptables -nvL orasrs_chain

# 查看 INPUT 链中的 OraSRS 引用
iptables -nvL INPUT | grep orasrs

# 查看 IPSet 统计
ipset list orasrs_threats -t
```

### 实时监控
```bash
# 监控规则计数器
watch -n1 'iptables -nvL orasrs_chain'

# 监控日志
logread -f | grep ORASRS

# 监控系统日志
tail -f /var/log/messages | grep ORASRS
```

### 性能监控
```bash
# CPU 使用率
top -bn1 | grep iptables

# 内存使用
free -m

# 连接跟踪表
cat /proc/net/nf_conntrack | wc -l
```

## 🔍 故障排查

### 规则未生效
```bash
# 1. 检查 firewall.user 是否可执行
ls -l /etc/firewall.user
chmod +x /etc/firewall.user

# 2. 手动执行
/etc/firewall.user

# 3. 检查错误日志
logread | grep -i error
dmesg | grep -i iptables
```

### 内核模块未加载
```bash
# 检查模块
lsmod | grep -E "ip_set|xt_set|xt_limit|xt_conntrack|xt_recent"

# 手动加载
modprobe ip_set
modprobe ip_set_hash_net
modprobe xt_set
modprobe xt_limit
modprobe xt_conntrack
modprobe xt_recent
```

### SSH 被锁定
```bash
# 方法 1: 物理访问
# 通过串口或物理访问路由器，删除规则：
iptables -D INPUT -j orasrs_chain
iptables -F orasrs_chain

# 方法 2: Failsafe 模式
# 重启时按住 reset 按钮进入 failsafe 模式
# 挂载 overlay 并编辑 /etc/firewall.user
```

### IPSet 错误
```bash
# 删除并重建 ipset
ipset destroy orasrs_threats
ipset create orasrs_threats hash:net family inet hashsize 4096 maxelem 65536

# 重新加载防火墙
/etc/init.d/firewall reload
```

## 📈 性能调优

### 连接跟踪表大小
```bash
# 查看当前设置
cat /proc/sys/net/netfilter/nf_conntrack_max

# 增加连接跟踪表（如果内存充足）
echo 65536 > /proc/sys/net/netfilter/nf_conntrack_max

# 永久设置
echo "net.netfilter.nf_conntrack_max=65536" >> /etc/sysctl.conf
sysctl -p
```

### IPSet 优化
```bash
# 增加 hashsize（减少冲突）
ipset create orasrs_threats hash:net family inet hashsize 8192 maxelem 131072
```

### 日志优化
```bash
# 禁用日志（生产环境）
iptables -D orasrs_chain -m limit --limit 1/min -j LOG

# 或减少日志频率
iptables -R orasrs_chain <规则编号> -m limit --limit 1/hour -j LOG
```

## 🧪 测试命令

### 测试 SYN Flood 防护
```bash
# 从外部机器测试（需要 hping3）
hping3 -S -p 80 --flood YOUR_ROUTER_IP

# 观察丢包情况
watch -n1 'iptables -nvL orasrs_chain | grep "tcp flags:0x17/0x02"'
```

### 测试 SSH 限速
```bash
# 快速连接多次（应该被限制）
for i in {1..10}; do ssh root@YOUR_ROUTER_IP & done

# 查看 recent 模块状态
cat /proc/net/xt_recent/SSH
```

### 测试 ICMP 防护
```bash
# Ping 洪水测试
ping -f YOUR_ROUTER_IP

# 观察限速效果
watch -n1 'iptables -nvL orasrs_chain | grep icmp'
```

## 📝 规则解析

### SYN 标志位
```
--tcp-flags SYN,ACK SYN  # 匹配 SYN 包（SYN=1, ACK=0）
--syn                     # 简写形式
```

### Conntrack 状态
```
ESTABLISHED  # 已建立的连接
RELATED      # 相关连接（如 FTP 数据连接）
NEW          # 新连接
INVALID      # 无效连接
```

### Recent 模块
```
--name SSH --set                           # 记录 IP
--update --seconds 60 --hitcount 4         # 60秒内超过4次
```

## 🔐 安全建议

1. **修改默认 SSH 端口**
   ```bash
   uci set dropbear.@dropbear[0].Port='2222'
   uci commit dropbear
   /etc/init.d/dropbear restart
   ```

2. **禁用密码认证**
   ```bash
   uci set dropbear.@dropbear[0].PasswordAuth='off'
   uci set dropbear.@dropbear[0].RootPasswordAuth='off'
   uci commit dropbear
   ```

3. **定期更新威胁情报**
   ```bash
   # 添加到 crontab
   echo "0 */6 * * * /usr/bin/orasrs-client sync" >> /etc/crontabs/root
   /etc/init.d/cron restart
   ```

4. **启用日志轮转**
   ```bash
   # 编辑 /etc/config/system
   uci set system.@system[0].log_size='64'
   uci commit system
   ```

## 📚 相关文件

| 文件路径 | 说明 |
|---------|------|
| `/etc/firewall.user` | 主防火墙规则文件 |
| `/etc/config/orasrs` | UCI 配置文件 |
| `/etc/init.d/orasrs` | 服务启动脚本 |
| `/etc/hotplug.d/firewall/99-orasrs` | 防火墙热插拔脚本 |
| `/usr/bin/orasrs-client` | 客户端主程序 |
| `/usr/bin/orasrs-cli` | CLI 工具 |
| `/var/log/orasrs.log` | 应用日志 |

## 🆘 紧急联系

如遇到严重问题：
1. 保存当前规则：`iptables-save > /tmp/rules.backup`
2. 清除所有规则：`iptables -F && iptables -X`
3. 恢复默认防火墙：`/etc/init.d/firewall restart`
4. 查看文档：`/root/openwrt/README.md`
