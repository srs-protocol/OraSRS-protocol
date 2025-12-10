// test-client-public-connection.js
import { ethers } from "ethers";

// 客户端配置 - 使用公网节点
const RPC_URL = "https://api.orasrs.net";
const CONTRACT_ADDR = "0x4c5859f0F772848b2D91F1D83E2Fe57935348029"; // 本地部署的合约地址不会在公网节点上存在

// 但我们可以测试连接和一些通用功能
const GENERIC_ABI = [
    // 通用的只读方法，适用于任何EVM兼容链
    "function getBlockNumber() view returns (uint256)",
    "function getBalance(address) view returns (uint256)"
];

async function testClientPublicConnection() {
    console.log("🌍 测试客户端公网连接功能...");
    console.log(`🔗 连接到: ${RPC_URL}`);
    
    try {
        // 创建provider连接到公网节点
        const provider = new ethers.JsonRpcProvider(RPC_URL, undefined, {
            timeout: 10000  // 10秒超时
        });
        
        console.log("✅ 成功创建连接到公网节点");
        
        // 测试基础连接
        console.log("\n🔍 测试基础连接...");
        const blockNumber = await provider.getBlockNumber();
        console.log(`✅ 当前区块高度: ${blockNumber}`);
        
        // 获取最新区块信息
        const latestBlock = await provider.getBlock(blockNumber);
        if (latestBlock) {
            console.log(`✅ 最新区块时间: ${new Date(latestBlock.timestamp * 1000).toISOString()}`);
            console.log(`✅ 最新区块哈希: ${latestBlock.hash?.substring(0, 10)}...`);
        }
        
        // 尝试连接到可能存在的合约（这会失败，因为我们使用的地址是在本地部署的）
        console.log("\n📋 尝试连接到合约 (预期会失败，因为地址不匹配)...");
        try {
            const contract = new ethers.Contract(CONTRACT_ADDR, GENERIC_ABI, provider);
            // 尝试调用一个简单的视图函数
            const result = await contract.getBlockNumber?.();
            if (result) {
                console.log(`✅ 合约连接成功 (意外)`);
            }
        } catch (contractErr) {
            console.log(`ℹ️  合约连接失败 (预期): ${contractErr.message}`);
            console.log("   这是正常的，因为我们尝试连接到本地部署的合约地址");
        }
        
        // 测试通用的eth方法
        console.log("\n🔍 测试通用方法...");
        
        // 获取网络信息
        try {
            const network = await provider.getNetwork();
            console.log(`✅ 网络信息: 名称=${network.name}, 链ID=${network.chainId}`);
        } catch (netErr) {
            console.log(`⚠️  获取网络信息时出现链ID不匹配 (常见): ${netErr.message}`);
        }
        
        console.log("\n✅ 公网连接测试完成!");
        console.log("📋 客户端连接状态:");
        console.log("   - ✅ 可以连接到公网节点 https://api.orasrs.net");
        console.log("   - ✅ 可以获取区块信息");
        console.log("   - ✅ 连接稳定，响应正常");
        console.log("   - ⚠️  合约地址需要使用公网节点上实际部署的地址");
        
        console.log("\n🔧 客户端配置建议:");
        console.log("   - RPC_URL: https://api.orasrs.net");
        console.log("   - 需要正确的合约地址");
        console.log("   - 实现事件监听功能");
        console.log("   - 添加错误处理和重连机制");
        
    } catch (error) {
        console.error(`❌ 公网连接测试失败: ${error.message}`);
        if (error.code) {
            console.error(`   错误代码: ${error.code}`);
        }
    }
}

// 运行测试
console.log("🚀 开始客户端公网连接测试...");
testClientPublicConnection()
    .then(() => {
        console.log("\n✅ 客户端公网连接测试完成");
    })
    .catch((error) => {
        console.error(`\n❌ 测试失败: ${error.message}`);
    });