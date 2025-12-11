import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("部署合约的地址: ", deployer.address);
  console.log("账户余额: ", (await ethers.provider.getBalance(deployer.address)).toString());

  // 部署OraSRSToken合约
  console.log("\n1. 部署OraSRSToken合约...");
  const OraSRSToken = await ethers.getContractFactory("OraSRSToken");
  const oraToken = await OraSRSToken.deploy();
  await oraToken.waitForDeployment();
  console.log("OraSRSToken 合约部署地址:", await oraToken.getAddress());

  // 部署NodeRegistry合约
  console.log("\n2. 部署NodeRegistry合约...");
  const NodeRegistry = await ethers.getContractFactory("NodeRegistry");
  const nodeRegistry = await NodeRegistry.deploy();
  await nodeRegistry.waitForDeployment();
  console.log("NodeRegistry 合约部署地址:", await nodeRegistry.getAddress());

  // 部署威胁情报协调合约
  console.log("\n3. 部署ThreatIntelligenceCoordination合约...");
  const ThreatIntelligenceCoordination = await ethers.getContractFactory("ThreatIntelligenceCoordination");
  const threatIntelCoord = await ThreatIntelligenceCoordination.deploy();
  await threatIntelCoord.waitForDeployment();
  console.log("ThreatIntelligenceCoordination 合约部署地址:", await threatIntelCoord.getAddress());

  // 部署SimpleSecurityActionContract合约 (需要治理合约地址作为参数)
  console.log("\n4. 部署SimpleSecurityActionContract合约...");
  const SimpleSecurityActionContract = await ethers.getContractFactory("SimpleSecurityActionContract");
  const simpleSecurityAction = await SimpleSecurityActionContract.deploy(deployer.address); // 使用部署者作为治理合约地址
  await simpleSecurityAction.waitForDeployment();
  console.log("SimpleSecurityActionContract 合约部署地址:", await simpleSecurityAction.getAddress());

  // 部署FaucetUpgradeable合约 (需要OraSRS代币合约地址作为参数)
  console.log("\n5. 部署FaucetUpgradeable合约...");
  const FaucetUpgradeable = await ethers.getContractFactory("FaucetUpgradeable");
  const faucet = await FaucetUpgradeable.deploy(await oraToken.getAddress());
  await faucet.waitForDeployment();
  console.log("FaucetUpgradeable 合约部署地址:", await faucet.getAddress());

  console.log("\n所有OraSRS协议核心合约部署完成！");
  
  // 保存部署信息到JSON文件
  const fs = await import('fs');
  const deploymentInfo = {
    oraTokenAddress: await oraToken.getAddress(),
    nodeRegistryAddress: await nodeRegistry.getAddress(),
    threatIntelligenceCoordinationAddress: await threatIntelCoord.getAddress(),
    simpleSecurityActionAddress: await simpleSecurityAction.getAddress(),
    faucetAddress: await faucet.getAddress(),
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync('all-deployments.json', JSON.stringify(deploymentInfo, null, 2));
  console.log("所有部署信息已保存到 all-deployments.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });