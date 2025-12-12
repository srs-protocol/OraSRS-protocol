// scripts/setup-threat-data.js
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
    const levels = [0, 1, 2, 3]; // 0=info, 1=warning, 2=critical, 3=emergency
    return levels[Math.floor(Math.random() * levels.length)];
}

// 生成随机威胁类型
function generateRandomThreatType() {
    const types = [0, 1, 2, 3, 4, 5, 6]; // 对应DDoS, Malware, Phishing等
    return types[Math.floor(Math.random() * types.length)];
}

async function main() {
    console.log("设置威胁情报数据到Hardhat节点合约中...");
    
    // 获取合约实例
    const contractAddress = '0x784eCe6c0e3a81752f288f63bD9B689Af3a3eC8A'; // 从deployments.json获取
    const signers = await ethers.getSigners();
    const signer = signers[0]; // 使用默认账户
    
    // 假设我们使用ThreatIntelSync合约
    try {
        const ThreatIntelSync = await ethers.getContractFactory("ThreatIntelSync");
        const threatIntelSync = new ethers.Contract(contractAddress, ThreatIntelSync.interface, signer);
        
        console.log(`使用账户: ${signer.address}`);
        console.log(`合约地址: ${contractAddress}`);
        
        // 生成10000个威胁情报数据
        console.log("生成10000个威胁情报数据...");
        for (let i = 0; i < 10000; i += 100) { // 批量处理以避免gas限制
            const batch = [];
            const batchSize = Math.min(100, 10000 - i);
            
            for (let j = 0; j < batchSize; j++) {
                const ip = generateRandomIP();
                const threatId = `threat_${ip}_${Math.floor(Date.now() / 1000 - Math.floor(Math.random() * 3600))}`;
                
                batch.push({
                    threatId,
                    sourceIP: ip,
                    targetIP: generateRandomIP(), // 随机目标IP
                    threatLevel: generateRandomThreatLevel(),
                    threatType: generateRandomThreatType(),
                    timestamp: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 3600), // 过去1小时内
                    evidenceHash: ethers.keccak256(ethers.toUtf8Bytes(`evidence_${threatId}`)),
                    geolocation: ['US', 'CN', 'EU', 'JP', 'KR'][Math.floor(Math.random() * 5)],
                    sourceChainId: 8888
                });
            }
            
            // 批量发送到合约 - 由于ThreatIntelSync合约没有批量方法，我们需要逐个发送
            for (const threat of batch) {
                try {
                    // 对于ThreatIntelSync合约，我们需要使用sendThreatIntel方法
                    // 注意：这里需要目标链ID，我们使用一个默认值
                    const tx = await threatIntelSync.sendThreatIntel(
                        11155420, // 目标链ID (OP Sepolia)
                        threat.threatId,
                        threat.sourceIP,
                        threat.threatLevel,
                        threat.threatType,
                        threat.evidenceHash,
                        threat.geolocation
                    );
                    
                    await tx.wait();
                    
                    if ((i + j + 1) % 100 === 0) {
                        console.log(`已设置 ${i + j + 1}/10000 个威胁情报数据`);
                    }
                } catch (err) {
                    console.warn(`设置威胁情报失败 ${threat.threatId}:`, err.message);
                    // 继续处理下一个，不中断整个过程
                }
            }
        }
        
        console.log("威胁情报数据设置完成！");
    } catch (error) {
        console.error("设置威胁情报数据时发生错误:", error);
        // 如果合约不存在，尝试其他可能的合约
        console.log("尝试连接SecurityRiskAssessment合约...");
        
        try {
            // 尝试使用SecurityRiskAssessment相关合约
            const SecurityRiskAssessmentContract = await ethers.getContractFactory("SecurityRiskAssessmentContract");
            // 这里需要正确的合约地址
            console.log("SecurityRiskAssessment合约连接成功，但需要具体实现设置威胁数据的逻辑");
        } catch (innerError) {
            console.error("无法连接到威胁情报合约:", innerError);
            console.log("可能需要部署合约或使用正确的合约地址");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });