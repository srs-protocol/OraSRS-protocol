// scripts/deploy-threat-consensus.js
import hre from 'hardhat';
import fs from 'fs';

async function main() {
  console.log("🚀 开始部署 ThreatConsensus 合约...");

  // 获取部署者
  const [deployer] = await hre.ethers.getSigners();
  console.log("📤 部署者地址:", deployer.address);

  // 获取或创建ORASRS代币合约地址（这里使用模拟地址，实际部署时需要先部署代币合约）
  // 在实际场景中，应该先部署代币合约，然后使用其地址
  const tokenAddress = process.env.TOKEN_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // 示例地址
  console.log("🏷️  代币合约地址:", tokenAddress);

  // 部署合约
  const ThreatConsensus = await hre.ethers.getContractFactory("ThreatConsensus");
  console.log("🏗️  正在部署 ThreatConsensus 合约...");
  const threatConsensus = await ThreatConsensus.connect(deployer).deploy(tokenAddress);
  await threatConsensus.waitForDeployment();

  console.log("✅ ThreatConsensus 合约部署成功!");
  const threatConsensusAddress = await threatConsensus.getAddress();
  console.log("📍 合约地址:", threatConsensusAddress);

  // 验证合约
  console.log("🔍 验证部署...");
  let threshold;
  try {
    threshold = await threatConsensus.CONSENSUS_THRESHOLD();
    console.log("✅ 合约验证通过!");
    console.log("📋 部署参数:");
    console.log(`   共识阈值: ${threshold}`);
  } catch (error) {
    console.error("❌ 合约验证失败:", error);
    threshold = "未知";
  }

  // 保存部署信息
  const deploymentInfo = {
    threatConsensusAddress: threatConsensusAddress,
    tokenAddress: tokenAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    network: hre.network.name,
    chainId: hre.network.config.chainId || (await hre.ethers.provider.getNetwork()).chainId
  };

  fs.writeFileSync("threat-consensus-deployment.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("💾 部署信息已保存到 threat-consensus-deployment.json");

  console.log("\n🎉 ThreatConsensus 合约部署完成!");
  console.log("📍 合约地址:", threatConsensusAddress);
  console.log("🏷️  代币合约地址:", tokenAddress);
  console.log("📋 重要提示:");
  console.log("   - 合约所有者:", deployer.address);
  console.log("   - 共识阈值:", `${threshold} 个节点举报`);
  console.log("   - 最小代币余额: 1000 代币");
  console.log("   - 需要将此地址配置到客户端");

  return threatConsensusAddress;
}

// 运行部署并处理错误
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 部署过程中发生错误:", error);
    process.exit(1);
  });
