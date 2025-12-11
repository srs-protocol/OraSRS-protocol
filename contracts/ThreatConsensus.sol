// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ThreatConsensus
 * @dev 带证据的威胁情报共识合约，实现乐观验证机制
 * 客户端先本地防御，再上传证据，达成共识后全网同步
 * 包含代币验证、提交-揭示机制和白名单功能
 */
contract ThreatConsensus is Ownable, ReentrancyGuard {
    
    constructor(address tokenAddress) Ownable(msg.sender) {
        orasrsToken = IERC20(tokenAddress);
        // 初始化默认白名单 - 直接操作映射而不是调用函数
        whitelist["8.8.8.8"] = true;
        whitelist["8.8.4.4"] = true;
        whitelist["1.1.1.1"] = true;
        whitelist["1.0.0.1"] = true;
    }
    
    struct AttackProof {
        address reporter;
        uint64 timestamp;
        uint8 cpuLoad;       // 攻击时CPU负载 (0-100)
        string logHash;      // 日志片段的哈希 (防篡改)
        string attackType;   // 攻击类型
    }

    struct ThreatStatus {
        bool isConfirmed;    // 是否达成全网共识
        uint256 reportCount; // 举报次数
        uint256 totalRiskScore;
        uint256 confirmedAt; // 确认时间戳
    }

    // 提交-揭示机制的数据结构
    struct Commitment {
        bytes32 hash;
        uint256 commitBlock;
        bool revealed;
    }

    mapping(string => ThreatStatus) public threatStatus;
    mapping(string => AttackProof[]) public evidenceHistory; // IP -> 证据列表
    mapping(address => mapping(string => bool)) public hasReported; // 防止同一节点重复举报
    mapping(bytes32 => Commitment) public commitments; // 提交的哈希值
    mapping(string => bool) public whitelist; // 白名单IP

    // 代币合约地址
    IERC20 public orasrsToken;
    // 代币持有门槛
    uint256 public constant MIN_TOKEN_BALANCE = 1000 * 10**18; // 1000代币
    
    // 触发全网封禁的阈值 (例如 3 个不同节点举报)
    uint256 public constant CONSENSUS_THRESHOLD = 3;
    uint256 public constant MAX_CPULOAD = 100;
    // 提交-揭示机制的区块延迟
    uint256 public constant REVEAL_DELAY = 10;

    event LocalDefenseActive(string indexed ip, address indexed reporter); // 仅记录，不全网广播
    event GlobalThreatConfirmed(string indexed ip, string reason);         // 全网广播，所有节点需同步
    event ThreatReportRevoked(string indexed ip, address indexed reporter); // 撤销举报事件
    event ThreatCommitted(bytes32 indexed commitment, address indexed reporter, uint256 commitBlock); // 提交事件
    event ThreatRevealed(string indexed ip, address indexed reporter, string indexed salt); // 揭示事件
    event WhitelistUpdated(string indexed ip, bool isWhitelisted); // 白名单更新事件

    /**
     * @dev 提交阶段：提交威胁证据的哈希值（防止跟风攻击）
     * @param ipHash IP地址的哈希值
     * @param salt 随机盐值
     */
    function commitThreatEvidence(bytes32 ipHash, string calldata salt) external nonReentrant {
        // 验证代币持有量
        require(orasrsToken.balanceOf(msg.sender) >= MIN_TOKEN_BALANCE, "Insufficient token balance for threat reporting");
        
        bytes32 commitment = keccak256(abi.encodePacked(ipHash, salt, msg.sender));
        
        // 确保承诺未被占用
        require(commitments[commitment].hash == bytes32(0), "Commitment already exists");
        
        commitments[commitment] = Commitment({
            hash: ipHash,
            commitBlock: block.number,
            revealed: false
        });
        
        emit ThreatCommitted(commitment, msg.sender, block.number);
    }
    
    /**
     * @dev 揭示阶段：揭示实际的威胁证据（在提交后一定区块数）
     * @param ip 实际IP地址
     * @param salt 之前使用的盐值
     * @param cpuLoad 攻击时CPU负载 (0-100)
     * @param logHash 日志片段的哈希
     * @param attackType 攻击类型
     * @param riskScore 风险分数
     */
    function revealThreatEvidence(
        string calldata ip, 
        string calldata salt,
        uint8 cpuLoad, 
        string calldata logHash, 
        string calldata attackType,
        uint256 riskScore
    ) external nonReentrant {
        bytes32 ipHash = keccak256(abi.encodePacked(ip));
        bytes32 commitment = keccak256(abi.encodePacked(ipHash, salt, msg.sender));
        
        Commitment storage commit = commitments[commitment];
        require(commit.hash != bytes32(0), "No such commitment");
        require(!commit.revealed, "Commitment already revealed");
        require(block.number >= commit.commitBlock + REVEAL_DELAY, "Reveal delay not reached");
        
        // 验证哈希匹配
        require(commit.hash == ipHash, "Hash mismatch");
        
        // 标记为已揭示
        commit.revealed = true;
        
        // 检查白名单
        require(!whitelist[ip], "IP is in whitelist");
        
        // 验证参数
        require(cpuLoad <= MAX_CPULOAD, "CPU load out of range");
        require(bytes(ip).length > 0, "IP cannot be empty");
        require(bytes(logHash).length > 0, "Log hash cannot be empty");
        
        ThreatStatus storage status = threatStatus[ip];
        
        // 检查是否已经举报过（防重复）
        require(!hasReported[msg.sender][ip], "Already reported this IP");
        
        // 1. 存储证据 (供治理节点或AI审计)
        evidenceHistory[ip].push(AttackProof({
            reporter: msg.sender,
            timestamp: uint64(block.timestamp),
            cpuLoad: cpuLoad,
            logHash: logHash,
            attackType: attackType
        }));
        
        // 2. 更新状态
        status.reportCount++;
        status.totalRiskScore += riskScore;
        hasReported[msg.sender][ip] = true;

        emit ThreatRevealed(ip, msg.sender, salt);
        emit LocalDefenseActive(ip, msg.sender); // 通知链上：有人被攻击了

        // 3. 检查是否达成共识
        if (!status.isConfirmed && status.reportCount >= CONSENSUS_THRESHOLD) {
            status.isConfirmed = true;
            status.confirmedAt = block.timestamp;
            emit GlobalThreatConfirmed(ip, attackType); // 🚀 触发全网封禁指令
        }
    }

    /**
     * @dev 撤销之前的举报（在达成共识前）
     * @param ip 要撤销举报的IP
     */
    function revokeThreatReport(string calldata ip) external {
        ThreatStatus storage status = threatStatus[ip];
        
        require(!status.isConfirmed, "Threat already confirmed");
        require(hasReported[msg.sender][ip], "You haven't reported this IP");
        
        // 减少举报计数
        status.reportCount--;
        // 注意：不减少totalRiskScore，因为无法知道之前贡献的分数
        
        // 标记为未举报
        hasReported[msg.sender][ip] = false;
        
        emit ThreatReportRevoked(ip, msg.sender);
    }

    /**
     * @dev 治理节点强制确认 (上帝模式)
     * @param ip 要强制确认的IP
     */
    function forceConfirm(string calldata ip) external onlyOwner {
        require(!whitelist[ip], "Cannot confirm whitelisted IP");
        ThreatStatus storage status = threatStatus[ip];
        status.isConfirmed = true;
        status.confirmedAt = block.timestamp;
        emit GlobalThreatConfirmed(ip, "Governance Force Block");
    }
    
    /**
     * @dev 治理节点强制撤销确认
     * @param ip 要撤销确认的IP
     */
    function forceRevoke(string calldata ip) external onlyOwner {
        ThreatStatus storage status = threatStatus[ip];
        require(status.isConfirmed, "Threat not confirmed");
        status.isConfirmed = false;
        status.confirmedAt = 0;
    }
    
    /**
     * @dev 治理节点添加白名单IP
     * @param ip 要添加到白名单的IP
     */
    function addToWhitelist(string calldata ip) public onlyOwner {
        whitelist[ip] = true;
        emit WhitelistUpdated(ip, true);
    }
    
    /**
     * @dev 治理节点移除白名单IP
     * @param ip 要从白名单移除的IP
     */
    function removeFromWhitelist(string calldata ip) public onlyOwner {
        whitelist[ip] = false;
        emit WhitelistUpdated(ip, false);
    }
    
    /**
     * @dev 检查IP是否在白名单中
     * @param ip 要检查的IP
     * @return 是否在白名单中
     */
    function isWhitelisted(string calldata ip) external view returns (bool) {
        return whitelist[ip];
    }
    
    /**
     * @dev 获取指定IP的证据数量
     * @param ip 目标IP
     * @return 证据数量
     */
    function getEvidenceCount(string calldata ip) external view returns (uint256) {
        return evidenceHistory[ip].length;
    }
    
    /**
     * @dev 获取指定IP的威胁状态
     * @param ip 目标IP
     * @return isConfirmed, reportCount, totalRiskScore, confirmedAt
     */
    function getThreatStatus(string calldata ip) external view returns (bool, uint256, uint256, uint256) {
        ThreatStatus storage status = threatStatus[ip];
        return (status.isConfirmed, status.reportCount, status.totalRiskScore, status.confirmedAt);
    }
    
    /**
     * @dev 检查某个地址是否已举报过某个IP
     * @param reporter 举报者地址
     * @param ip 目标IP
     * @return 是否已举报
     */
    function hasAddressReported(address reporter, string calldata ip) external view returns (bool) {
        return hasReported[reporter][ip];
    }
    
    /**
     * @dev 检查承诺是否已揭示
     * @param commitment 承诺哈希
     * @return 是否已揭示
     */
    function isCommitmentRevealed(bytes32 commitment) external view returns (bool) {
        return commitments[commitment].revealed;
    }
    
    /**
     * @dev 检查承诺是否有效（存在且未揭示）
     * @param commitment 承诺哈希
     * @return 是否有效
     */
    function isValidCommitment(bytes32 commitment) external view returns (bool) {
        Commitment storage commit = commitments[commitment];
        return (commit.hash != bytes32(0) && !commit.revealed && block.number >= commit.commitBlock + REVEAL_DELAY);
    }
}