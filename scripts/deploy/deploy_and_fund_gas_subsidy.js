import hardhat from "hardhat";
const { ethers } = hardhat;

async function deployGasSubsidy() {
  console.log("部署新的GasSubsidy合约...\n");
  
  // 获取默认账户
  const [deployer] = await ethers.getSigners();
  console.log("使用账户:", deployer.address);
  
  try {
    // 部署GasSubsidy合约
    const GasSubsidy = await ethers.getContractFactory("GasSubsidy");
    
    // 需要提供_owner和_relayer地址
    const gasSubsidy = await GasSubsidy.deploy(deployer.address, deployer.address);
    
    console.log("正在部署GasSubsidy合约...");
    await gasSubsidy.waitForDeployment();
    
    const gasSubsidyAddress = await gasSubsidy.getAddress();
    console.log("GasSubsidy合约已部署到:", gasSubsidyAddress);
    
    // 验证合约部署
    const owner = await gasSubsidy.owner();
    console.log("合约所有者:", owner);
    
    const relayer = await gasSubsidy.relayerAddress();
    console.log("Relayer地址:", relayer);
    
    const subsidyAmount = await gasSubsidy.subsidyAmount();
    console.log("补贴金额:", ethers.formatEther(subsidyAmount), "ETH");
    
    return gasSubsidyAddress;
  } catch (error) {
    console.error("部署GasSubsidy合约时出错:", error);
    throw error;
  }
}

async function fundGasSubsidyWithDeploy() {
  console.log("部署并注入资金到GasSubsidy合约...\n");
  
  try {
    const gasSubsidyAddress = await deployGasSubsidy();
    
    // 获取默认账户
    const [deployer] = await ethers.getSigners();
    
    // 注入资金
    const fundAmount = ethers.parseEther("100");  // 100个原生代币
    console.log(`\n向GasSubsidy合约注入 ${ethers.formatEther(fundAmount)} 原生代币...`);
    
    const tx = await deployer.sendTransaction({
      to: gasSubsidyAddress,
      value: fundAmount
    });
    
    console.log("交易已发送，交易哈希:", tx.hash);
    await tx.wait();
    
    // 验证余额
    const balance = await ethers.provider.getBalance(gasSubsidyAddress);
    console.log("GasSubsidy合约新余额:", ethers.formatEther(balance), "ETH");
    console.log("\n✅ GasSubsidy合约已成功部署并注入资金!");
    
  } catch (error) {
    console.error("操作失败:", error);
  }
}

// 运行部署和注入操作
fundGasSubsidyWithDeploy()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
