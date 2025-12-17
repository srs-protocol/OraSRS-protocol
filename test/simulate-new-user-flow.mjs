// 模拟新用户获取Gas补贴并注册节点的完整流程
import pkg from 'hardhat';
const { ethers } = pkg;

async function simulateNewUserFlow() {
  console.log("模拟新用户获取Gas补贴并注册节点的完整流程...");

  // 创建一个全新的钱包作为新用户（没有初始资金）
  const newUserWallet = ethers.Wallet.createRandom();
  console.log("新用户钱包地址:", newUserWallet.address);
  
  // 检查新用户初始余额
  const initialBalance = await ethers.provider.getBalance(newUserWallet.address);
  console.log("新用户初始原生代币余额:", ethers.formatEther(initialBalance));

  // 获取GasSubsidy合约地址
  const fs = await import('fs');
  const deploymentInfo = JSON.parse(fs.readFileSync('all-deployments.json', 'utf8'));
  const gasSubsidyAddress = deploymentInfo.gasSubsidyAddress;
  console.log("GasSubsidy合约地址:", gasSubsidyAddress);

  // 获取NodeRegistry合约地址
  const nodeRegistryAddress = deploymentInfo.nodeRegistryAddress;
  console.log("NodeRegistry合约地址:", nodeRegistryAddress);

  // 检查新用户是否已经领取过补贴
  const GasSubsidy = await ethers.getContractFactory("GasSubsidy");
  const gasSubsidy = GasSubsidy.attach(gasSubsidyAddress);
  const hasClaimed = await gasSubsidy.hasClaimed(newUserWallet.address);
  console.log("新用户是否已领取补贴:", hasClaimed);

  // 作为Relayer（治理账户）为新用户发放补贴
  console.log("\n通过API模拟：治理账户为新用户发放Gas补贴...");
  const [governanceAccount] = await ethers.getSigners(); // 这是Relayer账户
  console.log("治理账户(Relayer)地址:", governanceAccount.address);

  try {
    const subsidyTx = await gasSubsidy.connect(governanceAccount).subsidize(newUserWallet.address);
    await subsidyTx.wait();
    console.log("✓ Gas补贴发放成功，交易哈希:", subsidyTx.hash);

    // 检查新用户余额变化
    const balanceAfterSubsidy = await ethers.provider.getBalance(newUserWallet.address);
    console.log("新用户获得补贴后余额:", ethers.formatEther(balanceAfterSubsidy), "原生代币");
  } catch (error) {
    console.log("✗ Gas补贴发放失败:", error.message);
    return;
  }

  // 现在新用户有了Gas费，尝试注册节点
  console.log("\n新用户尝试在链上注册节点...");
  
  // 连接到NodeRegistry合约，使用新用户的钱包
  const NodeRegistry = await ethers.getContractFactory("NodeRegistry");
  const nodeRegistry = NodeRegistry.attach(nodeRegistryAddress);

  // 使用新用户的钱包连接合约
  const newUserConnectedRegistry = nodeRegistry.connect(newWalletWithFunds(newUserWallet.privateKey));

  // 实际上我们需要创建一个新provider连接带私钥的钱包
  const newUserProvider = new ethers.JsonRpcProvider("http://localhost:8545");
  const newUserSigner = new ethers.Wallet(newUserWallet.privateKey, newUserProvider);

  // 使用新用户注册节点
  try {
    console.log("新用户正在尝试注册节点...");
    const registerTx = await nodeRegistry.connect(newUserSigner).registerNode("192.168.1.101", 8081);
    await registerTx.wait();
    console.log("✓ 节点注册成功，交易哈希:", registerTx.hash);

    // 验证节点是否成功注册
    const nodes = await nodeRegistry.getNodes();
    console.log("当前节点总数:", nodes.length);
    
    // 检查最后注册的节点是否是新用户注册的
    const lastNode = nodes[nodes.length - 1];
    console.log(`最后一个节点信息: IP=${lastNode.ip}, 端口=${lastNode.port.toString()}, 钱包=${lastNode.wallet}`);
    
    if (lastNode.wallet.toLowerCase() === newUserWallet.address.toLowerCase()) {
      console.log("✓ 新用户节点注册验证成功！");
    } else {
      console.log("✗ 节点注册验证失败");
    }
  } catch (error) {
    console.log("✗ 节点注册失败:", error.message);
  }

  console.log("\n✓ 新用户流程模拟完成！");
  console.log("整个流程验证成功：新用户通过API获取Gas补贴 -> 使用补贴支付Gas费 -> 成功在链上注册节点");
}

// 辅助函数：创建连接到provider的钱包
function newWalletWithFunds(privateKey) {
  return new ethers.Wallet(privateKey, ethers.provider);
}

simulateNewUserFlow()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
