# OraSRS 客户端配置指南

## 配置说明

OraSRS 客户端支持两种配置模式：

### 1. 公网连接模式（默认）
- 默认连接到 `https://api.orasrs.net`
- 适用于生产环境部署
- 配置已内置在客户端代码中

### 2. 本地开发模式
- 连接到本地 Hardhat 节点 `http://127.0.0.1:8545`
- 适用于本地开发和测试
- 通过 `local-config.json` 文件启用

## 使用方法

### 生产环境部署
直接运行客户端即可使用公网配置：

```bash
node orasrs-simple-client.js
```

### 本地开发环境
1. 确保本地 Hardhat 节点正在运行：
```bash
npx hardhat node
```

2. 启动客户端，它会自动检测并使用 `local-config.json`：
```bash
node orasrs-simple-client.js
```

或者，您也可以创建 `user-config.json` 文件来覆盖默认配置：

```json
{
  "network": {
    "blockchainEndpoint": "http://127.0.0.1:8545",
    "chainId": 31337
  }
}
```

## 配置优先级

配置文件的加载优先级如下：

1. `user-config.json` - 用户自定义配置（最高优先级）
2. `local-config.json` - 本地开发配置
3. 内置默认配置（最低优先级）

## 环境变量

您也可以使用环境变量覆盖配置：

```bash
export ORASRS_BLOCKCHAIN_ENDPOINT=http://127.0.0.1:8545
export ORASRS_CHAIN_ID=31337
node orasrs-simple-client.js
```