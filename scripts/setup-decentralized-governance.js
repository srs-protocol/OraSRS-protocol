// scripts/setup-decentralized-governance.js
import pkg from "hardhat";
import { ethers } from "ethers";

const { ethers: hardhatEthers } = pkg;

async function main() {
  console.log('🌐 设置 OraSRS 去中心化治理...');

  // 获取多个账户用于分发
  const [deployer, account1, account2, account3] = await hardhatEthers.getSigners();
  console.log('📤 治理部署者:', await deployer.getAddress());
  console.log('📍 社区成员1:', await account1.getAddress());
  console.log('📍 社区成员2:', await account2.getAddress());
  console.log('📍 社区成员3:', await account3.getAddress());

  // 治理合约和代币合约地址
  const governanceAddress = "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c";
  const tokenAddress = "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1";
  
  // 连接到合约
  const tokenContract = await hardhatEthers.getContractAt("OraSRSToken", tokenAddress);
  const governanceContract = await hardhatEthers.getContractAt("OraSRSGovernance", governanceAddress);

  console.log('\n💰 当前代币分配情况:');
  const deployerBalance = await tokenContract.balanceOf(await deployer.getAddress());
  console.log(`   部署者余额: ${ethers.formatUnits(deployerBalance, 18)} ORA`);
  
  // 计算要分发的代币数量 (每个地址100万枚)
  const distributionAmount = ethers.parseUnits("1000000", 18); // 100万枚
  console.log(`\n📤 计划分发: 每个社区成员 ${ethers.formatUnits(distributionAmount, 18)} ORA`);

  // 转账给社区成员
  console.log('\n🔄 正在分发代币到社区成员地址...');
  
  try {
    // 转账给第一个社区成员
    console.log(`   给 ${await account1.getAddress()} 转账...`);
    let tx1 = await tokenContract.transfer(await account1.getAddress(), distributionAmount);
    await tx1.wait();
    console.log(`   ✅ ${ethers.formatUnits(distributionAmount, 18)} ORA 转账成功`);
    
    // 转账给第二个社区成员
    console.log(`   给 ${await account2.getAddress()} 转账...`);
    let tx2 = await tokenContract.transfer(await account2.getAddress(), distributionAmount);
    await tx2.wait();
    console.log(`   ✅ ${ethers.formatUnits(distributionAmount, 18)} ORA 转账成功`);
    
    // 转账给第三个社区成员
    console.log(`   给 ${await account3.getAddress()} 转账...`);
    let tx3 = await tokenContract.transfer(await account3.getAddress(), distributionAmount);
    await tx3.wait();
    console.log(`   ✅ ${ethers.formatUnits(distributionAmount, 18)} ORA 转账成功`);
    
    console.log('\n📈 更新后的代币分配:');
    const newDeployerBalance = await tokenContract.balanceOf(await deployer.getAddress());
    const account1Balance = await tokenContract.balanceOf(await account1.getAddress());
    const account2Balance = await tokenContract.balanceOf(await account2.getAddress());
    const account3Balance = await tokenContract.balanceOf(await account3.getAddress());
    
    console.log(`   部署者余额: ${ethers.formatUnits(newDeployerBalance, 18)} ORA`);
    console.log(`   社区成员1余额: ${ethers.formatUnits(account1Balance, 18)} ORA`);
    console.log(`   社区成员2余额: ${ethers.formatUnits(account2Balance, 18)} ORA`);
    console.log(`   社区成员3余额: ${ethers.formatUnits(account3Balance, 18)} ORA`);
    
    // 验证社区成员现在可以创建提案 (因为他们拥有了超过阈值的代币)
    console.log('\n✅ 社区成员现在拥有足够的代币来创建提案!');
    console.log(`   提案门槛: ${ethers.formatUnits(await governanceContract.proposalThreshold(), 18)} ORA`);
    console.log(`   每个社区成员拥有: ${ethers.formatUnits(account1Balance, 18)} ORA`);
    
    console.log('\n🎉 去中心化治理设置完成!');
    console.log('💡 现在社区成员可以:');
    console.log('   - 创建治理提案');
    console.log('   - 对提案进行投票');
    console.log('   - 参与协议治理决策');
    
  } catch (error) {
    console.log(`❌ 分发过程中出现错误: ${error.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 操作出错:', error);
    process.exit(1);
  });