// 验证水龙头合约状态
import pkg from 'hardhat';
const { ethers } = pkg;

async function verifyFaucet() {
  console.log("验证水龙头合约状态...");

  const faucetAddress = "0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f";
  const oraTokenAddress = "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d";

  // 连接到水龙头合约
  const FaucetUpgradeable = await ethers.getContractFactory("FaucetUpgradeable");
  const faucet = FaucetUpgradeable.attach(faucetAddress);

  // 连接到代币合约
  const OraSRSToken = await ethers.getContractFactory("OraSRSToken");
  const oraToken = OraSRSToken.attach(oraTokenAddress);

  // 检查水龙头合约的代币余额
  const faucetBalance = await oraToken.balanceOf(faucetAddress);
  console.log("✓ 水龙头ORA代币余额:", ethers.formatEther(faucetBalance));

  // 检查水龙头配置
  const withdrawAmount = await faucet.withdrawAmount();
  const cooldownPeriod = await faucet.cooldownPeriod();
  const faucetContractBalance = await faucet.faucetBalance();
  
  console.log("✓ 每次领取数量:", ethers.formatEther(withdrawAmount));
  console.log("✓ 冷却时间(秒):", cooldownPeriod.toString());
  console.log("✓ 水龙头合约记录的余额:", ethers.formatEther(faucetContractBalance));

  // 尝试从水龙头领取代币
  const [user1] = await ethers.getSigners();
  console.log("\n尝试从水龙头领取代币...");
  
  const canWithdraw = await faucet.canWithdraw(user1.address);
  console.log("✓ 账户是否可以领取:", canWithdraw);
  
  if (canWithdraw) {
    const withdrawTx = await faucet.withdrawTokens();
    await withdrawTx.wait();
    console.log("✓ 成功从水龙头领取代币");
    
    // 检查用户余额
    const userBalance = await oraToken.balanceOf(user1.address);
    console.log("✓ 账户ORA代币余额:", ethers.formatEther(userBalance));
  }

  console.log("\n✓ 水龙头合约验证完成！");
}

verifyFaucet()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });