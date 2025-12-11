// 检查所有Hardhat账户余额
import pkg from 'hardhat';
const { ethers } = pkg;

async function checkAllBalances() {
  console.log("检查所有Hardhat账户余额...");
  const accounts = await ethers.getSigners();
  
  for (let i = 0; i < accounts.length; i++) {
    const balance = await ethers.provider.getBalance(accounts[i].address);
    console.log(`账户 ${i}: ${accounts[i].address} - 余额: ${ethers.formatEther(balance)} 原生代币`);
  }
}

checkAllBalances()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });