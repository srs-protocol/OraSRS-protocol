import pkg from 'hardhat';
const { ethers } = pkg;
import fs from 'fs';

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("部署合约的地址: ", deployer.address);
  console.log("账户余额: ", (await ethers.provider.getBalance(deployer.address)).toString());

  // 部署NodeRegistry合约
  const NodeRegistry = await ethers.getContractFactory("NodeRegistry");
  const nodeRegistry = await NodeRegistry.deploy();
  await nodeRegistry.waitForDeployment(); // 使用新的方法替代已弃用的deployed()
  console.log("NodeRegistry 合约部署地址:", await nodeRegistry.getAddress());

  console.log("NodeRegistry合约部署完成！");
  
  // 保存部署信息到JSON文件
  const deploymentInfo = {
    nodeRegistryAddress: await nodeRegistry.getAddress(),
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync('deployment-info.json', JSON.stringify(deploymentInfo, null, 2));
  console.log("部署信息已保存到 deployment-info.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });