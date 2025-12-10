import hardhat from "hardhat";
const { ethers } = hardhat;

async function fundGasSubsidy() {
  console.log("向GasSubsidy合约注入原生代币资金...\n");
  
  // 获取默认账户
  const [deployer] = await ethers.getSigners();
  console.log("使用账户:", deployer.address);
  
  // GasSubsidy合约地址
  const gasSubsidyAddress = '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707';
  
  try {
    // 检查当前账户的原生代币余额
    const ethBalance = await ethers.provider.getBalance(deployer.address);
    console.log("当前账户原生代币余额:", ethers.formatEther(ethBalance));
    
    // 要注入的金额（100原生代币，更现实的数量）
    const fundAmount = ethers.parseEther("100");
    console.log("要注入的金额:", ethers.formatEther(fundAmount), "原生代币");
    
    if (ethBalance < fundAmount) {
      console.log("\n❌ 当前账户原生代币余额不足，无法注入资金");
      console.log("   需要:", ethers.formatEther(fundAmount), "原生代币");
      console.log("   当前余额:", ethers.formatEther(ethBalance), "原生代币");
      return;
    }
    
    // 检查GasSubsidy合约当前原生代币余额
    const currentBalance = await ethers.provider.getBalance(gasSubsidyAddress);
    console.log("GasSubsidy合约当前原生代币余额:", ethers.formatEther(currentBalance));
    
    // 执行转账到GasSubsidy合约（通过发送交易）
    console.log("\n✅ 余额充足，准备向GasSubsidy合约注入原生代币...");
    
    const tx = await deployer.sendTransaction({
      to: gasSubsidyAddress,
      value: fundAmount
    });
    
    console.log("交易已发送，交易哈希:", tx.hash);
    
    console.log("等待交易确认...");
    await tx.wait();
    
    console.log("\n✅ 原生代币资金已成功注入到GasSubsidy合约!");
    console.log("交易哈希:", tx.hash);
    
    // 验证GasSubsidy合约的新余额
    const newBalance = await ethers.provider.getBalance(gasSubsidyAddress);
    console.log("GasSubsidy合约新原生代币余额:", ethers.formatEther(newBalance));
    
  } catch (error) {
    console.error("\n❌ 向GasSubsidy合约注入原生代币资金时出错:", error.message);
    if (error.reason) {
      console.error("错误原因:", error.reason);
    }
  }
}

// 运行注入操作
fundGasSubsidy()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });