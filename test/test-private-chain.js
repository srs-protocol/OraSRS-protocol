// test-private-chain.js
const { ethers } = require("hardhat");

async function testConnection() {
  console.log("测试连接到OraSRS私有链...");
  
  try {
    // 获取网络信息
    const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
    const network = await provider.getNetwork();
    console.log("连接成功！网络信息：");
    console.log("- 网络名称:", network.name);
    console.log("- 链ID:", network.chainId);
    
    // 检查余额
    const accounts = await provider.listAccounts();
    console.log("可用账户:", accounts);
    
    if (accounts.length > 0) {
      const balance = await provider.getBalance(accounts[0]);
      console.log("第一个账户余额:", ethers.utils.formatEther(balance), "ETH");
    }
    
    return true;
  } catch (error) {
    console.error("连接失败:", error.message);
    return false;
  }
}

async function main() {
  const isConnected = await testConnection();
  
  if (isConnected) {
    console.log("\n可以连接到私有链，准备部署合约...");
    console.log("请先运行: ./start-orasrs-chain.sh");
    console.log("然后运行部署命令: npx hardhat run scripts/deploy_all.js --network my_private_chain");
  } else {
    console.log("\n无法连接到私有链。");
    console.log("请确保：");
    console.log("1. 已安装geth");
    console.log("2. 已启动OraSRS私有链: ./start-orasrs-chain.sh");
    console.log("3. 私有链在http://localhost:8545上运行");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });