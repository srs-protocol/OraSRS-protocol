# 快速开始 / Getting Started

> 🇺🇸 **English Version: [Click here for the English Documentation](./01-getting-started.md)**

## ⚠️ 项目状态 - 最终版本 (v3.3.6)

> **项目已结项**: OraSRS v3.3.6 是最终版本，专注于 T0 内核级防御。
> **仅 T0**: 本版本仅包含基于 iptables/ipset 的威胁拦截。不含 Node.js、区块链或 T2/T3 功能。
> **威胁情报**: 自动从公共源同步（Feodo Tracker + EmergingThreats）。
> **科研参考**: DOI 10.31224/5985 | IETF draft-luo-orasrs-decentralized-threat-signaling-01

## 🚀 安装内容

OraSRS v3.3.6 为所有平台提供统一的 T0 内核防御方案：

| 组件 | 说明 | 内存占用 |
|------|------|----------|
| **T0 内核防御** | iptables/ipset + SYN 洪水防护 | < 5 MB |
| **公共威胁源** | 从 Feodo Tracker + EmergingThreats 自动同步 | 已包含 |
| **管理 CLI** | 简单的 bash 客户端控制工具 | < 1 MB |

**不包含的内容:**
- ❌ Node.js 运行时
- ❌ 区块链集成 (T2/T3)
- ❌ Web API 服务器
- ❌ 数据库依赖

## 方法一: 一键安装 (Linux)

使用以下命令安装 OraSRS T0 Linux 客户端：

```bash
curl -fsSL https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/install-orasrs-client.sh | bash
```

或：

```bash
wget -O - https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/install-orasrs-client.sh | bash
```

### 服务管理命令

```bash
# 启动服务
sudo systemctl start orasrs

# 停止服务
sudo systemctl stop orasrs

# 查看服务状态
sudo systemctl status orasrs

# 查看防护状态
sudo orasrs-client status

# 手动同步威胁数据
sudo orasrs-client sync

# 检查 IP 是否被拦截
sudo orasrs-client check 1.2.3.4
```

## 方法二: 通过 Git 克隆手动安装

如果使用 curl 方法遇到 GitHub CDN 缓存问题：

```bash
# 克隆仓库
cd /tmp
git clone -b lite-client https://github.com/srs-protocol/OraSRS-protocol.git
cd OraSRS-protocol

# 运行安装脚本
sudo bash install-orasrs-client.sh
```

## 验证

安装后，验证 OraSRS 是否正在保护您的系统：

```bash
# 检查 iptables 规则
sudo iptables -nvL orasrs_chain

# 查看已加载的威胁
sudo ipset list orasrs_threats | head -20

# 测试 IP 查询
sudo orasrs-client check 8.8.8.8
```

## 配置

编辑 `/etc/orasrs/config` 进行自定义：

```bash
# SYN 洪水防护速率限制
LIMIT_RATE="20/s"
LIMIT_BURST="50"

# 威胁同步间隔（秒）
SYNC_INTERVAL="3600"
```

修改配置后：
```bash
sudo systemctl reload orasrs
```

## OpenWrt 安装

对于 OpenWrt 设备，请参考 [OpenWrt & IoT 文档](./03-openwrt-iot_zh-CN.md)。

## 技术特性

### T0 内核防御机制

OraSRS T0 使用经过实战验证的内核级防御策略：

**1. 威胁源拦截**
- 基于 ipset 的黑名单匹配（< 0.001ms 查询延迟）
- 自动从公共威胁源同步
- 原子更新，无服务中断

**2. SYN 洪水防护**
- 可配置的速率限制（默认 20/s）
- 爆发容忍（默认 50 个连接）
- SSH 端口白名单保护

**3. SSH 暴力破解防护**
- 基于 recent 模块的连接跟踪
- 60 秒内最多 4 次连接尝试
- 超限自动丢弃

### 性能指标

根据实测（v3.3.6 最终验证）：

- **查询延迟**: 0.001ms (eBPF 内核加速)
- **抗压能力**: 40M PPS (4000万包/秒 SYN 洪水)
- **内存占用**: < 5 MB (完整运行时)
- **业务连续性**: SSH + ping 保持 0% 丢包

详见：[性能基准测试文档](./06-academic-perf_zh-CN.md)

## 故障排查

### 服务无法启动

```bash
# 查看服务日志
sudo journalctl -u orasrs -n 50

# 查看内核模块
lsmod | grep -E 'ip_set|xt_'

# 手动加载模块
sudo modprobe ip_set
sudo modprobe xt_set
```

### 威胁同步失败

```bash
# 检查网络连接
curl -I https://feodotracker.abuse.ch

# 手动触发同步
sudo orasrs-client sync

# 查看同步日志
sudo tail -f /var/log/orasrs.log
```

### 误拦截处理

如果发现合法 IP 被误拦截：

```bash
# 从黑名单中移除
sudo ipset del orasrs_threats <IP地址>

# 永久白名单（编辑配置文件）
echo "ipset add orasrs_whitelist <IP地址>" >> /etc/orasrs/whitelist.conf
```

## 卸载

```bash
# 停止并禁用服务
sudo systemctl stop orasrs
sudo systemctl disable orasrs

# 删除文件
sudo rm -f /usr/local/bin/orasrs-client
sudo rm -f /etc/systemd/system/orasrs.service
sudo rm -rf /etc/orasrs

# 清理 iptables 规则
sudo iptables -D INPUT -j orasrs_chain
sudo iptables -F orasrs_chain
sudo iptables -X orasrs_chain

# 清理 ipset
sudo ipset destroy orasrs_threats
```

## 下一步

- [用户指南](./02-user-guide_zh-CN.md) - 详细的 CLI 命令和使用技巧
- [OpenWrt & IoT](./03-openwrt-iot_zh-CN.md) - OpenWrt 路由器和 IoT 设备部署
- [核心架构](./04-architecture_zh-CN.md) - 深入了解 DTSP 协议和 T0-T3 架构
