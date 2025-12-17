// 检查Hardhat节点中的所有可用账户
import pkg from 'hardhat';
const { ethers } = pkg;

async function checkAllHardhatAccounts() {
  console.log("尝试获取更多Hardhat账户...");
  
  // 使用Hardhat的provider来访问更多账户
  const provider = ethers.provider;
  
  // 通常Hardhat默认有20个账户，每个有10000个ETH
  // 通过助记词和索引生成账户
  const accounts = [];
  for (let i = 0; i < 20; i++) {
    try {
      // 使用Hardhat的默认助记词生成账户
      const wallet = ethers.HDNodeWallet.fromMnemonic(
        ethers.Mnemonic.fromPhrase("test test test test test test test test test test test junk"),
        `m/44'/60'/0'/0/${i}`
      );
      accounts.push(wallet.connect(provider));
      console.log(`账户 ${i}: ${wallet.address}`);
    } catch (e) {
      console.log(`无法生成账户 ${i}:`, e.message);
      break;
    }
  }
  
  console.log(`\n共生成 ${accounts.length} 个账户`);
  
  // 检查每个账户的余额
  for (let i = 0; i < accounts.length; i++) {
    try {
      const balance = await provider.getBalance(accounts[i].address);
      console.log(`账户 ${i} (${accounts[i].address}): ${ethers.formatEther(balance)} 原生代币`);
    } catch (e) {
      console.log(`无法获取账户 ${i} 余额:`, e.message);
    }
  }
  
  return accounts;
}

checkAllHardhatAccounts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });