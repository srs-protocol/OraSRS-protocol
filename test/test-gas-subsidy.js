import pkg from 'hardhat';

const { ethers } = pkg;

async function testGasSubsidy() {
  console.log("正在测试GasSubsidy合约功能...\n");

  const [deployer, user1, user2] = await ethers.getSigners();
  
  // 从部署信息文件中读取合约地址
  const fs = await import('fs');
  const deploymentInfo = JSON.parse(fs.readFileSync('all-deployments.json', 'utf8'));
  
  // 获取GasSubsidy合约实例
  const gasSubsidy = await ethers.getContractAt("GasSubsidy", deploymentInfo.gasSubsidyAddress);

  console.log("=== 测试GasSubsidy合约功能 ===");
  
  // 检查初始状态
  console.log("初始状态:");
  const subsidyAmount = await gasSubsidy.subsidyAmount();
  const relayerAddress = await gasSubsidy.relayerAddress();
  const contractBalance = await ethers.provider.getBalance(await gasSubsidy.getAddress());
  console.log("- 补贴金额:", ethers.formatEther(subsidyAmount), "ETH");
  console.log("- 中继器地址:", relayerAddress);
  console.log("- 合约余额:", ethers.formatEther(contractBalance), "ETH");
  console.log();

  // 测试给用户发放Gas补贴
  console.log("给用户1发放Gas补贴...");
  try {
    const tx = await gasSubsidy.connect(deployer).subsidize(user1.address);
    await tx.wait();
    console.log("✓ 成功给用户1发放Gas补贴:", ethers.formatEther(subsidyAmount), "ETH");
  } catch (error) {
    console.log("✗ 发放补贴失败:", error.message);
  }

  // 测试重复发放（应该失败）
  console.log("\n尝试给同一用户重复发放（应该失败）...");
  try {
    const tx = await gasSubsidy.connect(deployer).subsidize(user1.address);
    await tx.wait();
    console.log("✗ 重复发放竟然成功了，这不应该发生");
  } catch (error) {
    console.log("✓ 重复发放失败，符合预期:", error.reason || error.message);
  }

  // 测试批量发放
  console.log("\n批量给多个用户发放补贴...");
  try {
    const tx = await gasSubsidy.connect(deployer).batchSubsidize([user2.address]);
    await tx.wait();
    console.log("✓ 成功批量发放补贴给用户2");
  } catch (error) {
    console.log("✗ 批量发放失败:", error.message);
  }
  
  // 检查用户余额变化
  console.log("\n用户余额变化:");
  const user1Balance = await ethers.provider.getBalance(user1.address);
  const user2Balance = await ethers.provider.getBalance(user2.address);
  console.log("- 用户1余额:", ethers.formatEther(user1Balance), "ETH");
  console.log("- 用户2余额:", ethers.formatEther(user2Balance), "ETH");

  // 检查合约余额变化
  const newContractBalance = await ethers.provider.getBalance(await gasSubsidy.getAddress());
  console.log("- GasSubsidy合约新余额:", ethers.formatEther(newContractBalance), "ETH");
  
  console.log("\nGasSubsidy合约功能测试完成！");
}

testGasSubsidy()
  .then(() => {
    console.log("\n测试完成！");
    process.exit(0);
  })
  .catch((error) => {
    console.error("测试过程中出错:", error);
    process.exit(1);
  });
