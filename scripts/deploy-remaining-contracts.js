// scripts/deploy-remaining-contracts.js
import pkg from "hardhat";
import { writeFileSync } from 'fs';

const { ethers } = pkg;

async function main() {
  console.log('🚀 开始部署剩余的OraSRS合约...');

  // 获取部署者
  const [deployer] = await ethers.getSigners();
  console.log('📤 部署者地址:', deployer.address);

  // 获取已部署合约的地址
  const fs = await import('fs');
  const securityDeployment = JSON.parse(fs.readFileSync('./security-contracts-deployment.json', 'utf8'));
  const tokenDeployment = JSON.parse(fs.readFileSync('./orasrs-token-deployment.json', 'utf8'));
  const faucetDeployment = JSON.parse(fs.readFileSync('./orasrs-faucet-deployment.json', 'utf8'));

  const threatIntelligenceCoordinationAddr = securityDeployment.contracts.ThreatIntelligenceCoordination;
  const tokenAddr = tokenDeployment.tokenAddress;

  console.log('📍 已部署合约地址:');
  console.log('   - ThreatIntelligenceCoordination:', threatIntelligenceCoordinationAddr);
  console.log('   - OraSRSToken:', tokenAddr);

  // 1. 部署治理合约
  console.log('\n🏗️  部署 OraSRSGovernance 合约...');
  const OraSRSGovernance = await ethers.getContractFactory('OraSRSGovernance');
  
  // 由于我们没有timelock合约，我们使用零地址作为timelock参数
  const governance = await OraSRSGovernance.deploy(
    ethers.ZeroAddress,  // timelock (暂时使用零地址)
    threatIntelligenceCoordinationAddr  // 威胁情报协调合约
  );

  console.log('⏳ 等待治理合约部署确认...');
  await governance.waitForDeployment();

  const governanceAddr = await governance.getAddress();
  console.log('✅ OraSRSGovernance 合约部署成功！');
  console.log('📍 合约地址:', governanceAddr);

  // 2. 部署节点注册合约
  console.log('\n🏗️  部署 NodeRegistry 合约...');
  const NodeRegistry = await ethers.getContractFactory('NodeRegistry');
  const nodeRegistry = await NodeRegistry.deploy();

  console.log('⏳ 等待节点注册合约部署确认...');
  await nodeRegistry.waitForDeployment();

  const nodeRegistryAddr = await nodeRegistry.getAddress();
  console.log('✅ NodeRegistry 合约部署成功！');
  console.log('📍 合约地址:', nodeRegistryAddr);

  // 3. 部署安全操作合约
  console.log('\n🏗️  部署 SimpleSecurityActionContract 合约...');
  const SimpleSecurityActionContract = await ethers.getContractFactory('SimpleSecurityActionContract');
  const securityAction = await SimpleSecurityActionContract.deploy(governanceAddr); // 使用治理合约地址

  console.log('⏳ 等待安全操作合约部署确认...');
  await securityAction.waitForDeployment();

  const securityActionAddr = await securityAction.getAddress();
  console.log('✅ SimpleSecurityActionContract 合约部署成功！');
  console.log('📍 合约地址:', securityActionAddr);

  // 4. 现在更新治理合约中的威胁情报协调合约地址，因为可能需要循环依赖处理
  console.log('\n🔄 更新治理合约中的威胁情报协调合约地址...');
  // 这可能不是必需的，因为我们在构造函数中已经提供了地址

  // 5. 保存部署信息
  const deploymentInfo = {
    contracts: {
      OraSRSGovernance: governanceAddr,
      NodeRegistry: nodeRegistryAddr,
      SimpleSecurityActionContract: securityActionAddr
    },
    governanceParams: {
      timelock: ethers.ZeroAddress,
      threatIntelligenceCoordination: threatIntelligenceCoordinationAddr
    },
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    rpcUrl: "http://127.0.0.1:8545"
  };

  writeFileSync("remaining-contracts-deployment.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("\n💾 剩余合约部署信息已保存到 remaining-contracts-deployment.json");

  // 验证合约功能
  console.log('\n🔍 验证合约功能...');
  try {
    // 检查治理合约参数
    console.log('📋 治理合约 - Timelock地址:', await governance.timelock());
    console.log('📋 治理合约 - 威胁情报协调地址:', await governance.threatIntelligenceCoordination());
    console.log('📋 治理合约 - 投票期:', await governance.votingPeriod());
    
    // 检查节点注册合约
    const nodeCount = await nodeRegistry.activeNodes.length;
    console.log('📋 节点注册合约 - 当前节点数:', nodeCount);
    
    // 检查安全操作合约
    console.log('📋 安全操作合约 - 治理合约地址:', await securityAction.governanceContract());
  } catch (error) {
    console.log('⚠️  验证过程中出现错误:', error.message);
  }

  console.log('\n🎉 所有剩余合约已成功部署！');
  console.log('📝 部署的合约:');
  console.log('   • OraSRSGovernance (治理合约):', governanceAddr);
  console.log('   • NodeRegistry (节点注册):', nodeRegistryAddr);
  console.log('   • SimpleSecurityActionContract (安全操作):', securityActionAddr);
}

// 执行主函数
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 部署出错:', error);
    process.exit(1);
  });
