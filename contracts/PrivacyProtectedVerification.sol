// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "./libs/StringsLib.sol";
import "./EnhancedThreatVerification.sol";
// 国密算法功能通过内部实现或链上预编译合约实现
// import "./libs/GmSupport.sol"; // 使用内部或预编译合约替代

/**
 * @title OraSRS 隐私保护与数据可用性合约
 * @dev 实现哈希锚定和零知识证明接口，保护数据隐私同时保证可用性
 * @author OraSRS Protocol
 * @notice 该合约提供链下数据隐私保护和链上验证机制
 */
contract PrivacyProtectedVerification {
    // 数据隐私保护结构
    struct PrivacyProtectedReport {
        string reportId;              // 报告ID
        bytes32 dataHash;            // 原始数据哈希
        bytes32 encryptedDataHash;   // 加密数据哈希
        string publicAttributes;     // 公开属性（用于验证）
        uint256 threatLevel;         // 威胁级别
        uint256 threatType;          // 威胁类型
        address submitter;           // 提交者地址
        uint256 submissionTime;      // 提交时间
        bool isVerified;             // 是否已验证
        string zkProof;              // 零知识证明（字符串形式，实际应用中可能需要更复杂的结构）
        bytes32 privacyCommitment;   // 隐私承诺
        string[] auxiliaryData;      // 辅助数据（如地理位置、时间窗口等）
    }

    // 隐私验证挑战
    struct PrivacyVerificationChallenge {
        string reportId;             // 报告ID
        address challenger;          // 挑战者地址
        string challengeReason;      // 挑战原因
        uint256 challengeTime;       // 挑战时间
        bool isResolved;             // 是否已解决
        bool challengeSuccess;       // 挑战是否成功
        string resolutionNotes;      // 解决备注
    }

    // 数据访问控制
    struct DataAccessPermission {
        address requester;           // 请求者地址
        string reportId;             // 报告ID
        uint256 expirationTime;      // 过期时间
        string purpose;              // 访问目的
        bool granted;                // 是否已授权
        bytes32 accessKey;           // 访问密钥
    }

    // 合约状态
    enum ContractState { Active, Paused, EmergencyStopped }
    ContractState public contractState;

    // 映射存储
    mapping(string => PrivacyProtectedReport) public privacyProtectedReports;  // 隐私保护报告
    mapping(string => PrivacyVerificationChallenge) public privacyChallenges;   // 隐私验证挑战
    mapping(string => DataAccessPermission[]) public dataAccessPermissions;     // 数据访问权限
    mapping(bytes32 => string) public hashToReportId;                         // 哈希到报告ID映射
    mapping(address => bool) public authorizedPrivacyNodes;                    // 授权隐私节点
    mapping(string => string) public reportMetadata;                          // 报告元数据
    string[] public reportIds;                                                // 报告ID数组

    // 重要参数
    address public owner;
    address public governanceContract;
    uint256 public constant ACCESS_EXPIRATION_PERIOD = 7 days;                // 访问权限过期时间
    uint256 public constant CHALLENGE_RESOLUION_PERIOD = 3 days;              // 挑战解决期限
    uint256 public constant MIN_ZKPROOF_COMPLEXITY = 100;                     // 最小零知识证明复杂度

    // 事件
    event PrivacyProtectedReportSubmitted(
        string indexed reportId, 
        bytes32 indexed dataHash, 
        address indexed submitter, 
        uint256 timestamp
    );
    event DataHashRevealed(string indexed reportId, bytes32 dataHash, address indexed revealer, uint256 timestamp);
    event PrivacyChallengeCreated(string indexed reportId, address indexed challenger, uint256 timestamp);
    event PrivacyChallengeResolved(string indexed reportId, bool success, uint256 timestamp);
    event DataAccessPermissionGranted(string indexed reportId, address indexed requester, uint256 expiration, string purpose);
    event ZkProofVerified(string indexed reportId, address indexed verifier, uint256 timestamp);

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

    modifier onlyAuthorizedPrivacyNode() {
        require(authorizedPrivacyNodes[msg.sender], "Only authorized privacy nodes can call this function");
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

        // 授权治理合约作为初始隐私节点
        authorizedPrivacyNodes[_governanceContract] = true;
    }

    /**
     * @dev 提交隐私保护的威胁报告（哈希锚定方案）
     * @param reportId 报告ID
     * @param dataHash 原始数据哈希
     * @param publicAttributes 公开属性
     * @param threatLevel 威胁级别
     * @param threatType 威胁类型
     * @param auxiliaryData 辅助数据
     */
    // 内部函数实现
    function _submitPrivacyProtectedReport(
        string memory reportId,
        bytes32 dataHash,
        string memory publicAttributes,
        uint256 threatLevel,
        uint256 threatType,
        string[] memory auxiliaryData
    ) internal {
        require(bytes(privacyProtectedReports[reportId].reportId).length == 0, "Report already exists");
        require(dataHash != bytes32(0), "Data hash cannot be zero");
        require(threatLevel <= 100, "Threat level must be <= 100");
        require(threatType <= 6, "Invalid threat type");

        // 创建隐私保护报告
        PrivacyProtectedReport memory newReport = PrivacyProtectedReport({
            reportId: reportId,
            dataHash: dataHash,
            encryptedDataHash: bytes32(0), // 加密哈希稍后可添加
            publicAttributes: publicAttributes,
            threatLevel: threatLevel,
            threatType: threatType,
            submitter: msg.sender,
            submissionTime: block.timestamp,
            isVerified: false,
            zkProof: "",
            privacyCommitment: bytes32(0),
            auxiliaryData: auxiliaryData
        });

        privacyProtectedReports[reportId] = newReport;
        reportIds.push(reportId);
        emit PrivacyProtectedReportSubmitted(reportId, dataHash, msg.sender, block.timestamp);
    }

    function submitPrivacyProtectedReport(
        string memory reportId,
        bytes32 dataHash,
        string memory publicAttributes,
        uint256 threatLevel,
        uint256 threatType,
        string[] memory auxiliaryData
    ) external onlyAuthorizedPrivacyNode onlyActiveContract {
        _submitPrivacyProtectedReport(reportId, dataHash, publicAttributes, threatLevel, threatType, auxiliaryData);
    }

    /**
     * @dev 提交带零知识证明的威胁报告
     * @param reportId 报告ID
     * @param dataHash 原始数据哈希
     * @param publicAttributes 公开属性
     * @param threatLevel 威胁级别
     * @param threatType 威胁类型
     * @param zkProof 零知识证明
     * @param auxiliaryData 辅助数据
     */
    function submitZkProofProtectedReport(
        string memory reportId,
        bytes32 dataHash,
        string memory publicAttributes,
        uint256 threatLevel,
        uint256 threatType,
        string memory zkProof,
        string[] memory auxiliaryData
    ) external onlyAuthorizedPrivacyNode onlyActiveContract {
        require(bytes32(0) != dataHash, "Data hash cannot be zero");
        require(bytes(privacyProtectedReports[reportId].reportId).length == 0, "Report already exists");
        require(bytes(zkProof).length >= MIN_ZKPROOF_COMPLEXITY, "ZK proof too simple");

        // 验证零知识证明（简化验证，实际应用中需要复杂的ZKP验证器）
        require(_validateZkProof(zkProof, dataHash, threatLevel), "Invalid ZK proof");

        // 创建隐私保护报告
        PrivacyProtectedReport memory newReport = PrivacyProtectedReport({
            reportId: reportId,
            dataHash: dataHash,
            encryptedDataHash: keccak256(abi.encodePacked(dataHash, keccak256(bytes(zkProof)))),
            publicAttributes: publicAttributes,
            threatLevel: threatLevel,
            threatType: threatType,
            submitter: msg.sender,
            submissionTime: block.timestamp,
            isVerified: true, // 通过ZK证明验证
            zkProof: zkProof,
            privacyCommitment: keccak256(abi.encodePacked(reportId, dataHash, block.timestamp)),
            auxiliaryData: auxiliaryData
        });

        privacyProtectedReports[reportId] = newReport;
        hashToReportId[dataHash] = reportId;

        // 存储元数据
        reportMetadata[reportId] = string(abi.encodePacked(
            "ThreatLevel:", StringsLib.toString(threatLevel),
            ",ThreatType:", StringsLib.toString(threatType),
            ",ZkProof:True",
            ",AuxDataCount:", StringsLib.toString(auxiliaryData.length)
        ));

        emit PrivacyProtectedReportSubmitted(reportId, dataHash, msg.sender, block.timestamp);
        emit ZkProofVerified(reportId, msg.sender, block.timestamp);
    }

    /**
     * @dev 验证零知识证明（简化版本）
     * @param zkProof 零知识证明
     * @param dataHash 数据哈希
     * @param expectedThreatLevel 期望的威胁级别
     */
    function _validateZkProof(
        string memory zkProof,
        bytes32 dataHash,
        uint256 expectedThreatLevel
    ) internal pure returns (bool) {
        // 这里是简化的ZK证明验证逻辑
        // 在实际实现中，这将调用专门的ZKP验证器合约
        bytes memory proofBytes = bytes(zkProof);
        if (proofBytes.length < MIN_ZKPROOF_COMPLEXITY) {
            return false;
        }

        // 执行基本的一致性检查
        // 在实际应用中，这里会执行复杂的数学验证
        bytes32 proofHash = keccak256(abi.encodePacked(zkProof));
        return proofHash != bytes32(0) && expectedThreatLevel <= 100;
    }

    /**
     * @dev 请求数据访问权限
     * @param reportId 报告ID
     * @param purpose 访问目的
     */
    function requestDataAccess(
        string memory reportId,
        string memory purpose
    ) external onlyActiveContract returns (bytes32 accessKey) {
        PrivacyProtectedReport storage report = privacyProtectedReports[reportId];
        require(bytes(report.reportId).length > 0, "Report does not exist");
        
        accessKey = keccak256(abi.encodePacked(reportId, msg.sender, block.timestamp));
        
        DataAccessPermission memory permission = DataAccessPermission({
            requester: msg.sender,
            reportId: reportId,
            expirationTime: block.timestamp + ACCESS_EXPIRATION_PERIOD,
            purpose: purpose,
            granted: true, // 简化：自动授权，实际应用中可能需要审批
            accessKey: accessKey
        });

        dataAccessPermissions[reportId].push(permission);

        emit DataAccessPermissionGranted(reportId, msg.sender, permission.expirationTime, purpose);
    }

    /**
     * @dev 验证数据访问权限
     * @param reportId 报告ID
     * @param accessKey 访问密钥
     */
    function validateDataAccess(
        string memory reportId,
        bytes32 accessKey
    ) external view returns (bool valid, address requester, uint256 expirationTime) {
        DataAccessPermission[] storage permissions = dataAccessPermissions[reportId];
        
        for (uint i = 0; i < permissions.length; i++) {
            if (permissions[i].accessKey == accessKey) {
                if (permissions[i].granted && block.timestamp <= permissions[i].expirationTime) {
                    return (true, permissions[i].requester, permissions[i].expirationTime);
                } else {
                    return (false, address(0), 0);
                }
            }
        }

        return (false, address(0), 0);
    }

    /**
     * @dev 挑战隐私保护报告的有效性
     * @param reportId 报告ID
     * @param challengeReason 挑战原因
     */
    function challengePrivacyReport(
        string memory reportId,
        string memory challengeReason
    ) external onlyActiveContract {
        PrivacyProtectedReport storage report = privacyProtectedReports[reportId];
        require(bytes(report.reportId).length > 0, "Report does not exist");
        require(!privacyChallenges[reportId].isResolved, "Challenge already exists and unresolved");

        privacyChallenges[reportId] = PrivacyVerificationChallenge({
            reportId: reportId,
            challenger: msg.sender,
            challengeReason: challengeReason,
            challengeTime: block.timestamp,
            isResolved: false,
            challengeSuccess: false,
            resolutionNotes: ""
        });

        emit PrivacyChallengeCreated(reportId, msg.sender, block.timestamp);
    }

    /**
     * @dev 解决隐私挑战
     * @param reportId 报告ID
     * @param challengeSuccess 挑战是否成功
     * @param resolutionNotes 解决备注
     */
    function resolvePrivacyChallenge(
        string memory reportId,
        bool challengeSuccess,
        string memory resolutionNotes
    ) external onlyGovernance {
        PrivacyVerificationChallenge storage challenge = privacyChallenges[reportId];
        require(!challenge.isResolved, "Challenge already resolved");
        require(block.timestamp <= challenge.challengeTime + CHALLENGE_RESOLUION_PERIOD, "Challenge resolution period expired");

        challenge.isResolved = true;
        challenge.challengeSuccess = challengeSuccess;
        challenge.resolutionNotes = resolutionNotes;

        // 如果挑战成功，可能需要对原报告进行处理
        if (challengeSuccess) {
            PrivacyProtectedReport storage report = privacyProtectedReports[reportId];
            report.isVerified = false;
            // 在实际应用中，可能还需要惩罚原提交者
        }

        emit PrivacyChallengeResolved(reportId, challengeSuccess, block.timestamp);
    }

    /**
     * @dev 获取隐私保护报告详情
     * @param reportId 报告ID
     */
    function getPrivacyProtectedReport(string memory reportId) external view returns (
        bytes32 dataHash,
        string memory publicAttributes,
        uint256 threatLevel,
        uint256 threatType,
        address submitter,
        uint256 submissionTime,
        bool isVerified,
        string memory zkProof,
        string[] memory auxiliaryData
    ) {
        PrivacyProtectedReport storage report = privacyProtectedReports[reportId];
        
        return (
            report.dataHash,
            report.publicAttributes,
            report.threatLevel,
            report.threatType,
            report.submitter,
            report.submissionTime,
            report.isVerified,
            report.zkProof,
            report.auxiliaryData
        );
    }

    /**
     * @dev 通过数据哈希获取报告ID
     * @param dataHash 数据哈希
     */
    function getReportIdByHash(bytes32 dataHash) external view returns (string memory) {
        return hashToReportId[dataHash];
    }

    /**
     * @dev 获取报告元数据
     * @param reportId 报告ID
     */
    function getReportMetadata(string memory reportId) external view returns (string memory) {
        return reportMetadata[reportId];
    }

    /**
     * @dev 批量提交隐私保护报告（优化效率）
     * @param _reportIds 报告ID数组
     * @param dataHashes 数据哈希数组
     * @param publicAttributesArray 公开属性数组
     * @param threatLevels 威胁级别数组
     * @param threatTypes 威胁类型数组
     */
    function batchSubmitPrivacyReports(
        string[] memory _reportIds,
        bytes32[] memory dataHashes,
        string[] memory publicAttributesArray,
        uint256[] memory threatLevels,
        uint256[] memory threatTypes
    ) external onlyAuthorizedPrivacyNode onlyActiveContract {
        require(_reportIds.length == dataHashes.length, "Array length mismatch");
        require(_reportIds.length == publicAttributesArray.length, "Array length mismatch");
        require(_reportIds.length == threatLevels.length, "Array length mismatch");
        require(_reportIds.length == threatTypes.length, "Array length mismatch");
        require(_reportIds.length <= 100, "Too many reports in batch");

        for (uint i = 0; i < _reportIds.length; i++) {
            _submitPrivacyProtectedReport(
                _reportIds[i],
                dataHashes[i],
                publicAttributesArray[i],
                threatLevels[i],
                threatTypes[i],
                new string[](0) // 空的辅助数据数组
            );
        }
    }

    /**
     * @dev 治理功能：添加授权隐私节点
     * @param nodeAddress 节点地址
     */
    function addAuthorizedPrivacyNode(address nodeAddress) external onlyGovernance {
        authorizedPrivacyNodes[nodeAddress] = true;
    }

    /**
     * @dev 治理功能：移除授权隐私节点
     * @param nodeAddress 节点地址
     */
    function removeAuthorizedPrivacyNode(address nodeAddress) external onlyGovernance {
        authorizedPrivacyNodes[nodeAddress] = false;
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

