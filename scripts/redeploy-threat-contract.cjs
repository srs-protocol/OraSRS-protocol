// scripts/redeploy-threat-contract.cjs
const { ethers } = require("hardhat");

// 生成随机IP地址
function generateRandomIP() {
    const octets = [];
    for (let i = 0; i < 4; i++) {
        octets.push(Math.floor(Math.random() * 256));
    }
    return octets.join('.');
}

// 生成随机威胁级别
function generateRandomThreatLevel() {
    const levels = [0, 1, 2, 3]; // 0=Info, 1=Warning, 2=Critical, 3=Emergency
    return levels[Math.floor(Math.random() * levels.length)];
}

// 生成随机威胁类型
function generateRandomThreatType() {
    const types = [
        "DDoS", "Malware", "Phishing", "BruteForce", 
        "SuspiciousConnection", "AnomalousBehavior", "IoCMatch"
    ];
    return types[Math.floor(Math.random() * types.length)];
}

// 生成随机威胁分数
function generateRandomThreatScore() {
    return Math.floor(Math.random() * 100); // 0-99
}

async function main() {
    console.log("🚀 重新部署威胁情报协调合约...");

    // 获取合约实例
    const [deployer] = await ethers.getSigners();
    console.log(`使用账户: ${deployer.address}`);

    // 获取合约工厂
    const ThreatIntelligenceCoordination = await ethers.getContractFactory("ThreatIntelligenceCoordination");

    // 部署合约
    console.log("正在部署威胁情报协调合约...");
    const threatIntelContract = await ThreatIntelligenceCoordination.deploy();
    await threatIntelContract.deploymentTransaction().wait();
    console.log(`威胁情报协调合约部署在: ${await threatIntelContract.getAddress()}`);

    // 批量设置10000个威胁情报数据
    console.log("📊 设置10000个威胁情报数据...");
    
    // 为了更高效地设置数据，我们将分批添加
    const batchSize = 100; // 每批100个，避免gas限制
    
    for (let i = 0; i < 10000; i += batchSize) {
        const batchPromises = [];
        
        for (let j = 0; j < batchSize && (i + j) < 10000; j++) {
            const ip = generateRandomIP();
            const threatLevel = generateRandomThreatLevel();
            const threatType = generateRandomThreatType();
            
            // 添加威胁情报
            const tx = threatIntelContract.addThreatIntel(ip, threatLevel, threatType);
            batchPromises.push(tx);
        }
        
        // 等待所有交易完成
        const batchTxs = await Promise.all(batchPromises);
        // 等待所有交易被挖矿
        for (const tx of batchTxs) {
            await tx.wait();
        }
        
        if ((i + batchSize) % 1000 === 0) {
            console.log(`已设置 ${Math.min(i + batchSize, 10000)}/10000 个威胁情报数据`);
        }
    }
    
    // 获取合约中的IP数量验证
    const ipCount = await threatIntelContract.getThreatIPsCount();
    console.log(`✅ 合约中存储的威胁IP数量: ${ipCount}`);
    
    // 验证部分数据
    console.log("🔍 验证部分数据...");
    const sampleCount = Math.min(5, Number(ipCount));
    if (sampleCount > 0) {
        const sampleIPs = await threatIntelContract.getThreatIPs(0, sampleCount);
        for (let i = 0; i < sampleCount; i++) {
            const ip = sampleIPs[i];
            const isThreat = await threatIntelContract.isThreatSource(ip);
            const score = await threatIntelContract.getThreatScore(ip);
            console.log(`  IP: ${ip}, IsThreat: ${isThreat}, Score: ${score}`);
        }
    }
    
    console.log(`\n🎉 威胁情报合约重新部署完成！`);
    console.log(`合约地址: ${await threatIntelContract.getAddress()}`);
    console.log(`设置的IP数量: 10000`);
    console.log(`实际存储的IP数量: ${ipCount}`);
    
    // 保存部署地址
    const fs = require('fs');
    const addresses = {
        threatIntelligenceCoordination: await threatIntelContract.getAddress(),
        deployedAt: new Date().toISOString(),
        description: "Threat Intelligence Coordination Contract with support for getting all IPs"
    };
    
    fs.writeFileSync('threat-contract-deployment.json', JSON.stringify(addresses, null, 2));
    console.log("\n📋 部署地址已保存到 threat-contract-deployment.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ 错误:", error);
        process.exit(1);
    });
