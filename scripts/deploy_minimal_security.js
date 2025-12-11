// scripts/deploy_minimal_security.js
const { ethers } = require("hardhat");

async function main() {
  console.log("开始部署OraSRS最小化安全合约...");

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
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 2. 部署SecurityActionContract合约
  console.log("\n正在部署SecurityActionContract合约...");
  const SecurityActionContract = await ethers.getContractFactory("SecurityActionContract");
  const securityActionContract = await SecurityActionContract.deploy(deployer.address);
  await securityActionContract.deployed();
  console.log("✓ SecurityActionContract合约已部署到:", securityActionContract.address);

  // 等待几秒确保交易完成
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 创建一个简化的威胁情报协调合约
  console.log("\n正在部署简化版威胁情报协调合约...");
  const ThreatIntelCoordFactory = await ethers.getContractFactory("ThreatIntelligenceCoordination");
  const threatIntelContract = await ThreatIntelCoordFactory.deploy();
  await threatIntelContract.deployed();
  console.log("✓ ThreatIntelligenceCoordination合约已部署到:", threatIntelContract.address);

  // 等待几秒确保交易完成
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 3. 部署FaucetUpgradeable合约
  console.log("\n正在部署FaucetUpgradeable合约...");
  const FaucetUpgradeable = await ethers.getContractFactory("FaucetUpgradeable");
  const faucet = await FaucetUpgradeable.deploy(oraToken.address);
  await faucet.deployed();
  console.log("✓ FaucetUpgradeable合约已部署到:", faucet.address);

  // 等待几秒确保交易完成
  await new Promise(resolve => setTimeout(resolve, 1000));

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
  console.log("    OraSRS最小化安全合约部署完成！");
  console.log("===========================================");
  console.log("核心合约部署摘要:");
  console.log("✓ OraSRSToken地址:", oraToken.address);
  console.log("✓ SecurityActionContract地址:", securityActionContract.address);
  console.log("✓ ThreatIntelligenceCoordination地址:", threatIntelContract.address);
  console.log("✓ FaucetUpgradeable地址:", faucet.address);

  console.log("\n安全功能合约特点:");
  console.log("✓ SecurityActionContract: 管理IP和域名阻断列表");
  console.log("✓ 用户端可通过合约查询异常IP/域名并执行阻断");

  console.log("\n用户端功能:");
  console.log("1. 通过SecurityActionContract查询异常IP和域名");
  console.log("2. 实现双向阻断操作");
  console.log("3. 与ThreatIntelligenceCoordination合约交互获取威胁情报");
  console.log("4. 轻量级用户端，无需单独配置");

  // 演示如何使用安全功能
  console.log("\n演示安全功能:");
  console.log("- 阻断IP示例: securityActionContract.blockIP('192.168.1.100', '恶意IP地址')");
  console.log("- 阻断域名示例: securityActionContract.blockDomain('malicious.com', '恶意域名')");
  console.log("- 检查IP状态: securityActionContract.isIPBlocked('192.168.1.100')");

  // 写入配置文件
  const config = {
    network: {
      chainId: 31337, // Hardhat默认链ID
      rpcUrl: "http://localhost:8545"
    },
    contracts: {
      oraToken: oraToken.address,
      securityActionContract: securityActionContract.address,
      threatIntelCoord: threatIntelContract.address,
      faucet: faucet.address
    },
    security: {
      enableIPBlocking: true,
      enableDomainBlocking: true,
      queryInterval: 30000 // 30秒查询一次
    }
  };

  const fs = require('fs');
  fs.writeFileSync('user-client-config.json', JSON.stringify(config, null, 2));
  console.log("\n✓ 用户端配置文件已生成: user-client-config.json");

  console.log("\n===========================================");
  console.log("    OraSRS公开许可链已启动！");
  console.log("===========================================");
  console.log("现在您可以:");
  console.log("1. 连接到 http://localhost:8545");
  console.log("2. 使用合约地址与链交互");
  console.log("3. 通过SecurityActionContract管理安全规则");

  return {
    oraToken: oraToken.address,
    securityActionContract: securityActionContract.address,
    threatIntelCoord: threatIntelContract.address,
    faucet: faucet.address
  };
}

// 简化的威胁情报协调合约
const ThreatIntelCoordContract = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ThreatIntelligenceCoordination {
    // 威胁级别枚举
    enum ThreatLevel { Info, Warning, Critical, Emergency }
    
    // 威胁情报结构
    struct ThreatIntel {
        string sourceIP;
        string targetIP;
        ThreatLevel threatLevel;
        uint256 timestamp;
        string threatType;
        bool isActive;
    }
    
    // 存储威胁情报
    mapping(string => ThreatIntel) public threatIntels;  // IP -> ThreatIntel
    mapping(string => bool) public isThreatIP;          // IP -> 是否为威胁IP
    
    event ThreatIntelAdded(string indexed ip, ThreatLevel level, string threatType, uint256 timestamp);
    event ThreatIntelRemoved(string indexed ip, uint256 timestamp);
    
    /**
     * @dev 添加威胁情报
     */
    function addThreatIntel(
        string memory _ip,
        ThreatLevel _threatLevel,
        string memory _threatType
    ) external {
        require(bytes(_ip).length > 0, "IP cannot be empty");
        
        threatIntels[_ip] = ThreatIntel({
            sourceIP: _ip,
            targetIP: "",
            threatLevel: _threatLevel,
            timestamp: block.timestamp,
            threatType: _threatType,
            isActive: true
        });
        
        isThreatIP[_ip] = true;
        
        emit ThreatIntelAdded(_ip, _threatLevel, _threatType, block.timestamp);
    }
    
    /**
     * @dev 移除威胁情报
     */
    function removeThreatIntel(string memory _ip) external {
        threatIntels[_ip].isActive = false;
        isThreatIP[_ip] = false;
        
        emit ThreatIntelRemoved(_ip, block.timestamp);
    }
    
    /**
     * @dev 检查IP是否为威胁IP
     */
    function isThreatSource(string memory _ip) external view returns (bool) {
        return isThreatIP[_ip] && threatIntels[_ip].isActive;
    }
    
    /**
     * @dev 获取威胁情报
     */
    function getThreatIntel(string memory _ip) external view returns (
        string memory sourceIP,
        string memory targetIP,
        ThreatLevel threatLevel,
        uint256 timestamp,
        string memory threatType,
        bool isActive
    ) {
        ThreatIntel memory intel = threatIntels[_ip];
        return (
            intel.sourceIP,
            intel.targetIP,
            intel.threatLevel,
            intel.timestamp,
            intel.threatType,
            intel.isActive
        );
    }
}
`;

// 将合约添加到项目中
const fs = require('fs');
const path = require('path');

// 检查合约文件是否存在，如果不存在则创建
const contractPath = path.join(__dirname, '../contracts/ThreatIntelligenceCoordination.sol');
if (!fs.existsSync(contractPath)) {
    fs.writeFileSync(contractPath, ThreatIntelCoordContract);
    console.log("✓ ThreatIntelligenceCoordination.sol 已创建");
}

main()
  .then(() => {
    console.log("\n最小化安全合约部署完成！");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n合约部署失败:", error);
    process.exit(1);
  });
