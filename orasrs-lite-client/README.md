# OraSRS Lite Client

OraSRS Lite Client 是一个轻量级的威胁情报客户端，用于订阅和应用OraSRS协议链上的威胁情报。

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