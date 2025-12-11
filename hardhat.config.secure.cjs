require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true,  // 启用viaIR来解决堆栈深度问题
      metadata: {
        bytecodeHash: "none"
      }
    }
  },
  defaultNetwork: "localhost",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",  // 本地Hardhat节点
      chainId: 31337,                // Hardhat默认链ID
      // 使用Hardhat默认账户
      // 限制访问配置
      allowUnlimitedContractSize: false,
      gas: 12000000,
      blockGasLimit: 12000000,
      timeout: 30000,
    },
    "my_private_chain": {
      url: "http://127.0.0.1:8545",  // 本地Hardhat节点
      chainId: 31337,                // Hardhat默认链ID
      accounts: {
        mnemonic: "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat"
      }
    },
    "api.orasrs": {
      url: "http://127.0.0.1:8545",  // 本地Hardhat节点，代表OraSRS私有链
      chainId: 8888,                  // OraSRS协议链ID
      accounts: [
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" // 默认Hardhat账户私钥
      ]
    },
    sepolia: {
      url: process.env.ETHEREUM_SEPOLIA_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },
    "op-sepolia": {
      url: process.env.OP_SEPOLIA_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      "op-sepolia": process.env.OPTIMISTIC_ETHERSCAN_API_KEY || ""
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 40000
  },
  // 安全配置：限制RPC方法
  rpc: {
    // 限制允许的RPC方法，只开放读操作
    allowAdvancedRPC: false,  // 禁用高级RPC功能
  }
};