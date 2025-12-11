// 部署配置文件 - 用于在不同网络上部署OraSRS水龙头合约

// Sepolia测试网配置
module.exports = {
  sepolia: {
    faucetInitialBalance: "1000000", // 初始存入水龙头的ORA代币数量
    withdrawAmount: "1000", // 每次可领取的代币数量
    cooldownPeriod: 86400, // 冷却时间（秒）- 24小时
    description: "部署到Ethereum Sepolia测试网"
  },
  
  "op-sepolia": {
    faucetInitialBalance: "1000000", // 初始存入水龙头的ORA代币数量
    withdrawAmount: "1000", // 每次可领取的代币数量
    cooldownPeriod: 86400, // 冷却时间（秒）- 24小时
    description: "部署到Optimism Sepolia测试网"
  },
  
  localhost: {
    faucetInitialBalance: "1000000", // 初始存入水龙头的ORA代币数量
    withdrawAmount: "1000", // 每次可领取的代币数量
    cooldownPeriod: 30, // 冷却时间（秒）- 本地测试用
    description: "部署到本地Hardhat网络"
  },
  
  // 通用配置
  default: {
    tokenName: "OraSRS Protocol Token",
    tokenSymbol: "ORA",
    tokenInitialSupply: "100000000", // 1亿代币
    tokenDecimals: 18
  }
};