const { ethers } = require("hardhat");

async function main() {
  console.log('正在部署 OraSRS 网络代币...');

  // 获取部署者
  const [deployer] = await ethers.getSigners();
  console.log('部署者地址:', deployer.address);

  // 获取合约工厂并部署
  const OraSRSToken = await ethers.getContractFactory('OraSRSToken');
  const token = await OraSRSToken.deploy();

  console.log('等待部署确认...');
  await token.deploymentTransaction().wait();

  const tokenAddress = await token.getAddress();
  console.log('==================================================');
  console.log('🎉 OraSRS 代币部署成功！');
  console.log('📍 合约地址:', tokenAddress);
  console.log('==================================================');
  console.log('下一步：请将此地址复制到您的 .env 文件或前端配置中。');
}

// 执行主函数
main().catch((error) => {
  console.error('部署出错:', error);
  process.exitCode = 1;
});