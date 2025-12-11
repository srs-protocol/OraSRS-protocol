// scripts/transfer-governance-control.js
import pkg from "hardhat";
import { ethers } from "ethers";

const { ethers: hardhatEthers } = pkg;

async function main() {
  console.log('🔄 配置 OraSRS 治理合约控制权...');

  // 从Hardhat获取signer（拥有治理合约所有权）
  const [deployer] = await hardhatEthers.getSigners();
  console.log('📤 操作者地址:', await deployer.getAddress());

  // 连接到已部署的合约
  const governanceAddress = "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c";
  const tokenAddress = "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1";
  
  // governance合约ABI（包含owner函数）
  const governanceABI = [
    "function owner() view returns (address)",
    "function timelock() view returns (address)",
    "function threatIntelligenceCoordination() view returns (address)",
    "function votingPeriod() view returns (uint256)",
    "function proposalThreshold() view returns (uint256)",
    "function quorumPercentage() view returns (uint256)",
    "function updateTimelock(address _newTimelock) external",
    "function updateThreatIntelligenceCoordination(address _newContract) external",
    "function updateVotingPeriod(uint256 _newVotingPeriod) external",
    "function updateProposalThreshold(uint256 _newThreshold) external",
    "function updateQuorumPercentage(uint256 _newQuorumPercentage) external"
  ];
  
  const governanceContract = new ethers.Contract(governanceAddress, governanceABI, deployer);

  console.log('\n📋 当前治理合约状态:');
  try {
    const owner = await governanceContract.owner();
    const timelock = await governanceContract.timelock();
    const tiCoord = await governanceContract.threatIntelligenceCoordination();
    const votingPeriod = await governanceContract.votingPeriod();
    const proposalThreshold = await governanceContract.proposalThreshold();
    const quorumPercentage = await governanceContract.quorumPercentage();
    
    console.log(`   - 所有者: ${owner}`);
    console.log(`   - Timelock: ${timelock}`);
    console.log(`   - 威胁情报协调: ${tiCoord}`);
    console.log(`   - 投票期: ${votingPeriod.toString()} 秒 (${Number(votingPeriod)/86400} 天)`);
    console.log(`   - 提案门槛: ${ethers.formatUnits(proposalThreshold, 18)} ORA`);
    console.log(`   - 法定人数: ${Number(quorumPercentage)/10000}%`);
  } catch (error) {
    console.log(`   ❌ 获取状态失败: ${error.message}`);
  }

  // 注意：治理合约本身不能转移所有权，但可以更新治理参数
  // 我们可以更新关键地址和参数来使治理更去中心化
  
  console.log('\n🔧 可能的去中心化步骤:');
  console.log('   1. 更新治理合约中的关键地址（如果需要）');
  console.log('   2. 调整治理参数以适应社区治理');
  console.log('   3. 分发代币给社区成员以实现真正的代币投票治理');
  
  // 演示如何更新治理参数（使用当前的值作为示例）
  console.log('\n💡 治理合约设计为通过提案进行治理:');
  console.log('   - 任何拥有至少10,000 ORA代币的地址可以创建提案');
  console.log('   - 提案需要社区投票通过');
  console.log('   - 部署者目前拥有所有代币，因此控制治理');
  console.log('   - 建议将代币分发给社区以实现去中心化');
  
  // 如果我们想更新某些参数（例如，如果威胁情报协调合约地址需要更新）
  // 但目前看起来地址是正确的
  console.log('\n✅ 治理合约已部署，准备就绪');
  console.log('💡 要实现真正的去中心化，需要:');
  console.log('   1. 将代币分发给社区成员');
  console.log('   2. 设置多签钱包用于关键操作（如果需要）');
  console.log('   3. 社区开始使用治理系统');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 操作出错:', error);
    process.exit(1);
  });
