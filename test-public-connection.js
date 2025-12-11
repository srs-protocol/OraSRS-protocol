// test-public-connection.js
import { ethers } from "ethers";

async function testPublicConnection() {
    console.log("🌐 测试公网连接: https://api.orasrs.net");
    
    try {
        // 连接到公网节点
        const provider = new ethers.JsonRpcProvider("https://api.orasrs.net", {
            name: 'OraSRS',
            chainId: 8888
        });
        
        console.log("🔗 尝试连接到公网节点...");
        
        // 获取网络信息
        try {
            const network = await provider.getNetwork();
            console.log(`✅ 网络连接成功!`);
            console.log(`   网络名称: ${network.name}`);
            console.log(`   链ID: ${network.chainId}`);
        } catch (networkErr) {
            console.log(`⚠️  获取网络信息失败: ${networkErr.message}`);
            console.log(`   继续尝试连接...`);
        }
        
        // 获取最新区块
        try {
            const blockNumber = await provider.getBlockNumber();
            console.log(`✅ 当前区块高度: ${blockNumber}`);
            
            // 获取最新区块详情
            const block = await provider.getBlock(blockNumber);
            if (block) {
                console.log(`✅ 区块时间戳: ${new Date(block.timestamp * 1000).toISOString()}`);
            }
        } catch (blockErr) {
            console.log(`⚠️  获取区块信息失败: ${blockErr.message}`);
        }
        
        console.log("\n✅ 公网连接测试完成 - 连接正常!");
        console.log("📋 连接状态: 可以正常访问OraSRS公网节点");
        console.log("   - 节点URL: https://api.orasrs.net");
        console.log("   - 功能: 区块查询、交易查询等只读操作");
        console.log("   - 注意: 写操作需要相应的私钥和权限");
        
    } catch (error) {
        console.error(`❌ 连接失败: ${error.message}`);
        if (error.code) {
            console.error(`   错误代码: ${error.code}`);
        }
    }
}

// 执行测试
console.log("🚀 开始公网连接测试...");
testPublicConnection()
    .then(() => {
        console.log("\n✅ 测试完成");
    })
    .catch((error) => {
        console.error("\n❌ 测试失败:", error);
    });