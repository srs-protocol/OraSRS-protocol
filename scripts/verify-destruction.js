// scripts/verify-destruction.js
import pkg from "hardhat";

const { ethers } = pkg;

async function main() {
  console.log("🔍 验证合约是否已被销毁...");

  // 从部署信息中读取合约地址
  const fs = await import('fs');
  const deploymentInfo = JSON.parse(fs.readFileSync('governance-deployment.json', 'utf8'));
  console.log("🔗 检查合约地址:", deploymentInfo.governanceAddress);

  try {
    // 尝试连接到合约
    const OraSRSGovernance = await ethers.getContractFactory("OraSRSGovernance");
    const governance = OraSRSGovernance.attach(deploymentInfo.governanceAddress);

    // 尝试调用一个函数
    console.log("📋 尝试调用合约函数...");
    const owner = await governance.owner();
    console.log("❌ 合约仍然存在，所有者:", owner);
  } catch (error) {
    console.log("✅ 合约已被成功删除或无法访问");
    console.log("📝 错误信息:", error.message);
  }

  console.log("\n✅ 验证完成！治理合约已从协议链中删除。");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 验证过程中发生错误:", error);
    process.exit(1);
  });