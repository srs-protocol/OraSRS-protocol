// scripts/destroy-governance.js
import pkg from "hardhat";
import { readFileSync } from 'fs';

const { ethers } = pkg;

async function main() {
  console.log("🗑️  准备删除 OraSRSGovernance 合约...");

  // 获取部署账户
  const [deployer] = await ethers.getSigners();
  console.log("📤 操作账户:", deployer.address);

  // 从部署信息中读取合约地址
  const deploymentInfo = JSON.parse(readFileSync('governance-deployment.json', 'utf8'));
  console.log("🔗 治理合约地址:", deploymentInfo.governanceAddress);
  console.log("🌐 链ID:", deploymentInfo.chainId);

  // 连接已部署的合约
  const OraSRSGovernance = await ethers.getContractFactory("OraSRSGovernance");
  const governance = OraSRSGovernance.attach(deploymentInfo.governanceAddress);

  console.log("\n🔍 验证合约所有权...");
  try {
    const owner = await governance.owner();
    console.log("📋 合约所有者:", owner);
    console.log("👤 当前账户是否为所有者:", owner.toLowerCase() === deployer.address.toLowerCase());
  } catch (error) {
    console.log("⚠️  无法验证合约所有权，可能合约已不存在或无法访问:", error.message);
  }

  console.log("\n⏰ 准备销毁合约...");
  try {
    // 调用自毁函数
    console.log("💥 执行合约销毁操作...");
    const tx = await governance.destroy();
    console.log("🗳️  交易已提交，交易哈希:", tx.hash);
    
    // 等待交易确认
    const receipt = await tx.wait();
    console.log("✅ 交易已确认，合约已被销毁");
    console.log("📝 交易收据:", receipt);
  } catch (error) {
    if (error.message.includes("execution reverted")) {
      console.log("❌ 合约销毁失败，可能原因：");
      console.log("   - 当前账户不是合约所有者");
      console.log("   - 合约中没有实现销毁函数");
      console.log("   - 合约已经被销毁");
      console.log("   - 错误详情:", error.reason || error.message);
    } else {
      console.log("❌ 合约销毁过程中发生错误:", error);
    }
  }

  console.log("\n📋 合约销毁操作完成！");
  console.log("注意：合约销毁后，其地址将不再响应任何函数调用。");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 删除合约过程中发生错误:", error);
    process.exit(1);
  });