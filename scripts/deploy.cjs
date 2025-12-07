// scripts/deploy.js
const { ethers } = require("hardhat");

async function main() {
  console.log("开始部署OraSRS合约...");
  
  // 部署威胁情报协调合约
  console.log("部署ThreatIntelligenceCoordination合约...");
  const ThreatIntelligenceCoordination = await ethers.getContractFactory("ThreatIntelligenceCoordination");
  const threatIntelContract = await ThreatIntelligenceCoordination.deploy();
  await threatIntelContract.waitForDeployment();
  console.log("ThreatIntelligenceCoordination合约已部署到:", await threatIntelContract.getAddress());

  // 部署简单安全操作合约
  console.log("部署SimpleSecurityActionContract合约...");
  const SimpleSecurityActionContract = await ethers.getContractFactory("SimpleSecurityActionContract");
  const securityActionContract = await SimpleSecurityActionContract.deploy(await threatIntelContract.getAddress());
  await securityActionContract.waitForDeployment();
  console.log("SimpleSecurityActionContract合约已部署到:", await securityActionContract.getAddress());

  // 部署OraSRS代币合约
  console.log("部署OraSRSToken合约...");
  const OraSRSToken = await ethers.getContractFactory("OraSRSToken");
  const oraToken = await OraSRSToken.deploy();
  await oraToken.waitForDeployment();
  console.log("OraSRSToken合约已部署到:", await oraToken.getAddress());

  // 部署水龙头合约
  console.log("部署FaucetUpgradeable合约...");
  const FaucetUpgradeable = await ethers.getContractFactory("FaucetUpgradeable");
  const faucet = await FaucetUpgradeable.deploy(await oraToken.getAddress());
  await faucet.waitForDeployment();
  console.log("FaucetUpgradeable合约已部署到:", await faucet.getAddress());

  // 保存部署信息
  const fs = require('fs');
  const deploymentInfo = {
    threatIntelContract: await threatIntelContract.getAddress(),
    securityActionContract: await securityActionContract.getAddress(),
    oraToken: await oraToken.getAddress(),
    faucet: await faucet.getAddress(),
    deployer: (await ethers.getSigners())[0].address,
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync('deployment-info.json', JSON.stringify(deploymentInfo, null, 2));
  console.log("部署信息已保存到 deployment-info.json");
  
  console.log("所有合约部署完成！");
  console.log("部署详情:");
  console.log("- 威胁情报合约:", await threatIntelContract.getAddress());
  console.log("- 安全操作合约:", await securityActionContract.getAddress());
  console.log("- 代币合约:", await oraToken.getAddress());
  console.log("- 水龙头合约:", await faucet.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });