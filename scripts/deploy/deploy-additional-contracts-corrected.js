// deploy-additional-contracts-corrected.js
// 部署额外的OraSRS合约（修正版）

import pkg from 'hardhat';
const { ethers } = pkg;

async function deployAdditionalContracts() {
  const [deployer] = await ethers.getSigners();

  console.log("部署合约的地址: ", deployer.address);
  console.log("账户余额: ", (await ethers.provider.getBalance(deployer.address)).toString());

  // 从已有的部署文件读取已部署的合约地址
  let existingDeployments = {};
  try {
    const fs = await import('fs');
    if (fs.existsSync('all-deployments.json')) {
      existingDeployments = JSON.parse(fs.readFileSync('all-deployments.json', 'utf8'));
      console.log("已加载现有部署信息");
    }
  } catch (error) {
    console.log("未找到现有部署信息");
  }

  // 部署IPRiskCalculator合约（无构造函数参数）
  console.log("\n1. 部署IPRiskCalculator合约...");
  const IPRiskCalculator = await ethers.getContractFactory("IPRiskCalculator");
  const ipRiskCalculator = await IPRiskCalculator.deploy();
  await ipRiskCalculator.waitForDeployment();
  console.log("IPRiskCalculator 合约部署地址:", await ipRiskCalculator.getAddress());

  // 部署ThreatStats合约（无构造函数参数）
  console.log("\n2. 部署ThreatStats合约...");
  const ThreatStats = await ethers.getContractFactory("ThreatStats");
  const threatStats = await ThreatStats.deploy();
  await threatStats.waitForDeployment();
  console.log("ThreatStats 合约部署地址:", await threatStats.getAddress());

  // 部署OraSRSGovernance合约（需要构造函数参数）
  console.log("\n3. 部署OraSRSGovernance合约...");
  const OraSRSGovernance = await ethers.getContractFactory("OraSRSGovernance");
  // 使用零地址作为timelock，使用已部署的威胁情报协调合约地址
  const governance = await OraSRSGovernance.deploy(
    "0x0000000000000000000000000000000000000000",  // timelock地址
    existingDeployments.threatIntelligenceCoordinationAddress || "0xa82fF9aFd8f496c3d6ac40E2a0F282E47488CFc9"  // 威胁情报协调合约地址
  );
  await governance.waitForDeployment();
  console.log("OraSRSGovernance 合约部署地址:", await governance.getAddress());

  // 部署ThreatConsensus合约（需要治理合约地址作为参数）
  console.log("\n4. 部署ThreatConsensus合约...");
  const ThreatConsensus = await ethers.getContractFactory("ThreatConsensus");
  const threatConsensus = await ThreatConsensus.deploy(
    existingDeployments.oraTokenAddress || "0x84eA74d481Ee0A5332c457a4d796187F6Ba67fEB"  // ORA代币地址
  );
  await threatConsensus.waitForDeployment();
  console.log("ThreatConsensus 合约部署地址:", await threatConsensus.getAddress());

  // 部署ThreatBatch合约（无构造函数参数）
  console.log("\n5. 部署ThreatBatch合约...");
  const ThreatBatch = await ethers.getContractFactory("ThreatBatch");
  const threatBatch = await ThreatBatch.deploy();
  await threatBatch.waitForDeployment();
  console.log("ThreatBatch 合约部署地址:", await threatBatch.getAddress());

  // 部署更新的OraSRSReader合约
  console.log("\n6. 部署更新的OraSRSReader合约...");
  const OraSRSReader = await ethers.getContractFactory("OraSRSReader");
  const oraSRSReader = await OraSRSReader.deploy(
    existingDeployments.threatIntelligenceCoordinationAddress || "0xa82fF9aFd8f496c3d6ac40E2a0F282E47488CFc9",  // 威胁情报协调合约地址
    await ipRiskCalculator.getAddress()  // 风险计算器合约地址
  );
  await oraSRSReader.waitForDeployment();
  console.log("OraSRSReader 合约部署地址:", await oraSRSReader.getAddress());

  console.log("\n所有额外的OraSRS协议合约部署完成！");

  // 保存新的部署信息到JSON文件
  const fs = await import('fs');
  const newDeploymentInfo = {
    ...existingDeployments, // 保留现有部署地址
    ipRiskCalculatorAddress: await ipRiskCalculator.getAddress(),
    threatStatsAddress: await threatStats.getAddress(),
    governanceAddress: await governance.getAddress(),
    threatConsensusAddress: await threatConsensus.getAddress(),
    threatBatchAddress: await threatBatch.getAddress(),
    oraSRSReaderAddress: await oraSRSReader.getAddress(),
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync('all-deployments.json', JSON.stringify(newDeploymentInfo, null, 2));
  console.log("更新后的部署信息已保存到 all-deployments.json");

  // 打印所有部署的合约地址
  console.log("\n=== 所有部署的合约地址 ===");
  for (const [key, value] of Object.entries(newDeploymentInfo)) {
    if (typeof value === 'string' && (value.startsWith('0x') || key.includes('Address'))) {
      console.log(`${key}: ${value}`);
    }
  }
}

deployAdditionalContracts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });