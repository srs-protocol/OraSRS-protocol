# Hardhat 本地节点服务 - 使用指南

## 概述

本文档介绍如何使用 systemd 服务管理 Hardhat 本地节点，实现自动重启和开机自启功能。

## 文件说明

### 1. hardhat-node.service
systemd 服务配置文件，定义了 Hardhat 节点的运行方式和自动重启策略。

**位置**: `/etc/systemd/system/hardhat-node.service`

**关键配置**:
- `Restart=always`: 服务异常退出时自动重启
- `RestartSec=10`: 重启前等待 10 秒
- `WorkingDirectory=/home/Great/SRS-Protocol`: 工作目录
- `Environment=HARDHAT_SECURE_MODE=true`: 启用安全模式

### 2. manage-hardhat-service.sh
服务管理脚本，提供便捷的命令来管理 Hardhat 节点服务。

**位置**: `/home/Great/SRS-Protocol/manage-hardhat-service.sh`

## 快速开始

### 安装服务

```bash
cd /home/Great/SRS-Protocol
sudo ./manage-hardhat-service.sh install
```

### 启动服务

```bash
sudo ./manage-hardhat-service.sh start
```

### 查看状态

```bash
sudo ./manage-hardhat-service.sh status
```

### 查看日志

```bash
sudo ./manage-hardhat-service.sh logs
```

按 `Ctrl+C` 退出日志查看。

## 完整命令列表

### 服务管理命令

| 命令 | 说明 | 示例 |
|------|------|------|
| `install` | 安装服务并设置开机自启 | `sudo ./manage-hardhat-service.sh install` |
| `uninstall` | 卸载服务 | `sudo ./manage-hardhat-service.sh uninstall` |
| `start` | 启动服务 | `sudo ./manage-hardhat-service.sh start` |
| `stop` | 停止服务 | `sudo ./manage-hardhat-service.sh stop` |
| `restart` | 重启服务 | `sudo ./manage-hardhat-service.sh restart` |
| `status` | 查看服务状态 | `sudo ./manage-hardhat-service.sh status` |
| `logs` | 实时查看日志 | `sudo ./manage-hardhat-service.sh logs` |
| `test-restart` | 测试自动重启功能 | `sudo ./manage-hardhat-service.sh test-restart` |

### 使用 systemctl 命令（可选）

也可以直接使用 systemctl 命令：

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

# 查看最近 50 条日志
sudo journalctl -u hardhat-node -n 50

# 禁用开机自启
sudo systemctl disable hardhat-node

# 启用开机自启
sudo systemctl enable hardhat-node
```

## 自动重启功能

### 工作原理

服务配置了以下自动重启策略：

```ini
Restart=always          # 总是重启（无论退出原因）
RestartSec=10          # 重启前等待 10 秒
```

这意味着：
- ✅ 进程崩溃时自动重启
- ✅ 手动 kill 进程后自动重启
- ✅ 系统重启后自动启动
- ✅ 服务异常退出时自动重启

### 测试自动重启

运行测试命令：

```bash
sudo ./manage-hardhat-service.sh test-restart
```

测试过程：
1. 获取当前进程 PID
2. 强制终止进程（kill -9）
3. 等待 12 秒
4. 验证服务是否自动重启
5. 显示新的进程 PID

**预期输出**:
```
[INFO] 测试自动重启功能...
[INFO] 当前进程 PID: 240050
[INFO] 终止进程以测试自动重启...
[INFO] 等待服务自动重启...
[SUCCESS] 服务已自动重启！
[SUCCESS] 新进程 PID: 240123
```

## 服务配置详解

### 环境变量

```ini
Environment=NODE_ENV=development
Environment=HARDHAT_SECURE_MODE=true
Environment=PATH=/usr/bin:/usr/local/bin:/www/server/nodejs/v24.11.1/bin
```

### 资源限制

```ini
LimitNOFILE=65536      # 最大打开文件数
LimitNPROC=4096        # 最大进程数
```

### 进程管理

```ini
KillMode=process       # 只杀死主进程
KillSignal=SIGTERM     # 使用 SIGTERM 信号
TimeoutStopSec=30      # 停止超时时间 30 秒
```

## 日志管理

### 查看实时日志

```bash
sudo journalctl -u hardhat-node -f
```

### 查看最近日志

```bash
# 最近 50 条
sudo journalctl -u hardhat-node -n 50

# 最近 100 条
sudo journalctl -u hardhat-node -n 100
```

### 按时间范围查看

```bash
# 今天的日志
sudo journalctl -u hardhat-node --since today

# 最近 1 小时
sudo journalctl -u hardhat-node --since "1 hour ago"

# 指定时间范围
sudo journalctl -u hardhat-node --since "2025-12-17 00:00:00" --until "2025-12-17 23:59:59"
```

### 导出日志

```bash
# 导出到文件
sudo journalctl -u hardhat-node > hardhat-node.log

# 导出最近 100 条
sudo journalctl -u hardhat-node -n 100 > hardhat-recent.log
```

## 连接到 Hardhat 节点

### 本地连接

```bash
# HTTP RPC 端点
http://127.0.0.1:8545

# 使用 curl 测试
curl -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### 在代码中使用

```javascript
// JavaScript/Node.js
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');

// 获取区块号
const blockNumber = await provider.getBlockNumber();
console.log('Current block:', blockNumber);
```

```python
# Python
from web3 import Web3

w3 = Web3(Web3.HTTPProvider('http://127.0.0.1:8545'))
print('Connected:', w3.is_connected())
print('Block number:', w3.eth.block_number)
```

## 故障排查

### 服务无法启动

1. 检查端口是否被占用：
```bash
sudo lsof -i :8545
```

2. 查看详细错误日志：
```bash
sudo journalctl -u hardhat-node -n 50 --no-pager
```

3. 检查 Node.js 和 npx 是否可用：
```bash
which node
which npx
node --version
```

### 服务频繁重启

查看日志找出原因：
```bash
sudo journalctl -u hardhat-node -f
```

常见原因：
- 端口冲突
- 内存不足
- 配置文件错误
- 依赖包缺失

### 手动停止自动重启

临时禁用自动重启：
```bash
sudo systemctl stop hardhat-node
sudo systemctl disable hardhat-node
```

重新启用：
```bash
sudo systemctl enable hardhat-node
sudo systemctl start hardhat-node
```

## 性能监控

### 查看资源使用

```bash
# 查看服务状态（包含内存和 CPU）
sudo systemctl status hardhat-node

# 使用 top 监控
top -p $(systemctl show hardhat-node -p MainPID --value)

# 使用 htop（如果已安装）
htop -p $(systemctl show hardhat-node -p MainPID --value)
```

### 查看进程信息

```bash
# 获取 PID
PID=$(systemctl show hardhat-node -p MainPID --value)

# 查看详细信息
ps aux | grep $PID

# 查看内存使用
cat /proc/$PID/status | grep -i mem
```

## 安全建议

1. **仅本地访问**: 服务配置为只监听 `127.0.0.1`，不对外开放
2. **安全模式**: 启用了 `HARDHAT_SECURE_MODE`，限制危险的 RPC 方法
3. **资源限制**: 配置了文件和进程数限制，防止资源耗尽
4. **日志记录**: 所有操作都记录到 systemd journal

## 卸载服务

如果需要完全移除服务：

```bash
# 停止并卸载服务
sudo ./manage-hardhat-service.sh uninstall

# 删除服务文件（可选）
rm /home/Great/SRS-Protocol/hardhat-node.service
rm /home/Great/SRS-Protocol/manage-hardhat-service.sh
```

## 常见问题

### Q: 服务启动后无法连接？
A: 检查防火墙设置和端口监听状态：
```bash
sudo ss -tlnp | grep 8545
```

### Q: 如何更改监听端口？
A: 编辑服务文件 `/etc/systemd/system/hardhat-node.service`，修改 `--port` 参数，然后重载配置：
```bash
sudo systemctl daemon-reload
sudo systemctl restart hardhat-node
```

### Q: 如何查看 Hardhat 账户？
A: 查看日志，Hardhat 启动时会显示测试账户：
```bash
sudo journalctl -u hardhat-node -n 100 | grep -A 20 "Account"
```

### Q: 服务占用内存过高？
A: 可以在服务文件中添加内存限制：
```ini
[Service]
MemoryLimit=512M
```

## 总结

通过 systemd 服务，您现在可以：
- ✅ 自动启动 Hardhat 节点
- ✅ 进程崩溃时自动重启
- ✅ 系统重启后自动恢复
- ✅ 方便地管理和监控服务
- ✅ 查看详细的运行日志

如有问题，请查看日志或联系技术支持。
