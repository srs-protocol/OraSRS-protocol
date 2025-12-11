// scripts/deploy-security-contracts.js
import pkg from "hardhat";
import { writeFileSync } from 'fs';

const { ethers } = pkg;

async function main() {
  console.log("🚀 开始部署 OraSRS 安全相关合约...");

  // 获取部署账户
  const [deployer] = await ethers.getSigners();
  console.log("📤 部署账户:", deployer.address);

  // 首先部署核心威胁情报协调合约（需要先部署，因为它将作为OraSRSReader的数据源）
  console.log("\n🏗️  部署 ThreatIntelligenceCoordination 合约...");
  const ThreatIntelligenceCoordination = await ethers.getContractFactory("ThreatIntelligenceCoordination");
  const threatIntelligence = await ThreatIntelligenceCoordination.deploy();
  await threatIntelligence.waitForDeployment();
  console.log("✅ ThreatIntelligenceCoordination 合约部署成功！");
  console.log("🔗 合约地址:", await threatIntelligence.getAddress());

  // 部署IP风险计算器
  console.log("\n🏗️  部署 IPRiskCalculator 合约...");
  const IPRiskCalculator = await ethers.getContractFactory("IPRiskCalculator");
  const riskCalculator = await IPRiskCalculator.deploy();
  await riskCalculator.waitForDeployment();
  console.log("✅ IPRiskCalculator 合约部署成功！");
  console.log("🔗 合约地址:", await riskCalculator.getAddress());

  // 部署威胁态势分析合约
  console.log("\n🏗️  部署 ThreatStats 合约...");
  const ThreatStats = await ethers.getContractFactory("ThreatStats");
  const threatStats = await ThreatStats.deploy();
  await threatStats.waitForDeployment();
  console.log("✅ ThreatStats 合约部署成功！");
  console.log("🔗 合约地址:", await threatStats.getAddress());

  // 部署批量查询合约 - 使用已部署的威胁情报协调合约和风险计算器地址
  console.log("\n🏗️  部署 OraSRSReader 合约...");
  const OraSRSReader = await ethers.getContractFactory("OraSRSReader");
  const reader = await OraSRSReader.deploy(
    await threatIntelligence.getAddress(),  // 使用威胁情报协调合约（实现getThreatScore接口）
    await riskCalculator.getAddress()        // 使用风险计算器合约
  );
  await reader.waitForDeployment();
  console.log("✅ OraSRSReader 合约部署成功！");
  console.log("🔗 合约地址:", await reader.getAddress());

  // 验证合约功能
  console.log("\n🔍 验证合约功能...");
  try {
    // 测试风险计算器
    const baseScore = await riskCalculator.baseScores(1); // BRUTE_FORCE
    console.log("📋 风险计算器 - 暴力破解基础分:", baseScore.toString());
    
    // 测试威胁统计
    console.log("📋 威胁统计 - 总威胁数:", (await threatStats.totalThreatsDetected()).toString());
    
    // 测试威胁情报协调合约
    console.log("📋 威胁情报协调 - 合约地址:", await threatIntelligence.getAddress());
    
    // 测试批量查询
    const singleResult = await reader.checkSingleIP("192.168.1.1", 80);
    console.log("📋 批量查询 - 单IP查询功能正常");
    console.log("   IP:", singleResult.ipResult);
    console.log("   Score:", singleResult.score.toString());
    console.log("   Risk Level:", singleResult.riskLevel.toString());
    console.log("   Should Block:", singleResult.shouldBlock);
  } catch (error) {
    console.log("⚠️  验证过程中出现错误:", error.message);
  }

  console.log("\n🎉 所有安全合约已成功部署！");
  console.log("📝 合约功能:");
  console.log("   • IPRiskCalculator: IP风险评分算法");
  console.log("   • ThreatStats: 威胁态势分析");
  console.log("   • OraSRSReader: 批量查询接口");
  console.log("   • ThreatIntelligenceCoordination: 威胁情报存储和查询");

  // 保存部署信息
  const deploymentInfo = {
    contracts: {
      IPRiskCalculator: await riskCalculator.getAddress(),
      ThreatStats: await threatStats.getAddress(),
      OraSRSReader: await reader.getAddress(),
      ThreatIntelligenceCoordination: await threatIntelligence.getAddress()
    },
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    rpcUrl: "http://127.0.0.1:8545"
  };

  writeFileSync("security-contracts-deployment.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("\n💾 部署信息已保存到 security-contracts-deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 部署过程中发生错误:", error);
    process.exit(1);
  });