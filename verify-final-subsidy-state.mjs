// 验证GasSubsidy合约最终状态
import pkg from 'hardhat';
const { ethers } = pkg;

async function verifyFinalState() {
  console.log("验证GasSubsidy合约最终状态...");

  // 获取GasSubsidy合约地址
  const gasSubsidyAddress = "0x5eb3Bc0a489C5A8288765d2336659EbCA68FCd00";

  // 连接到GasSubsidy合约
  const GasSubsidy = await ethers.getContractFactory("GasSubsidy");
  const gasSubsidy = GasSubsidy.attach(gasSubsidyAddress);

  // 检查合约余额
  const contractBalance = await ethers.provider.getBalance(gasSubsidyAddress);
  console.log("✓ GasSubsidy合约最终原生代币余额:", ethers.formatEther(contractBalance));

  // 检查补贴金额设置
  const subsidyAmount = await gasSubsidy.subsidyAmount();
  console.log("✓ 单次补贴金额:", ethers.formatEther(subsidyAmount), "原生代币");

  // 检查Relayer地址
  const relayer = await gasSubsidy.relayerAddress();
  console.log("✓ Relayer地址:", relayer);

  // 检查合约所有权
  const owner = await gasSubsidy.owner();
  console.log("✓ 合约所有者:", owner);

  console.log("\n✓ GasSubsidy合约状态验证完成！");
  console.log(`\n现在GasSubsidy合约拥有 ${ethers.formatEther(contractBalance)} 原生代币的资金池，`);
  console.log("可以为新用户提供Gas补贴，解决'先有鸡还是先有蛋'的问题。");
}

verifyFinalState()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });