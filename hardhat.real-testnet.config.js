// 真实测试网部署配置
module.exports = {
  networks: {
    // OP主网
    optimism: {
      url: "https://opt-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY", // 替换为您的Alchemy密钥
      accounts: [process.env.PRIVATE_KEY], // 通过环境变量提供私钥
      chainId: 10
    },
    // OP Sepolia测试网
    opsepolia: {
      url: "https://opt-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY", // 替换为您的Alchemy密钥
      accounts: [process.env.PRIVATE_KEY], // 通过环境变量提供私钥
      chainId: 11155420
    },
    // 以太坊主网
    ethereum: {
      url: "https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY", // 替换为您的Alchemy密钥
      accounts: [process.env.PRIVATE_KEY],
      chainId: 1
    },
    // Sepolia测试网
    sepolia: {
      url: "https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY", // 替换为您的Alchemy密钥
      accounts: [process.env.PRIVATE_KEY],
      chainId: 11155111
    }
  },

  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },

  mocha: {
    timeout: 30000
  }
};