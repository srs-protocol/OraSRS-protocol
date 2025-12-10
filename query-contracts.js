import pkg from 'hardhat';
import fs from 'fs';

const { ethers } = pkg;

async function queryContracts() {
  console.log("正在查询已部署的OraSRS合约...\n");

  // 从部署信息文件中读取合约地址
  const deploymentInfo = JSON.parse(fs.readFileSync('all-deployments.json', 'utf8'));
  
  console.log("部署信息:");
  console.log("- 部署者地址:", deploymentInfo.deployer);
  console.log("- 部署时间:", deploymentInfo.timestamp);
  console.log();

  // 获取合约实例
  const oraToken = await ethers.getContractAt("OraSRSToken", deploymentInfo.oraTokenAddress);
  const nodeRegistry = await ethers.getContractAt("NodeRegistry", deploymentInfo.nodeRegistryAddress);
  const threatIntelCoord = await ethers.getContractAt("ThreatIntelligenceCoordination", deploymentInfo.threatIntelligenceCoordinationAddress);
  const simpleSecurityAction = await ethers.getContractAt("SimpleSecurityActionContract", deploymentInfo.simpleSecurityActionAddress);
  const faucet = await ethers.getContractAt("FaucetUpgradeable", deploymentInfo.faucetAddress);
  const gasSubsidy = await ethers.getContractAt("GasSubsidy", deploymentInfo.gasSubsidyAddress);

  // 查询OraSRSToken合约信息
  console.log("=== OraSRSToken 合约信息 ===");
  try {
    const name = await oraToken.name();
    const symbol = await oraToken.symbol();
    const decimals = await oraToken.decimals();
    const totalSupply = await oraToken.totalSupply();
    
    console.log("- 名称:", name);
    console.log("- 符号:", symbol);
    console.log("- 精度:", decimals.toString());
    console.log("- 总供应量:", totalSupply.toString());
    
    // 查询部署者余额
    const deployerBalance = await oraToken.balanceOf(deploymentInfo.deployer);
    console.log("- 部署者余额:", deployerBalance.toString());
  } catch (error) {
    console.log("查询OraSRSToken合约失败:", error.message);
  }
  console.log();

  // 查询NodeRegistry合约信息
  console.log("=== NodeRegistry 合约信息 ===");
  try {
    const nodes = await nodeRegistry.getNodes();
    console.log("- 注册节点数量:", nodes.length);
    
    // 获取所有节点信息
    if (nodes.length > 0) {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        console.log(`- 节点 ${i+1}:`, {
          ip: node.ip,
          port: node.port.toString(),
          wallet: node.wallet
        });
      }
    } else {
      console.log("- 当前没有注册的节点");
    }
  } catch (error) {
    console.log("查询NodeRegistry合约失败:", error.message);
  }
  console.log();

  // 查询ThreatIntelligenceCoord合约信息
  console.log("=== ThreatIntelligenceCoord 合约信息 ===");
  try {
    // 由于合约没有提供获取所有报告的函数，我们先查询一个示例IP
    console.log("- 合约地址:", await threatIntelCoord.getAddress());
    
    // 可以检查一个示例IP是否为威胁源
    const sampleIP = "192.168.1.1"; // 示例IP
    const isThreat = await threatIntelCoord.isThreatSource(sampleIP);
    console.log("- 示例IP (192.168.1.1) 是否为威胁源:", isThreat);
    
  } catch (error) {
    console.log("查询ThreatIntelligenceCoord合约失败:", error.message);
  }
  console.log();

  // 查询SimpleSecurityActionContract合约信息
  console.log("=== SimpleSecurityActionContract 合约信息 ===");
  try {
    console.log("- 合约地址:", await simpleSecurityAction.getAddress());
  } catch (error) {
    console.log("查询SimpleSecurityActionContract合约失败:", error.message);
  }
  console.log();

  // 查询FaucetUpgradeable合约信息
  console.log("=== FaucetUpgradeable 合约信息 ===");
  try {
    const tokenAddress = await faucet.oraToken();
    console.log("- 水龙头代币地址:", tokenAddress);
    
    const withdrawAmount = await faucet.withdrawAmount();
    console.log("- 单次领取数量:", withdrawAmount.toString());
    
    const cooldownPeriod = await faucet.cooldownPeriod();
    console.log("- 冷却时间(秒):", cooldownPeriod.toString());
    
    const faucetBalance = await faucet.faucetBalance();
    console.log("- 水龙头余额:", faucetBalance.toString());
    
  } catch (error) {
    console.log("查询FaucetUpgradeable合约失败:", error.message);
  }
  console.log();

  // 查询GasSubsidy合约信息
  console.log("=== GasSubsidy 合约信息 ===");
  try {
    const subsidyAmount = await gasSubsidy.subsidyAmount();
    const relayerAddress = await gasSubsidy.relayerAddress();
    const contractBalance = await ethers.provider.getBalance(await gasSubsidy.getAddress());
    
    console.log("- 补贴金额:", ethers.formatEther(subsidyAmount), "ETH");
    console.log("- 中继器地址:", relayerAddress);
    console.log("- 合约余额:", ethers.formatEther(contractBalance), "ETH");
    
  } catch (error) {
    console.log("查询GasSubsidy合约失败:", error.message);
  }
  console.log();
}

queryContracts()
  .then(() => {
    console.log("合约查询完成！");
    process.exit(0);
  })
  .catch((error) => {
    console.error("查询合约时出错:", error);
    process.exit(1);
  });