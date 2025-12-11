// 测试所有OraSRS协议合约功能
import pkg from 'hardhat';
const { ethers } = pkg;

async function testAllContracts() {
  console.log("开始测试所有OraSRS协议合约功能...");

  // 获取合约地址
  const deploymentInfo = {
    oraTokenAddress: "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d",
    nodeRegistryAddress: "0x59b670e9fA9D0A427751Af201D676719a970857b",
    threatIntelligenceCoordinationAddress: "0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1",
    simpleSecurityActionAddress: "0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44",
    faucetAddress: "0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f"
  };

  const [owner] = await ethers.getSigners();
  console.log("\n测试账户:", owner.address);

  // 测试NodeRegistry合约
  console.log("\n=== 测试NodeRegistry合约 ===");
  const NodeRegistry = await ethers.getContractFactory("NodeRegistry");
  const nodeRegistry = NodeRegistry.attach(deploymentInfo.nodeRegistryAddress);
  
  console.log("注册新节点...");
  const registerTx = await nodeRegistry.registerNode("8.8.8.8", 443);
  await registerTx.wait();
  console.log("✓ 节点注册成功");
  
  const nodes = await nodeRegistry.getNodes();
  console.log("✓ 当前节点数量:", nodes.length);

  // 测试OraSRSToken合约
  console.log("\n=== 测试OraSRSToken合约 ===");
  const OraSRSToken = await ethers.getContractFactory("OraSRSToken");
  const oraToken = OraSRSToken.attach(deploymentInfo.oraTokenAddress);
  
  const initialSupply = await oraToken.totalSupply();
  console.log("✓ 代币总供应量:", ethers.formatEther(initialSupply));
  
  const balance = await oraToken.balanceOf(owner.address);
  console.log("✓ 部署者余额:", ethers.formatEther(balance));

  // 测试ThreatIntelligenceCoordination合约
  console.log("\n=== 测试ThreatIntelligenceCoordination合约 ===");
  const ThreatIntelligenceCoordination = await ethers.getContractFactory("ThreatIntelligenceCoordination");
  const threatIntelCoord = ThreatIntelligenceCoordination.attach(deploymentInfo.threatIntelligenceCoordinationAddress);
  
  console.log("添加威胁情报...");
  const addThreatTx = await threatIntelCoord.addThreatIntel("192.168.1.100", 2, "Malware");
  await addThreatTx.wait();
  console.log("✓ 威胁情报添加成功");
  
  const isThreat = await threatIntelCoord.isThreatSource("192.168.1.100");
  console.log("✓ 威胁IP检查结果:", isThreat);

  // 测试SimpleSecurityActionContract合约
  console.log("\n=== 测试SimpleSecurityActionContract合约 ===");
  const SimpleSecurityActionContract = await ethers.getContractFactory("SimpleSecurityActionContract");
  const simpleSecurityAction = SimpleSecurityActionContract.attach(deploymentInfo.simpleSecurityActionAddress);
  
  console.log("阻断IP...");
  const blockIPTx = await simpleSecurityAction.blockIP("10.0.0.1");
  await blockIPTx.wait();
  console.log("✓ IP阻断成功");
  
  const isIPBlocked = await simpleSecurityAction.isIPBlocked("10.0.0.1");
  console.log("✓ IP阻断状态:", isIPBlocked);

  // 测试FaucetUpgradeable合约
  console.log("\n=== 测试FaucetUpgradeable合约 ===");
  const FaucetUpgradeable = await ethers.getContractFactory("FaucetUpgradeable");
  const faucet = FaucetUpgradeable.attach(deploymentInfo.faucetAddress);
  
  const faucetBalance = await oraToken.balanceOf(deploymentInfo.faucetAddress);
  console.log("✓ 水龙头ORA代币余额:", ethers.formatEther(faucetBalance));

  console.log("\n✓ 所有OraSRS协议合约测试完成！");
}

testAllContracts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
