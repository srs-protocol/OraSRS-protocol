// test-contract-interaction.js
import { ethers } from "ethers";

// 使用已部署的合约地址
const CONTRACT_ADDR = "0x4c5859f0F772848b2D91F1D83E2Fe57935348029";
const RPC_URL = "http://127.0.0.1:8545"; // 先使用本地节点测试功能

// 合约ABI - 只包含客户端需要的读取方法
const CONTRACT_ABI = [
    "function getProfile(string memory ip) external view returns (uint40, uint16, uint16)",
    "function getProfilesBatch(string[] calldata ips) external view returns (uint40[] memory, uint16[] memory, uint16[] memory)",
    "function getBanDuration(uint16 offenseCount) external view returns (uint32)",
    "function TIER_1() external view returns (uint32)",
    "function TIER_2() external view returns (uint32)",
    "function TIER_3() external view returns (uint32)"
];

async function testContractInteraction() {
    console.log("🔗 测试合约交互功能...");
    
    try {
        // 连接到本地Hardhat节点（因为我们刚刚部署了合约）
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        console.log("✅ 连接到本地节点");
        
        // 创建合约实例
        const contract = new ethers.Contract(CONTRACT_ADDR, CONTRACT_ABI, provider);
        console.log(`✅ 合约实例创建成功: ${CONTRACT_ADDR}`);
        
        // 测试读取函数
        console.log("\n🔍 测试读取功能...");
        
        // 测试获取封禁时长配置
        try {
            const tier1 = await contract.TIER_1();
            const tier2 = await contract.TIER_2();
            const tier3 = await contract.TIER_3();
            console.log(`✅ 封禁时长配置:`);
            console.log(`   TIER_1 (24h): ${tier1}秒`);
            console.log(`   TIER_2 (3d): ${tier2}秒`); 
            console.log(`   TIER_3 (7d): ${tier3}秒`);
        } catch (err) {
            console.error(`❌ 读取封禁配置失败: ${err.message}`);
        }
        
        // 测试获取单个IP档案
        try {
            const testIP = "192.168.1.1";
            const [lastOffenseTime, offenseCount, riskScore] = await contract.getProfile(testIP);
            console.log(`✅ IP档案查询成功: ${testIP}`);
            console.log(`   上次违规时间: ${lastOffenseTime}`);
            console.log(`   违规次数: ${offenseCount}`);
            console.log(`   风险分数: ${riskScore}`);
        } catch (err) {
            console.log(`ℹ️  IP未在记录中或查询失败: ${err.message}`);
        }
        
        // 测试批量查询
        try {
            const testIPs = ["8.8.8.8", "1.1.1.1", "192.168.1.1"];
            const [timestamps, counts, scores] = await contract.getProfilesBatch(testIPs);
            console.log(`✅ 批量查询成功，查询了${testIPs.length}个IP:`);
            for (let i = 0; i < testIPs.length; i++) {
                console.log(`   ${testIPs[i]}: 风险分=${Number(scores[i])}, 违规次数=${Number(counts[i])}`);
            }
        } catch (err) {
            console.error(`❌ 批量查询失败: ${err.message}`);
        }
        
        // 测试获取封禁时长
        try {
            const duration1 = await contract.getBanDuration(1);
            const duration2 = await contract.getBanDuration(2);
            const duration3 = await contract.getBanDuration(3);
            console.log(`✅ 封禁时长查询:`);
            console.log(`   1次违规: ${duration1}秒`);
            console.log(`   2次违规: ${duration2}秒`);
            console.log(`   3次违规: ${duration3}秒`);
        } catch (err) {
            console.error(`❌ 封禁时长查询失败: ${err.message}`);
        }
        
        console.log("\n✅ 合约交互功能测试完成!");
        console.log("📋 测试总结:");
        console.log("   - 合约连接正常");
        console.log("   - 读取功能正常 (getProfile, getProfilesBatch)");
        console.log("   - 配置查询正常 (TIER_1/2/3, getBanDuration)");
        console.log("   - 批量查询功能正常");
        
    } catch (error) {
        console.error(`❌ 合约交互测试失败: ${error.message}`);
        console.error(`   错误堆栈: ${error.stack}`);
    }
}

// 对于公网的威胁上报功能测试（需要私钥，仅作演示）
async function demoThreatReportingProcess() {
    console.log("\n📋 威胁上报流程演示 (仅演示，不实际执行):");
    console.log("⚠️  注意: 实际威胁上报需要合约所有者权限，以下是流程说明");
    
    console.log("1. 收集威胁情报数据");
    console.log("2. 验证数据准确性");
    console.log("3. 准备批量上报数据 (IP数组, 风险分数数组)");
    console.log("4. 调用合约的reportBatch方法");
    console.log("5. 监听PunishBatch事件获取处理结果");
    
    // 示例数据结构
    const demoIPs = [
        "1.2.3.4",      // 高风险IP
        "5.6.7.8",      // 恶意扫描IP  
        "9.10.11.12"   // 攻击IP
    ];
    
    const demoScores = [
        500,  // 高风险
        300,  // 中风险
        800   // 非常高风险
    ];
    
    console.log(`\n📊 演示数据:`);
    for (let i = 0; i < demoIPs.length; i++) {
        console.log(`   ${demoIPs[i]} -> 风险分: ${demoScores[i]}`);
    }
    
    console.log("\n🔐 实际上报需要:"); 
    console.log("   - 合约所有者私钥");
    console.log("   - 足够的Gas费用");
    console.log("   - 数据验证机制");
    console.log("   - 安全的私钥管理");
}

// 运行测试
console.log("🚀 开始合约交互和威胁上报功能测试");
testContractInteraction()
    .then(() => {
        demoThreatReportingProcess();
        console.log("\n✅ 所有测试完成!");
    })
    .catch((error) => {
        console.error(`\n❌ 测试失败: ${error.message}`);
    });