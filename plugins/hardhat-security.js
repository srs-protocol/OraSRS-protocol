// plugins/hardhat-security.js
// Hardhat安全插件，限制高危RPC方法并加固节点

import { task, extendProvider } from "hardhat/config";
import { HardhatPluginError } from "hardhat/plugins";

// 定义安全的RPC方法白名单
const SAFE_RPC_METHODS = [
  // 区块相关
  'eth_blockNumber',
  'eth_getBlockByHash',
  'eth_getBlockByNumber',
  'eth_getBlockTransactionCountByHash',
  'eth_getBlockTransactionCountByNumber',
  
  // 交易相关（只读）
  'eth_getTransactionByHash',
  'eth_getTransactionByBlockHashAndIndex',
  'eth_getTransactionByBlockNumberAndIndex',
  'eth_getTransactionReceipt',
  'eth_estimateGas',
  
  // 合约相关（只读）
  'eth_getCode',
  'eth_call',
  'eth_getStorageAt',
  
  // 账户相关（只读）
  'eth_getBalance',
  'eth_getTransactionCount',
  
  // 网络信息
  'net_version',
  'net_listening',
  'net_peerCount',
  'web3_clientVersion',
  'eth_chainId',
  'eth_protocolVersion',
  'eth_syncing',
  'eth_gasPrice',
  
  // 日志和事件
  'eth_getLogs',
  
  // 其他只读操作
  'eth_getUncleByBlockHashAndIndex',
  'eth_getUncleByBlockNumberAndIndex',
  'eth_getUncleCountByBlockHash',
  'eth_getUncleCountByBlockNumber',
  'eth_getProof',
];

// 高危RPC方法黑名单
const HIGH_RISK_RPC_METHODS = [
  // 调试和开发相关
  'debug_*',
  'trace_*',
  
  // 节点管理相关
  'admin_*',
  'miner_*',
  'txpool_*',
  'evm_*', // 除了测试相关的evm方法
  
  // 账户管理相关（修改）
  'personal_*',
  'eth_sendTransaction',
  'eth_sendRawTransaction',
  
  // 网络配置相关
  'net_*', // 除了上面允许的net方法
  
  // 挖矿相关
  'eth_mining',
  'eth_hashrate',
  'eth_submitWork',
  'eth_submitHashrate',
  'eth_getWork',
  'eth_coinbase',
  'eth_accounts',
  
  // 共识相关
  'clique_*',
  'istanbul_*',
  'bor_*',
];

// 检查方法名是否匹配模式
function isMethodAllowed(method) {
  // 检查白名单
  if (SAFE_RPC_METHODS.includes(method)) {
    return true;
  }
  
  // 检查黑名单
  for (const riskyPattern of HIGH_RISK_RPC_METHODS) {
    if (matchesPattern(method, riskyPattern)) {
      return false;
    }
  }
  
  // 默认拒绝
  return false;
}

function matchesPattern(method, pattern) {
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1);
    return method.startsWith(prefix);
  }
  return method === pattern;
}

// 创建安全provider包装器
function createSecureProvider(originalProvider) {
  return {
    async send(method, params) {
      // 记录请求日志
      console.log(`🔒 RPC请求: ${method}`);
      
      // 检查方法是否被允许
      if (!isMethodAllowed(method)) {
        console.error(`❌ 拒绝高危RPC方法: ${method}`);
        throw new HardhatPluginError(
          "hardhat-security", 
          `RPC method '${method}' is blocked for security reasons.`
        );
      }
      
      // 执行原始请求
      try {
        const result = await originalProvider.send(method, params);
        console.log(`✅ RPC响应: ${method}`);
        return result;
      } catch (error) {
        console.error(`❌ RPC错误: ${method}`, error.message);
        throw error;
      }
    },
    
    // 确保提供所有必要的provider方法
    on: originalProvider.on ? originalProvider.on.bind(originalProvider) : undefined,
    removeListener: originalProvider.removeListener ? originalProvider.removeListener.bind(originalProvider) : undefined,
  };
}

// Hardhat插件配置
require("@nomicfoundation/hardhat-toolbox");

// 扩展provider以添加安全层
extendProvider(async (provider, config, network) => {
  // 检查是否启用安全模式
  const isSecureMode = process.env.HARDHAT_SECURE_MODE === 'true' || 
                      config.networks[network.name]?.secureMode === true;
  
  if (isSecureMode) {
    console.log("🛡️  启用Hardhat安全模式 - 限制高危RPC方法");
    return createSecureProvider(provider);
  }
  
  return provider;
});

// 定义安全相关的任务
task("node:secure", "Starts a secure JSON-RPC server with restricted methods")
  .addOptionalParam("hostname", "The hostname to bind to", "127.0.0.1")
  .addOptionalParam("port", "The port to bind to", 8545)
  .setAction(async (taskArgs, { run }) => {
    // 设置环境变量以启用安全模式
    process.env.HARDHAT_SECURE_MODE = 'true';
    
    console.log("🛡️  启动安全模式Hardhat节点...");
    console.log("🔒 仅允许安全的RPC方法");
    
    // 运行标准的node任务
    return await run("node", taskArgs);
  });

export default {};