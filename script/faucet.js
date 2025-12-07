const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  // 获取 ORA 代币合约实例
  const OraSRSAddress = "0xB09f5a73655aE61BD0560FbEd69BD86Ab7d49fe0"; // 已部署的代币合约地址
  const OraSRS = await ethers.getContractFactory("OraSRSToken");
  const oraSRS = await OraSRS.attach(OraSRSAddress);
  
  // 从命令行参数获取接收者地址
  const receiverAddress = process.argv[2];
  
  if (!receiverAddress) {
    console.log("请提供接收者地址: npx hardhat run script/faucet.js RECEIVER_ADDRESS --network sepolia");
    return;
  }
  
  // 验证地址格式
  if (!ethers.utils.isAddress(receiverAddress)) {
    console.log("无效的以太坊地址");
    return;
  }
  
  console.log("Faucet 配置:");
  console.log("  - 发送者: ", deployer.address);
  console.log("  - 接收者: ", receiverAddress);
  console.log("  - 代币合约: ", oraSRS.address);
  
  // 发送 1000 ORA 代币
  const amount = ethers.utils.parseEther("1000"); // 1000 ORA (考虑了18位精度)
  
  console.log(`\\n正在发送 ${ethers.utils.formatEther(amount)} ORA 代币...`);
  
  const tx = await oraSRS.transfer(receiverAddress, amount);
  console.log("交易已发送，交易哈希:", tx.hash);
  
  await tx.wait();
  console.log("交易已确认！");
  
  // 检查接收者余额
  const balance = await oraSRS.balanceOf(receiverAddress);
  console.log(`接收者新余额: ${ethers.utils.formatEther(balance)} ORA`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });