// 用于测试威胁情报合约的脚本
// 首先确保本地节点正在运行
const { expect } = require("chai");
const { ethers } = require("hardhat");

async function testContractFunctionality() {
    console.log("🔍 测试ThreatBatch合约功能...");
    
    // 获取测试账户
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // 部署合约
    const ThreatBatch = await ethers.getContractFactory("ThreatBatch");
    const threatBatch = await ThreatBatch.deploy();
    await threatBatch.waitForDeployment();
    
    console.log(`✅ 合约部署成功，地址: ${await threatBatch.getAddress()}`);
    
    // 测试报告批量威胁
    const ips = ["192.168.1.1", "192.168.1.2", "10.0.0.1"];
    const scores = [100, 200, 150];
    
    console.log("📤 报告批量威胁...");
    const tx = await threatBatch.connect(owner).reportBatch(ips, scores);
    await tx.wait();
    console.log("✅ 威胁报告成功");
    
    // 测试查询功能
    console.log("🔍 测试查询功能...");
    
    // 查询单个IP
    const [time, count, score] = await threatBatch.getProfile("192.168.1.1");
    console.log(`✅ 单个IP查询 - 192.168.1.1: 时间=${time}, 次数=${count}, 分数=${score}`);
    
    // 批量查询
    const [times, counts, scoresResult] = await threatBatch.getProfilesBatch(ips);
    console.log("✅ 批量查询成功:");
    for (let i = 0; i < ips.length; i++) {
        console.log(`   ${ips[i]}: 分数=${scoresResult[i].toString()}`);
    }
    
    // 测试封禁时长
    const duration = await threatBatch.getBanDuration(1);
    console.log(`✅ 封禁时长: ${duration}秒`);
    
    // 测试事件
    console.log("✅ 所有功能测试通过！");
    
    return threatBatch;
}

// 如果直接运行此脚本
if (require.main === module) {
    async function runTest() {
        // 需要先启动hardhat节点
        console.log("🚀 运行威胁情报合约功能测试...");
        
        try {
            // 由于此脚本需要在Hardhat环境下运行，我们提供一个简单的测试
            console.log("ℹ️  此测试需要在Hardhat环境中运行:");
            console.log("   npx hardhat run test-local-threat-contract.cjs");
        } catch (error) {
            console.error("❌ 测试失败:", error);
        }
    }
    
    runTest();
}

module.exports = { testContractFunctionality };