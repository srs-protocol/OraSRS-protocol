// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "./libs/StringsLib.sol";
import "./libs/GmSupport.sol";

/**
 * @title OraSRS 威胁证据存证安全合约
 * @dev 安全增强版本的威胁证据存证合约
 * @author OraSRS Protocol
 * @notice 该合约提供额外的安全检查和验证
 */
contract ThreatEvidenceSecure {
    // 威胁级别枚举
    enum ThreatLevel { Info, Warning, Critical, Emergency }
    
    // 威胁类型枚举
    enum ThreatType { DDoS, Malware, Phishing, BruteForce, SuspiciousConnection, AnomalousBehavior, IoCMatch }
    
    // 威胁证据结构
    struct ThreatAttestation {
        string id;                    // 威胁报告ID
        uint256 timestamp;            // 报告时间戳
        string sourceIP;              // 威胁源IP
        string targetIP;              // 威胁目标IP
        ThreatType threatType;        // 威胁类型
        ThreatLevel threatLevel;      // 威胁级别
        string context;               // 附加上下文
        string evidenceHash;          // 证据哈希
        string geolocation;           // 地理位置
        address agentAddress;         // 报告代理地址
        string sm2Signature;          // SM2数字签名
        bool verified;                // 是否已验证
        uint256 verificationCount;    // 验证次数
        bytes32 pqSignature;          // 抗量子签名
    }
    
    // 合约状态
    enum ContractState { Active, Paused, EmergencyStopped }
    ContractState public contractState;
    
    // 映射存储
    mapping(string => ThreatAttestation) public threatReports;  // 威胁报告ID到威胁报告
    mapping(address => bool) public authorizedAgents;          // 授权代理地址
    mapping(address => bool) public authorizedValidators;      // 授权验证器地址
    mapping(bytes32 => bool) public usedNonces;                // 已使用随机数（防重放攻击）
    mapping(address => bool) public registeredNodes;            // 注册节点
    
    // 威胁统计
    mapping(ThreatType => uint256) public threatTypeCount;     // 按威胁类型统计
    mapping(string => string[]) public sourceIPToThreats;      // 源IP到威胁报告ID列表
    mapping(uint256 => string[]) public dateToThreats;         // 日期到威胁报告ID列表
    
    // 重要参数
    address public owner;
    address public governanceCommittee;
    uint256 public constant MIN_VERIFICATION_COUNT = 3;        // 最小验证数
    uint256 public constant MIN_STAKE_AMOUNT = 100 ether;      // 最小质押量（安全增强）
    
    // 事件
    event ThreatReportSubmitted(string indexed threatId, string sourceIP, address indexed reporter, uint256 timestamp);
    event ThreatReportVerified(string indexed threatId, address indexed verifier, uint256 verificationCount);
    event ThreatReportRevoked(string indexed threatId, address indexed revoker, string reason);
    event ContractStateChanged(ContractState newState, uint256 timestamp);
    event NodeRegistered(address indexed nodeAddress, string nodeId, uint256 stakeAmount);
    event NodeUnregistered(address indexed nodeAddress);
    
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
    
    modifier onlyAuthorizedAgent() {
        require(registeredNodes[msg.sender], "Only registered nodes can submit threat reports");
        _;
    }
    
    modifier onlyAuthorizedValidator() {
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
        
        // 授权初始验证器（治理委员会本身）
        authorizedValidators[_governanceCommittee] = true;
    }
    
    /**
     * @dev 节点注册功能（安全增强）
     */
    function registerNode(
        string memory nodeId,
        string memory businessLicenseHash,
        string memory filingNumberHash,
        bytes memory sm2PublicKey,
        bytes32 pqPublicKey
    ) external payable {
        require(msg.value >= MIN_STAKE_AMOUNT, "Insufficient stake amount");
        require(bytes(nodeId).length > 0, "Node ID is required");
        require(!registeredNodes[msg.sender], "Node already registered");
        
        // 验证营业执照和备案号
        require(GmSupport.validateBusinessLicense(businessLicenseHash), "Invalid business license");
        require(GmSupport.validateFilingNumber(filingNumberHash), "Invalid filing number");
        
        // 验证SM2公钥格式
        require(sm2PublicKey.length == 64 || sm2PublicKey.length == 128, "Invalid SM2 public key format");
        
        // 验证抗量子公钥
        require(pqPublicKey != bytes32(0), "Invalid post-quantum public key");
        
        // 注册节点
        registeredNodes[msg.sender] = true;
        
        emit NodeRegistered(msg.sender, nodeId, msg.value);
    }
    
    /**
     * @dev 节点注销功能
     */
    function unregisterNode() external {
        require(registeredNodes[msg.sender], "Node not registered");
        
        // 退还质押，但需要经过一定的冷却期或验证
        registeredNodes[msg.sender] = false;
        
        // 退还质押金（这里简化处理，实际实现需要更复杂的逻辑）
        (bool sent, ) = payable(msg.sender).call{value: MIN_STAKE_AMOUNT}("");
        require(sent, "Failed to send Ether");
        
        emit NodeUnregistered(msg.sender);
    }
    
    /**
     * @dev 提交威胁报告（安全增强版）
     * @param reportData 威胁报告数据结构
     * @param sm2Signature SM2数字签名
     * @param pqSignature 抗量子签名
     * @param _nonce 防重放随机数
     */
    function submitThreatReportSecure(
        ThreatReportData memory reportData,
        bytes memory sm2Signature,
        bytes32 pqSignature,
        uint256 _nonce
    ) external payable onlyActiveContract onlyAuthorizedAgent {
        // 防重放攻击
        bytes32 requestHash = keccak256(abi.encodePacked(
            msg.sender, reportData.sourceIP, reportData.targetIP, block.timestamp, _nonce
        ));
        require(!usedNonces[requestHash], "Nonce already used");
        usedNonces[requestHash] = true;
        
        // 验证参数
        require(reportData.threatType < 7, "Invalid threat type");
        require(reportData.threatLevel < 4, "Invalid threat level");
        require(bytes(reportData.sourceIP).length > 0, "Source IP is required");
        require(bytes(reportData.evidenceHash).length > 0, "Evidence hash is required");
        require(sm2Signature.length > 0, "SM2 signature is required");
        require(pqSignature != bytes32(0), "Post-quantum signature is required");
        
        // 生成威胁报告ID
        string memory threatId = string(abi.encodePacked(
            "threat_secure_", 
            reportData.sourceIP, 
            "_", 
            StringsLib.toString(block.timestamp)
        ));
        
        // 验证威胁报告ID唯一性
        require(bytes(threatReports[threatId].id).length == 0, "Threat report ID already exists");
        
        // 验证SM2签名
        bytes32 reportHash = keccak256(abi.encodePacked(
            threatId, 
            reportData.sourceIP, 
            reportData.targetIP, 
            uint8(reportData.threatType), 
            uint8(reportData.threatLevel),
            reportData.context,
            reportData.evidenceHash
        ));
        
        // 注意：这里使用GmSupport.verifySm2进行SM2验证
        // 由于GmSupport.verifySm2是模拟实现，实际部署时需要替换为真正的SM2验证
        bool sm2Valid = GmSupport.verifySm2(reportHash, sm2Signature, hex"");
        require(sm2Valid, "Invalid SM2 signature");
        
        // 验证抗量子签名（使用模拟方法）
        // 在实际部署中，这里应该使用PostQuantumCrypto.verify进行验证
        bool pqValid = validatePqSignature(reportHash, pqSignature);
        require(pqValid, "Invalid post-quantum signature");
        
        // 创建威胁报告
        ThreatAttestation memory newReport = ThreatAttestation({
            id: threatId,
            timestamp: block.timestamp,
            sourceIP: reportData.sourceIP,
            targetIP: reportData.targetIP,
            threatType: ThreatType(reportData.threatType),
            threatLevel: ThreatLevel(reportData.threatLevel),
            context: reportData.context,
            evidenceHash: reportData.evidenceHash,
            geolocation: reportData.geolocation,
            agentAddress: msg.sender,
            sm2Signature: string(sm2Signature),
            verified: false,
            verificationCount: 0,
            pqSignature: pqSignature
        });
        
        threatReports[threatId] = newReport;
        
        // 更新统计信息
        threatTypeCount[ThreatType(reportData.threatType)]++;
        sourceIPToThreats[reportData.sourceIP].push(threatId);
        
        // 按日期分组（精确到天）
        uint256 date = block.timestamp / 1 days;
        dateToThreats[date].push(threatId);
        
        emit ThreatReportSubmitted(threatId, reportData.sourceIP, msg.sender, block.timestamp);
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
     * @dev 验证威胁报告
     * @param _threatId 威胁报告ID
     */
    function verifyThreatReport(string memory _threatId) external onlyAuthorizedValidator {
        ThreatAttestation storage report = threatReports[_threatId];
        require(bytes(report.id).length > 0, "Threat report does not exist");
        
        // 增加验证计数
        report.verificationCount++;
        
        // 如果验证次数达到阈值，标记为已验证
        if (report.verificationCount >= MIN_VERIFICATION_COUNT) {
            report.verified = true;
        }
        
        emit ThreatReportVerified(_threatId, msg.sender, report.verificationCount);
    }
    
    /**
     * @dev 获取威胁报告
     * @param _threatId 威胁报告ID
     */
    function getThreatReport(string memory _threatId) external view returns (ThreatAttestation memory) {
        return threatReports[_threatId];
    }
    
    /**
     * @dev 撤销威胁报告（治理功能）
     * @param _threatId 威胁报告ID
     * @param _reason 撤销原因
     */
    function revokeThreatReport(string memory _threatId, string memory _reason) external onlyGovernance {
        ThreatAttestation storage report = threatReports[_threatId];
        require(bytes(report.id).length > 0, "Threat report does not exist");
        
        // 从相关映射中移除
        delete threatReports[_threatId];
        
        // 更新威胁类型统计
        threatTypeCount[report.threatType]--;
        
        // 从源IP到威胁的映射中移除
        string[] storage ipThreats = sourceIPToThreats[report.sourceIP];
        for (uint i = 0; i < ipThreats.length; i++) {
            if (keccak256(bytes(ipThreats[i])) == keccak256(bytes(_threatId))) {
                ipThreats[i] = ipThreats[ipThreats.length - 1];
                ipThreats.pop();
                break;
            }
        }
        
        emit ThreatReportRevoked(_threatId, msg.sender, _reason);
    }
    
    /**
     * @dev 获取源IP相关的威胁报告
     * @param _sourceIP 源IP地址
     */
    function getThreatsBySourceIP(string memory _sourceIP) external view returns (string[] memory) {
        return sourceIPToThreats[_sourceIP];
    }
    
    /**
     * @dev 获取指定日期的威胁报告
     * @param _date 日期戳（精确到天）
     */
    function getThreatsByDate(uint256 _date) external view returns (string[] memory) {
        return dateToThreats[_date];
    }
    
    /**
     * @dev 获取合约统计信息
     */
    function getContractStats() external view returns (
        uint256 totalThreats,
        uint256 verifiedThreats,
        uint256[] memory threatTypeCounts
    ) {
        // 计算总威胁数和已验证威胁数
        totalThreats = 0;
        verifiedThreats = 0;
        
        // 遍历所有威胁类型统计
        threatTypeCounts = new uint256[](7);
        for (uint8 i = 0; i < 7; i++) {
            threatTypeCounts[i] = threatTypeCount[ThreatType(i)];
            totalThreats += threatTypeCounts[i];
        }
    }
    
    /**
     * @dev 获取指定威胁类型的威胁报告数量
     * @param _threatType 威胁类型
     */
    function getThreatCountByType(ThreatType _threatType) external view returns (uint256) {
        return threatTypeCount[_threatType];
    }
    
    /**
     * @dev 检查威胁报告是否存在
     * @param _threatId 威胁报告ID
     */
    function threatReportExists(string memory _threatId) external view returns (bool) {
        return bytes(threatReports[_threatId].id).length > 0;
    }
    
    /**
     * @dev 添加授权代理
     * @param _agentAddress 代理地址
     */
    function addAuthorizedAgent(address _agentAddress) external onlyGovernance {
        authorizedAgents[_agentAddress] = true;
    }
    
    /**
     * @dev 添加授权验证器
     * @param _validatorAddress 验证器地址
     */
    function addAuthorizedValidator(address _validatorAddress) external onlyGovernance {
        authorizedValidators[_validatorAddress] = true;
    }
    
    /**
     * @dev 暂停合约
     */
    function pauseContract() external onlyGovernance {
        contractState = ContractState.Paused;
        emit ContractStateChanged(ContractState.Paused, block.timestamp);
    }
    
    /**
     * @dev 恢复合约
     */
    function resumeContract() external onlyGovernance {
        contractState = ContractState.Active;
        emit ContractStateChanged(ContractState.Active, block.timestamp);
    }
    
    /**
     * @dev 威胁报告数据结构（用于函数参数）
     */
    struct ThreatReportData {
        uint8 threatType;
        string sourceIP;
        string targetIP;
        uint8 threatLevel;
        string context;
        string evidenceHash;
        string geolocation;
    }
}

