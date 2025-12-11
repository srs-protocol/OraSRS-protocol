// 超简单测试GasSubsidy合约功能 - 使用一个账户
import pkg from 'hardhat';
const { ethers } = pkg;

async function testGasSubsidy() {
  console.log("测试GasSubsidy合约功能...");

  // 获取Hardhat默认账号
  const accounts = await ethers.getSigners();
  const deployer = accounts[0]; // 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
  console.log("操作账户:", deployer.address);

  // 获取GasSubsidy合约地址
  const gasSubsidyAddress = "0x5eb3Bc0a489C5A8288765d2336659EbCA68FCd00";

  // 连接到GasSubsidy合约
  const GasSubsidy = await ethers.getContractFactory("GasSubsidy");
  const gasSubsidy = GasSubsidy.attach(gasSubsidyAddress);

  console.log("正在查询合约状态...");
  
  // 检查合约余额
  const contractBalance = await ethers.provider.getBalance(gasSubsidyAddress);
  console.log("GasSubsidy合约原生代币余额:", ethers.formatEther(contractBalance));

  // 检查补贴金额设置
  const subsidyAmount = await gasSubsidy.subsidyAmount();
  console.log("单次补贴金额:", ethers.formatEther(subsidyAmount), "原生代币");

  // 检查Relayer地址
  const relayer = await gasSubsidy.relayerAddress();
  console.log("Relayer地址:", relayer);

  // 创建一个虚拟地址用于测试
  const user1Address = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Hardhat默认账户2的地址
  console.log("测试用户地址:", user1Address);

  // 检查用户1是否已领取
  const hasClaimed = await gasSubsidy.hasClaimed(user1Address);
  console.log("用户1已领取状态:", hasClaimed);

  // 检查用户1的初始余额
  const user1InitialBalance = await ethers.provider.getBalance(user1Address);
  console.log("用户1初始余额:", ethers.formatEther(user1InitialBalance));

  // 作为Relayer给用户1发放补贴
  console.log("\n给用户1发放Gas补贴...");
  try {
    const subsidyTx = await gasSubsidy.connect(deployer).subsidize(user1Address);
    await subsidyTx.wait();
    console.log("✓ Gas补贴发放成功");

    // 检查用户1的新余额
    const user1NewBalance = await ethers.provider.getBalance(user1Address);
    console.log("用户1新余额:", ethers.formatEther(user1NewBalance));
    console.log("用户1余额增加:", ethers.formatEther(user1NewBalance - user1InitialBalance));

    // 再次检查用户1的已领取状态
    const hasClaimedAfter = await gasSubsidy.hasClaimed(user1Address);
    console.log("用户1已领取状态(发放后):", hasClaimedAfter);
  } catch (error) {
    console.log("✗ 发放补贴失败:", error.message);
  }

  console.log("\n✓ GasSubsidy合约功能测试完成！");
}

testGasSubsidy()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
