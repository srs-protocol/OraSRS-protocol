// scripts/deploy_all.js
const { ethers } = require("hardhat");

async function main() {
  console.log("开始部署OraSRS协议合约到私有链...");

  try {
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

    // 4. 部署EnhancedThreatVerification合约
    console.log("\n正在部署EnhancedThreatVerification合约...");
    const EnhancedThreatVerification = await ethers.getContractFactory("EnhancedThreatVerification");
    const threatVerification = await EnhancedThreatVerification.deploy(governance.address, oraToken.address);
    await threatVerification.deployed();
    console.log("✓ EnhancedThreatVerification合约已部署到:", threatVerification.address);

    // 等待几秒确保交易完成
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 5. 部署NodeRegistry合约
    console.log("\n正在部署NodeRegistry合约...");
    const NodeRegistry = await ethers.getContractFactory("NodeRegistry");
    const nodeRegistry = await NodeRegistry.deploy(deployer.address); // 治理委员会设为部署者
    await nodeRegistry.deployed();
    console.log("✓ NodeRegistry合约已部署到:", nodeRegistry.address);

    // 等待几秒确保交易完成
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 6. 部署OraPoints积分合约
    console.log("\n正在部署OraPoints积分合约...");
    const OraPoints = await ethers.getContractFactory("OraPoints");
    const oraPoints = await OraPoints.deploy();
    await oraPoints.deployed();
    console.log("✓ OraPoints积分合约已部署到:", oraPoints.address);

    // 等待几秒确保交易完成
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 7. 部署ThreatIntelSync合约（如果需要）
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
    console.log("    OraSRS合约部署完成！");
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

    console.log("\n私有链配置完成！");
    console.log("✓ 原生代币: ORA");
    console.log("✓ 网络ID: 8888");
    console.log("✓ RPC端点: http://127.0.0.1:8545");
    console.log("✓ 区块时间: 1秒");
    console.log("\n公开许可链架构特点:");
    console.log("✓ 节点端: 通过NodeRegistry实现准入控制");
    console.log("✓ 用户端: 通过OraPoints积分系统防止垃圾数据");
    console.log("✓ API网关: 通过Nginx实现速率限制和认证");
    console.log("\n现在您可以:");
    console.log("1. 连接认证节点到 http://localhost:8545");
    console.log("2. 通过API网关与合约交互");
    console.log("3. 使用积分系统管理用户访问");

    // 输出合约验证信息
    console.log("\n部署摘要:");
    console.log(`ORA代币合约: ${oraToken.address}`);
    console.log(`威胁情报协调合约: ${threatIntelCoord.address}`);
    console.log(`治理合约: ${governance.address}`);
    console.log(`节点注册合约: ${nodeRegistry.address}`);
    console.log(`积分系统合约: ${oraPoints.address}`);
    console.log(`威胁验证合约: ${threatVerification.address}`);
    console.log(`跨链同步合约: ${threatIntelSync.address}`);
    console.log(`水龙头合约: ${faucet.address}`);

    return {
      oraToken: oraToken.address,
      threatIntelCoord: threatIntelCoord.address,
      governance: governance.address,
      nodeRegistry: nodeRegistry.address,
      oraPoints: oraPoints.address,
      threatVerification: threatVerification.address,
      threatIntelSync: threatIntelSync.address,
      faucet: faucet.address
    };
  } catch (error) {
    console.error("部署过程中出现错误:", error);
    throw error;
  }
}

main()
  .then(() => {
    console.log("\n部署成功完成！");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n部署失败:", error);
    process.exit(1);
  });
