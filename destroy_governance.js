import hardhat from "hardhat";
const { ethers } = hardhat;

async function destroyGovernance() {
  console.log("尝试使用默认账户删除治理合约...\n");
  
  // 获取默认账户
  const [deployer] = await ethers.getSigners();
  console.log("使用账户:", deployer.address);
  
  // 治理合约地址
  const governanceAddress = '0x3Aa5ebB10DC797CAC828524e59A333d0A371443c';
  
  // 治理合约ABI（仅包含destroy函数）
  const governanceABI = [
    "function owner() external view returns (address)",
    "function destroy() external",
    "function destroyAndSendTo(address payable _recipient) external"
  ];
  
  try {
    // 连接到治理合约
    const governanceContract = new ethers.Contract(governanceAddress, governanceABI, deployer);
    
    // 首先检查是否为所有者
    const owner = await governanceContract.owner();
    console.log("治理合约所有者:", owner);
    console.log("当前账户是否为所有者:", owner.toLowerCase() === deployer.address.toLowerCase());
    
    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
      console.log("\n❌ 当前账户不是治理合约的所有者，无法执行删除操作");
      console.log("   治理合约只能由其所有者（", owner, "）删除");
      return;
    }
    
    // 执行删除操作
    console.log("\n✅ 账户匹配，准备删除治理合约...");
    
    // 检查合约余额
    const contractBalance = await ethers.provider.getBalance(governanceAddress);
    console.log("治理合约余额:", ethers.formatEther(contractBalance), "ETH");
    
    const tx = await governanceContract.destroy();
    console.log("交易已发送，交易哈希:", tx.hash);
    
    console.log("等待交易确认...");
    await tx.wait();
    
    console.log("\n✅ 治理合约已成功删除!");
    console.log("交易哈希:", tx.hash);
    
  } catch (error) {
    console.error("\n❌ 删除治理合约时出错:", error.message);
    if (error.reason) {
      console.error("错误原因:", error.reason);
    }
  }
}

// 运行删除操作
destroyGovernance()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
