// simulate-agent.cjs - 模拟OraSRS Agent连接到私有链并上报威胁
import { ethers } from "ethers";
import { readFile } from "fs/promises";

async function simulateAgent() {
  console.log("🚀 启动 OraSRS Agent 模拟器...");
  console.log("🔗 连接到本地私有链 http://localhost:8545");
  
  // 连接到本地Hardhat节点
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  
  // 获取部署的合约地址
  const deploymentInfo = JSON.parse(await readFile('./deployment-info.json', 'utf8'));
  console.log("📋 使用合约地址:");
  console.log("   威胁情报合约:", deploymentInfo.threatIntelContract);
  console.log("   安全操作合约:", deploymentInfo.securityActionContract);
  
  // 威胁情报合约ABI
  const threatIntelABI = [
    "function addThreatIntel(string memory _ip, uint8 _threatLevel, string memory _threatType) external",
    "function removeThreatIntel(string memory _ip) external",
    "function isThreatSource(string memory _ip) external view returns (bool)",
    "function getThreatIntel(string memory _ip) external view returns (string memory sourceIP, string memory targetIP, uint8 threatLevel, uint256 timestamp, string memory threatType, bool isActive)"
  ];
  
  // 安全操作合约ABI
  const securityActionABI = [
    "function blockIP(string memory _ip) external",
    "function unblockIP(string memory _ip) external",
    "function isIPBlocked(string memory _ip) external view returns (bool)"
  ];

  // 创建合约实例
  const threatIntelContract = new ethers.Contract(
    deploymentInfo.threatIntelContract, 
    threatIntelABI, 
    provider
  );
  
  const securityActionContract = new ethers.Contract(
    deploymentInfo.securityActionContract, 
    securityActionABI, 
    provider
  );

  // 使用Hardhat默认账户
  const wallet = new ethers.Wallet(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // Hardhat默认私钥
    provider
  );

  // 重新创建合约实例以进行写操作
  const threatIntelWrite = threatIntelContract.connect(wallet);
  const securityActionWrite = securityActionContract.connect(wallet);

  console.log("\n🔍 开始威胁检测和上报模拟...\n");

  // 模拟检测到的威胁 (威胁等级在0-3范围内，符合合约定义)
  const detectedThreats = [
    {
      id: "threat_" + Date.now(),
      sourceIP: "192.168.1.100",
      threatLevel: 3, // 3 = Emergency (最高级)
      threatType: "DDoS_Attack",
      timestamp: Math.floor(Date.now() / 1000),
      evidence: "Multiple SYN flood packets detected"
    },
    {
      id: "threat_" + (Date.now() + 1),
      sourceIP: "104.28.29.30",
      threatLevel: 2, // 降低威胁等级以避免合约revert
      threatType: "Malware_Distribution",
      timestamp: Math.floor(Date.now() / 1000),
      evidence: "Known malware hash detected in network traffic"
    },
    {
      id: "threat_" + (Date.now() + 2),
      sourceIP: "185.132.189.10",
      threatLevel: 1, // 1 = Warning
      threatType: "Port_Scanning",
      timestamp: Math.floor(Date.now() / 1000),
      evidence: "Sequential port scanning detected"
    }
  ];

  // 上报检测到的威胁
  for (const threat of detectedThreats) {
    console.log(`📡 上报威胁: ${threat.id}`);
    console.log(`   来源IP: ${threat.sourceIP}`);
    console.log(`   威胁等级: ${threat.threatLevel} (${getThreatLevelName(threat.threatLevel)})`);
    console.log(`   威胁类型: ${threat.threatType}`);
    console.log(`   证据: ${threat.evidence}`);
    
    try {
      // 添加威胁到威胁情报合约 (带重试机制)
      console.log(`   📥 正在添加到威胁情报合约...`);
      let tx, receipt;
      let retries = 0;
      const maxRetries = 3;
      
      while (retries < maxRetries) {
        try {
          tx = await threatIntelWrite.addThreatIntel(
            threat.sourceIP, 
            threat.threatLevel, 
            threat.threatType
          );
          // 等待交易确认，确保Nonce正确更新
          receipt = await tx.wait();
          break; // 成功则退出重试循环
        } catch (txError) {
          retries++;
          if (retries >= maxRetries) {
            throw txError; // 所有重试都失败，抛出错误
          }
          console.log(`   ⚠️ 交易失败，重试 ${retries}/${maxRetries}:`, txError.message);
          // 等待一段时间再重试
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log(`   ✅ 威胁已成功上报到区块链 (交易哈希: ${receipt.hash.slice(0, 10)}...)`);
      
      // 检查威胁是否已记录
      const isThreat = await threatIntelContract.isThreatSource(threat.sourceIP);
      console.log(`   🔍 威胁状态验证: ${isThreat ? '已确认' : '未确认'}`);
      
      // 如果是高威胁，执行自动阻断
      if (threat.threatLevel >= 3) {
        console.log(`   🚫 执行自动阻断...`);
        retries = 0;
        let blockTx, blockReceipt;
        
        while (retries < maxRetries) {
          try {
            blockTx = await securityActionWrite.blockIP(threat.sourceIP);
            // 等待阻断交易确认
            blockReceipt = await blockTx.wait();
            break; // 成功则退出重试循环
          } catch (txError) {
            retries++;
            if (retries >= maxRetries) {
              throw txError; // 所有重试都失败，抛出错误
            }
            console.log(`   ⚠️ 阻断交易失败，重试 ${retries}/${maxRetries}:`, txError.message);
            // 等待一段时间再重试
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        console.log(`   ✅ IP ${threat.sourceIP} 已被自动阻断 (交易哈希: ${blockReceipt.hash.slice(0, 10)}...)`);
        
        // 验证阻断状态
        const isBlocked = await securityActionContract.isIPBlocked(threat.sourceIP);
        console.log(`   🔒 阻断状态验证: ${isBlocked ? '已阻断' : '未阻断'}`);
      }
      
    } catch (error) {
      console.error(`   ❌ 上报威胁失败:`, error.message);
    }
    
    console.log(`   ---`);
    // 等待一段时间再处理下一个威胁，确保区块链状态更新
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // 演示威胁情报查询
  console.log("\n📋 查询威胁情报...");
  for (const threat of detectedThreats.slice(0, 2)) { // 只查询前两个
    try {
      const threatInfo = await threatIntelContract.getThreatIntel(threat.sourceIP);
      console.log(`   IP ${threat.sourceIP}:`);
      console.log(`     - 威胁等级: ${Number(threatInfo.threatLevel)} (${getThreatLevelName(Number(threatInfo.threatLevel))})`);
      console.log(`     - 威胁类型: ${threatInfo.threatType}`);
      console.log(`     - 活跃状态: ${threatInfo.isActive ? '是' : '否'}`);
      console.log(`     - 时间戳: ${new Date(Number(threatInfo.timestamp) * 1000).toISOString()}`);
    } catch (error) {
      console.error(`   查询 ${threat.sourceIP} 失败:`, error.message);
    }
  }

  console.log("\n🎯 OraSRS Agent 模拟运行完成！");
  console.log("📊 Agent 成功连接到本地私有链并执行了威胁检测和上报任务");
}

function getThreatLevelName(level) {
  switch(level) {
    case 0: return "Info";
    case 1: return "Warning";
    case 2: return "Critical";
    case 3: return "Emergency";
    default: return "Unknown";
  }
}

// 运行模拟
simulateAgent().catch(console.error);
