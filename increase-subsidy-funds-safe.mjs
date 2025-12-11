// 向GasSubsidy合约增加资金（使用账户全部可用余额）
import pkg from 'hardhat';
const { ethers } = pkg;

async function fundGasSubsidy() {
  console.log("向GasSubsidy合约增加资金...");

  const [deployer] = await ethers.getSigners();
  console.log("操作账户:", deployer.address);

  // 获取当前合约余额
  const gasSubsidyAddress = "0x5eb3Bc0a489C5A8288765d2336659EbCA68FCd00";
  const initialBalance = await ethers.provider.getBalance(gasSubsidyAddress);
  console.log("当前GasSubsidy合约余额:", ethers.formatEther(initialBalance), "原生代币");

  // 计算操作账户的可用余额（保留少量作为Gas费用）
  const deployerBalance = await ethers.provider.getBalance(deployer.address);
  const gasForTransaction = ethers.parseEther("1.0"); // 保留1个代币作为Gas费用
  const availableBalance = deployerBalance - gasForTransaction;
  
  console.log("操作账户总余额:", ethers.formatEther(deployerBalance), "原生代币");
  console.log("可用于注资:", ethers.formatEther(availableBalance), "原生代币");

  if (availableBalance <= 0) {
    console.log("错误: 操作账户可用余额不足！");
    return;
  }

  // 向GasSubsidy合约发送资金
  console.log("\n正在向GasSubsidy合约注资...");
  const fundingTx = await deployer.sendTransaction({
    to: gasSubsidyAddress,
    value: availableBalance
  });
  await fundingTx.wait();
  
  console.log("✓ 资金注入成功，交易哈希:", fundingTx.hash);

  // 验证新的余额
  const newBalance = await ethers.provider.getBalance(gasSubsidyAddress);
  console.log("新的GasSubsidy合约余额:", ethers.formatEther(newBalance), "原生代币");

  console.log("\n✓ GasSubsidy合约资金注入完成！");
}

fundGasSubsidy()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });