// add-test-data-to-contracts.js
// 为合约添加测试数据

import pkg from 'hardhat';
const { ethers } = pkg;

async function addTestData() {
  const [deployer] = await ethers.getSigners();

  console.log("使用账户: ", deployer.address);
  console.log("账户余额: ", (await ethers.provider.getBalance(deployer.address)).toString());

  // 从部署文件加载合约地址
  let deployments = {};
  try {
    const fs = await import('fs');
    if (fs.existsSync('all-deployments.json')) {
      deployments = JSON.parse(fs.readFileSync('all-deployments.json', 'utf8'));
      console.log("加载部署信息成功");
    }
  } catch (error) {
    console.error("加载部署信息失败:", error);
    return;
  }

  // 连接威胁情报协调合约
  const threatIntelABI = [
    "function addThreatIntel(string memory _ip, uint8 _threatLevel, string memory _threatType) external",
    "function updateThreatScore(string memory _ip, uint256 _score) external",
    "function getThreatScore(string memory _ip) external view returns (uint256)"
  ];

  const threatIntelContract = new ethers.Contract(
    deployments.threatIntelligenceCoordinationAddress,
    threatIntelABI,
    deployer
  );

  // 连接节点注册合约
  const nodeRegistryABI = [
    "function registerNode(string memory nodeInfo) returns (bool)"
  ];

  const nodeRegistryContract = new ethers.Contract(
    deployments.nodeRegistryAddress,
    nodeRegistryABI,
    deployer
  );

  // 连接威胁统计合约
  const threatStatsABI = [
    "function getDashboardStats() view returns (uint256 total, string memory mostDangerousIp, uint256 maxScore, uint256[] memory typeDistribution)"
  ];

  const threatStatsContract = new ethers.Contract(
    deployments.threatStatsAddress,
    threatStatsABI,
    ethers.provider
  );

  // 添加一些测试威胁IP
  const testThreatIPs = [
    { ip: "1.2.3.4", score: 850, level: 3, type: "DDoS Attack" },
    { ip: "5.6.7.8", score: 720, level: 2, type: "Brute Force" },
    { ip: "9.10.11.12", score: 950, level: 3, type: "Malware Distribution" },
    { ip: "13.14.15.16", score: 450, level: 1, type: "Port Scanning" },
    { ip: "8.8.8.8", score: 0, level: 0, type: "Safe IP" },  // Google DNS (应该豁免)
    { ip: "1.1.1.1", score: 0, level: 0, type: "Safe IP" }   // Cloudflare DNS (应该豁免)
  ];

  console.log("\n📝 开始添加测试威胁IP到合约...");
  
  for (const threat of testThreatIPs) {
    try {
      console.log(`添加威胁IP: ${threat.ip}, 分数: ${threat.score}, 级别: ${threat.level}, 类型: ${threat.type}`);
      
      // 如果不是安全IP，则添加威胁情报
      if (threat.score > 0) {
        const tx1 = await threatIntelContract.addThreatIntel(threat.ip, threat.level, threat.type);
        await tx1.wait();
        console.log(`  ✓ 威胁情报添加成功`);
      }
      
      // 更新威胁分数
      const tx2 = await threatIntelContract.updateThreatScore(threat.ip, threat.score);
      await tx2.wait();
      console.log(`  ✓ 威胁分数更新成功: ${threat.score}`);
      
      // 验证分数是否正确设置
      const currentScore = await threatIntelContract.getThreatScore(threat.ip);
      console.log(`  ✓ 验证分数: ${currentScore} (期望: ${threat.score})`);
      
    } catch (error) {
      console.error(`  ❌ 添加威胁IP ${threat.ip} 失败:`, error.message);
    }
  }

  // 注册一个测试节点
  console.log("\n📝 注册测试节点...");
  try {
    const tx = await nodeRegistryContract.registerNode("Test Node for Performance Evaluation");
    await tx.wait();
    console.log("✓ 测试节点注册成功");
  } catch (error) {
    console.error("❌ 节点注册失败:", error.message);
  }

  // 检查威胁统计数据
  console.log("\n📊 获取威胁统计数据...");
  try {
    const stats = await threatStatsContract.getDashboardStats();
    console.log(`总威胁数: ${stats[0]}`);
    console.log(`最危险IP: ${stats[1]}`);
    console.log(`最高威胁分: ${stats[2]}`);
    console.log(`攻击类型分布:`, stats[3]);
  } catch (error) {
    console.error("❌ 获取威胁统计数据失败:", error.message);
  }

  console.log("\n✅ 测试数据添加完成！");
}

addTestData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });