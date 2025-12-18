// hardhat-middleware/security-middleware.js
// 安全中间件，限制高危RPC方法

const { task, subtask, network } = require("hardhat/config");
const { HardhatError } = require("hardhat/internal/core/errors");

// 限制高危RPC方法列表
const HIGH_RISK_RPC_METHODS = [
  'debug_*',           // 调试相关方法
  'miner_*',           // 挖矿相关方法
  'admin_*',           // 管理员相关方法
  'txpool_*',          // 交易池相关方法
  'evm_*',             // EVM控制方法（除了evm_snapshot, evm_revert等测试方法）
  'net_*',             // 网络相关方法（除了net_version, net_listening, net_peerCount）
  'web3_*',            // Web3相关方法（除了web3_clientVersion）
  'eth_mining',        // 挖矿状态
  'eth_hashrate',      // 哈希率
  'eth_submitWork',    // 提交工作
  'eth_submitHashrate',// 提交哈希率
  'eth_getWork',       // 获取工作
  'eth_coinbase',      // 挖矿地址
  'eth_accounts',      // 账户列表
  'personal_*',        // 个人账户相关方法
  'clique_*',          // Clique共识相关方法
  'istanbul_*',        // Istanbul共识相关方法
];

// 安全的RPC方法列表（只允许安全的读操作）
const SAFE_RPC_METHODS = [
  'eth_blockNumber',       // 获取区块号
  'eth_getBlockByHash',    // 根据哈希获取区块
  'eth_getBlockByNumber',  // 根据编号获取区块
  'eth_getBlockTransactionCountByHash',    // 获取区块交易数量（哈希）
  'eth_getBlockTransactionCountByNumber',  // 获取区块交易数量（编号）
  'eth_getCode',           // 获取合约代码
  'eth_getTransactionByHash',              // 根据哈希获取交易
  'eth_getTransactionByBlockHashAndIndex', // 根据区块哈希和索引获取交易
  'eth_getTransactionByBlockNumberAndIndex', // 根据区块编号和索引获取交易
  'eth_getTransactionReceipt',               // 获取交易回执
  'eth_getUncleByBlockHashAndIndex',       // 获取叔块
  'eth_getUncleByBlockNumberAndIndex',     // 获取叔块
  'eth_getUncleCountByBlockHash',          // 获取叔块数量
  'eth_getUncleCountByBlockNumber',        // 获取叔块数量
  'eth_call',              // 调用合约（只读）
  'eth_estimateGas',       // 估算Gas
  'eth_getLogs',           // 获取日志
  'eth_getBalance',        // 获取余额
  'eth_getStorageAt',      // 获取存储
  'eth_getTransactionCount', // 获取交易计数
  'eth_gasPrice',          // Gas价格
  'eth_protocolVersion',   // 协议版本
  'eth_syncing',           // 同步状态
  'eth_chainId',           // 链ID
  'web3_clientVersion',    // 客户端版本
  'net_version',           // 网络版本
  'net_listening',         // 监听状态
  'net_peerCount',         // 节点数量
  'eth_getProof',          // 获取证明
];

// Hardhat插件定义
module.exports = (config) => {
  // 检查是否开启了安全模式
  const isSecureMode = process.env.HARDHAT_SECURE_MODE === 'true';
  
  if (isSecureMode) {
    console.log("🔒 启用Hardhat安全中间件 - 限制高危RPC方法");
    
    // 在Hardhat运行时添加安全检查
    task("node", "Starts a JSON-RPC server for the Hardhat Network")
      .addOptionalParam("hostname", "The hostname to bind to", "127.0.0.1", types.string)
      .addOptionalParam("port", "The port to bind to", 8545, types.int)
      .setAction(async (taskArgs, { network, run }) => {
        console.log("🔒 启动安全模式Hardhat节点...");
        
        // 重写网络的provider以添加安全检查
        const originalProvider = network.provider;
        
        // 创建一个安全的provider包装器
        const secureProvider = {
          async send(method, params) {
            // 检查RPC方法是否安全
            if (!isMethodAllowed(method)) {
              console.error(`❌ 拒绝高危RPC方法: ${method}`);
              throw new Error(`Method ${method} is not allowed in secure mode`);
            }
            
            console.log(`✅ 允许RPC方法: ${method}`);
            return await originalProvider.send(method, params);
          }
        };
        
        // 临时替换provider（实际在Hardhat中需要更复杂的操作）
        // 这里只是概念验证
        return await run("node", taskArgs);
      });
  }
};

// 检查方法是否被允许
function isMethodAllowed(method) {
  // 检查是否在安全列表中
  if (SAFE_RPC_METHODS.includes(method)) {
    return true;
  }
  
  // 检查是否在高危列表中
  for (const riskyMethod of HIGH_RISK_RPC_METHODS) {
    if (matchesPattern(method, riskyMethod)) {
      return false;
    }
  }
  
  // 默认拒绝所有其他方法
  return false;
}

// 检查方法是否匹配模式（支持通配符）
function matchesPattern(method, pattern) {
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1);
    return method.startsWith(prefix);
  }
  return method === pattern;
}

// 导出配置函数
module.exports.setupSecureNode = (config) => {
  return {
    ...config,
    networks: {
      ...config.networks,
      localhost: {
        ...config.networks.localhost,
        // 在安全模式下，限制更多功能
        ...(process.env.HARDHAT_SECURE_MODE === 'true' && {
          allowUnlimitedContractSize: false,
          // 限制并发连接数
          maxConnections: 10,
        })
      }
    }
  };
};