// scripts/deploy_security_contracts.js
const { ethers } = require("hardhat");

async function main() {
  console.log("开始部署OraSRS安全功能合约...");

  // 获取部署者账户
  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);

  // 检查部署者余额
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("部署者余额:", ethers.utils.formatEther(balance), "ETH");

  // 1. 部署OraSRSToken合约
  console.log("\n正在部署OraSRSToken合约...");
  const OraSRSToken = await ethers.getContractFactory("OraSRSToken");
  const oraToken = await OraSRSToken.deploy();
  await oraToken.deployed();
  console.log("✓ OraSRSToken合约已部署到:", oraToken.address);

  // 等待几秒确保交易完成
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 2. 部署ThreatIntelligenceCoordination合约
  console.log("\n正在部署ThreatIntelligenceCoordination合约...");
  const ThreatIntelligenceCoordination = await ethers.getContractFactory("ThreatIntelligenceCoordination");
  const threatIntelCoord = await ThreatIntelligenceCoordination.deploy(oraToken.address);
  await threatIntelCoord.deployed();
  console.log("✓ ThreatIntelligenceCoordination合约已部署到:", threatIntelCoord.address);

  // 等待几秒确保交易完成
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 3. 部署OraSRSGovernance合约
  console.log("\n正在部署OraSRSGovernance合约...");
  const OraSRSGovernance = await ethers.getContractFactory("OraSRSGovernance");
  const governance = await OraSRSGovernance.deploy(oraToken.address, threatIntelCoord.address);
  await governance.deployed();
  console.log("✓ OraSRSGovernance合约已部署到:", governance.address);

  // 等待几秒确保交易完成
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 4. 部署NodeRegistry合约
  console.log("\n正在部署NodeRegistry合约...");
  const NodeRegistry = await ethers.getContractFactory("NodeRegistry");
  const nodeRegistry = await NodeRegistry.deploy(deployer.address); // 治理委员会设为部署者
  await nodeRegistry.deployed();
  console.log("✓ NodeRegistry合约已部署到:", nodeRegistry.address);

  // 等待几秒确保交易完成
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 5. 部署OraPoints积分合约
  console.log("\n正在部署OraPoints积分合约...");
  const OraPoints = await ethers.getContractFactory("OraPoints");
  const oraPoints = await OraPoints.deploy();
  await oraPoints.deployed();
  console.log("✓ OraPoints积分合约已部署到:", oraPoints.address);

  // 等待几秒确保交易完成
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 6. 部署EnhancedThreatVerification合约
  console.log("\n正在部署EnhancedThreatVerification合约...");
  const EnhancedThreatVerification = await ethers.getContractFactory("EnhancedThreatVerification");
  const threatVerification = await EnhancedThreatVerification.deploy(governance.address, oraToken.address);
  await threatVerification.deployed();
  console.log("✓ EnhancedThreatVerification合约已部署到:", threatVerification.address);

  // 等待几秒确保交易完成
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 7. 部署ThreatIntelSync合约
  console.log("\n正在部署ThreatIntelSync合约...");
  const ThreatIntelSync = await ethers.getContractFactory("ThreatIntelSync");
  const threatIntelSync = await ThreatIntelSync.deploy(
    "0x0000000000000000000000000000000000000001", // 模拟LayerZero端点
    governance.address,
    100, // 模拟国内链ID
    200  // 模拟海外链ID
  );
  await threatIntelSync.deployed();
  console.log("✓ ThreatIntelSync合约已部署到:", threatIntelSync.address);

  // 等待几秒确保交易完成
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 8. 部署FaucetUpgradeable合约
  console.log("\n正在部署FaucetUpgradeable合约...");
  const FaucetUpgradeable = await ethers.getContractFactory("FaucetUpgradeable");
  const faucet = await FaucetUpgradeable.deploy(oraToken.address);
  await faucet.deployed();
  console.log("✓ FaucetUpgradeable合约已部署到:", faucet.address);

  // 等待几秒确保交易完成
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 9. 部署SecurityActionContract合约
  console.log("\n正在部署SecurityActionContract合约...");
  const SecurityActionContract = await ethers.getContractFactory("SecurityActionContract");
  const securityActionContract = await SecurityActionContract.deploy(governance.address);
  await securityActionContract.deployed();
  console.log("✓ SecurityActionContract合约已部署到:", securityActionContract.address);

  // 等待几秒确保交易完成
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 向水龙头合约发送代币
  console.log("\n正在向水龙头合约发送代币...");
  const faucetInitialBalance = ethers.utils.parseEther("1000000"); // 100万代币
  const transferTx = await oraToken.transfer(faucet.address, faucetInitialBalance);
  await transferTx.wait();
  console.log("✓ 已向水龙头合约发送100万ORA代币");

  // 验证水龙头余额
  const faucetBalance = await oraToken.balanceOf(faucet.address);
  console.log("✓ 水龙头合约当前余额:", ethers.utils.formatEther(faucetBalance), "ORA");

  console.log("\n===========================================");
  console.log("    OraSRS合约部署完成！（含安全功能）");
  console.log("===========================================");
  console.log("核心合约部署摘要:");
  console.log("✓ OraSRSToken地址:", oraToken.address);
  console.log("✓ ThreatIntelligenceCoordination地址:", threatIntelCoord.address);
  console.log("✓ OraSRSGovernance地址:", governance.address);
  console.log("✓ NodeRegistry地址:", nodeRegistry.address);
  console.log("✓ OraPoints积分合约:", oraPoints.address);
  console.log("✓ EnhancedThreatVerification地址:", threatVerification.address);
  console.log("✓ ThreatIntelSync地址:", threatIntelSync.address);
  console.log("✓ FaucetUpgradeable地址:", faucet.address);
  console.log("✓ SecurityActionContract地址:", securityActionContract.address);

  console.log("\n安全功能合约特点:");
  console.log("✓ SecurityActionContract: 管理IP和域名阻断列表");
  console.log("✓ ThreatIntelligenceCoordination: 存储威胁情报");
  console.log("✓ 用户端可通过合约查询异常IP/域名并执行阻断");

  console.log("\n用户端功能:");
  console.log("1. 通过SecurityActionContract查询异常IP和域名");
  console.log("2. 实现双向阻断操作");
  console.log("3. 与ThreatIntelligenceCoordination合约交互获取威胁情报");
  console.log("4. 轻量级用户端，无需单独配置");

  return {
    oraToken: oraToken.address,
    threatIntelCoord: threatIntelCoord.address,
    governance: governance.address,
    nodeRegistry: nodeRegistry.address,
    oraPoints: oraPoints.address,
    threatVerification: threatVerification.address,
    threatIntelSync: threatIntelSync.address,
    faucet: faucet.address,
    securityActionContract: securityActionContract.address
  };
}

main()
  .then(() => {
    console.log("\n合约部署完成！");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n合约部署失败:", error);
    process.exit(1);
  });
