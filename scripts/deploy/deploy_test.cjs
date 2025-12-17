const { ethers } = require("hardhat");

async function main() {
  console.log("开始部署OraSRS合约...");
  
  // 部署OraSRSToken合约 (无构造函数参数)
  const OraSRSToken = await ethers.getContractFactory("OraSRSToken");
  const token = await OraSRSToken.deploy();
  await token.waitForDeployment();
  console.log("OraSRSToken合约部署到:", await token.getAddress());

  // 部署ThreatIntelligenceCoordination合约 (无构造函数参数)
  const ThreatIntelligenceCoordination = await ethers.getContractFactory("ThreatIntelligenceCoordination");
  const threatIntel = await ThreatIntelligenceCoordination.deploy();
  await threatIntel.waitForDeployment();
  console.log("ThreatIntelligenceCoordination合约部署到:", await threatIntel.getAddress());

  // 部署OraSRSGovernance合约 (需要timelock和threatIntelligenceCoordination地址)
  // 由于可能依赖关系复杂，我们先部署一个简单的版本
  const OraSRSGovernance = await ethers.getContractFactory("OraSRSGovernance");
  // 使用零地址作为临时参数，后续可以更新
  const governance = await OraSRSGovernance.deploy(ethers.ZeroAddress, await threatIntel.getAddress());
  await governance.waitForDeployment();
  console.log("OraSRSGovernance合约部署到:", await governance.getAddress());

  console.log("所有合约部署完成！");
  
  // 进行基本功能测试
  console.log("\n开始基本功能测试...");
  
  // 获取默认账户
  const [deployer, account1, account2] = await ethers.getSigners();
  
  // 测试威胁情报合约功能
  try {
    // 添加一个测试威胁IP
    const tx = await threatIntel.connect(account1).addThreatIntel(
      "192.168.1.100",      // IP
      2,                    // 威胁级别 (Critical - 从枚举来看: Info=0, Warning=1, Critical=2, Emergency=3)
      "DDoS Attack"         // 威胁类型
    );
    await tx.wait();
    console.log("威胁情报添加成功");
    
    // 更新威胁分数
    const scoreTx = await threatIntel.connect(account1).updateThreatScore("192.168.1.100", 95);
    await scoreTx.wait();
    console.log("威胁分数更新成功");
    
    // 查询威胁分数
    const threatScore = await threatIntel.getThreatScore("192.168.1.100");
    console.log("查询威胁分数:", threatScore.toString());
    
    // 检查IP是否为威胁IP
    const isThreat = await threatIntel.isThreatIP("192.168.1.100");
    console.log("IP是否为威胁IP:", isThreat);
    
  } catch (error) {
    console.error("测试过程中出现错误:", error);
  }
  
  console.log("\n部署和基本测试完成！");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });