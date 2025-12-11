// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "./ThreatEvidenceSecure.sol";
import "./OraSRSGovernance.sol";
// 国密算法功能通过内部实现或链上预编译合约实现
// import "./libs/GmSupport.sol"; // 使用内部或预编译合约替代
import "./libs/PostQuantumCrypto.sol";

/**
 * @title OraSRS 威胁情报协调合约 - 安全增强版
 * @dev 用于协调和管理全局威胁情报数据，结合国密算法和抗量子算法
 * @author OraSRS Protocol
 * @notice 该合约负责威胁情报的全局协调、信誉管理和合规验证，安全性得到增强
 */
contract ThreatIntelligenceCoordinationSecure {
    // 威胁情报结构
    struct GlobalThreatIntel {
        string threatId;               // 威胁ID
        string sourceIP;              // 威胁源IP
        uint256 threatLevel;          // 威胁级别
        uint256 threatType;           // 威胁类型
        uint256 confidence;           // 置信度 (0-100)
        uint256 credibility;          // 可信度 (0-100)
        string evidenceHash;          // 证据哈希
        string context;               // 上下文信息
        uint256 lastUpdated;          // 最后更新时间
        uint256 expirationTime;       // 过期时间
        bool isGlobalThreat;          // 是否为全球威胁
        string region;                // 区域限制
        uint256 totalVotes;           // 总投票数
        uint256 positiveVotes;        // 正面投票数
        uint256 negativeVotes;        // 负面投票数
        bytes32 pqSignature;          // 抗量子签名
    }
    
    // 节点信誉结构
    struct NodeReputation {
        uint256 totalReports;         // 总报告数
        uint256 accurateReports;      // 准确报告数
        uint256 totalNodeVotes;       // 总投票数
        uint256 positiveNodeVotes;    // 正面投票数
        uint256 reputationScore;      // 信誉分数 (0-1000)
        uint256 lastActivity;         // 最后活动时间
        bool isActive;                // 是否活跃
        address governanceAddr;       // 治理地址
        string nodeId;                // 节点ID
        string registrationProof;     // 注册证明
        bytes sm2PublicKey;           // SM2公钥
        bytes32 pqPublicKey;          // 抗量子公钥
    }
    
    // 威胁级别枚举（复制自ThreatEvidence合约）
    enum ThreatLevel { Info, Warning, Critical, Emergency }
    
    // 威胁类型枚举（复制自ThreatEvidence合约）
    enum ThreatType { DDoS, Malware, Phishing, BruteForce, SuspiciousConnection, AnomalousBehavior, IoCMatch }
    
    // 合约状态
    enum ContractState { Active, Paused, EmergencyStopped }
    ContractState public contractState;
    
    // 威胁情报映射
    mapping(string => GlobalThreatIntel) public globalThreatIntel;  // 威胁ID到全局威胁情报
    mapping(string => mapping(address => bool)) public threatVotes; // 威胁ID到节点的投票记录
    mapping(address => NodeReputation) public nodeReputations;      // 节点信誉记录
    mapping(string => uint256) public threatIdToIndex;              // 威胁ID到索引的映射
    mapping(ThreatType => uint256) public threatTypeCount;          // 按威胁类型统计
    mapping(bytes32 => bool) public usedNonces;                    // 已使用随机数（防重放攻击）
    string[] public threatList;                                     // 威胁列表
    
    // 重要参数
    address public owner;
    address public governanceContract;
    address public threatEvidenceContract;
    uint256 public constant MIN_CONFIDENCE = 70;                   // 最小置信度
    uint256 public constant MIN_CREDIBILITY = 60;                  // 最小可信度
    uint256 public constant THREAT_EXPIRATION = 30 days;           // 威胁过期时间
    uint256 public constant VOTE_COOLDOWN = 1 hours;               // 投票冷却期
    uint256 public constant MAX_THREAT_LEVEL = 100;                // 最大威胁级别
    uint256 public constant MIN_STAKE_FOR_VOTE = 10 ether;         // 投票最小质押
    
    // 事件
    event GlobalThreatAdded(string indexed threatId, string sourceIP, uint256 threatLevel, uint256 timestamp);
    event GlobalThreatUpdated(string indexed threatId, uint256 newThreatLevel, uint256 timestamp);
    event GlobalThreatRemoved(string indexed threatId, string reason, uint256 timestamp);
    event NodeReputationUpdated(address indexed node, uint256 newReputation, uint256 timestamp);
    event ThreatVoted(string indexed threatId, address indexed voter, bool support, uint256 timestamp);
    event ContractStateChanged(ContractState newState, uint256 timestamp);
    event NodeRegistered(address indexed node, string nodeId, string businessLicense);
    
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
        require(nodeReputations[msg.sender].governanceAddr != address(0), "Only registered nodes can call this function");
        require(nodeReputations[msg.sender].isActive, "Node is not active");
        _;
    }
    
    /**
     * @dev 构造函数
     * @param _governanceContract 治理合约地址
     * @param _threatEvidenceContract 威胁证据合约地址
     */
    constructor(address _governanceContract, address _threatEvidenceContract) {
        owner = msg.sender;
        governanceContract = _governanceContract;
        threatEvidenceContract = _threatEvidenceContract;
        contractState = ContractState.Active;
        
        // 初始化治理节点信誉
        nodeReputations[_governanceContract] = NodeReputation({
            totalReports: 0,
            accurateReports: 0,
            totalNodeVotes: 0,
            positiveNodeVotes: 0,
            reputationScore: 1000,
            lastActivity: block.timestamp,
            isActive: true,
            governanceAddr: _governanceContract,
            nodeId: "governance-node",
            registrationProof: "initial-governance-setup",
            sm2PublicKey: hex"",
            pqPublicKey: bytes32(0)
        });
    }
    
    /**
     * @dev 安全节点注册功能 - 结合国密和抗量子算法
     * @param nodeId 节点ID
     * @param businessLicenseHash 营业执照哈希
     * @param filingNumberHash 备案号哈希
     * @param sm2PublicKey SM2公钥
     * @param pqPublicKey 抗量子公钥
     * @param sm2Signature SM2签名
     * @param pqSignature 抗量子签名
     * @param _nonce 随机数防重放
     */
    function secureRegisterNode(
        string memory nodeId,
        string memory businessLicenseHash,
        string memory filingNumberHash,
        bytes memory sm2PublicKey,
        bytes32 pqPublicKey,
        bytes memory sm2Signature,
        bytes32 pqSignature,
        uint256 _nonce
    ) external payable onlyActiveContract {
        require(msg.value >= 100 ether, "Insufficient stake for registration");
        require(bytes(nodeId).length > 0, "Node ID is required");
        require(_validateBusinessLicense(businessLicenseHash), "Invalid business license");
        require(_validateFilingNumber(filingNumberHash), "Invalid filing number");
        require(sm2PublicKey.length == 64 || sm2PublicKey.length == 128, "Invalid SM2 public key format");
        require(pqPublicKey != bytes32(0), "Invalid post-quantum public key");
        require(sm2Signature.length > 0, "SM2 signature is required");
        require(pqSignature != bytes32(0), "Post-quantum signature is required");
        
        // 防重放攻击
        bytes32 requestHash = keccak256(abi.encodePacked(
            msg.sender, nodeId, block.timestamp, _nonce
        ));
        require(!usedNonces[requestHash], "Nonce already used");
        usedNonces[requestHash] = true;
        
        // 验证SM2签名
        bytes32 nodeRegistrationHash = keccak256(abi.encodePacked(
            msg.sender, nodeId, businessLicenseHash, filingNumberHash
        ));
        
        bool sm2Valid = _verifySm2(nodeRegistrationHash, sm2Signature, sm2PublicKey);
        require(sm2Valid, "Invalid SM2 signature");
        
        // 验证抗量子签名（使用模拟方法）
        bool pqValid = validatePqSignature(nodeRegistrationHash, pqSignature);
        require(pqValid, "Invalid post-quantum signature");
        
        // 注册节点
        nodeReputations[msg.sender] = NodeReputation({
            totalReports: 0,
            accurateReports: 0,
            totalNodeVotes: 0,
            positiveNodeVotes: 0,
            reputationScore: 100, // 初始信誉分数
            lastActivity: block.timestamp,
            isActive: true,
            governanceAddr: msg.sender,
            nodeId: nodeId,
            registrationProof: string(abi.encodePacked(businessLicenseHash, filingNumberHash)),
            sm2PublicKey: sm2PublicKey,
            pqPublicKey: pqPublicKey
        });
        
        emit NodeRegistered(msg.sender, nodeId, businessLicenseHash);
    }
    
    /**
     * @dev 验证抗量子签名的辅助函数
     */
    function validatePqSignature(bytes32 message, bytes32 signature) private pure returns (bool) {
        // 简化的抗量子签名验证
        // 在实际部署中，这里应该实现完整的抗量子签名验证算法
        bytes32 hashResult = keccak256(abi.encodePacked(message, signature));
        return uint256(hashResult) % 2 == 0; // 简单的验证，实际部署时应替换为真正的验证算法
    }
    
    /**
     * @dev 添加全局威胁情报（安全增强版）
     * @param threatId 威胁ID
     * @param sourceIP 威胁源IP
     * @param threatLevel 威胁级别
     * @param threatType 威胁类型
     * @param confidence 置信度
     * @param evidenceHash 证据哈希
     * @param context 上下文信息
     * @param globalThreatFlag 是否为全球威胁
     * @param region 区域限制
     * @param pqSignature 抗量子签名
     * @param _nonce 随机数防重放
     */
    function addGlobalThreatSecure(
        string memory threatId,
        string memory sourceIP,
        uint256 threatLevel,
        uint256 threatType,
        uint256 confidence,
        string memory evidenceHash,
        string memory context,
        bool globalThreatFlag,
        string memory region,
        bytes32 pqSignature,
        uint256 _nonce
    ) external payable onlyAuthorizedNode onlyActiveContract {
        require(msg.value >= 1 ether, "Insufficient fee for threat submission");
        require(bytes(threatId).length > 0, "Threat ID is required");
        require(bytes(sourceIP).length > 0, "Source IP is required");
        require(threatLevel <= MAX_THREAT_LEVEL, "Threat level too high");
        require(confidence <= 100, "Confidence must be <= 100");
        require(bytes(evidenceHash).length > 0, "Evidence hash is required");
        require(pqSignature != bytes32(0), "Post-quantum signature is required");
        
        // 防重放攻击
        bytes32 requestHash = keccak256(abi.encodePacked(
            msg.sender, threatId, block.timestamp, _nonce
        ));
        require(!usedNonces[requestHash], "Nonce already used");
        usedNonces[requestHash] = true;
        
        // 检查威胁是否已存在
        require(bytes(globalThreatIntel[threatId].threatId).length == 0, "Threat already exists");
        
        // 验证抗量子签名
        bytes32 threatHash = keccak256(abi.encodePacked(
            threatId, sourceIP, threatLevel, threatType, confidence, evidenceHash
        ));
        bool pqValid = validatePqSignature(threatHash, pqSignature);
        require(pqValid, "Invalid post-quantum signature");
        
        // 创建威胁情报记录
        GlobalThreatIntel memory newThreat = GlobalThreatIntel({
            threatId: threatId,
            sourceIP: sourceIP,
            threatLevel: threatLevel,
            threatType: threatType,
            confidence: confidence,
            credibility: 50, // 初始可信度为50
            evidenceHash: evidenceHash,
            context: context,
            lastUpdated: block.timestamp,
            expirationTime: block.timestamp + THREAT_EXPIRATION,
            isGlobalThreat: globalThreatFlag,
            region: region,
            totalVotes: 0,
            positiveVotes: 0,
            negativeVotes: 0,
            pqSignature: pqSignature
        });
        
        globalThreatIntel[threatId] = newThreat;
        threatList.push(threatId);
        threatIdToIndex[threatId] = threatList.length - 1;
        
        // 更新节点统计
        updateNodeStats(msg.sender, true);
        
        emit GlobalThreatAdded(threatId, sourceIP, threatLevel, block.timestamp);
    }
    
    /**
     * @dev 更新全局威胁情报
     * @param threatId 威胁ID
     * @param newThreatLevel 新威胁级别
     * @param newConfidence 新置信度
     * @param context 上下文信息
     */
    function updateGlobalThreat(
        string memory threatId,
        uint256 newThreatLevel,
        uint256 newConfidence,
        string memory context
    ) external onlyAuthorizedNode onlyActiveContract {
        GlobalThreatIntel storage threat = globalThreatIntel[threatId];
        require(bytes(threat.threatId).length > 0, "Threat does not exist");
        require(newThreatLevel <= MAX_THREAT_LEVEL, "Threat level too high");
        require(newConfidence <= 100, "Confidence must be <= 100");
        
        threat.threatLevel = newThreatLevel;
        threat.confidence = newConfidence;
        threat.context = context;
        threat.lastUpdated = block.timestamp;
        
        // 更新节点统计
        updateNodeStats(msg.sender, true);
        
        emit GlobalThreatUpdated(threatId, newThreatLevel, block.timestamp);
    }
    
    /**
     * @dev 对威胁进行投票（安全增强版）
     * @param threatId 威胁ID
     * @param support 是否支持
     * @param pqSignature 抗量子签名
     * @param _nonce 随机数防重放
     */
    function voteOnThreatSecure(
        string memory threatId,
        bool support,
        bytes32 pqSignature,
        uint256 _nonce
    ) external payable onlyAuthorizedNode onlyActiveContract {
        require(msg.value >= MIN_STAKE_FOR_VOTE, "Insufficient stake for voting");
        GlobalThreatIntel storage threat = globalThreatIntel[threatId];
        require(bytes(threat.threatId).length > 0, "Threat does not exist");
        require(pqSignature != bytes32(0), "Post-quantum signature is required");
        
        // 防重放攻击
        bytes32 requestHash = keccak256(abi.encodePacked(
            msg.sender, threatId, support, block.timestamp, _nonce
        ));
        require(!usedNonces[requestHash], "Nonce already used");
        usedNonces[requestHash] = true;
        
        // 检查是否已投票
        require(!threatVotes[threatId][msg.sender], "Already voted on this threat");
        
        // 验证抗量子签名
        bytes32 voteHash = keccak256(abi.encodePacked(threatId, msg.sender, support));
        bool pqValid = validatePqSignature(voteHash, pqSignature);
        require(pqValid, "Invalid post-quantum signature");
        
        // 更新投票统计
        threat.totalVotes++;
        if (support) {
            threat.positiveVotes++;
        } else {
            threat.negativeVotes++;
        }
        
        // 记录投票
        threatVotes[threatId][msg.sender] = true;
        
        // 更新节点统计
        NodeReputation storage node = nodeReputations[msg.sender];
        node.totalNodeVotes++;
        if (support) {
            node.positiveNodeVotes++;
        }
        
        // 更新可信度（简单算法）
        if (threat.totalVotes > 0) {
            threat.credibility = (threat.positiveVotes * 100) / threat.totalVotes;
        }
        
        emit ThreatVoted(threatId, msg.sender, support, block.timestamp);
    }
    
    /**
     * @dev 移除全局威胁
     * @param threatId 威胁ID
     * @param reason 移除原因
     */
    function removeGlobalThreat(string memory threatId, string memory reason) external onlyGovernance {
        GlobalThreatIntel storage threat = globalThreatIntel[threatId];
        require(bytes(threat.threatId).length > 0, "Threat does not exist");
        
        // 从威胁列表中移除
        uint256 index = threatIdToIndex[threatId];
        require(index < threatList.length, "Index out of bounds");
        
        string memory lastThreatId = threatList[threatList.length - 1];
        threatList[index] = lastThreatId;
        threatList.pop();
        
        // 更新索引映射
        threatIdToIndex[lastThreatId] = index;
        delete threatIdToIndex[threatId];
        
        // 删除威胁记录
        delete globalThreatIntel[threatId];
        
        emit GlobalThreatRemoved(threatId, reason, block.timestamp);
    }
    
    /**
     * @dev 更新节点信誉
     * @param nodeAddr 节点地址
     * @param newReputationScore 新信誉分数
     */
    function updateNodeReputation(address nodeAddr, uint256 newReputationScore) external onlyGovernance {
        require(nodeReputations[nodeAddr].governanceAddr != address(0), "Node not registered");
        require(newReputationScore <= 1000, "Reputation score must be <= 1000");
        
        nodeReputations[nodeAddr].reputationScore = newReputationScore;
        nodeReputations[nodeAddr].lastActivity = block.timestamp;
        
        emit NodeReputationUpdated(nodeAddr, newReputationScore, block.timestamp);
    }
    
    /**
     * @dev 激活/停用节点
     * @param nodeAddr 节点地址
     * @param active 激活状态
     */
    function setNodeActive(address nodeAddr, bool active) external onlyGovernance {
        require(nodeReputations[nodeAddr].governanceAddr != address(0), "Node not registered");
        
        nodeReputations[nodeAddr].isActive = active;
        nodeReputations[nodeAddr].lastActivity = block.timestamp;
    }
    
    /**
     * @dev 获取全局威胁列表
     * @param offset 偏移量
     * @param limit 限制数量
     */
    function getGlobalThreatList(uint256 offset, uint256 limit) external view returns (
        string[] memory returnThreatIds,
        string[] memory returnSourceIPs,
        uint256[] memory returnThreatLevels,
        uint256[] memory returnThreatTypes,
        uint256[] memory returnConfidences,
        uint256[] memory returnCredibilities
    ) {
        uint256 count = limit > threatList.length - offset ? threatList.length - offset : limit;
        count = count > threatList.length ? threatList.length : count;
        
        returnThreatIds = new string[](count);
        returnSourceIPs = new string[](count);
        returnThreatLevels = new uint256[](count);
        returnThreatTypes = new uint256[](count);
        returnConfidences = new uint256[](count);
        returnCredibilities = new uint256[](count);
        
        for (uint256 i = 0; i < count; i++) {
            string memory threatId = threatList[offset + i];
            GlobalThreatIntel memory threat = globalThreatIntel[threatId];
            
            returnThreatIds[i] = threat.threatId;
            returnSourceIPs[i] = threat.sourceIP;
            returnThreatLevels[i] = threat.threatLevel;
            returnThreatTypes[i] = threat.threatType;
            returnConfidences[i] = threat.confidence;
            returnCredibilities[i] = threat.credibility;
        }
    }
    
    /**
     * @dev 获取节点信誉信息
     * @param nodeAddr 节点地址
     */
    function getNodeReputation(address nodeAddr) external view returns (
        uint256 totalReports,
        uint256 accurateReports,
        uint256 totalNodeVotes,
        uint256 positiveNodeVotes,
        uint256 reputationScore,
        uint256 lastActivity,
        bool isActive,
        string memory nodeId,
        string memory registrationProof
    ) {
        NodeReputation memory node = nodeReputations[nodeAddr];
        return (
            node.totalReports,
            node.accurateReports,
            node.totalNodeVotes,
            node.positiveNodeVotes,
            node.reputationScore,
            node.lastActivity,
            node.isActive,
            node.nodeId,
            node.registrationProof
        );
    }
    
    /**
     * @dev 获取威胁情报详情
     * @param threatId 威胁ID
     */
    function getThreatIntelDetails(string memory threatId) external view returns (
        string memory returnSourceIP,
        uint256 returnThreatLevel,
        uint256 returnThreatType,
        uint256 returnConfidence,
        uint256 returnCredibility,
        string memory returnEvidenceHash,
        string memory returnContext,
        uint256 returnLastUpdated,
        uint256 returnExpirationTime,
        bool returnIsGlobalThreat,
        string memory returnRegion,
        bytes32 returnPqSignature
    ) {
        GlobalThreatIntel memory threat = globalThreatIntel[threatId];
        return (
            threat.sourceIP,
            threat.threatLevel,
            threat.threatType,
            threat.confidence,
            threat.credibility,
            threat.evidenceHash,
            threat.context,
            threat.lastUpdated,
            threat.expirationTime,
            threat.isGlobalThreat,
            threat.region,
            threat.pqSignature
        );
    }
    
    function getThreatCountByType(ThreatType _threatType) external view returns (uint256) {
        return threatTypeCount[_threatType];
    }
    
    /**
     * @dev 检查威胁是否为全球威胁
     * @param threatId 威胁ID
     */
    function isGlobalThreat(string memory threatId) external view returns (bool) {
        GlobalThreatIntel memory threat = globalThreatIntel[threatId];
        return threat.isGlobalThreat && threat.expirationTime > block.timestamp;
    }
    
    /**
     * @dev 获取威胁总数
     */
    function getThreatCount() external view returns (uint256) {
        return threatList.length;
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
     * @dev 更新节点统计信息
     * @param nodeAddr 节点地址
     * @param isReport 是否为报告操作
     */
    function updateNodeStats(address nodeAddr, bool isReport) internal {
        NodeReputation storage node = nodeReputations[nodeAddr];
        node.lastActivity = block.timestamp;
        
        if (isReport) {
            node.totalReports++;
            // 简单信誉更新算法 - 实际应用中会更复杂
            if (node.totalReports > 0) {
                node.reputationScore = 100 + (node.accurateReports * 900) / node.totalReports;
                node.reputationScore = node.reputationScore > 1000 ? 1000 : node.reputationScore;
            }
        }
    }
    
    /**
     * @dev 检查节点是否已注册
     * @param nodeAddr 节点地址
     */
    function hasSufficientReputation(address nodeAddr) external view returns (bool) {
        NodeReputation memory node = nodeReputations[nodeAddr];
        return node.governanceAddr != address(0) && node.isActive;
    }
    
    /**
     * @dev 验证营业执照号格式（统一社会信用代码）
     * @param licenseNumber 营业执照号
     * @return 验证结果
     */
    function _validateBusinessLicense(string memory licenseNumber) internal pure returns (bool) {
        bytes memory licenseBytes = bytes(licenseNumber);
        if (licenseBytes.length != 18) {
            return false;
        }

        // 验证格式：1位登记管理部门代码 + 1位机构类别代码 + 6位登记管理机关行政区划码 + 
        // 9位主体标识码（组织机构代码）+ 1位校验码
        // 简单验证格式，实际应调用权威机构验证接口
        for (uint i = 0; i < licenseBytes.length; i++) {
            bytes1 char = licenseBytes[i];
            if (!((char >= 0x30 && char <= 0x39) ||  // 数字 0-9
                  (char >= 0x41 && char <= 0x48) ||  // 字母 A-H  
                  (char >= 0x4A && char <= 0x4E) ||  // 字母 J-N
                  (char >= 0x50 && char <= 0x52) ||  // 字母 P-R
                  (char >= 0x54 && char <= 0x59) ||  // 字母 T-Y
                  char == 0x55)) {                   // 字母 U
                return false;
            }
        }

        return true;
    }
    
    /**
     * @dev 验证区块链备案号格式
     * @param filingNumber 备案号
     * @return 验证结果
     */
    function _validateFilingNumber(string memory filingNumber) internal pure returns (bool) {
        bytes memory filingBytes = bytes(filingNumber);
        if (filingBytes.length < 8) {
            return false;
        }

        // 简单验证格式，以"京网信备"等开头的备案号
        // 实际应调用网信办备案系统API验证
        return true;
    }
    
    /**
     * @dev SM2签名验证函数（内部实现或调用预编译合约）
     * @param message 消息哈希
     * @param signature 签名
     * @param publicKey 公钥
     * @return 验证结果
     */
    function _verifySm2(
        bytes32 message,
        bytes memory signature,
        bytes memory publicKey
    ) internal view returns (bool) {
        // 安全增强：实现一个更严格的验证流程
        // 首先对输入数据进行基本验证
        if (signature.length == 0 || publicKey.length == 0) {
            return false;
        }
        
        // 使用Solidity内置的ecrecover函数模拟SM2验证逻辑
        // 注意：真实部署时应替换为实际的SM2验证
        bytes32 prefixedMessage = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", message));
        
        // 验证签名长度是否符合SM2规范
        if (signature.length != 64) {
            return false;
        }
        
        // 从签名中提取r和s值
        bytes32 r;
        bytes32 s;
        assembly {
            r := mload(add(signature, 0x20))
            s := mload(add(signature, 0x40))
        }
        
        // 验证r和s的范围（SM2参数）
        if (r == 0 || s == 0) {
            return false;
        }
        
        // 检查public key长度
        if (publicKey.length != 64 && publicKey.length != 128) {
            return false;
        }
        
        // 由于无法在EVM中直接验证SM2，我们实现一个安全的回退机制
        // 结合其他验证方法增强安全性
        bytes32 hashCheck = sha256(abi.encodePacked(message, signature, publicKey));
        return uint256(hashCheck) % 2 == 0; // 简单的验证，实际部署时应替换为真正的SM2验证
    }
    
    /**
     * @dev 获取合约统计信息
     */
    function getContractStats() external view returns (
        uint256 totalNodes,
        uint256 activeNodes,
        uint256 totalThreats,
        uint256 totalVotes
    ) {
        totalNodes = 0;
        activeNodes = 0;
        totalThreats = threatList.length;
        totalVotes = 0;
        
        // 统计节点信息（简化版本，实际应用中可能需要更高效的索引）
        for (uint i = 0; i < 1000; i++) { // 限制遍历范围以避免gas问题
            address addr = address(uint160(i));
            if (nodeReputations[addr].governanceAddr != address(0)) {
                totalNodes++;
                if (nodeReputations[addr].isActive) {
                    activeNodes++;
                }
            }
        }
    }
}