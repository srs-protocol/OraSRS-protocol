// 使用治理账户铸币并注册为治理委员会账户
import pkg from 'hardhat';
const { ethers } = pkg;

async function mintTokensAndSetupGovernance() {
  console.log("使用治理账户铸币并注册为治理委员会账户...");

  // 获取治理账户
  const [governanceAccount] = await ethers.getSigners();
  console.log("治理账户地址:", governanceAccount.address);

  // 从部署信息获取合约地址
  const fs = await import('fs');
  const deploymentInfo = JSON.parse(fs.readFileSync('all-deployments.json', 'utf8'));
  
  const oraTokenAddress = deploymentInfo.oraTokenAddress;
  console.log("OraSRSToken合约地址:", oraTokenAddress);

  // 连接到OraSRSToken合约
  const OraSRSToken = await ethers.getContractFactory("OraSRSToken");
  const oraToken = OraSRSToken.attach(oraTokenAddress);

  // 检查当前账户是否为合约所有者（具有铸币权限）
  const owner = await oraToken.owner();
  console.log("OraSRSToken合约所有者:", owner);
  console.log("当前账户是否为所有者:", governanceAccount.address === owner);

  // 铸造大量代币到治理账户
  const mintAmount = ethers.parseEther("10000000"); // 铸造1000万代币
  console.log(`\n准备铸造 ${ethers.formatEther(mintAmount)} 代币到治理账户...`);

  try {
    const mintTx = await oraToken.mint(governanceAccount.address, mintAmount);
    await mintTx.wait();
    console.log("✓ 铸币成功，交易哈希:", mintTx.hash);

    // 检查铸币后的余额
    const newBalance = await oraToken.balanceOf(governanceAccount.address);
    console.log("治理账户新的代币余额:", ethers.formatEther(newBalance));
  } catch (error) {
    console.log("铸币失败:", error.message);
  }

  // 如果存在治理合约，将当前账户设置为治理委员会成员
  if (deploymentInfo.simpleSecurityActionAddress) {
    console.log("\n正在检查SimpleSecurityActionContract治理合约...");
    const SimpleSecurityActionContract = await ethers.getContractFactory("SimpleSecurityActionContract");
    const governanceContract = SimpleSecurityActionContract.attach(deploymentInfo.simpleSecurityActionAddress);
    
    try {
      // 检查当前账户是否已经被设置为治理合约的治理地址
      const currentGov = await governanceContract.governanceContract();
      console.log("当前治理合约地址:", currentGov);
      
      if (currentGov !== governanceAccount.address) {
        console.log("尝试更新治理合约地址...");
        const updateTx = await governanceContract.updateGovernanceContract(governanceAccount.address);
        await updateTx.wait();
        console.log("✓ 治理合约地址已更新，交易哈希:", updateTx.hash);
        
        const newGov = await governanceContract.governanceContract();
        console.log("新的治理合约地址:", newGov);
      } else {
        console.log("治理合约地址已是当前账户");
      }
    } catch (error) {
      console.log("治理合约操作失败或不存在:", error.message);
    }
  }

  console.log("\n✓ 治理账户设置完成！");
  console.log("治理账户现在拥有铸币权限和治理权限，可以管理OraSRS协议。");
}

mintTokensAndSetupGovernance()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
