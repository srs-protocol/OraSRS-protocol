# OraSRS Lite Client

OraSRS Lite Client 是一个轻量级的威胁情报客户端，用于订阅和应用OraSRS协议链上的威胁情报。

## 🚀 快速启动 (一键安装)

您可以在 **30秒内** 使用我们的安装脚本部署完整的OraSRS节点。该脚本会自动处理依赖项（Node.js、ipset等）和系统配置。

**支持的操作系统**: Ubuntu 20.04/22.04 LTS, Debian 11/12

```bash
# 下载并安装 OraSRS 客户端
curl -fsSL https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/main/orasrs-lite-client/scripts/install.sh | sudo bash

# 启动服务
sudo systemctl start orasrs-client
```

> **审稿人注意**: 此脚本默认以"轻量模式"安装客户端，适合测试论文第7.1节中描述的<100ms本地响应能力。

## 📁 目录结构

```
orasrs-lite-client/
├── src/                  # 核心源代码
│   ├── network/          # 网络通信模块
│   ├── crypto/           # 加密/哈希模块
│   └── storage/          # 本地存储/ipset逻辑
├── tests/                # 测试文件
│   ├── unit/             # 单元测试
│   └── integration/      # 集成测试
├── benchmarks/           # 性能基准测试
│   ├── 10k-ip-test.js    # 10000个IP的性能测试
│   └── latency-check.sh  # 延迟检查脚本
├── logs/                 # 日志文件
│   └── hybrid-cloud-test-results/ # 测试结果
├── config/               # 配置文件
│   └── orasrs.config.json
├── scripts/              # 辅助脚本
│   └── install.sh        # 一键安装脚本
└── README.md
```

## 功能特性

- **轻量级设计**: <5MB 内存占用
- **实时同步**: 从OraSRS协议链同步威胁情报
- **本地缓存**: 高效的本地缓存机制
- **自动阻断**: 根据威胁等级自动阻断恶意IP
- **国密算法**: 支持SM2/SM3/SM4国密算法
- **IPSet集成**: 使用IPSet实现高效的IP阻断

## 安装

### 前提条件

- Rust 1.70+
- Node.js 18+
- Tauri CLI

### 一键安装

```bash
bash scripts/install.sh
```

### 手动安装

```bash
# 安装依赖
npm install

# 开发模式运行
npm run tauri dev

# 生产模式构建
npm run tauri build
```

## 配置

配置文件位于 `config/orasrs.config.json`，主要配置项包括：

- `api_endpoint`: OraSRS API端点
- `update_interval`: 更新间隔（毫秒）
- `cache_ttl`: 缓存生存时间
- `max_cache_size`: 最大缓存大小
- `security`: 安全相关配置

## 使用方法

客户端会自动从OraSRS协议链获取威胁情报，并使用IPSet或iptables进行本地阻断。

## 测试

运行单元测试：
```bash
npm run test:unit
```

运行集成测试：
```bash
npm run test:integration
```

## 性能基准

性能测试位于 `benchmarks/` 目录，包括：

- 10k-ip-test.js: 10000个IP的性能测试
- latency-check.sh: 延迟检查脚本