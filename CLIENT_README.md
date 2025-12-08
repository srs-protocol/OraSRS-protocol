# OraSRS (Oracle Security Root Service) 客户端

OraSRS (Oracle Security Root Service) 是一个咨询式风险评分服务，为 IP 和域名提供风险评估。客户端连接到 OraSRS 协议链 (api.orasrs.net)，这是一个基于Hardhat和Geth的私有链，Chain ID为8888，以获取威胁情报和风险评估。

## 功能特性

- **威胁情报查询**：查询 IP 或域名的风险评分
- **风险评估**：基于多源证据的综合风险评估
- **去重逻辑**：防止重复威胁报告
- **区块链集成**：连接 OraSRS 协议链进行验证
- **合规性**：符合 GDPR、CCPA 和中国网络安全法要求
- **三层架构**：边缘层、共识层、智能层
- **威胁检测**：内置日志分析、蜜罐和深度包检测功能
- **Gas补贴**：新用户可申请Gas补贴以获得初始交易费用

## 一键安装 (Linux)

使用以下命令一键安装 OraSRS Linux 客户端：

```bash
curl -fsSL https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/install-orasrs-client.sh | bash
```

或

```bash
wget -O - https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/install-orasrs-client.sh | bash
```

安装完成后，服务将自动启动并设置为开机自启。

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
export ORASRS_CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

## Docker 部署

### 使用 Dockerfile

```bash
# 构建镜像
docker build -f Dockerfile.client -t orasrs-client .

# 运行容器
docker run -d --name orasrs-client -p 3006:3006 orasrs-client
```

### 使用 Docker Compose

```bash
# 启动服务
docker-compose -f docker-compose.client.yml up -d

# 查看日志
docker-compose -f docker-compose.client.yml logs -f

# 停止服务
docker-compose -f docker-compose.client.yml down
```

## API 端点

服务启动后，可通过以下端点访问：

- **健康检查**: `GET /health`
- **风险查询**: `GET /orasrs/v1/query?ip=1.2.3.4&domain=example.com`
- **快速查询**: `GET /orasrs/v1/lookup/{ip_or_domain}`
- **申诉接口**: `POST /orasrs/v1/appeal`
- **透明化报告**: `GET /orasrs/v1/explain?ip=1.2.3.4`
- **威胁列表**: `GET /orasrs/v2/threat-list`
- **Gas补贴请求**: `POST /orasrs/v1/gas-subsidy/request`
- **Gas补贴状态**: `GET /orasrs/v1/gas-subsidy/status/{address}`
- **检测威胁列表**: `GET /orasrs/v1/threats/detected`
- **威胁统计**: `GET /orasrs/v1/threats/stats`
- **提交威胁**: `POST /orasrs/v1/threats/submit`

## 威胁情报 API (v2.0)

- **获取全局威胁列表**: `GET /orasrs/v2/threat-list`
- **威胁情报申诉**: `POST /orasrs/v1/appeal`

## 服务管理 (Linux 一键安装版本)

```bash
# 启动服务
sudo systemctl start orasrs-client

# 停止服务
sudo systemctl stop orasrs-client

# 重启服务
sudo systemctl restart orasrs-client

# 查看服务状态
sudo systemctl status orasrs-client

# 查看实时日志
sudo journalctl -u orasrs-client -f
```

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

## 威胁检测功能

客户端内置了三种威胁检测方法：

### 1. 基于日志的分析 (Fail2Ban原理)
- 实时监控系统日志（如 `/var/log/auth.log`, `/var/log/nginx/access.log`）
- 检测SSH暴力破解攻击：当1分钟内出现5次失败登录时标记为威胁
- 检测Web扫描：识别大量404请求
- 检测端口扫描：监控连接尝试

### 2. 蜜罐技术 (Honeypot)
- 在客户端上部署了假端口（23, 3306, 1433, 5432端口对应telnet, mysql, mssql, postgres）
- 任何连接到这些假端口的IP都会被直接标记为恶意活动
- 误报率几乎为0，因为正常用户不会连接这些端口

### 3. 深度包检测 (DPI/NIDS)
- 模拟网络流量分析
- 检测SQL注入、XSS等攻击模式
- 可以扩展为实际的pcap库实现

## Gas补贴功能

新用户可以通过API申请Gas补贴以获得初始交易费用：

### 申请Gas补贴
```bash
curl -X POST http://localhost:3006/orasrs/v1/gas-subsidy/request \
  -H "Content-Type: application/json" \
  -d '{"userAddress":"0xYOUR_WALLET_ADDRESS", "ip":"YOUR_IP"}'
```

### 查询补贴状态
```bash
curl -X GET http://localhost:3006/orasrs/v1/gas-subsidy/status/0xYOUR_WALLET_ADDRESS
```

## 重要提醒

此服务提供咨询建议，最终决策由客户端做出。OraSRS 不直接阻断流量，而是提供风险评估供客户端参考。

## 客户端响应类型

OraSRS 客户端根据区块链连接状态和数据可用性提供以下响应类型：

- **正常数据响应** (`version: "2.0-contract"`): 从区块链合约获取的实时威胁数据
- **无数据响应** (`version: "2.0-no-data"`): 区块链中未找到特定IP的威胁数据，返回"无数据"状态
- **离线响应** (`version: "2.0-offline"`): 无法连接到区块链时返回离线状态

客户端不再在区块链连接失败时返回模拟数据，确保响应的准确性和透明度。

## 许可证

MIT License