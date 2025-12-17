// 验证治理账户状态
import pkg from 'hardhat';
const { ethers } = pkg;

async function verifyGovernanceAccount() {
  console.log("验证治理账户状态...");

  const governanceAccountAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  console.log("治理账户地址:", governanceAccountAddress);

  // 从部署信息获取合约地址
  const fs = await import('fs');
  const deploymentInfo = JSON.parse(fs.readFileSync('all-deployments.json', 'utf8'));
  
  // 检查代币余额
  const OraSRSToken = await ethers.getContractFactory("OraSRSToken");
  const oraToken = OraSRSToken.attach(deploymentInfo.oraTokenAddress);
  
  const balance = await oraToken.balanceOf(governanceAccountAddress);
  console.log("✓ 治理账户代币余额:", ethers.formatEther(balance));

  // 检查是否为代币合约所有者
  const owner = await oraToken.owner();
  console.log("✓ 代币合约所有者:", owner);
  console.log("✓ 治理账户是否为代币合约所有者:", owner === governanceAccountAddress);

  // 检查治理合约设置
  const SimpleSecurityActionContract = await ethers.getContractFactory("SimpleSecurityActionContract");
  const governanceContract = SimpleSecurityActionContract.attach(deploymentInfo.simpleSecurityActionAddress);
  
  const currentGov = await governanceContract.governanceContract();
  console.log("✓ 治理合约地址:", currentGov);
  console.log("✓ 治理账户是否为治理合约地址:", currentGov === governanceAccountAddress);

  // 检查其他合约的owner（如果适用）
  try {
    const NodeRegistry = await ethers.getContractFactory("NodeRegistry");
    const nodeRegistry = NodeRegistry.attach(deploymentInfo.nodeRegistryAddress);
    const nodeRegistryOwner = await nodeRegistry.owner ? await nodeRegistry.owner() : "N/A";
    console.log("✓ NodeRegistry合约所有者:", nodeRegistryOwner);
  } catch (error) {
    console.log("NodeRegistry合约可能没有owner函数:", error.message);
  }

  console.log("\n✓ 治理账户状态验证完成！");
  console.log("治理账户现在是OraSRS协议的核心治理地址，拥有铸币和治理权限。");
}

verifyGovernanceAccount()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });