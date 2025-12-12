// scripts/setup-threat-data-hh.js
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
    console.log("🚀 设置威胁情报数据到Hardhat节点合约中...");

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

    // 生成10000个威胁情报数据
    console.log("📊 生成10000个威胁情报数据...");
    
    // 为了更高效地设置数据，我们将使用批量更新分数的方法
    const ipList = [];
    const scoreList = [];
    
    for (let i = 0; i < 10000; i++) {
        const ip = generateRandomIP();
        const threatLevel = generateRandomThreatLevel();
        const threatType = generateRandomThreatType();
        
        // 添加威胁情报
        await threatIntelContract.addThreatIntel(ip, threatLevel, threatType);
        
        // 收集IP和分数用于批量更新
        ipList.push(ip);
        scoreList.push(generateRandomThreatScore());
        
        if ((i + 1) % 1000 === 0) {
            console.log(`已设置 ${i + 1}/10000 个威胁情报数据`);
        }
    }
    
    // 批量更新威胁分数，分批处理以避免gas限制
    console.log("🔄 批量更新威胁分数...");
    const batchSize = 1000; // 分批处理，每批1000个
    for (let i = 0; i < ipList.length; i += batchSize) {
        const batchIPs = ipList.slice(i, i + batchSize);
        const batchScores = scoreList.slice(i, i + batchSize);
        
        await threatIntelContract.batchUpdateThreatScores(batchIPs, batchScores);
        
        if ((i + batchSize) % 5000 === 0) {
            console.log(`已更新 ${Math.min(i + batchSize, ipList.length)}/10000 个威胁分数`);
        }
    }
    
    console.log("✅ 威胁情报数据设置完成！");
    console.log(`合约地址: ${await threatIntelContract.getAddress()}`);
    console.log(`设置的IP数量: ${ipList.length}`);
    
    // 验证数据
    console.log("🔍 验证部分数据...");
    for (let i = 0; i < 5; i++) {
        const randomIndex = Math.floor(Math.random() * ipList.length);
        const ip = ipList[randomIndex];
        const isThreat = await threatIntelContract.isThreatSource(ip);
        const score = await threatIntelContract.getThreatScore(ip);
        console.log(`  IP: ${ip}, IsThreat: ${isThreat}, Score: ${score}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ 错误:", error);
        process.exit(1);
    });