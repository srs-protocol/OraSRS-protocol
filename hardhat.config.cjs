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
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",  // Hardhat默认端口
      accounts: {
        mnemonic: "test test test test test test test test test test test junk"
      }
    },
    "my_private_chain": {
      url: "http://127.0.0.1:8545",  // Geth私有链的URL
      // Geth开发模式默认账户已预充值，无需私钥
      accounts: {
        mnemonic: "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat"
      }
    },
    "api.orasrs": {
      url: "http://localhost:8545",  // 本地OraSRS网络RPC端点
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
  }
};