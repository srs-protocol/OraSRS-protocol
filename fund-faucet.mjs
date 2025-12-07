// 给水龙头合约添加代币
import pkg from 'hardhat';
const { ethers } = pkg;

async function fundFaucet() {
  console.log("开始为水龙头合约添加代币...");

  const [owner] = await ethers.getSigners();
  console.log("操作账户:", owner.address);

  // 获取合约地址
  const oraTokenAddress = "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d";
  const faucetAddress = "0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f";

  // 连接到代币合约
  const OraSRSToken = await ethers.getContractFactory("OraSRSToken");
  const oraToken = OraSRSToken.attach(oraTokenAddress);

  // 连接到水龙头合约
  const FaucetUpgradeable = await ethers.getContractFactory("FaucetUpgradeable");
  const faucet = FaucetUpgradeable.attach(faucetAddress);

  // 计算10,000,000代币的数量（考虑18位小数）
  const amount = ethers.parseEther("10000000"); // 1000万代币
  console.log("准备添加代币数量:", ethers.formatEther(amount));

  // 首先检查操作者账户余额
  const balance = await oraToken.balanceOf(owner.address);
  console.log("账户ORA代币余额:", ethers.formatEther(balance));

  // 检查是否足够支付
  if (balance < amount) {
    console.log("账户余额不足，无法为水龙头添加代币");
    return;
  }

  console.log("正在批准代币转账...");
  const approveTx = await oraToken.approve(faucetAddress, amount);
  await approveTx.wait();
  console.log("✓ 代币转账已批准");

  console.log("正在向水龙头合约添加代币...");
  const depositTx = await faucet.depositTokens(amount);
  await depositTx.wait();
  console.log("✓ 成功向水龙头添加", ethers.formatEther(amount), "个代币");

  // 检查水龙头合约的代币余额
  const faucetBalance = await oraToken.balanceOf(faucetAddress);
  console.log("水龙头ORA代币余额:", ethers.formatEther(faucetBalance));
  
  console.log("✓ 水龙头资金添加完成！");
}

fundFaucet()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });