# OraSRS 水龙头合约部署和使用指南

## 概述

此文档介绍如何在测试网上部署OraSRS水龙头合约，以便为协议参与者分发ORA代币。

## 部署步骤

### 1. 环境准备

首先确保你已经安装了必要的依赖：

```bash
npm install
```

### 2. 配置网络环境

在部署前，需要配置网络环境变量。在项目根目录创建 `.env` 文件：

```env
# Ethereum Sepolia 测试网 RPC URL
ETHEREUM_SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID

# Optimism Sepolia 测试网 RPC URL
OP_SEPOLIA_URL=https://sepolia.optimism.io

# 部署者私钥（用于部署合约和初始资金）
PRIVATE_KEY=your_private_key_here

# Etherscan API 密钥（用于合约验证）
ETHERSCAN_API_KEY=your_etherscan_api_key
OPTIMISTIC_ETHERSCAN_API_KEY=your_optimistic_etherscan_api_key
```

### 3. 部署到本地网络（测试用）

```bash
# 启动本地节点
npx hardhat node

# 在另一个终端部署合约
npx hardhat run scripts/deployFaucet.js --network localhost
```

### 4. 部署到 Sepolia 测试网

```bash
npx hardhat run scripts/deployFaucet.js --network sepolia
```

### 5. 部署到 Optimism Sepolia 测试网

```bash
npx hardhat run scripts/deployFaucet.js --network op-sepolia
```

## 合约功能说明

### OraSRSToken 合约
- 标准的ERC20代币合约
- 代币名称：OraSRS Protocol Token
- 代币符号：ORA
- 总供应量：1亿枚
- 精度：18位小数

### FaucetUpgradeable 合约
- 每次可领取代币数量：1000 ORA
- 冷却时间：24小时（本地测试为30秒）
- 防止重复领取机制
- 批量分发功能
- 合约所有者权限管理

## 主要功能

### 对于普通用户：

1. **领取代币**：
   ```javascript
   // 调用 withdrawTokens() 函数领取代币
   await faucet.connect(user).withdrawTokens();
   ```

2. **检查是否可以领取**：
   ```javascript
   // 检查是否可以领取
   const canWithdraw = await faucet.canWithdraw(userAddress);
   
   // 获取还需等待的时间
   const timeLeft = await faucet.timeToNextWithdraw(userAddress);
   ```

### 对于合约所有者：

1. **补充水龙头资金**：
   ```javascript
   // 向水龙头存入代币
   await faucet.connect(owner).depositTokens(amount);
   ```

2. **批量分发代币**：
   ```javascript
   // 批量向多个地址分发代币
   await faucet.connect(owner).batchDistribute([addr1, addr2, addr3]);
   ```

3. **修改参数**：
   ```javascript
   // 修改每次领取数量
   await faucet.connect(owner).setWithdrawAmount(newAmount);
   
   // 修改冷却时间
   await faucet.connect(owner).setCooldownPeriod(newPeriod);
   ```

4. **提取水龙头资金**：
   ```javascript
   // 提取水龙头中的代币
   await faucet.connect(owner).withdrawFaucetBalance(amount);
   ```

## 部署后操作

部署完成后，你将获得两个合约地址：

1. **OraSRSToken 合约地址**：ORA代币合约
2. **FaucetUpgradeable 合约地址**：水龙头合约

### 合约验证

为了在Etherscan等浏览器上验证合约，请运行以下命令：

```bash
# 验证代币合约
npx hardhat verify --network sepolia YOUR_TOKEN_CONTRACT_ADDRESS

# 验证水龙头合约
npx hardhat verify --network sepolia YOUR_FAUCET_CONTRACT_ADDRESS YOUR_TOKEN_CONTRACT_ADDRESS
```

### 初始化配置

部署后，你可能需要：

1. 向水龙头补充更多代币
2. 调整领取参数（如果需要）
3. 将水龙头地址添加到OraSRS协议的配置中

## 配置文件说明

`config/deploy-config.js` 文件包含不同网络的部署配置：

- `faucetInitialBalance`: 部署时向水龙头存入的代币数量
- `withdrawAmount`: 每次可领取的代币数量
- `cooldownPeriod`: 冷却时间（秒）
- `description`: 配置描述

## 安全注意事项

1. **私钥安全**：确保私钥安全，不要分享给他人
2. **资金安全**：在测试网上部署时，确保账户有足够的ETH支付gas费用
3. **参数验证**：部署后验证合约参数是否正确
4. **访问控制**：只有合约所有者可以执行管理功能

## 故障排除

### 部署失败

1. 检查账户余额是否充足
2. 检查RPC URL是否正确
3. 检查网络连接是否正常

### 交易失败

1. 检查gas价格和gas限制
2. 确认合约状态是否正常
3. 验证参数是否符合要求

## 运行测试

部署前可以运行测试验证合约功能：

```bash
npx hardhat test
```

## 后续步骤

部署水龙头合约后，你需要：

1. 将水龙头合约地址添加到OraSRS协议配置中
2. 通知用户水龙头合约地址
3. 监控水龙头余额，必要时补充资金
4. 配置OraSRS协议的其他组件以使用新部署的代币合约

## 支持

如果遇到问题，请参考：

- [Hardhat文档](https://hardhat.org/docs)
- [OpenZeppelin文档](https://docs.openzeppelin.com/contracts/)
- 项目中的其他合约文件