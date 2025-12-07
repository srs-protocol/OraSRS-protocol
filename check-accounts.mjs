// 检查账户数量
import pkg from 'hardhat';
const { ethers } = pkg;

async function checkAccounts() {
  const accounts = await ethers.getSigners();
  console.log("可用账户数量:", accounts.length);
  for (let i = 0; i < accounts.length; i++) {
    console.log(`账户 ${i}:`, accounts[i].address);
  }
}

checkAccounts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });