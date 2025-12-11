// scripts/deploy-orasrs-token.js
import pkg from "hardhat";
import { writeFileSync } from 'fs';

const { ethers } = pkg;

async function main() {
  console.log('🚀 正在部署 OraSRS 网络代币...');

  // 获取部署者
  const [deployer] = await ethers.getSigners();
  console.log('📤 部署者地址:', deployer.address);

  // 获取合约工厂并部署
  const OraSRSToken = await ethers.getContractFactory('OraSRSToken');
  const token = await OraSRSToken.deploy();

  console.log('⏳ 等待部署确认...');
  await token.waitForDeployment();

  const tokenAddress = await token.getAddress();
  console.log('==================================================');
  console.log('🎉 OraSRS 代币部署成功！');
  console.log('📍 合约地址:', tokenAddress);
  console.log('==================================================');
  
  // 保存部署信息
  const deploymentInfo = {
    tokenAddress: tokenAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    rpcUrl: "http://127.0.0.1:8545"
  };

  writeFileSync("orasrs-token-deployment.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("💾 部署信息已保存到 orasrs-token-deployment.json");
  
  // 验证代币信息
  console.log('\n📋 代币信息验证:');
  console.log('   名称:', await token.name());
  console.log('   符号:', await token.symbol());
  console.log('   精度:', await token.decimals());
  console.log('   初始供应量:', ethers.formatUnits(await token.totalSupply(), 18));
  
  console.log('\n💰 部署者初始余额:', ethers.formatUnits(await token.balanceOf(deployer.address), 18));
}

// 执行主函数
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 部署出错:', error);
    process.exit(1);
  });