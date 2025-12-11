import pkg from 'hardhat';

const { ethers } = pkg;

async function getBlockchainInfo() {
  console.log("=== Hardhat 本地节点信息 ===");
  
  // 获取最新区块信息
  const latestBlock = await ethers.provider.getBlock("latest");
  console.log("最新区块高度:", latestBlock.number);
  console.log("区块哈希:", latestBlock.hash);
  console.log("区块时间戳:", new Date(latestBlock.timestamp * 1000).toISOString());
  console.log();

  // 获取账户信息
  const accounts = await ethers.getSigners();
  console.log("Hardhat 默认账户:");
  for (let i = 0; i < Math.min(5, accounts.length); i++) {
    const balance = await ethers.provider.getBalance(accounts[i].address);
    console.log(`  账户 ${i+1}: ${accounts[i].address} (余额: ${ethers.formatEther(balance)} ETH)`);
  }
  console.log();

  // 获取网络信息
  const network = await ethers.provider.getNetwork();
  console.log("网络信息:");
  console.log("  网络名称:", network.name);
  console.log("  链ID:", network.chainId);
  console.log();

  console.log("=== OraSRS 合约部署信息 ===");
  const fs = await import('fs');
  const deploymentInfo = JSON.parse(fs.readFileSync('all-deployments.json', 'utf8'));
  
  console.log("OraSRSToken (ORA代币):", deploymentInfo.oraTokenAddress);
  console.log("NodeRegistry (节点注册):", deploymentInfo.nodeRegistryAddress);
  console.log("ThreatIntelligenceCoordination (威胁情报):", deploymentInfo.threatIntelligenceCoordinationAddress);
  console.log("SimpleSecurityActionContract (安全行动):", deploymentInfo.simpleSecurityActionAddress);
  console.log("FaucetUpgradeable (水龙头):", deploymentInfo.faucetAddress);
  
  console.log("\n所有OraSRS合约已在Hardhat本地节点上成功部署并可以使用。");
}

getBlockchainInfo()
  .then(() => {
    console.log("\n信息查询完成！");
    process.exit(0);
  })
  .catch((error) => {
    console.error("查询信息时出错:", error);
    process.exit(1);
  });