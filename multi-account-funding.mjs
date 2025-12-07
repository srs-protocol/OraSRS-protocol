// 使用多个Hardhat账户向GasSubsidy合约注资100000代币
import pkg from 'hardhat';
const { ethers } = pkg;

async function multiAccountFunding() {
  console.log("使用多个账户向GasSubsidy合约注资100000代币...");

  const accounts = await ethers.getSigners();
  console.log(`共找到 ${accounts.length} 个账户`);

  // 获取新的GasSubsidy合约地址
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

  // 遍历所有账户进行注资
  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    console.log(`\n处理账户 ${i+1}/${accounts.length}: ${account.address}`);

    // 检查账户余额
    const balance = await ethers.provider.getBalance(account.address);
    console.log(`账户余额: ${ethers.formatEther(balance)} 原生代币`);

    // 保留一些余额用于Gas费用
    const gasReserve = ethers.parseEther("10.0"); // 保留10个代币作为Gas费用
    if (balance <= gasReserve) {
      console.log("余额不足，跳过此账户");
      continue;
    }

    const fundAmount = balance - gasReserve;
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

      // 检查是否已达到目标
      if (totalFunded >= targetAmount) {
        console.log(`\n✓ 已达到目标金额 ${ethers.formatEther(targetAmount)} 代币！`);
        break;
      }
    } catch (error) {
      console.log(`✗ 账户 ${i+1} 注资失败:`, error.message);
    }
  }

  // 最终验证
  const finalBalance = await ethers.provider.getBalance(gasSubsidyAddress);
  console.log(`\n最终GasSubsidy合约余额: ${ethers.formatEther(finalBalance)} 原生代币`);
  
  if (finalBalance >= targetAmount) {
    console.log("✓ 成功达到100000代币注资目标！");
  } else {
    console.log(`⚠️ 未能完全达到目标，还需 ${ethers.formatEther(targetAmount - finalBalance)} 代币`);
  }
}

multiAccountFunding()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
