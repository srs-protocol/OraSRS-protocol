// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "./ThreatEvidence.sol";
import "./OraSRSGovernance.sol";

/**
 * @title OraSRS 增强型威胁验证与抗操纵合约
 * @dev 基于多节点共识、声誉系统和Commit-Reveal机制的威胁验证合约
 * @author OraSRS Protocol
 * @notice 该合约实现去中心化、抗操纵的威胁验证机制
 */
contract EnhancedThreatVerification {
    // 威胁验证结构
    struct ThreatVerification {
        string threatId;              // 威胁ID
        address submitter;           // 提交者地址
        uint256 threatLevel;         // 威胁级别
        uint256 threatType;          // 威胁类型
        uint256 finalScore;          // 最终共识分数
        uint256 totalVerifications;  // 总验证次数
        uint256 positiveVerifications; // 正面验证次数
        uint256 negativeVerifications; // 负面验证次数
        bool consensusReached;       // 是否达成共识
        bool commitPhase;            // 是否处于提交阶段
        uint256 commitDeadline;      // 提交截止时间
        uint256 revealDeadline;      // 揭示截止时间
        uint256 minRequiredVerifiers; // 最小验证者数量
        uint256 consensusThreshold;  // 共识阈值 (百分比)
        mapping(address => bytes32) commits;  // 验证者提交的哈希
        mapping(address => VerificationReveal) reveals;  // 验证者揭示的数据
        address[] verifiers;         // 参与验证的验证者列表
    }

    // 验证揭示数据结构
    struct VerificationReveal {
        uint256 score;              // 评分
        string reason;              // 验证原因
        bytes32 salt;               // 盐值
        bool revealed;              // 是否已揭示
    }

    // 节点声誉结构
    struct NodeReputation {
        uint256 totalVerifications; // 总验证次数
        uint256 accurateVerifications; // 准确验证次数
        uint256 reputationScore;    // 声誉分数 (0-1000)
        uint256 stakeAmount;        // 质押金额
        uint256 slashAmount;        // 被削减金额
        uint256 lastActivity;       // 最后活动时间
        bool isActive;              // 是否活跃
        bool isSlashed;             // 是否被削减
    }

    // 验证挑战结构
    struct VerificationChallenge {
        string threatId;            // 威胁ID
        address challenger;         // 挑战者
        string challengeReason;     // 挑战原因
        uint256 stake;             // 挑战质押
        bool resolved;              // 是否已解决
        bool challengeSuccessful;   // 挑战是否成功
        uint256 challengeTime;      // 挑战时间
        uint256 resolutionTime;     // 解决时间
    }

    // 合约状态
    enum ContractState { Active, Paused, EmergencyStopped }
    ContractState public contractState;

    // 映射存储
    mapping(string => ThreatVerification) public threatVerifications;  // 威胁验证映射
    mapping(address => NodeReputation) public nodeReputations;        // 节点声誉
    mapping(string => VerificationChallenge) public verificationChallenges; // 验证挑战
    mapping(address => bool) public authorizedNodes;                  // 授权节点
    mapping(string => bool) public maliciousReports;                  // 恶意报告标记

    // 重要参数
    address public owner;
    address public governanceContract;
    uint256 public constant MIN_STAKE_AMOUNT = 1 ether;              // 最小质押金额
    uint256 public constant VERIFICATION_COMMIT_PERIOD = 1 hours;    // 提交阶段时长
    uint256 public constant VERIFICATION_REVEAL_PERIOD = 1 hours;    // 揭示阶段时长
    uint256 public constant CHALLENGE_PERIOD = 24 hours;             // 挑战期
    uint256 public constant CONSENSUS_THRESHOLD = 66;                // 共识阈值 (66%)
    uint256 public constant MIN_VERIFIERS = 3;                       // 最小验证者数量
    uint256 public constant SLASH_PENALTY_PERCENT = 10;              // 削减比例 (10%)
    uint256 public constant REPUTATION_REWARD = 10;                  // 声誉奖励值

    // 事件
    event ThreatVerificationStarted(string indexed threatId, address indexed submitter, uint256 indexed timestamp);
    event VerificationCommitted(string indexed threatId, address indexed verifier, uint256 indexed timestamp);
    event VerificationRevealed(string indexed threatId, address indexed verifier, uint256 score, uint256 indexed timestamp);
    event ConsensusReached(string indexed threatId, uint256 finalScore, uint256 indexed timestamp);
    event NodeSlashed(address indexed node, uint256 amount, string reason);
    event ReputationUpdated(address indexed node, uint256 newScore, uint256 indexed timestamp);
    event VerificationChallenged(string indexed threatId, address indexed challenger, uint256 stake, uint256 indexed timestamp);
    event ChallengeResolved(string indexed threatId, bool successful, uint256 indexed timestamp);

    // 修饰符
    modifier onlyActiveContract() {
        require(contractState == ContractState.Active, "Contract is not active");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlyGovernance() {
        require(msg.sender == governanceContract, "Only governance can call this function");
        _;
    }

    modifier onlyAuthorizedNode() {
        require(authorizedNodes[msg.sender], "Only authorized nodes can call this function");
        require(nodeReputations[msg.sender].isActive, "Node is not active");
        _;
    }

    /**
     * @dev 构造函数
     * @param _governanceContract 治理合约地址
     */
    constructor(address _governanceContract) {
        owner = msg.sender;
        governanceContract = _governanceContract;
        contractState = ContractState.Active;

        // 初始化治理节点
        nodeReputations[_governanceContract] = NodeReputation({
            totalVerifications: 0,
            accurateVerifications: 0,
            reputationScore: 1000,
            stakeAmount: 0,
            slashAmount: 0,
            lastActivity: block.timestamp,
            isActive: true,
            isSlashed: false
        });
        authorizedNodes[_governanceContract] = true;
    }

    /**
     * @dev 开始威胁验证流程（使用Commit-Reveal机制）
     * @param threatId 威胁ID
     * @param submitter 提交者地址
     * @param threatLevel 威胁级别
     * @param threatType 威胁类型
     */
    function startThreatVerification(
        string memory threatId,
        address submitter,
        uint256 threatLevel,
        uint256 threatType
    ) external onlyAuthorizedNode onlyActiveContract {
        require(bytes(threatVerifications[threatId].threatId).length == 0, "Verification already started for this threat");
        require(threatLevel <= 100, "Threat level must be <= 100");
        require(threatType <= 6, "Invalid threat type");

        ThreatVerification storage verification = threatVerifications[threatId];
        verification.threatId = threatId;
        verification.submitter = submitter;
        verification.threatLevel = threatLevel;
        verification.threatType = threatType;
        verification.commitPhase = true;
        verification.commitDeadline = block.timestamp + VERIFICATION_COMMIT_PERIOD;
        verification.revealDeadline = verification.commitDeadline + VERIFICATION_REVEAL_PERIOD;
        verification.minRequiredVerifiers = MIN_VERIFIERS;
        verification.consensusThreshold = CONSENSUS_THRESHOLD;

        emit ThreatVerificationStarted(threatId, submitter, block.timestamp);
    }

    /**
     * @dev 提交验证（Commit阶段）
     * @param threatId 威胁ID
     * @param commitmentHash 承诺哈希 (score + salt)
     */
    function commitVerification(
        string memory threatId,
        bytes32 commitmentHash
    ) external onlyAuthorizedNode onlyActiveContract {
        ThreatVerification storage verification = threatVerifications[threatId];
        require(bytes(verification.threatId).length > 0, "Verification not started for this threat");
        require(verification.commitPhase, "Commit phase has ended");
        require(block.timestamp <= verification.commitDeadline, "Commit deadline has passed");
        require(verification.commits[msg.sender] == bytes32(0), "Already committed");

        verification.commits[msg.sender] = commitmentHash;
        verification.verifiers.push(msg.sender);

        emit VerificationCommitted(threatId, msg.sender, block.timestamp);
    }

    /**
     * @dev 揭示验证（Reveal阶段）
     * @param threatId 威胁ID
     * @param score 验证评分
     * @param reason 验证原因
     * @param salt 盐值
     */
    function revealVerification(
        string memory threatId,
        uint256 score,
        string memory reason,
        bytes32 salt
    ) external onlyAuthorizedNode onlyActiveContract {
        ThreatVerification storage verification = threatVerifications[threatId];
        require(bytes(verification.threatId).length > 0, "Verification not started for this threat");
        require(!verification.commitPhase, "Reveal phase has not started yet");
        require(block.timestamp <= verification.revealDeadline, "Reveal deadline has passed");
        require(verification.commits[msg.sender] != bytes32(0), "No commitment found for this verifier");
        require(!verification.reveals[msg.sender].revealed, "Already revealed");

        // 验证哈希匹配
        bytes32 expectedHash = keccak256(abi.encodePacked(score, reason, salt));
        require(verification.commits[msg.sender] == expectedHash, "Hash mismatch - possible manipulation");

        // 记录揭示信息
        verification.reveals[msg.sender] = VerificationReveal({
            score: score,
            reason: reason,
            salt: salt,
            revealed: true
        });

        // 更新验证统计
        verification.totalVerifications++;
        if (score >= 50) { // 假设50是正面验证阈值
            verification.positiveVerifications++;
        } else {
            verification.negativeVerifications++;
        }

        // 更新节点活动时间
        nodeReputations[msg.sender].lastActivity = block.timestamp;

        // 检查是否达成共识
        if (!verification.consensusReached) {
            _checkConsensus(threatId);
        }

        emit VerificationRevealed(threatId, msg.sender, score, block.timestamp);
    }

    /**
     * @dev 检查是否达成共识
     * @param threatId 威胁ID
     */
    function _checkConsensus(string memory threatId) internal {
        ThreatVerification storage verification = threatVerifications[threatId];

        if (verification.totalVerifications < verification.minRequiredVerifiers) {
            return; // 还没有足够的验证者
        }

        // 计算共识比例
        uint256 consensusRatio = (verification.positiveVerifications * 100) / verification.totalVerifications;

        // 检查是否达到共识阈值
        if (consensusRatio >= verification.consensusThreshold || 
            (100 - consensusRatio) >= verification.consensusThreshold) {
            
            // 计算最终分数（加权平均或其他算法）
            uint256 totalScore = 0;
            for (uint i = 0; i < verification.verifiers.length; i++) {
                address verifier = verification.verifiers[i];
                if (verification.reveals[verifier].revealed) {
                    totalScore += verification.reveals[verifier].score;
                }
            }

            if (verification.totalVerifications > 0) {
                verification.finalScore = totalScore / verification.totalVerifications;
            }

            verification.consensusReached = true;

            // 更新节点声誉
            _updateNodeReputations(threatId);

            emit ConsensusReached(threatId, verification.finalScore, block.timestamp);
        }
    }

    /**
     * @dev 更新节点声誉
     * @param threatId 威胁ID
     */
    function _updateNodeReputations(string memory threatId) internal {
        ThreatVerification storage verification = threatVerifications[threatId];

        uint256 expectedScore = verification.finalScore;
        for (uint i = 0; i < verification.verifiers.length; i++) {
            address verifier = verification.verifiers[i];
            if (verification.reveals[verifier].revealed) {
                NodeReputation storage nodeRep = nodeReputations[verifier];

                nodeRep.totalVerifications++;

                // 检查验证准确性（简化算法）
                uint256 scoreDiff = verification.reveals[verifier].score > expectedScore 
                    ? verification.reveals[verifier].score - expectedScore 
                    : expectedScore - verification.reveals[verifier].score;

                // 如果评分差异小于阈值，认为验证准确
                if (scoreDiff <= 20) { // 评分差异在20以内认为准确
                    nodeRep.accurateVerifications++;
                    nodeRep.reputationScore = _calculateReputation(nodeRep);
                } else {
                    // 评分差异过大，可能需要惩罚
                    _applyPenaltyIfNecessary(verifier, threatId);
                }

                nodeRep.lastActivity = block.timestamp;
                emit ReputationUpdated(verifier, nodeRep.reputationScore, block.timestamp);
            }
        }
    }

    /**
     * @dev 计算节点声誉
     * @param nodeRep 节点声誉结构
     */
    function _calculateReputation(NodeReputation memory nodeRep) internal pure returns (uint256) {
        if (nodeRep.totalVerifications == 0) {
            return 500; // 新节点初始声誉
        }

        uint256 accuracy = (nodeRep.accurateVerifications * 1000) / nodeRep.totalVerifications;
        // 声誉分数范围 0-1000
        return accuracy > 1000 ? 1000 : accuracy;
    }

    /**
     * @dev 如有必要，应用惩罚
     * @param verifier 验证者地址
     * @param threatId 威胁ID
     */
    function _applyPenaltyIfNecessary(address verifier, string memory threatId) internal {
        ThreatVerification storage verification = threatVerifications[threatId];
        NodeReputation storage nodeRep = nodeReputations[verifier];

        // 如果节点声誉过低，考虑削减质押
        if (nodeRep.reputationScore < 200) { // 声誉分数低于200
            uint256 slashAmount = (nodeRep.stakeAmount * SLASH_PENALTY_PERCENT) / 100;
            if (slashAmount > 0 && nodeRep.stakeAmount >= slashAmount) {
                nodeRep.stakeAmount -= slashAmount;
                nodeRep.slashAmount += slashAmount;
                nodeRep.isSlashed = true;

                emit NodeSlashed(verifier, slashAmount, "Low reputation score");
            }
        }
    }

    /**
     * @dev 质押代币以成为验证者
     * @param amount 质押金额
     */
    function stakeForVerification(uint256 amount) external payable {
        require(amount >= MIN_STAKE_AMOUNT, "Insufficient stake amount");
        require(msg.value == amount, "Amount mismatch");

        NodeReputation storage nodeRep = nodeReputations[msg.sender];
        nodeRep.stakeAmount += amount;

        // 如果是新节点，设置初始状态
        if (!authorizedNodes[msg.sender]) {
            authorizedNodes[msg.sender] = true;
            nodeRep.reputationScore = 500; // 新节点初始声誉
        }

        nodeRep.isActive = true;
        nodeRep.lastActivity = block.timestamp;
    }

    /**
     * @dev 挑战验证结果
     * @param threatId 威胁ID
     * @param challengeReason 挑战原因
     */
    function challengeVerification(
        string memory threatId,
        string memory challengeReason
    ) external payable onlyActiveContract {
        ThreatVerification storage verification = threatVerifications[threatId];
        require(bytes(verification.threatId).length > 0, "Verification does not exist");
        require(verification.consensusReached, "Consensus not yet reached");
        require(block.timestamp < verification.revealDeadline + CHALLENGE_PERIOD, "Challenge period has ended");
        require(msg.value >= MIN_STAKE_AMOUNT, "Insufficient challenge stake");

        require(verificationChallenges[threatId].challenger == address(0), "Challenge already exists for this threat");

        verificationChallenges[threatId] = VerificationChallenge({
            threatId: threatId,
            challenger: msg.sender,
            challengeReason: challengeReason,
            stake: msg.value,
            resolved: false,
            challengeSuccessful: false,
            challengeTime: block.timestamp,
            resolutionTime: 0
        });

        emit VerificationChallenged(threatId, msg.sender, msg.value, block.timestamp);
    }

    /**
     * @dev 解决验证挑战
     * @param threatId 威胁ID
     * @param challengeSuccessful 挑战是否成功
     */
    function resolveChallenge(
        string memory threatId,
        bool challengeSuccessful
    ) external onlyGovernance {
        VerificationChallenge storage challenge = verificationChallenges[threatId];
        require(!challenge.resolved, "Challenge already resolved");

        challenge.resolved = true;
        challenge.challengeSuccessful = challengeSuccessful;
        challenge.resolutionTime = block.timestamp;

        // 处理质押奖励/惩罚
        if (challengeSuccessful) {
            // 挑战成功，挑战者获得奖励，原始验证者被惩罚
            _handleSuccessfulChallenge(threatId);
        } else {
            // 挑战失败，挑战者质押被没收
            _handleFailedChallenge(threatId);
        }

        emit ChallengeResolved(threatId, challengeSuccessful, block.timestamp);
    }

    /**
     * @dev 处理成功的挑战
     * @param threatId 威胁ID
     */
    function _handleSuccessfulChallenge(string memory threatId) internal {
        VerificationChallenge storage challenge = verificationChallenges[threatId];
        ThreatVerification storage verification = threatVerifications[threatId];

        // 挑战者获得质押奖励
        payable(challenge.challenger).transfer(challenge.stake * 2); // 本金+奖励

        // 对参与验证的节点进行惩罚
        for (uint i = 0; i < verification.verifiers.length; i++) {
            address verifier = verification.verifiers[i];
            NodeReputation storage nodeRep = nodeReputations[verifier];

            if (nodeRep.stakeAmount > 0) {
                uint256 slashAmount = (nodeRep.stakeAmount * SLASH_PENALTY_PERCENT) / 100;
                if (slashAmount > 0 && nodeRep.stakeAmount >= slashAmount) {
                    nodeRep.stakeAmount -= slashAmount;
                    nodeRep.slashAmount += slashAmount;
                    nodeRep.isSlashed = true;
                    nodeRep.reputationScore = _applyReputationPenalty(nodeRep.reputationScore);

                    emit NodeSlashed(verifier, slashAmount, "Challenge successful against verification");
                }
            }
        }

        // 标记原始威胁报告为恶意
        maliciousReports[threatId] = true;
    }

    /**
     * @dev 处理失败的挑战
     * @param threatId 威胁ID
     */
    function _handleFailedChallenge(string memory threatId) internal {
        VerificationChallenge storage challenge = verificationChallenges[threatId];

        // 挑战失败，挑战者质押被没收
        // 质押可能被发送到治理合约或其他地方
        payable(governanceContract).transfer(challenge.stake);
    }

    /**
     * @dev 应用声誉惩罚
     * @param currentReputation 当前声誉
     */
    function _applyReputationPenalty(uint256 currentReputation) internal pure returns (uint256) {
        // 降低声誉分数
        uint256 penalty = currentReputation / 4; // 降低25%
        return currentReputation > penalty ? currentReputation - penalty : 0;
    }

    /**
     * @dev 获取威胁验证详情
     * @param threatId 威胁ID
     */
    function getThreatVerificationDetails(string memory threatId) external view returns (
        address submitter,
        uint256 threatLevel,
        uint256 threatType,
        uint256 finalScore,
        uint256 totalVerifications,
        uint256 positiveVerifications,
        uint256 negativeVerifications,
        bool consensusReached,
        bool commitPhase,
        uint256 commitDeadline,
        uint256 revealDeadline,
        uint256 minRequiredVerifiers,
        uint256 consensusThreshold
    ) {
        ThreatVerification storage verification = threatVerifications[threatId];
        return (
            verification.submitter,
            verification.threatLevel,
            verification.threatType,
            verification.finalScore,
            verification.totalVerifications,
            verification.positiveVerifications,
            verification.negativeVerifications,
            verification.consensusReached,
            verification.commitPhase,
            verification.commitDeadline,
            verification.revealDeadline,
            verification.minRequiredVerifiers,
            verification.consensusThreshold
        );
    }

    /**
     * @dev 获取节点声誉详情
     * @param node 地址
     */
    function getNodeReputationDetails(address node) external view returns (
        uint256 totalVerifications,
        uint256 accurateVerifications,
        uint256 reputationScore,
        uint256 stakeAmount,
        uint256 slashAmount,
        uint256 lastActivity,
        bool isActive,
        bool isSlashed
    ) {
        NodeReputation storage nodeRep = nodeReputations[node];
        return (
            nodeRep.totalVerifications,
            nodeRep.accurateVerifications,
            nodeRep.reputationScore,
            nodeRep.stakeAmount,
            nodeRep.slashAmount,
            nodeRep.lastActivity,
            nodeRep.isActive,
            nodeRep.isSlashed
        );
    }

    /**
     * @dev 检查验证者是否已提交
     * @param threatId 威胁ID
     * @param verifier 验证者地址
     */
    function hasVerifierCommitted(string memory threatId, address verifier) external view returns (bool) {
        return threatVerifications[threatId].commits[verifier] != bytes32(0);
    }

    /**
     * @dev 检查验证者是否已揭示
     * @param threatId 威胁ID
     * @param verifier 验证者地址
     */
    function hasVerifierRevealed(string memory threatId, address verifier) external view returns (bool) {
        return threatVerifications[threatId].reveals[verifier].revealed;
    }

    /**
     * @dev 治理功能：暂停合约
     */
    function pauseContract() external onlyGovernance {
        contractState = ContractState.Paused;
    }

    /**
     * @dev 治理功能：恢复合约
     */
    function resumeContract() external onlyGovernance {
        contractState = ContractState.Active;
    }

    /**
     * @dev 治理功能：紧急停止
     */
    function emergencyStop() external onlyGovernance {
        contractState = ContractState.EmergencyStopped;
    }
}