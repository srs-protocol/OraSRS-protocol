// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "./libs/GmSupport.sol"; // 国密算法库（概念性）

/**
 * @title OraSRS 国密版质押智能合约
 * @dev 基于国密算法（SM2/SM3/SM4）的质押合约，符合中国国家标准
 * @author OraSRS Protocol
 * @notice 该合约部署在支持国密算法的国产联盟链上
 */
contract OrasrsStakingGmContract {
    using GmSupport for bytes32;
    
    // 合约状态
    enum ContractState { Active, Paused, EmergencyStopped }
    ContractState public contractState;
    
    // 节点状态
    enum NodeStatus { Unregistered, Registered, Active, Slashed, PendingRemoval }
    
    // 节点结构
    struct Node {
        address nodeAddress;
        uint256 stakeAmount;
        uint256 stakeStart;
        uint256 reputationScore;
        NodeStatus status;
        string nodeId; // 节点ID
        string businessLicense; // 营业执照号（SM3哈希）
        string filingNumber; // 区块链备案号（SM3哈希）
        uint256 challengeCount;
        uint256 challengesWon;
        uint256 challengesLost;
        uint256 lastSeen;
        bool isConsensusNode;
    }
    
    // 质押参数
    uint256 public constant MIN_STAKE_ROOT = 10000; // 根层最小质押：10,000 ORA
    uint256 public constant MIN_STAKE_PARTITION = 5000; // 分区层最小质押：5,000 ORA
    uint256 public constant MIN_STAKE_EDGE = 100; // 边缘层最小质押：100 ORA
    uint256 public constant STAKE_LOCK_PERIOD = 7 days; // 质押锁定期：7天
    uint256 public constant SLASH_PENALTY_RATE = 100; // 作恶罚没比例：100%
    uint256 public constant OFFLINE_PENALTY_RATE = 5; // 离线罚没比例：5%/天
    uint256 public constant CHALLENGE_THRESHOLD = 3; // 挑战阈值：3个节点
    
    // 重要参数
    uint256 public constant MAX_CONSENSUS_NODES = 21; // 最大共识节点数
    uint256 public constant MAX_PARTITION_NODES = 50; // 最大分区节点数
    
    // 映射
    mapping(address => Node) public nodes; // 节点地址到节点信息
    mapping(string => address) public nodeIdToAddress; // 节点ID到地址
    mapping(address => uint256) public pendingWithdrawals; // 待提取金额
    mapping(bytes32 => bool) public usedNonces; // 防重放攻击
    
    // 共识节点集合
    address[] public consensusNodes;
    address[] public partitionNodes;
    address[] public edgeNodes;
    
    // 事件
    event NodeStaked(string nodeId, address indexed nodeAddress, uint256 amount, uint256 timestamp);
    event NodeSlashed(string nodeId, uint256 penaltyAmount, string reason, uint256 timestamp);
    event NodeChallenged(string indexed cacheKey, address indexed challenger, string reason, uint256 timestamp);
    event ChallengeResolved(string indexed cacheKey, bool success, uint256 penaltyAmount, uint256 rewardAmount, uint256 timestamp);
    event NodeWithdrawn(address indexed nodeAddress, uint256 amount, uint256 timestamp);
    event ContractStateChanged(ContractState newState, uint256 timestamp);
    
    // 访问控制
    address public owner;
    address public governanceCommittee;
    mapping(address => bool) public authorizedValidators;
    
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
        require(msg.sender == governanceCommittee, "Only governance can call this function");
        _;
    }
    
    modifier onlyValidator() {
        require(authorizedValidators[msg.sender], "Only authorized validators can call this function");
        _;
    }
    
    /**
     * @dev 构造函数
     * @param _governanceCommittee 治理委员会地址
     */
    constructor(address _governanceCommittee) {
        owner = msg.sender;
        governanceCommittee = _governanceCommittee;
        contractState = ContractState.Active;
    }
    
    /**
     * @dev 节点质押函数（国密签名验证版）
     * @param nodeId 节点ID
     * @param amount 质押金额
     * @param sm2Signature SM2数字签名
     * @param dataHash 数据哈希值
     * @param nonce 防重放随机数
     * @param businessLicenseHash 营业执照号SM3哈希
     * @param filingNumberHash 备案号SM3哈希
     * @param nodeType 节点类型 (0=根层, 1=分区层, 2=边缘层)
     */
    function stakeWithGmSign(
        string memory nodeId,
        uint256 amount,
        bytes memory sm2Signature,
        bytes32 dataHash,
        uint256 nonce,
        string memory businessLicenseHash,
        string memory filingNumberHash,
        uint8 nodeType
    ) external payable onlyActiveContract {
        // 防重放攻击
        bytes32 requestHash = keccak256(abi.encodePacked(
            msg.sender, nodeId, amount, block.timestamp, nonce
        ));
        require(!usedNonces[requestHash], "Nonce already used");
        usedNonces[requestHash] = true;
        
        // 验证SM2签名（概念性实现，实际需要在支持国密的链上完成）
        require(validateSm2Signature(sm2Signature, dataHash, msg.sender), "Invalid SM2 signature");
        
        // 验证质押金额
        uint256 minStake = getMinStakeForNodeType(nodeType);
        require(amount >= minStake, "Insufficient stake amount");
        require(msg.value >= amount, "Insufficient ETH sent");
        
        // 验证节点是否已存在
        require(nodeIdToAddress[nodeId] == address(0), "Node ID already exists");
        
        // 验证营业执照和备案信息（SM3哈希验证）
        require(bytes(businessLicenseHash).length > 0, "Business license hash is required");
        require(bytes(filingNumberHash).length > 0, "Filing number hash is required");
        
        // 创建节点
        Node memory newNode = Node({
            nodeAddress: msg.sender,
            stakeAmount: amount,
            stakeStart: block.timestamp,
            reputationScore: 100, // 初始声誉分数
            status: NodeStatus.Registered,
            nodeId: nodeId,
            businessLicense: businessLicenseHash,
            filingNumber: filingNumberHash,
            challengeCount: 0,
            challengesWon: 0,
            challengesLost: 0,
            lastSeen: block.timestamp,
            isConsensusNode: false
        });
        
        nodes[msg.sender] = newNode;
        nodeIdToAddress[nodeId] = msg.sender;
        
        // 根据节点类型加入相应列表
        if (nodeType == 0) { // 根层节点
            require(consensusNodes.length < MAX_CONSENSUS_NODES, "Max consensus nodes reached");
            consensusNodes.push(msg.sender);
        } else if (nodeType == 1) { // 分区层节点
            partitionNodes.push(msg.sender);
        } else { // 边缘层节点
            edgeNodes.push(msg.sender);
        }
        
        emit NodeStaked(nodeId, msg.sender, amount, block.timestamp);
    }
    
    /**
     * @dev 验证SM2签名（概念性实现）
     * @param signature SM2签名
     * @param hash 待验证的哈希值
     * @param signer 签名者地址
     */
    function validateSm2Signature(
        bytes memory signature,
        bytes32 hash,
        address signer
    ) internal view returns (bool) {
        // 在实际部署中，这将调用链上预编译合约或内置函数来验证SM2签名
        // 此处为概念性实现
        return true; // 真实实现需要根据具体链的国密支持情况
    }
    
    /**
     * @dev 获取节点类型对应的最小质押额
     * @param nodeType 节点类型
     */
    function getMinStakeForNodeType(uint8 nodeType) internal pure returns (uint256) {
        if (nodeType == 0) { // 根层
            return MIN_STAKE_ROOT;
        } else if (nodeType == 1) { // 分区层
            return MIN_STAKE_PARTITION;
        } else { // 边缘层
            return MIN_STAKE_EDGE;
        }
    }
    
    /**
     * @dev SM3哈希函数（概念性实现）
     * @param data 待哈希的数据
     */
    function sm3Hash(bytes memory data) internal pure returns (bytes32) {
        // 在实际部署中，这将使用链上SM3预编译合约
        return keccak256(data); // 用keccak256替代，实际应使用SM3
    }
    
    /**
     * @dev 提交缓存挑战
     * @param cacheKey 缓存键
     * @param reason 挑战理由
     * @param challengeData 挑战数据
     */
    function submitCacheChallenge(
        string memory cacheKey,
        string memory reason,
        bytes memory challengeData
    ) external onlyActiveContract {
        require(nodes[msg.sender].status == NodeStatus.Active, "Node not active");
        
        // 记录挑战事件
        emit NodeChallenged(cacheKey, msg.sender, reason, block.timestamp);
        
        // 实际挑战处理逻辑将在外部完成，合约只记录挑战
    }
    
    /**
     * @dev 验证挑战结果并执行相应操作
     * @param cacheKey 缓存键
     * @param challengedNode 被挑战节点地址
     * @param challengeSuccessful 挑战是否成功
     * @param challengerNodes 挑战者节点列表
     */
    function resolveChallenge(
        string memory cacheKey,
        address challengedNode,
        bool challengeSuccessful,
        address[] memory challengerNodes
    ) external onlyValidator {
        require(nodes[challengedNode].status == NodeStatus.Active, "Challenged node not active");
        
        uint256 penaltyAmount = 0;
        uint256 rewardAmount = 0;
        
        if (challengeSuccessful) {
            // 挑战成功：罚没被挑战节点50%质押金
            penaltyAmount = nodes[challengedNode].stakeAmount / 2;
            nodes[challengedNode].stakeAmount -= penaltyAmount;
            
            // 更新节点统计数据
            nodes[challengedNode].challengesLost += 1;
            
            // 计算挑战者奖励（80%罚没金额）
            if (challengerNodes.length > 0) {
                rewardAmount = (penaltyAmount * 80) / 100;
                uint256 rewardPerChallenger = rewardAmount / challengerNodes.length;
                
                for (uint i = 0; i < challengerNodes.length; i++) {
                    require(nodes[challengerNodes[i]].status == NodeStatus.Active, "Invalid challenger node");
                    nodes[challengerNodes[i]].stakeAmount += rewardPerChallenger;
                    nodes[challengerNodes[i]].challengesWon += 1;
                }
            }
        } else {
            // 挑战失败：记录失败统计
            nodes[challengedNode].challengesWon += 1;
        }
        
        emit ChallengeResolved(cacheKey, challengeSuccessful, penaltyAmount, rewardAmount, block.timestamp);
    }
    
    /**
     * @dev 声誉更新
     * @param nodeAddress 节点地址
     * @param reputationDelta 声誉变化量
     */
    function updateReputation(
        address nodeAddress,
        int256 reputationDelta
    ) external onlyValidator {
        Node storage node = nodes[nodeAddress];
        require(node.status != NodeStatus.Unregistered, "Node not registered");
        
        // 更新声誉分数
        if (reputationDelta > 0) {
            node.reputationScore = uint256(int256(node.reputationScore) + reputationDelta);
        } else {
            int256 newReputation = int256(node.reputationScore) + reputationDelta;
            node.reputationScore = newReputation > 0 ? uint256(newReputation) : 0;
        }
        
        // 根据声誉分数调整节点状态
        applyReputationRules(nodeAddress);
    }
    
    /**
     * @dev 应用声誉规则
     * @param nodeAddress 节点地址
     */
    function applyReputationRules(address nodeAddress) internal {
        Node storage node = nodes[nodeAddress];
        
        if (node.reputationScore < 80) {
            // 声誉 < 80，移出共识节点
            if (node.isConsensusNode) {
                removeNodeFromConsensusList(nodeAddress);
                node.isConsensusNode = false;
            }
        } else if (node.reputationScore > 120) {
            // 声誉 > 120，可以考虑降低质押要求或提高收益
            // 实现细节待定
        }
        
        if (node.reputationScore < 60) {
            // 连续低声誉处理
            // 在实际实现中，这可能需要跟踪连续天数
        }
    }
    
    /**
     * @dev 将节点从共识列表中移除
     * @param nodeAddress 节点地址
     */
    function removeNodeFromConsensusList(address nodeAddress) internal {
        for (uint i = 0; i < consensusNodes.length; i++) {
            if (consensusNodes[i] == nodeAddress) {
                consensusNodes[i] = consensusNodes[consensusNodes.length - 1];
                consensusNodes.pop();
                break;
            }
        }
    }
    
    /**
     * @dev 节点作恶罚没
     * @param nodeAddress 作恶节点地址
     * @param reason 作恶原因
     */
    function slashNode(address nodeAddress, string memory reason) external onlyGovernance {
        Node storage node = nodes[nodeAddress];
        require(node.status == NodeStatus.Active || node.status == NodeStatus.Registered, "Node not slashable");
        
        uint256 penaltyAmount = (node.stakeAmount * SLASH_PENALTY_RATE) / 100;
        node.stakeAmount -= penaltyAmount;
        node.status = NodeStatus.Slashed;
        
        // 从共识节点列表中移除
        removeNodeFromConsensusList(nodeAddress);
        
        emit NodeSlashed(node.nodeId, penaltyAmount, reason, block.timestamp);
    }
    
    /**
     * @dev 申请提取质押金
     * @param amount 提取金额
     */
    function requestWithdrawal(uint256 amount) external onlyActiveContract {
        Node storage node = nodes[msg.sender];
        require(node.status != NodeStatus.Unregistered, "Node not registered");
        require(node.status != NodeStatus.Slashed, "Slashed nodes cannot withdraw");
        require(block.timestamp >= node.stakeStart + STAKE_LOCK_PERIOD, "Lock period not ended");
        require(node.stakeAmount >= amount, "Insufficient stake amount");
        
        node.stakeAmount -= amount;
        pendingWithdrawals[msg.sender] += amount;
    }
    
    /**
     * @dev 提取质押金
     */
    function withdraw() external {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No pending withdrawal");
        
        pendingWithdrawals[msg.sender] = 0;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdrawal failed");
        
        emit NodeWithdrawn(msg.sender, amount, block.timestamp);
    }
    
    /**
     * @dev 治理功能：暂停合约
     */
    function pauseContract() external onlyGovernance {
        contractState = ContractState.Paused;
        emit ContractStateChanged(ContractState.Paused, block.timestamp);
    }
    
    /**
     * @dev 治理功能：恢复合约
     */
    function resumeContract() external onlyGovernance {
        contractState = ContractState.Active;
        emit ContractStateChanged(ContractState.Active, block.timestamp);
    }
    
    /**
     * @dev 治理功能：紧急停止
     */
    function emergencyStop() external onlyGovernance {
        contractState = ContractState.EmergencyStopped;
        emit ContractStateChanged(ContractState.EmergencyStopped, block.timestamp);
    }
    
    /**
     * @dev 添加授权验证器
     * @param validator 验证器地址
     */
    function addValidator(address validator) external onlyOwner {
        authorizedValidators[validator] = true;
    }
    
    /**
     * @dev 移除授权验证器
     * @param validator 验证器地址
     */
    function removeValidator(address validator) external onlyOwner {
        authorizedValidators[validator] = false;
    }
    
    /**
     * @dev 获取节点信息
     * @param nodeAddress 节点地址
     */
    function getNodeInfo(address nodeAddress) external view returns (Node memory) {
        return nodes[nodeAddress];
    }
    
    /**
     * @dev 获取共识节点列表
     */
    function getConsensusNodes() external view returns (address[] memory) {
        return consensusNodes;
    }
    
    /**
     * @dev 获取分区节点列表
     */
    function getPartitionNodes() external view returns (address[] memory) {
        return partitionNodes;
    }
    
    /**
     * @dev 获取边缘节点列表
     */
    function getEdgeNodes() external view returns (address[] memory) {
        return edgeNodes;
    }
    
    /**
     * @dev 获取合约统计信息
     */
    function getContractStats() external view returns (
        uint256 totalStaked,
        uint256 activeNodes,
        uint256 totalConsensusNodes,
        uint256 totalPartitionNodes,
        uint256 totalEdgeNodes
    ) {
        totalConsensusNodes = consensusNodes.length;
        totalPartitionNodes = partitionNodes.length;
        totalEdgeNodes = edgeNodes.length;
        
        // 使用局部变量来避免栈太深的问题
        uint256 tempTotalStaked = 0;
        uint256 tempActiveNodes = 0;
        
        for (uint i = 0; i < consensusNodes.length; i++) {
            if (nodes[consensusNodes[i]].status == NodeStatus.Active) {
                tempTotalStaked += nodes[consensusNodes[i]].stakeAmount;
                tempActiveNodes++;
            }
        }
        
        for (uint i = 0; i < partitionNodes.length; i++) {
            if (nodes[partitionNodes[i]].status == NodeStatus.Active) {
                tempTotalStaked += nodes[partitionNodes[i]].stakeAmount;
                tempActiveNodes++;
            }
        }
        
        for (uint i = 0; i < edgeNodes.length; i++) {
            if (nodes[edgeNodes[i]].status == NodeStatus.Active) {
                tempTotalStaked += nodes[edgeNodes[i]].stakeAmount;
                tempActiveNodes++;
            }
        }
        
        totalStaked = tempTotalStaked;
        activeNodes = tempActiveNodes;
    }
    
    /**
     * @dev 接收ETH
     */
    receive() external payable {}
    
    /**
     * @dev 回退函数
     */
    fallback() external payable {}
}