# 用户指南 / User Guide

> 🇺🇸 **English Version: [Click here for the English Documentation](./02-user-guide.md)**

## 🛠️ Client Tools / 客户端工具

### CLI Usage / CLI 使用

OraSRS 提供强大的命令行界面用于管理和查询。

```bash
# Query an IP with pretty output (default)
# 查询 IP（中文友好格式，默认）
orasrs-cli query 45.135.193.0

# Query with JSON output
# 查询并返回 JSON 格式
orasrs-cli query 45.135.193.0 --format json

# Report a threat (requires private key)
# 报告威胁（需要私钥）
orasrs-cli report 1.2.3.4 --reason "Phishing" --private-key <YOUR_KEY>

# Manually sync threat data from blockchain
# 手动从区块链同步威胁数据
orasrs-cli sync

# Force full sync (not incremental)
# 强制完整同步（非增量）
orasrs-cli sync --force

# Cache management
# 缓存管理
orasrs-cli cache status   # View cache status / 查看缓存状态
orasrs-cli cache clear    # Clear cache / 清空缓存
orasrs-cli cache rebuild  # Rebuild cache / 重建缓存

# Whitelist management
# 白名单管理
orasrs-cli whitelist add 1.2.3.4      # Add to whitelist / 添加到白名单
orasrs-cli whitelist remove 1.2.3.4   # Remove from whitelist / 从白名单移除
orasrs-cli whitelist list             # 列出所有

# 内核加速管理 (eBPF)
orasrs-cli kernel                    # 查看内核加速状态
orasrs-cli kernel --detailed         # 查看详细统计信息
orasrs-cli kernel-sync               # 手动同步威胁数据到内核
```

### CLI 输出格式示例 / CLI Output Example

**中文友好格式**（`--format pretty`，默认）：

```
🔍 查询 IP: 45.135.193.0

威胁情报:
  风险评分: 75/100
  风险等级: 高
  威胁类型: Botnet C2 (推测)
  数据来源: Local Cache (Abuse.ch)
  首次出现: 2025-12-10
  持续活跃: Yes

来源：测试协议链
缓存：是
📌 注意: OraSRS 仅提供风险评估，是否阻断请结合业务策略决定。
```

## 🧩 Client SDK / 客户端 SDK

开发者可以使用 OraSRS 客户端将威胁情报集成到应用中。

**安装 / Installation:**

```bash
git clone https://github.com/srs-protocol/OraSRS-protocol.git
cd OraSRS-protocol
npm install
node orasrs-simple-client.js
```

**基本用法 / Basic Usage:**

```javascript
// Query IP via HTTP API / 通过 HTTP API 查询 IP
const response = await fetch('http://localhost:3006/orasrs/v1/query?ip=45.135.193.0');
const data = await response.json();

console.log(data.response.risk_score);
console.log(data.response.risk_level);
```

**完整文档 / Full Documentation:**

- [SDK Usage Guide / SDK 使用指南](guides/SDK_USAGE_GUIDE.md)
- [API Reference / API 参考](api.md)

## 💻 OraSRS 轻量级客户端 (桌面版)

OraSRS轻量级客户端是一个基于Tauri框架（Rust + 前端）构建的桌面应用，专为资源受限环境设计。

**特性**:
- **增量更新** - 仅同步最新威胁情报
- **TTL过期淘汰** - 自动清理过期威胁数据
- **静默模式** - 默认静默运行
- **跨平台支持** - Windows, macOS, Linux

### 快速启动 / Quick Start
```bash
git clone https://github.com/srs-protocol/orasrs-protocol.git
cd orasrs-protocol/orasrs-lite-client
npm install
npm run tauri dev
```

## 🧩 客户端库 / Client Libraries
- [客户端实现指南 / Client Implementation Guide](guides/CLIENT_IMPLEMENTATION_GUIDE.md)
- Node.js: `npm install @SRA-client`
