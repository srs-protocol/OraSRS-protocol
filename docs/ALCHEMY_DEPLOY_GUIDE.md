# 如何使用 Alchemy 部署 OraSRS 混合L2架构

## 1. Alchemy 账号设置

### 创建 Alchemy 账号
1. 访问 [Alchemy官网](https://www.alchemy.com/)
2. 点击 "Sign Up" 创建账号
3. 验证邮箱并登录

### 创建应用
1. 登录后点击 "Create App"
2. 填写应用信息：
   - App Name: "OraSRS-Testnet" 
   - Chain: Ethereum 或 Optimism
   - Network: Sepolia 或 OP Sepolia
3. 点击 "Create App"

### 获取 API Key
1. 在应用页面找到 "API Keys" 部分
2. 复制 "HTTP" 或 "Websocket" 端点
3. 示例格式：
   ```
   https://opt-sepolia.g.alchemy.com/v2/YOUR_API_KEY
   ```

## 2. 环境配置

### 设置环境变量
创建 `.env` 文件：
```bash
# .env
# Alchemy API 密钥
ALCHEMY_API_KEY="your_alchemy_api_key_here"

# 部署者私钥 (从钱包导出)
PRIVATE_KEY="your_wallet_private_key_here"

# 网络端点
OPTIMISM_SEPOLIA_URL="https://opt-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}"
ETHEREUM_SEPOLIA_URL="https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}"

# 可选: Etherscan API 密钥 (用于合约验证)
ETHERSCAN_API_KEY="your_etherscan_api_key"
OPTIMISTIC_ETHERSCAN_API_KEY="your_optimistic_etherscan_api_key"
```

### 安装依赖
```bash
npm install @nomiclabs/hardhat-ethers ethers @nomiclabs/hardhat-verify dotenv
```

### 更新 Hardhat 配置
```javascript
// hardhat.config.js
require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-verify');
require('dotenv').config();

module.exports = {
  networks: {
    sepolia: {
      url: process.env.ETHEREUM_SEPOLIA_URL,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 11155111
    },
    opsepolia: {
      url: process.env.OPTIMISM_SEPOLIA_URL,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 11155420
    }
  },
  
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY,
      opsepolia: process.env.OPTIMISTIC_ETHERSCAN_API_KEY
    },
    customChains: [
      {
        network: "opsepolia",
        chainId: 11155420,
        urls: {
          apiURL: "https://api-sepolia-optimistic.etherscan.io/api",
          browserURL: "https://sepolia-optimism.etherscan.io"
        }
      }
    ]
  }
};
```

## 3. 部署准备

### 获取测试币
1. **Sepolia ETH**:
   - 访问 [Sepolia Faucet](https://sepoliafaucet.com/)
   - 输入钱包地址获取测试ETH

2. **OP Sepolia ETH**:
   - 需要先有 Sepolia ETH
   - 使用 [Optimism Bridge](https://app.optimism.io/bridge) 将ETH桥接到OP Sepolia
   - 桥接比例通常是 1:1，但需要支付少量Gas费

### 部署前检查
```bash
# 检查余额
npx hardhat balance --network opsepolia

# 编译合约
npx hardhat compile
```

## 4. 部署步骤

### 步骤1: 部署到 OP Sepolia
```bash
# 部署到OP Sepolia测试网
npx hardhat run scripts/deploy-to-testnet.js --network opsepolia
```

### 步骤2: 部署到 Sepolia
```bash
# 部署到Sepolia测试网
npx hardhat run scripts/deploy-to-testnet.js --network sepolia
```

### 步骤3: 配置跨链通信
部署完成后，需要配置两个链上合约的跨链通信参数：

```javascript
// scripts/configure-crosschain.js
const hre = require("hardhat");

async function configureCrossChain() {
  // 获取已部署合约的地址（从部署输出获取）
  const chainId = (await hre.ethers.provider.getNetwork()).chainId;
  
  // 这里需要替换为实际部署后的地址
  const threatIntelAddress = "YOUR_THREAT_INTEL_ADDRESS";
  const lzEndpointAddress = "YOUR_LZ_ENDPOINT_ADDRESS";
  
  const threatIntel = await hre.ethers.getContractAt("ThreatIntelSync", threatIntelAddress);
  
  console.log("配置跨链通信参数...");
  
  // 可能需要设置目标链的合约地址
  // 这个步骤取决于LayerZero的具体配置要求
}

configureCrossChain()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

## 5. 部署脚本

### 一键部署脚本
```bash
#!/bin/bash
# deploy-all.sh

set -e

echo "开始部署 OraSRS 混合L2架构到测试网..."

echo "1. 部署到 OP Sepolia..."
npx hardhat run scripts/deploy-to-testnet.js --network opsepolia

echo "2. 部署到 Sepolia..."
npx hardhat run scripts/deploy-to-testnet.js --network sepolia

echo "3. 验证合约..."
# 合约验证会在部署脚本中自动进行

echo "部署完成！"
echo "请检查 deployments/ 目录获取部署详情"
```

## 6. 安全注意事项

### 私钥安全
- 绝不将私钥提交到代码仓库
- 使用环境变量管理私钥
- 定期更换测试网私钥

### 费用管理
- 测试网部署也需要真实Gas费用
- 监控部署成本
- 为部署地址预留足够测试币

### 验证合约
- 部署后立即验证合约源码
- 确保合约验证成功
- 保存所有部署参数和交易哈希

## 7. 常见问题

### Q: Alchemy端点请求限制
A: 免费账户有请求限制，部署大量合约时可能遇到限制，可升级到付费计划或优化部署脚本

### Q: Gas价格过高
A: 测试网Gas价格会波动，可使用EIP-1559设置合适的maxFeePerGas

### Q: 合约验证失败
A: 确保提供正确的构造函数参数和编译器版本

## 8. 后续步骤

部署完成后:
1. 记录所有合约地址
2. 配置前端应用连接
3. 进行功能测试
4. 准备生产环境部署