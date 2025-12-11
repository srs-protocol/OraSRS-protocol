// scripts/deploy-threat-batch.js
import hre from 'hardhat';
import fs from 'fs';

async function main() {
  console.log("🚀 开始部署 ThreatBatch 合约...");

  // 获取部署者
  const [deployer] = await hre.ethers.getSigners();
  console.log("📤 部署者地址:", deployer.address);

  // 部署合约
  const ThreatBatch = await hre.ethers.getContractFactory("ThreatBatch");
  console.log("🏗️  正在部署 ThreatBatch 合约...");
  const threatBatch = await ThreatBatch.connect(deployer).deploy();
  await threatBatch.waitForDeployment();

  console.log("✅ ThreatBatch 合约部署成功!");
  const threatBatchAddress = await threatBatch.getAddress();
  console.log("📍 合约地址:", threatBatchAddress);

  // 验证合约
  console.log("🔍 验证部署...");
  try {
    const tier1 = await threatBatch.TIER_1();
    const tier2 = await threatBatch.TIER_2();
    const tier3 = await threatBatch.TIER_3();
    
    console.log("📋 封禁时长配置:");
    console.log(`   TIER_1 (24h): ${tier1} 秒`);
    console.log(`   TIER_2 (3d): ${tier2} 秒`);
    console.log(`   TIER_3 (7d): ${tier3} 秒`);
    
    console.log("✅ 合约验证通过!");
  } catch (error) {
    console.error("❌ 合约验证失败:", error);
  }

  // 保存部署信息
  const deploymentInfo = {
    threatBatchAddress: threatBatchAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    network: hre.network.name,
    chainId: hre.network.config.chainId || (await hre.ethers.provider.getNetwork()).chainId
  };

  fs.writeFileSync("threat-batch-deployment.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("💾 部署信息已保存到 threat-batch-deployment.json");

  console.log("\n🎉 ThreatBatch 合约部署完成!");
  console.log("📍 合约地址:", threatBatchAddress);
  console.log("📋 重要提示:");
  console.log("   - 合约所有者:", deployer.address);
  console.log("   - 需要将此地址配置到客户端");
  console.log("   - 只有合约所有者可以调用 reportBatch 函数");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 部署过程中发生错误:", error);
    process.exit(1);
  });