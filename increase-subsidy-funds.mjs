// 向GasSubsidy合约增加资金
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

  // 计算需要追加的资金量（目标100000 - 当前余额）
  const targetBalance = ethers.parseEther("100000.0");
  const currentBalance = initialBalance;
  const additionalFunding = targetBalance - currentBalance;
  
  console.log("目标余额: 100000.0 原生代币");
  console.log("当前余额:", ethers.formatEther(currentBalance), "原生代币");
  console.log("需要追加:", ethers.formatEther(additionalFunding), "原生代币");

  // 检查操作账户余额是否足够
  const deployerBalance = await ethers.provider.getBalance(deployer.address);
  console.log("操作账户余额:", ethers.formatEther(deployerBalance), "原生代币");
  
  if (deployerBalance < additionalFunding) {
    console.log("错误: 操作账户余额不足！");
    return;
  }

  // 向GasSubsidy合约发送资金
  console.log("\n正在向GasSubsidy合约追加资金...");
  const fundingTx = await deployer.sendTransaction({
    to: gasSubsidyAddress,
    value: additionalFunding
  });
  await fundingTx.wait();
  
  console.log("✓ 资金追加成功，交易哈希:", fundingTx.hash);

  // 验证新的余额
  const newBalance = await ethers.provider.getBalance(gasSubsidyAddress);
  console.log("新的GasSubsidy合约余额:", ethers.formatEther(newBalance), "原生代币");

  console.log("\n✓ GasSubsidy合约资金增加完成！");
}

fundGasSubsidy()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
