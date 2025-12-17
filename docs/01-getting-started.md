# 快速开始 / Getting Started

## ⚠️ 测试阶段声明 / Beta Disclaimer

> **测试阶段声明**: 本项目处于 Beta 测试阶段，部分功能（如出站审查）默认为监控模式。
> **威胁情报源声明**: 在测试阶段，OraSRS 集成了 Spamhaus DROP, DShield, Abuse.ch Feodo Tracker 等开源威胁情报源。
> **生产环境建议**: 部署前请根据实际业务需求评估这些数据源，并配置本地白名单以避免误拦截。
> **测试节点地域政策**: OraSRS Alpha 测试目前仅面向中国大陆以外的节点开放。

## 🚀 部署模式与资源需求 / Deployment Modes

OraSRS 提供三种灵活的部署模式，以适应从云服务器到 IoT 设备的各种环境：

| 模式 | 适用场景 | 内存需求 | 核心组件 | 功能 |
|------|----------|----------|----------|------|
| **完整管理节点 (Full)** | 云服务器、网关 | ~90 MB | Node.js + eBPF | 完整 API、区块链交互、可视化、CLI |
| **混合模式 (Hybrid)** | 边缘网关、路由器 | ~30 MB | Python + eBPF | 核心防护、有限 API、自动同步 |
| **原生边缘代理 (Edge)** | IoT 设备、传感器 | **< 5 MB** | Native C + eBPF | 仅核心防护、被动更新、极致轻量 |

**注意**: 论文中提到的 "<5MB" 内存指标特指 **原生边缘代理 (Native Edge Agent)** 模式。默认安装脚本会自动检测设备内存并推荐合适的模式。

## 方式 1: 一键安装 (Linux)

使用以下命令一键安装 OraSRS Linux 客户端：

```bash
curl -fsSL https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/install-orasrs-client.sh | bash
```

或

```bash
wget -O - https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/install-orasrs-client.sh | bash
```

### 传统服务管理命令

```bash
# 启动服务
sudo systemctl start orasrs-client

# 停止服务
sudo systemctl stop orasrs-client

# 重启服务
sudo systemctl restart orasrs-client

# 查看服务状态
sudo systemctl status orasrs-client
```

## 方式 3: 手动安装 (Docker)

*(待补充详细 Docker 安装步骤)*
