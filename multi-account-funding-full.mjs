// 使用多个Hardhat账户向GasSubsidy合约注资100000代币
import pkg from 'hardhat';
const { ethers } = pkg;

async function multiAccountFundingFull() {
  console.log("使用多个Hardhat账户向GasSubsidy合约注资100000代币...");

  // 使用助记词和路径生成所有20个账户
  const accounts = [];
  for (let i = 0; i < 20; i++) {
    const wallet = ethers.HDNodeWallet.fromMnemonic(
      ethers.Mnemonic.fromPhrase("test test test test test test test test test test test junk"),
      `m/44'/60'/0'/0/${i}`
    ).connect(ethers.provider);
    accounts.push(wallet);
  }

  // 获取GasSubsidy合约地址
  const fs = await import('fs');
  const deploymentInfo = JSON.parse(fs.readFileSync('all-deployments.json', 'utf8'));
  const gasSubsidyAddress = deploymentInfo.gasSubsidyAddress;
  console.log("GasSubsidy合约地址:", gasSubsidyAddress);

  // 检查合约当前余额
  const initialBalance = await ethers.provider.getBalance(gasSubsidyAddress);
  console.log("当前GasSubsidy合约余额:", ethers.formatEther(initialBalance), "原生代币");

  const targetAmount = ethers.parseEther("100000.0");
  let totalFunded = initialBalance; // 从初始余额开始计算

  console.log(`目标余额: ${ethers.formatEther(targetAmount)} 原生代币`);
  console.log(`还需注资: ${ethers.formatEther(targetAmount - initialBalance)} 原生代币`);

  // 遍历账户进行注资（跳过第一个账户，因为可能需要保留一些资金用于交易）
  const gasReserve = ethers.parseEther("50.0"); // 每个账户保留50个代币作为Gas费用
  let accountsUsed = 0;

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    console.log(`\n处理账户 ${i+1}/${accounts.length}: ${account.address}`);

    // 检查账户余额
    const balance = await ethers.provider.getBalance(account.address);
    console.log(`账户余额: ${ethers.formatEther(balance)} 原生代币`);

    // 如果余额不足以支付Gas费用，跳过
    if (balance <= gasReserve) {
      console.log("余额不足，跳过此账户");
      continue;
    }

    // 计算可注资金额（保留Gas费用后）
    let fundAmount = balance - gasReserve;
    
    // 如果加上这笔资金会超过目标，只注资差额部分
    const remainingToTarget = targetAmount - totalFunded;
    if (fundAmount > remainingToTarget) {
      fundAmount = remainingToTarget;
    }

    if (fundAmount <= 0) {
      console.log("已达到目标金额，停止注资");
      break;
    }

    console.log(`计划注资: ${ethers.formatEther(fundAmount)} 原生代币`);

    // 向GasSubsidy合约注资
    try {
      const tx = await account.sendTransaction({
        to: gasSubsidyAddress,
        value: fundAmount
      });
      await tx.wait();
      console.log(`✓ 账户 ${i+1} 注资成功，交易哈希: ${tx.hash}`);

      // 更新总注资金额
      totalFunded += fundAmount;
      console.log(`当前总资金: ${ethers.formatEther(totalFunded)} 原生代币`);
      console.log(`距离目标还差: ${ethers.formatEther(targetAmount - totalFunded)} 原生代币`);

      accountsUsed++;
      
      // 检查是否已达到目标
      if (totalFunded >= targetAmount) {
        console.log(`\n✓ 已达到或超过目标金额 ${ethers.formatEther(targetAmount)} 代币！`);
        break;
      }
    } catch (error) {
      console.log(`✗ 账户 ${i+1} 注资失败:`, error.message);
    }
  }

  // 最终验证
  const finalBalance = await ethers.provider.getBalance(gasSubsidyAddress);
  console.log(`\n最终GasSubsidy合约余额: ${ethers.formatEther(finalBalance)} 原生代币`);
  console.log(`共使用了 ${accountsUsed} 个账户进行注资`);
  
  if (finalBalance >= targetAmount) {
    console.log("✓ 成功达到100000代币注资目标！");
  } else {
    console.log(`⚠️ 未能完全达到目标，还需 ${ethers.formatEther(targetAmount - finalBalance)} 代币`);
  }
}

multiAccountFundingFull()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
