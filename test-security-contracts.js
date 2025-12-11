// test-security-contracts.js
// 测试新部署的安全合约功能

import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  console.log("🔍 开始测试安全合约功能...");

  // 获取部署的合约实例
  const deploymentInfo = {
    "contracts": {
      "IPRiskCalculator": "0x0165878A594ca255338adfa4d48449f69242Eb8F",
      "ThreatStats": "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
      "OraSRSReader": "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
      "ThreatIntelligenceCoordination": "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707"
    }
  };

  // 获取合约实例
  const IPRiskCalculator = await ethers.getContractFactory("IPRiskCalculator");
  const ipRiskCalculator = await IPRiskCalculator.attach(deploymentInfo.contracts.IPRiskCalculator);

  const ThreatStats = await ethers.getContractFactory("ThreatStats");
  const threatStats = await ThreatStats.attach(deploymentInfo.contracts.ThreatStats);

  const OraSRSReader = await ethers.getContractFactory("OraSRSReader");
  const oraSRSReader = await OraSRSReader.attach(deploymentInfo.contracts.OraSRSReader);

  const ThreatIntelligenceCoordination = await ethers.getContractFactory("ThreatIntelligenceCoordination");
  const threatIntelligence = await ThreatIntelligenceCoordination.attach(deploymentInfo.contracts.ThreatIntelligenceCoordination);

  console.log("✅ 合约实例创建成功！");

  // 测试 1: IPRiskCalculator - 风险计算功能
  console.log("\n🧪 测试 1: IPRiskCalculator 合约");
  try {
    // 检查基础评分
    const bruteForceScore = await ipRiskCalculator.baseScores(1); // BRUTE_FORCE
    console.log("   • 暴力破解基础分:", bruteForceScore.toString());
    
    // 计算风险分数
    const newScore = await ipRiskCalculator.calculateRisk(50, 1, 5); // 当前分数50, 暴力破解, 5次攻击
    console.log("   • 计算后分数:", newScore.toString());
    
    // 评估风险等级
    const riskLevel = await ipRiskCalculator.evaluateRiskLevel(250);
    console.log("   • 风险等级 (250分):", riskLevel.toString());
    
    console.log("   ✅ IPRiskCalculator 功能正常");
  } catch (error) {
    console.error("   ❌ IPRiskCalculator 测试失败:", error.message);
  }

  // 测试 2: ThreatStats - 威胁统计功能
  console.log("\n🧪 测试 2: ThreatStats 合约");
  try {
    const totalThreats = await threatStats.totalThreatsDetected();
    console.log("   • 总威胁数:", totalThreats.toString());
    
    const attackTypeCount = await threatStats.getAttackTypeCount(1);
    console.log("   • 暴力破解攻击次数:", attackTypeCount.toString());
    
    console.log("   ✅ ThreatStats 功能正常");
  } catch (error) {
    console.error("   ❌ ThreatStats 测试失败:", error.message);
  }

  // 测试 3: ThreatIntelligenceCoordination - 威胁情报协调功能
  console.log("\n🧪 测试 3: ThreatIntelligenceCoordination 合约");
  try {
    // 更新一个IP的威胁分数
    await threatIntelligence.updateThreatScore("192.168.1.100", 250);
    console.log("   • 已更新 192.168.1.100 的威胁分数为 250");
    
    // 获取威胁分数
    const score = await threatIntelligence.getThreatScore("192.168.1.100");
    console.log("   • 获取 192.168.1.100 的威胁分数:", score.toString());
    
    console.log("   ✅ ThreatIntelligenceCoordination 功能正常");
  } catch (error) {
    console.error("   ❌ ThreatIntelligenceCoordination 测试失败:", error.message);
  }

  // 测试 4: OraSRSReader - 批量查询功能
  console.log("\n🧪 测试 4: OraSRSReader 合约");
  try {
    // 测试单IP查询
    const singleResult = await oraSRSReader.checkSingleIP("192.168.1.100", 200);
    console.log("   • 单IP查询结果:");
    console.log("     - IP:", singleResult.ipResult);
    console.log("     - 分数:", singleResult.score.toString());
    console.log("     - 风险等级:", singleResult.riskLevel.toString());
    console.log("     - 应该拦截:", singleResult.shouldBlock);
    
    // 测试批量查询
    const ips = ["192.168.1.100", "192.168.1.101", "192.168.1.102"];
    const bulkResults = await oraSRSReader.checkMultipleIPs(ips, 100);
    console.log("   • 批量查询结果 (共", bulkResults.length, "个IP):");
    for (let i = 0; i < bulkResults.length; i++) {
      console.log(`     - ${ips[i]}: 分数=${bulkResults[i].score}, 等级=${bulkResults[i].riskLevel}, 拦截=${bulkResults[i].shouldBlock}`);
    }
    
    // 测试过滤查询（仅返回高风险IP）
    const filteredResults = await oraSRSReader.checkMultipleIPsFiltered(ips, 200);
    console.log("   • 过滤查询结果 (仅高风险IP, 阈值200):", filteredResults.length, "个");
    
    console.log("   ✅ OraSRSReader 功能正常");
  } catch (error) {
    console.error("   ❌ OraSRSReader 测试失败:", error.message);
  }

  // 测试 5: 端到端功能 - 模拟完整的威胁情报更新和查询流程
  console.log("\n🧪 测试 5: 端到端功能测试");
  try {
    // 1. 更新威胁情报协调合约中的分数
    await threatIntelligence.updateThreatScore("203.0.113.5", 450);
    console.log("   • 更新威胁情报: 203.0.113.5 分数=450");
    
    // 2. 更新威胁统计
    await threatStats.updateStats(2, "203.0.113.5", 450); // DDOS 攻击类型
    console.log("   • 更新威胁统计: DDOS 攻击类型");
    
    // 3. 通过批量查询合约获取信息
    const endResult = await oraSRSReader.checkSingleIP("203.0.113.5", 300);
    console.log("   • 端到端查询结果:");
    console.log("     - IP:", endResult.ipResult);
    console.log("     - 分数:", endResult.score.toString());
    console.log("     - 风险等级:", endResult.riskLevel.toString());
    console.log("     - 应该拦截:", endResult.shouldBlock);
    
    // 4. 获取威胁统计信息
    const stats = await threatStats.getDashboardStats();
    console.log("   • 仪表盘统计:");
    console.log("     - 总威胁数:", stats.total.toString());
    console.log("     - 最危险IP:", stats.mostDangerousIp);
    console.log("     - 最高分:", stats.maxScore.toString());
    
    console.log("   ✅ 端到端功能测试通过");
  } catch (error) {
    console.error("   ❌ 端到端功能测试失败:", error.message);
  }

  console.log("\n🎉 所有安全合约测试完成！");
  console.log("📋 部署的合约地址:");
  console.log("   • IPRiskCalculator:", deploymentInfo.contracts.IPRiskCalculator);
  console.log("   • ThreatStats:", deploymentInfo.contracts.ThreatStats);
  console.log("   • OraSRSReader:", deploymentInfo.contracts.OraSRSReader);
  console.log("   • ThreatIntelligenceCoordination:", deploymentInfo.contracts.ThreatIntelligenceCoordination);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 测试过程中发生错误:", error);
    process.exit(1);
  });
