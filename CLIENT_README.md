# OraSRS (Oracle Security Root Service) 客户端

OraSRS (Oracle Security Root Service) 是一个咨询式风险评分服务，为 IP 和域名提供风险评估。客户端连接到 OraSRS 协议链 (api.orasrs.net) 以获取威胁情报和风险评估。

## 功能特性

- **威胁情报查询**：查询 IP 或域名的风险评分
- **风险评估**：基于多源证据的综合风险评估
- **去重逻辑**：防止重复威胁报告
- **区块链集成**：连接 OraSRS 协议链进行验证
- **合规性**：符合 GDPR、CCPA 和中国网络安全法要求
- **三层架构**：边缘层、共识层、智能层

## 预编译二进制文件

我们提供了预编译的二进制文件，无需安装 Node.js 环境即可运行：

### 下载地址

- **Linux**: `orasrs-simple-client-linux`
- **macOS**: `orasrs-simple-client-macos`  
- **Windows**: `orasrs-simple-client-win.exe`

### 使用方法

```bash
# Linux
chmod +x orasrs-simple-client-linux
./orasrs-simple-client-linux

# macOS
chmod +x orasrs-simple-client-macos
./orasrs-simple-client-macos

# Windows
orasrs-simple-client-win.exe
```

### 环境变量配置

```bash
# 服务端口 (默认: 3006)
export ORASRS_PORT=3006

# 监听地址 (默认: 0.0.0.0)
export ORASRS_HOST=0.0.0.0

# 日志文件 (默认: ./logs/orasrs-service.log)
export ORASRS_LOG_FILE=./logs/orasrs-service.log

# 是否启用日志 (默认: true)
export ORASRS_ENABLE_LOGGING=true

# OraSRS 协议链端点 (默认: https://api.orasrs.net)
export ORASRS_BLOCKCHAIN_ENDPOINT=https://api.orasrs.net

# OraSRS 协议链ID (默认: 8888)
export ORASRS_CHAIN_ID=8888

# OraSRS 合约地址
export ORASRS_CONTRACT_ADDRESS=0x0B306BF915C4d645ff596e518fAf3F9669b97016
```

## API 端点

服务启动后，可通过以下端点访问：

- **健康检查**: `GET /health`
- **风险查询**: `GET /orasrs/v1/query?ip=1.2.3.4&domain=example.com`
- **快速查询**: `GET /orasrs/v1/lookup/{ip_or_domain}`
- **申诉接口**: `POST /orasrs/v1/appeal`
- **透明化报告**: `GET /orasrs/v1/explain?ip=1.2.3.4`
- **威胁列表**: `GET /orasrs/v2/threat-list`

## 威胁情报 API (v2.0)

- **获取全局威胁列表**: `GET /orasrs/v2/threat-list`
- **威胁情报申诉**: `POST /orasrs/v1/appeal`

## 去重逻辑

客户端实现了多层去重机制：

1. **时间窗口去重**：在 5 分钟时间窗口内防止重复威胁报告
2. **证据去重**：对相同类型和详情的证据进行去重
3. **区块链层去重**：在 OraSRS 协议链层面防止重复提交

## 三层架构

OraSRS 采用三层共识架构：

1. **边缘层**：轻量级威胁检测节点
2. **共识层**：验证和存证节点
3. **智能层**：威胁情报协调网络

## 区块链集成

- 所有威胁情报记录在 OraSRS 协议链上
- 通过长安链技术实现多方共识
- 支持国密算法 (SM2/SM3/SM4)
- 提供透明和不可篡改的验证机制

## 安全合规

- 国密算法支持 (SM2/SM3/SM4)
- 数据本地化处理
- GDPR/CCPA 合规
- 最小化数据收集
- 符合中国网络安全法要求

## 重要提醒

此服务提供咨询建议，最终决策由客户端做出。OraSRS 不直接阻断流量，而是提供风险评估供客户端参考。

## 许可证

MIT License