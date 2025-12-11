// 简单测试GasSubsidy合约功能
import pkg from 'hardhat';
const { ethers } = pkg;

async function testGasSubsidy() {
  console.log("测试GasSubsidy合约功能...");

  const signers = await ethers.getSigners();
  const deployer = signers[0];
  const user1 = signers[1];
  console.log("操作账户:", deployer.address);
  console.log("测试用户1:", user1.address);

  // 获取GasSubsidy合约地址
  const gasSubsidyAddress = "0x5eb3Bc0a489C5A8288765d2336659EbCA68FCd00";

  // 连接到GasSubsidy合约
  const GasSubsidy = await ethers.getContractFactory("GasSubsidy");
  const gasSubsidy = GasSubsidy.attach(gasSubsidyAddress);

  // 检查合约余额
  const contractBalance = await ethers.provider.getBalance(gasSubsidy.target);
  console.log("GasSubsidy合约原生代币余额:", ethers.formatEther(contractBalance));

  // 检查补贴金额设置
  const subsidyAmount = await gasSubsidy.subsidyAmount();
  console.log("单次补贴金额:", ethers.formatEther(subsidyAmount), "原生代币");

  // 检查用户初始余额
  const user1InitialBalance = await ethers.provider.getBalance(user1.address);
  console.log("用户1初始余额:", ethers.formatEther(user1InitialBalance));

  // 作为Relayer给用户1发放补贴
  console.log("\n给用户1发放Gas补贴...");
  try {
    const subsidyTx = await gasSubsidy.subsidize(user1.address);
    await subsidyTx.wait();
    console.log("✓ Gas补贴发放成功");

    // 检查用户1的余额变化
    const user1NewBalance = await ethers.provider.getBalance(user1.address);
    console.log("用户1新余额:", ethers.formatEther(user1NewBalance));
    console.log("用户1余额增加:", ethers.formatEther(user1NewBalance - user1InitialBalance));

    // 检查用户1是否已标记为已领取
    const hasClaimed = await gasSubsidy.hasClaimed(user1.address);
    console.log("用户1已领取状态:", hasClaimed);

    // 尝试再次给用户1发放补贴（应该失败）
    console.log("\n尝试重复给用户1发放补贴（应该失败）...");
    try {
      await gasSubsidy.subsidize(user1.address);
      console.log("✗ 重复发放应该失败但成功了");
    } catch (error) {
      console.log("✓ 重复发放被正确阻止");
    }
  } catch (error) {
    console.log("✗ 发放补贴失败:", error);
  }

  console.log("\n✓ GasSubsidy合约功能测试完成！");
}

testGasSubsidy()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
