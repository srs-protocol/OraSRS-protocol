# Hardhat 服务守护进程部署指南

## 概述

为 OraSRS 本地 Hardhat 区块链节点创建了完整的守护进程解决方案，包括：

1. **增强的 systemd 服务** - 自动重启和资源管理
2. **健康监控守护进程** - 主动监控和智能恢复
3. **指数退避重试** - 防止服务频繁重启
4. **完整的管理工具** - 简化运维操作

## 核心功能

### 1. 自动重启策略

**systemd 配置** (`hardhat-node.service`):
- ✅ 服务崩溃后自动重启
- ✅ 指数退避延迟: 10s → 20s → 40s → 60s (最大)
- ✅ 5分钟内最多重启5次（防止无限重启）
- ✅ 资源限制: 2GB 内存, 200% CPU

### 2. 健康监控

**监控守护进程** (`hardhat-health-monitor.sh`):
- ✅ 每30秒检查一次服务健康状态
- ✅ RPC 端点响应性检测
- ✅ 自动重启失败的服务
- ✅ 详细日志记录到 `/var/log/hardhat-monitor.log`

### 3. 智能重试逻辑

**指数退避算法**:
```
重试次数 0: 立即重启
重试次数 1: 等待 10 秒
重试次数 2: 等待 20 秒
重试次数 3: 等待 40 秒
重试次数 4+: 等待 60 秒 (最大值)
```

## 快速开始

### 一键部署

```bash
# 自动安装和启动所有服务
sudo bash /home/Great/SRS-Protocol/deploy-hardhat-daemon.sh
```

### 手动部署

```bash
# 1. 安装服务
sudo bash /home/Great/SRS-Protocol/manage-hardhat-service.sh install

# 2. 启动 Hardhat 节点
sudo systemctl start hardhat-node

# 3. 启动健康监控
sudo systemctl start hardhat-health-monitor

# 4. 检查状态
sudo systemctl status hardhat-node
sudo systemctl status hardhat-health-monitor
```

## 管理命令

### Hardhat 节点服务

```bash
# 启动服务
sudo systemctl start hardhat-node

# 停止服务
sudo systemctl stop hardhat-node

# 重启服务
sudo systemctl restart hardhat-node

# 查看状态
sudo systemctl status hardhat-node

# 查看日志
sudo journalctl -u hardhat-node -f

# 查看最近50行日志
sudo journalctl -u hardhat-node -n 50
```

### 健康监控服务

```bash
# 启动监控
sudo bash manage-hardhat-service.sh monitor

# 停止监控
sudo bash manage-hardhat-service.sh monitor-stop

# 查看监控状态
sudo bash manage-hardhat-service.sh monitor-status

# 执行健康检查
sudo bash manage-hardhat-service.sh health-check

# 查看监控日志
sudo tail -f /var/log/hardhat-monitor.log
```

### 测试自动重启

```bash
# 测试自动重启功能
sudo bash manage-hardhat-service.sh test-restart
```

## 健康检查机制

### 检查项目

1. **服务状态检查**
   - 验证 systemd 服务是否运行
   - 检查进程是否存活

2. **RPC 响应检查**
   - 调用 `eth_blockNumber` 方法
   - 验证 JSON-RPC 响应
   - 5秒超时限制

3. **综合健康评估**
   - 结合服务状态和 RPC 响应
   - 连续失败计数
   - 自动触发重启

### 健康检查日志示例

```
2025-12-18 02:48:00 [INFO] Hardhat 健康监控已启动
2025-12-18 02:48:00 [INFO] 检查间隔: 30s
2025-12-18 02:48:00 [INFO] RPC 端点: http://127.0.0.1:8545
2025-12-18 02:48:30 [INFO] 服务运行正常 (总重启次数: 0)
2025-12-18 02:49:00 [ERROR] 健康检查失败 (连续失败次数: 1)
2025-12-18 02:49:00 [WARNING] 准备重启 Hardhat 服务 (重试次数: 1, 延迟: 10s)
2025-12-18 02:49:10 [SUCCESS] Hardhat 服务重启成功
2025-12-18 02:49:20 [SUCCESS] Hardhat 服务健康检查通过
```

## 文件结构

```
/home/Great/SRS-Protocol/
├── hardhat-node.service              # systemd 服务配置
├── hardhat-health-monitor.service    # 监控服务配置
├── hardhat-health-monitor.sh         # 健康监控守护进程
├── manage-hardhat-service.sh         # 服务管理脚本
├── deploy-hardhat-daemon.sh          # 一键部署脚本
└── start-secure-hardhat-node.sh      # 安全启动脚本（旧版）

/etc/systemd/system/
├── hardhat-node.service              # 已安装的服务
└── hardhat-health-monitor.service    # 已安装的监控服务

/var/log/
└── hardhat-monitor.log               # 监控日志

/var/run/
└── hardhat-monitor.pid               # 监控进程 PID
```

## 配置说明

### systemd 服务配置

**关键参数**:
- `Restart=always` - 总是自动重启
- `RestartSec=10` - 初始重启延迟10秒
- `StartLimitInterval=300` - 5分钟时间窗口
- `StartLimitBurst=5` - 最多重启5次
- `MemoryMax=2G` - 最大内存限制
- `CPUQuota=200%` - CPU 配额（2核）

### 监控配置

**可调参数** (在 `hardhat-health-monitor.sh` 中):
```bash
CHECK_INTERVAL=30          # 健康检查间隔（秒）
MAX_RETRY_DELAY=300        # 最大重试延迟（秒）
INITIAL_RETRY_DELAY=10     # 初始重试延迟（秒）
```

## 故障排查

### 服务无法启动

```bash
# 查看详细错误日志
sudo journalctl -u hardhat-node -n 50 --no-pager

# 检查端口占用
sudo lsof -i :8545

# 手动测试启动
cd /home/Great/SRS-Protocol
npx hardhat node --hostname 127.0.0.1 --port 8545
```

### 监控服务异常

```bash
# 查看监控日志
sudo tail -100 /var/log/hardhat-monitor.log

# 手动执行健康检查
sudo bash hardhat-health-monitor.sh test

# 重启监控服务
sudo systemctl restart hardhat-health-monitor
```

### 频繁重启

如果服务频繁重启，检查：
1. 系统资源是否充足（内存、CPU）
2. Node.js 版本是否兼容
3. Hardhat 配置是否正确
4. 网络端口是否冲突

```bash
# 查看系统资源
free -h
top -bn1 | head -20

# 查看 Node.js 版本
node --version

# 检查配置文件
cat hardhat.config.cjs
```

## 性能优化

### 资源限制调整

如果需要调整资源限制，编辑 `hardhat-node.service`:

```ini
# 增加内存限制到 4GB
MemoryMax=4G

# 增加 CPU 配额到 4核
CPUQuota=400%
```

然后重新加载配置:
```bash
sudo systemctl daemon-reload
sudo systemctl restart hardhat-node
```

### 监控间隔调整

编辑 `hardhat-health-monitor.sh`:
```bash
# 减少检查间隔到15秒（更敏感）
CHECK_INTERVAL=15

# 或增加到60秒（减少开销）
CHECK_INTERVAL=60
```

## 安全建议

1. **仅监听本地地址** - Hardhat 节点绑定到 `127.0.0.1`，不暴露到公网
2. **日志轮转** - 配置 logrotate 防止日志文件过大
3. **资源限制** - systemd 限制内存和 CPU 使用
4. **权限控制** - 服务以 root 运行（生产环境建议使用专用用户）

## 下一步

- [ ] 配置日志轮转 (`/etc/logrotate.d/hardhat`)
- [ ] 添加告警通知（邮件/Webhook）
- [ ] 集成 Prometheus 监控
- [ ] 创建备份脚本

## 相关文档

- [Hardhat 官方文档](https://hardhat.org/)
- [systemd 服务管理](https://www.freedesktop.org/software/systemd/man/systemd.service.html)
- [OraSRS 协议文档](../README.md)
