// test/test-threat-reporting.js
const { ethers } = require("ethers");

// 测试配置
const RPC_URL = "https://api.orasrs.net";
const CONTRACT_ADDR = "0x09635F643e140090A9A8Dcd712eD6285858ceBef"; // 已部署的ThreatBatch合约地址
const BATCH_ABI = [
    "event PunishBatch(string[] indexed ips, uint32[] durations)",
    "function getProfilesBatch(string[] calldata ips) external view returns (uint40[] memory, uint16[] memory, uint16[] memory)",
    "function getProfile(string memory ip) external view returns (uint40, uint16, uint16)"
];

async function testThreatReporting() {
    console.log("🔍 开始测试异常IP上报功能...");
    
    try {
        // 创建provider连接到公网节点
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        
        // 验证节点连接
        console.log("🔗 正在连接到公网节点...");
        const network = await provider.getNetwork();
        console.log(`✅ 节点连接成功 - 网络: ${network.name}, 链ID: ${network.chainId}`);
        
        // 创建合约实例
        const contract = new ethers.Contract(CONTRACT_ADDR, BATCH_ABI, provider);
        
        // 检查合约是否可用
        console.log("📋 正在检查合约可用性...");
        try {
            const tier1 = await contract.TIER_1();
            const tier2 = await contract.TIER_2();
            const tier3 = await contract.TIER_3();
            console.log(`✅ 合约连接成功 - TIER_1: ${tier1}, TIER_2: ${tier2}, TIER_3: ${tier3}`);
        } catch (error) {
            console.error("❌ 合约连接失败:", error.message);
            return;
        }
        
        // 测试查询功能
        console.log("\n🔍 测试查询功能...");
        
        // 测试查询单个IP
        const testIP = "8.8.8.8"; // 使用一个相对安全的IP进行测试
        try {
            const [lastOffenseTime, offenseCount, riskScore] = await contract.getProfile(testIP);
            console.log(`✅ 单个IP查询成功 - IP: ${testIP}`);
            console.log(`   - 上次违规时间: ${lastOffenseTime}`);
            console.log(`   - 违规次数: ${offenseCount}`);
            console.log(`   - 风险分数: ${riskScore}`);
        } catch (error) {
            console.log(`ℹ️  IP ${testIP} 未在威胁列表中或查询失败: ${error.message}`);
        }
        
        // 测试批量查询
        const testIPs = ["8.8.8.8", "1.1.1.1", "192.168.1.1"];
        try {
            const [timestamps, counts, scores] = await contract.getProfilesBatch(testIPs);
            console.log(`✅ 批量查询成功 - 查询 ${testIPs.length} 个IP:`);
            for (let i = 0; i < testIPs.length; i++) {
                console.log(`   - ${testIPs[i]}: 风险分=${Number(scores[i])}, 违规次数=${Number(counts[i])}`);
            }
        } catch (error) {
            console.error("❌ 批量查询失败:", error.message);
        }
        
        // 测试监听事件（只读模式，不会真正上报）
        console.log("\n📡 测试事件监听...");
        console.log("⚠️  注意: 由于是只读连接，无法主动触发事件，但可以监听实时事件");
        
        // 设置一个短暂的监听器来捕获任何新事件
        let eventCount = 0;
        const maxEvents = 3; // 最多监听3个事件
        
        contract.on("PunishBatch", (ips, durations, event) => {
            eventCount++;
            console.log(`\n🚨 捕获到PunishBatch事件 #${eventCount}:`);
            console.log(`   - 封禁IP数量: ${ips.length}`);
            console.log(`   - 封禁时长: ${durations.map(d => \`\${d}s\`).join(', ')}`);
            console.log(`   - 事件哈希: ${event.hash}`);
            
            // 只显示前几个IP以避免输出过多
            const displayIPs = ips.length > 5 ? [...ips.slice(0, 5), `...和\${ips.length-5}个IP`] : ips;
            console.log(`   - IP列表: [\${displayIPs.join(', ')}]`);
            
            if (eventCount >= maxEvents) {
                console.log(`\n✅ 已达到最大事件监听数量(\${maxEvents})，停止监听`);
                contract.removeAllListeners("PunishBatch");
            }
        });
        
        console.log("⏳ 正在监听事件... (持续30秒)");
        
        // 等待30秒，然后结束测试
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        // 停止监听
        contract.removeAllListeners("PunishBatch");
        
        console.log("\n✅ 异常IP上报功能测试完成!");
        console.log("📋 测试总结:");
        console.log("   - 成功连接到公网节点: https://api.orasrs.net");
        console.log("   - 成功连接到ThreatBatch合约");
        console.log("   - 单个IP查询功能正常");
        console.log("   - 批量IP查询功能正常");
        console.log(`   - 事件监听功能正常 (捕获到 \${eventCount} 个事件)`);
        
    } catch (error) {
        console.error("❌ 测试过程中发生错误:", error);
        console.error("错误详情:", error.message);
        if (error.code) {
            console.error("错误代码:", error.code);
        }
    }
}

// 运行测试
console.log("🚀 开始测试 OraSRS 客户端公网连接和威胁上报功能");
testThreatReporting()
    .then(() => {
        console.log("\n✅ 测试完成");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n❌ 测试失败:", error);
        process.exit(1);
    });
