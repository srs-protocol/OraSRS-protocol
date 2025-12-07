// scripts/deploy_with_security_features.js
const { ethers } = require("hardhat");

async function main() {
  console.log("开始部署OraSRS协议合约（含安全功能）...");

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
  
  // 9. 部署SecurityActionContract合约 - 用于管理安全操作（如阻断IP和域名）
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

  console.log("\n现在您可以:");
  console.log("1. 通过合约查询异常IP和域名");
  console.log("2. 执行双向阻断操作");
  console.log("3. 使用治理合约管理网络参数");

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

// 安全操作合约定义
const SecurityActionContract = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SecurityActionContract
 * @dev 用于管理安全操作的合约，如IP和域名阻断
 */
contract SecurityActionContract is Ownable, ReentrancyGuard {
    // 安全操作类型
    enum ActionType { BlockIP, BlockDomain, AllowIP, AllowDomain }
    
    // 安全操作结构
    struct SecurityAction {
        ActionType actionType;
        string target;  // IP地址或域名
        address executor;  // 执行者
        uint256 timestamp;  // 时间戳
        string reason;  // 原因
        bool active;  // 是否活跃
    }
    
    // 存储映射
    mapping(string => SecurityAction) public ipBlockList;      // IP阻断列表
    mapping(string => SecurityAction) public domainBlockList;  // 域名阻断列表
    mapping(string => SecurityAction) public ipAllowList;      // IP允许列表
    mapping(string => SecurityAction) public domainAllowList;  // 域名允许列表
    mapping(uint256 => SecurityAction) public actionHistory;   // 操作历史
    uint256 public actionCount;
    
    // 治理合约地址
    address public governanceContract;
    
    // 事件
    event SecurityActionExecuted(uint256 indexed actionId, ActionType actionType, string target, string reason, uint256 timestamp);
    event SecurityActionRevoked(uint256 indexed actionId, string target, string reason);
    event GovernanceContractUpdated(address oldGovernance, address newGovernance);
    
    // 修饰符
    modifier onlyGovernance() {
        require(msg.sender == governanceContract, "Only governance can call this function");
        _;
    }
    
    modifier onlyAuthorizedNode() {
        require(msg.sender == governanceContract || msg.sender == owner(), "Only authorized nodes can call this function");
        _;
    }
    
    /**
     * @dev 构造函数
     * @param _governanceContract 治理合约地址
     */
    constructor(address _governanceContract) Ownable(msg.sender) {
        require(_governanceContract != address(0), "Governance contract cannot be zero address");
        governanceContract = _governanceContract;
    }
    
    /**
     * @dev 执行安全操作
     * @param _actionType 操作类型
     * @param _target 目标IP或域名
     * @param _reason 原因
     */
    function executeSecurityAction(ActionType _actionType, string memory _target, string memory _reason) 
        external 
        onlyAuthorizedNode 
        nonReentrant 
    {
        require(bytes(_target).length > 0, "Target cannot be empty");
        
        SecurityAction storage action = actionHistory[++actionCount];
        action.actionType = _actionType;
        action.target = _target;
        action.executor = msg.sender;
        action.timestamp = block.timestamp;
        action.reason = _reason;
        action.active = true;
        
        // 根据操作类型更新相应的列表
        if (_actionType == ActionType.BlockIP) {
            ipBlockList[_target] = action;
        } else if (_actionType == ActionType.BlockDomain) {
            domainBlockList[_target] = action;
        } else if (_actionType == ActionType.AllowIP) {
            ipAllowList[_target] = action;
        } else if (_actionType == ActionType.AllowDomain) {
            domainAllowList[_target] = action;
        }
        
        emit SecurityActionExecuted(actionCount, _actionType, _target, _reason, block.timestamp);
    }
    
    /**
     * @dev 撤销安全操作
     * @param _actionId 操作ID
     * @param _reason 撤销原因
     */
    function revokeSecurityAction(uint256 _actionId, string memory _reason) 
        external 
        onlyAuthorizedNode 
        nonReentrant 
    {
        SecurityAction storage action = actionHistory[_actionId];
        require(action.active, "Action is not active");
        require(bytes(action.target).length > 0, "Action does not exist");
        
        action.active = false;
        
        // 从相应的列表中移除
        if (action.actionType == ActionType.BlockIP) {
            delete ipBlockList[action.target];
        } else if (action.actionType == ActionType.BlockDomain) {
            delete domainBlockList[action.target];
        } else if (action.actionType == ActionType.AllowIP) {
            delete ipAllowList[action.target];
        } else if (action.actionType == ActionType.AllowDomain) {
            delete domainAllowList[action.target];
        }
        
        emit SecurityActionRevoked(_actionId, action.target, _reason);
    }
    
    /**
     * @dev 检查IP是否被阻断
     * @param _ip IP地址
     */
    function isIPBlocked(string memory _ip) external view returns (bool) {
        SecurityAction memory action = ipBlockList[_ip];
        return action.active && action.actionType == ActionType.BlockIP;
    }
    
    /**
     * @dev 检查域名是否被阻断
     * @param _domain 域名
     */
    function isDomainBlocked(string memory _domain) external view returns (bool) {
        SecurityAction memory action = domainBlockList[_domain];
        return action.active && action.actionType == ActionType.BlockDomain;
    }
    
    /**
     * @dev 检查IP是否被允许
     * @param _ip IP地址
     */
    function isIPAllowed(string memory _ip) external view returns (bool) {
        SecurityAction memory action = ipAllowList[_ip];
        return action.active && action.actionType == ActionType.AllowIP;
    }
    
    /**
     * @dev 检查域名是否被允许
     * @param _domain 域名
     */
    function isDomainAllowed(string memory _domain) external view returns (bool) {
        SecurityAction memory action = domainAllowList[_domain];
        return action.active && action.actionType == ActionType.AllowDomain;
    }
    
    /**
     * @dev 获取安全操作详情
     * @param _actionId 操作ID
     */
    function getSecurityAction(uint256 _actionId) external view returns (
        ActionType actionType,
        string memory target,
        address executor,
        uint256 timestamp,
        string memory reason,
        bool active
    ) {
        SecurityAction memory action = actionHistory[_actionId];
        return (
            action.actionType,
            action.target,
            action.executor,
            action.timestamp,
            action.reason,
            action.active
        );
    }
    
    /**
     * @dev 获取操作历史总数
     */
    function getActionHistoryCount() external view returns (uint256) {
        return actionCount;
    }
    
    /**
     * @dev 更新治理合约地址
     * @param _newGovernanceContract 新治理合约地址
     */
    function updateGovernanceContract(address _newGovernanceContract) external onlyOwner {
        require(_newGovernanceContract != address(0), "New governance contract cannot be zero address");
        address oldGovernance = governanceContract;
        governanceContract = _newGovernanceContract;
        
        emit GovernanceContractUpdated(oldGovernance, _newGovernanceContract);
    }
    
    /**
     * @dev 批量执行安全操作（治理功能）
     */
    function batchExecuteSecurityActions(
        ActionType[] memory _actionTypes,
        string[] memory _targets,
        string[] memory _reasons
    ) external onlyGovernance {
        require(_actionTypes.length == _targets.length && _targets.length == _reasons.length, 
                "Array lengths must match");
        
        for (uint i = 0; i < _actionTypes.length; i++) {
            executeSecurityAction(_actionTypes[i], _targets[i], _reasons[i]);
        }
    }
}
`;

// 将合约添加到项目中
const fs = require('fs');
const path = require('path');

// 检查合约文件是否存在，如果不存在则创建
const contractPath = path.join(__dirname, '../contracts/SecurityActionContract.sol');
if (!fs.existsSync(contractPath)) {
    fs.writeFileSync(contractPath, SecurityActionContract);
    console.log("✓ SecurityActionContract.sol 已创建");
}

main()
  .then(() => {
    console.log("\n合约部署脚本执行完成！");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n合约部署失败:", error);
    process.exit(1);
  });
