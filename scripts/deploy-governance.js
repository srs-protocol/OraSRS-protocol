// scripts/deploy-governance.js
import pkg from "hardhat";
import { writeFileSync } from 'fs';

const { ethers } = pkg;

async function main() {
  console.log("🚀 开始部署 OraSRSGovernance 合约到 OraSRS 私有链 (api.orasrs.net)...");

  // 获取部署账户
  const [deployer] = await ethers.getSigners();
  console.log("📤 部署账户:", deployer.address);
  console.log("💰 账户余额:", (await ethers.provider.getBalance(deployer.address)).toString());

  // 部署治理合约
  console.log("\n🏗️  部署 OraSRSGovernance 合约...");
  const OraSRSGovernance = await ethers.getContractFactory("OraSRSGovernance");
  
  // 使用零地址作为timelock和威胁情报协调合约的临时地址，后续可以更新
  const governance = await OraSRSGovernance.deploy(
    ethers.ZeroAddress, // timelock（可后续更新）
    ethers.ZeroAddress  // threatIntelligenceCoordination（可后续更新）
  );
  
  await governance.waitForDeployment();
  console.log("✅ OraSRSGovernance 合约部署成功！");
  console.log("🔗 合约地址:", await governance.getAddress());

  // 验证合约是否部署成功
  console.log("\n🔍 验证合约部署...");
  try {
    const timelockAddr = await governance.timelock();
    const threatIntelAddr = await governance.threatIntelligenceCoordination();
    console.log("✓ timelock 地址:", timelockAddr);
    console.log("✓ 威胁情报协调合约地址:", threatIntelAddr);
    console.log("✓ 治理参数 - 投票期:", await governance.votingPeriod());
    console.log("✓ 治理参数 - 提案门槛:", await governance.proposalThreshold());
    console.log("✓ 治理参数 - 法定人数:", await governance.quorumPercentage());
  } catch (error) {
    console.error("❌ 验证失败:", error);
  }

  console.log("\n🎉 OraSRSGovernance 合约已成功部署到 OraSRS 私有链！");
  console.log("📝 合约功能:");
  console.log("   • 创建治理提案 (createProposal)");
  console.log("   • 对提案进行投票 (castVote)");
  console.log("   • 更新治理参数");
  console.log("   • 管理协议关键配置");

  // 保存部署信息
  const network = await ethers.provider.getNetwork();
  const deploymentInfo = {
    governanceAddress: await governance.getAddress(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    chainId: Number(network.chainId),  // Convert BigInt to Number
    rpcUrl: "http://127.0.0.1:8545"  // Use string instead of network.rpc
  };

  writeFileSync("governance-deployment.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("\n💾 部署信息已保存到 governance-deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 部署过程中发生错误:", error);
    process.exit(1);
  });
