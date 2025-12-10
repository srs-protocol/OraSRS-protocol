// scripts/deploy-faucet-with-token.js
import pkg from "hardhat";
import { writeFileSync } from 'fs';

const { ethers } = pkg;

async function main() {
  console.log('🚀 正在部署 OraSRS 水龙头合约并与代币集成...');

  // 获取部署者
  const [deployer] = await ethers.getSigners();
  console.log('📤 部署者地址:', deployer.address);

  // 获取已部署的代币合约地址
  const fs = await import('fs');
  const tokenDeployment = JSON.parse(fs.readFileSync('./orasrs-token-deployment.json', 'utf8'));
  const tokenAddress = tokenDeployment.tokenAddress;
  console.log('📍 使用代币合约地址:', tokenAddress);

  // 部署水龙头合约，传入代币地址
  const FaucetUpgradeable = await ethers.getContractFactory('FaucetUpgradeable');
  const faucet = await FaucetUpgradeable.deploy(tokenAddress);

  console.log('⏳ 等待部署确认...');
  await faucet.waitForDeployment();

  const faucetAddress = await faucet.getAddress();
  console.log('==================================================');
  console.log('🎉 OraSRS 水龙头合约部署成功！');
  console.log('📍 合约地址:', faucetAddress);
  console.log('==================================================');
  
  // 保存部署信息
  const deploymentInfo = {
    tokenAddress: tokenAddress,
    faucetAddress: faucetAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    rpcUrl: "http://127.0.0.1:8545"
  };

  writeFileSync("orasrs-faucet-deployment.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("💾 部署信息已保存到 orasrs-faucet-deployment.json");
  
  // 验证合约信息
  console.log('\n📋 合约信息验证:');
  console.log('   代币合约:', await faucet.oraToken());
  console.log('   每次提取数量:', ethers.formatUnits(await faucet.withdrawAmount(), 18));
  console.log('   冷却时间:', await faucet.cooldownPeriod(), '秒');
  
  // 尝试将一些代币发送到水龙头合约
  console.log('\n💰 为水龙头合约充值代币...');
  const tokenContract = await ethers.getContractAt('OraSRSToken', tokenAddress);
  const faucetAmount = ethers.parseUnits('10000', 18); // 10000 ORA
  
  const tx = await tokenContract.transfer(faucetAddress, faucetAmount);
  console.log('⏳ 等待代币转账确认...');
  await tx.wait();
  
  console.log('✅ 成功向水龙头合约转入', ethers.formatUnits(faucetAmount, 18), 'ORA代币');
  console.log('📊 水龙头合约当前余额:', ethers.formatUnits(await faucet.faucetBalance(), 18), 'ORA');
}

// 执行主函数
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 部署出错:', error);
    process.exit(1);
  });
