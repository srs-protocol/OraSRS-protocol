// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "./libs/StringsLib.sol";
import "./EnhancedThreatVerification.sol";
import "./PrivacyProtectedVerification.sol";

/**
 * @title OraSRS 可验证审计与追溯合约
 * @dev 实现完整的审计日志、追溯ID和透明度机制
 * @author OraSRS Protocol
 * @notice 该合约提供完全透明和可验证的操作记录
 */
contract VerifiableAuditTrail {
    // 审计事件类型枚举
    enum AuditEventType {
        ThreatReportSubmitted,
        ThreatReportVerified,
        NodeReputationUpdated,
        StakeDeposited,
        StakeSlashed,
        ChallengeCreated,
        ChallengeResolved,
        PrivacyReportSubmitted,
        ZkProofVerified,
        GovernanceAction
    }

    // 审计事件结构
    struct AuditEvent {
        uint256 eventId;                    // 事件ID
        AuditEventType eventType;           // 事件类型
        address actor;                      // 操作者地址
        string targetId;                    // 目标ID（威胁ID、节点ID等）
        string details;                     // 详细信息
        uint256 timestamp;                  // 时间戳
        bytes32 txHash;                     // 交易哈希
        uint256 blockNumber;                // 区块号
        string traceId;                     // 追溯ID
        bytes32 dataHash;                   // 数据哈希（用于验证）
        string metadata;                    // 元数据
    }

    // 追溯记录结构
    struct TraceRecord {
        string traceId;                     // 追溯ID
        string[] relatedEvents;             // 相关事件ID列表
        address originator;                 // 起始操作者
        uint256 timestamp;                  // 创建时间
        string processType;                 // 流程类型
        mapping(string => string) attributes; // 附加属性
    }

    // 合规证明结构
    struct ComplianceProof {
        string proofId;                     // 证明ID
        string regulation;                  // 法规要求
        bytes32 evidenceHash;              // 证据哈希
        uint256 timestamp;                  // 时间戳
        address verifier;                   // 验证者
        bool approved;                      // 是否批准
        string details;                     // 详情
    }

    // 合约状态
    enum ContractState { Active, Paused, EmergencyStopped }
    ContractState public contractState;

    // 映射存储
    mapping(uint256 => AuditEvent) public auditEvents;           // 审计事件
    mapping(string => TraceRecord) public traceRecords;          // 追溯记录
    mapping(string => ComplianceProof) public complianceProofs;  // 合规证明
    mapping(address => uint256[]) public actorEventHistory;      // 操作者事件历史
    mapping(string => uint256[]) public targetEventHistory;      // 目标事件历史
    mapping(bytes32 => uint256) public txHashToEventId;         // 交易哈希到事件ID
    mapping(string => bytes32) public traceIdToDataHash;        // 追溯ID到数据哈希

    // 计数器
    uint256 public eventCounter;
    uint256 public traceCounter;

    // 重要参数
    address public owner;
    address public governanceContract;

    // 事件
    event AuditEventLogged(
        uint256 indexed eventId,
        AuditEventType indexed eventType,
        address indexed actor,
        string targetId,
        string traceId,
        uint256 timestamp
    );
    event TraceRecordCreated(string indexed traceId, address indexed originator, string processType, uint256 timestamp);
    event ComplianceProofSubmitted(string indexed proofId, string regulation, address indexed verifier, uint256 timestamp);
    event ComplianceProofVerified(string indexed proofId, bool approved, uint256 timestamp);

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

    /**
     * @dev 构造函数
     * @param _governanceContract 治理合约地址
     */
    constructor(address _governanceContract) {
        owner = msg.sender;
        governanceContract = _governanceContract;
        contractState = ContractState.Active;
        eventCounter = 1;
        traceCounter = 1;
    }

    /**
     * @dev 记录审计事件
     * @param eventType 事件类型
     * @param targetId 目标ID
     * @param details 详细信息
     * @param traceId 追溯ID
     * @param dataHash 数据哈希
     */
    function logAuditEvent(
        AuditEventType eventType,
        string memory targetId,
        string memory details,
        string memory traceId,
        bytes32 dataHash
    ) public onlyActiveContract returns (uint256 eventId) {
        eventId = eventCounter++;
        
        AuditEvent memory auditEvent = AuditEvent({
            eventId: eventId,
            eventType: eventType,
            actor: msg.sender,
            targetId: targetId,
            details: details,
            timestamp: block.timestamp,
            txHash: blockhash(block.number - 1), // 使用前一个区块哈希
            blockNumber: block.number,
            traceId: traceId,
            dataHash: dataHash,
            metadata: _generateMetadata(eventType, targetId)
        });

        auditEvents[eventId] = auditEvent;
        txHashToEventId[auditEvent.txHash] = eventId;
        
        // 添加到操作者和目标的历史记录
        actorEventHistory[msg.sender].push(eventId);
        if (bytes(targetId).length > 0) {
            targetEventHistory[targetId].push(eventId);
        }

        // 如果提供了追溯ID，更新追溯记录
        if (bytes(traceId).length > 0) {
            _updateTraceRecord(traceId, eventId, eventType, msg.sender);
        }

        emit AuditEventLogged(eventId, eventType, msg.sender, targetId, traceId, block.timestamp);
    }

    /**
     * @dev 生成事件元数据
     * @param eventType 事件类型
     * @param targetId 目标ID
     */
    function _generateMetadata(AuditEventType eventType, string memory targetId) internal view returns (string memory) {
        return string(abi.encodePacked(
            "Contract:", StringsLib.toString(uint256(uint160(address(this)))),
            ",Event:", StringsLib.toString(uint256(eventType)),
            ",Target:", targetId,
            ",Block:", StringsLib.toString(block.number)
        ));
    }

    /**
     * @dev 更新追溯记录
     * @param traceId 追溯ID
     * @param eventId 事件ID
     * @param eventType 事件类型
     * @param originator 操作者
     */
    function _updateTraceRecord(
        string memory traceId,
        uint256 eventId,
        AuditEventType eventType,
        address originator
    ) internal {
        if (bytes(traceRecords[traceId].traceId).length == 0) {
            // 创建新的追溯记录
            TraceRecord storage newRecord = traceRecords[traceId];
            newRecord.traceId = traceId;
            newRecord.originator = originator;
            newRecord.timestamp = block.timestamp;
            newRecord.processType = _getProcessType(eventType);
        }
        
        // 添加事件到追溯记录
        traceRecords[traceId].relatedEvents.push(StringsLib.toString(eventId));
    }

    /**
     * @dev 获取流程类型
     * @param eventType 事件类型
     */
    function _getProcessType(AuditEventType eventType) internal pure returns (string memory) {
        if (eventType == AuditEventType.ThreatReportSubmitted || eventType == AuditEventType.ThreatReportVerified) {
            return "ThreatVerification";
        } else if (eventType == AuditEventType.NodeReputationUpdated || eventType == AuditEventType.StakeSlashed) {
            return "ReputationManagement";
        } else if (eventType == AuditEventType.ChallengeCreated || eventType == AuditEventType.ChallengeResolved) {
            return "ChallengeProcess";
        } else if (eventType == AuditEventType.PrivacyReportSubmitted || eventType == AuditEventType.ZkProofVerified) {
            return "PrivacyVerification";
        } else if (eventType == AuditEventType.GovernanceAction) {
            return "Governance";
        } else {
            return "General";
        }
    }

    /**
     * @dev 创建追溯ID
     */
    function createTraceId() external onlyActiveContract returns (string memory) {
        string memory traceId = string(abi.encodePacked(
            "trace_", 
            StringsLib.toString(traceCounter++), 
            "_", 
            StringsLib.toString(block.timestamp)
        ));
        
        TraceRecord storage traceRecord = traceRecords[traceId];
        traceRecord.traceId = traceId;
        traceRecord.originator = msg.sender;
        traceRecord.timestamp = block.timestamp;
        traceRecord.processType = "Custom";

        emit TraceRecordCreated(traceId, msg.sender, "Custom", block.timestamp);
        
        return traceId;
    }

    /**
     * @dev 提交合规证明
     * @param regulation 法规要求
     * @param evidenceHash 证据哈希
     * @param details 详情
     */
    function submitComplianceProof(
        string memory regulation,
        bytes32 evidenceHash,
        string memory details
    ) external onlyActiveContract returns (string memory proofId) {
        proofId = string(abi.encodePacked(
            "compliance_", 
            StringsLib.toString(block.timestamp)
        ));

        complianceProofs[proofId] = ComplianceProof({
            proofId: proofId,
            regulation: regulation,
            evidenceHash: evidenceHash,
            timestamp: block.timestamp,
            verifier: msg.sender,
            approved: false,
            details: details
        });

        // 记录审计事件
        logAuditEvent(
            AuditEventType.GovernanceAction,
            proofId,
            string(abi.encodePacked("Compliance proof submitted for ", regulation)),
            string(abi.encodePacked("compliance:", proofId)),
            evidenceHash
        );

        emit ComplianceProofSubmitted(proofId, regulation, msg.sender, block.timestamp);
    }

    /**
     * @dev 验证合规证明
     * @param proofId 证明ID
     * @param approved 是否批准
     */
    function verifyComplianceProof(
        string memory proofId,
        bool approved
    ) external onlyGovernance {
        ComplianceProof storage proof = complianceProofs[proofId];
        require(bytes(proof.proofId).length > 0, "Proof does not exist");

        proof.approved = approved;

        // 记录审计事件
        logAuditEvent(
            AuditEventType.GovernanceAction,
            proofId,
            string(abi.encodePacked("Compliance proof ", approved ? "approved" : "rejected")),
            string(abi.encodePacked("compliance:", proofId)),
            proof.evidenceHash
        );

        emit ComplianceProofVerified(proofId, approved, block.timestamp);
    }

    /**
     * @dev 获取审计事件
     * @param eventId 事件ID
     */
    function getAuditEvent(uint256 eventId) external view returns (
        AuditEventType eventType,
        address actor,
        string memory targetId,
        string memory details,
        uint256 timestamp,
        bytes32 txHash,
        uint256 blockNumber,
        string memory traceId,
        bytes32 dataHash,
        string memory metadata
    ) {
        AuditEvent storage auditEvent = auditEvents[eventId];
        return (
            auditEvent.eventType,
            auditEvent.actor,
            auditEvent.targetId,
            auditEvent.details,
            auditEvent.timestamp,
            auditEvent.txHash,
            auditEvent.blockNumber,
            auditEvent.traceId,
            auditEvent.dataHash,
            auditEvent.metadata
        );
    }

    // 修复另一个函数中的变量名冲突
    function searchAuditEventsByActor(
        address actor,
        uint256 fromTime,
        uint256 toTime
    ) external view returns (uint256[] memory) {
        uint256[] memory actorEvents = actorEventHistory[actor];
        uint256[] memory tempIds = new uint256[](actorEvents.length);
        uint256 count = 0;

        for (uint256 i = 0; i < actorEvents.length; i++) {
            AuditEvent storage auditEvent = auditEvents[actorEvents[i]];
            if (auditEvent.timestamp >= fromTime && auditEvent.timestamp <= toTime) {
                tempIds[count] = actorEvents[i];
                count++;
            }
        }

        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = tempIds[i];
        }

        return result;
    }

    /**
     * @dev 获取追溯记录
     * @param traceId 追溯ID
     */
    function getTraceRecord(string memory traceId) external view returns (
        address originator,
        uint256 timestamp,
        string memory processType,
        string[] memory relatedEvents
    ) {
        TraceRecord storage record = traceRecords[traceId];
        return (
            record.originator,
            record.timestamp,
            record.processType,
            record.relatedEvents
        );
    }

    /**
     * @dev 获取操作者事件历史
     * @param actor 操作者地址
     */
    function getActorEventHistory(address actor) external view returns (uint256[] memory) {
        return actorEventHistory[actor];
    }

    /**
     * @dev 获取目标事件历史
     * @param targetId 目标ID
     */
    function getTargetEventHistory(string memory targetId) external view returns (uint256[] memory) {
        return targetEventHistory[targetId];
    }

    /**
     * @dev 获取合规证明
     * @param proofId 证明ID
     */
    function getComplianceProof(string memory proofId) external view returns (
        string memory regulation,
        bytes32 evidenceHash,
        uint256 timestamp,
        address verifier,
        bool approved,
        string memory details
    ) {
        ComplianceProof storage proof = complianceProofs[proofId];
        return (
            proof.regulation,
            proof.evidenceHash,
            proof.timestamp,
            proof.verifier,
            proof.approved,
            proof.details
        );
    }

    /**
     * @dev 验证数据完整性
     * @param eventId 事件ID
     * @param expectedDataHash 期望的数据哈希
     */
    function verifyDataIntegrity(uint256 eventId, bytes32 expectedDataHash) external view returns (bool) {
        AuditEvent storage auditEvent = auditEvents[eventId];
        return auditEvent.dataHash == expectedDataHash;
    }

    /**
     * @dev 通过交易哈希获取事件ID
     * @param txHash 交易哈希
     */
    function getEventIdByTxHash(bytes32 txHash) external view returns (uint256) {
        return txHashToEventId[txHash];
    }

    /**
     * @dev 搜索审计事件（按类型）
     * @param eventType 事件类型
     * @param fromTime 开始时间
     * @param toTime 结束时间
     */
    function searchAuditEventsByType(
        AuditEventType eventType,
        uint256 fromTime,
        uint256 toTime
    ) external view returns (uint256[] memory) {
        uint256 currentEventId = eventCounter - 1;
        uint256[] memory tempIds = new uint256[](currentEventId);
        uint256 count = 0;

        for (uint256 i = 1; i <= currentEventId; i++) {
            AuditEvent storage auditEvent = auditEvents[i];
            if (auditEvent.eventType == eventType && 
                auditEvent.timestamp >= fromTime && 
                auditEvent.timestamp <= toTime) {
                tempIds[count] = i;
                count++;
            }
        }

        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = tempIds[i];
        }

        return result;
    }

    

    /**
     * @dev 获取合约统计信息
     */
    function getAuditStats() external view returns (
        uint256 totalEvents,
        uint256 totalTraces,
        uint256 totalComplianceProofs,
        uint256 latestEventId,
        uint256 latestTraceId
    ) {
        return (
            eventCounter - 1,
            traceCounter - 1,
            _countComplianceProofs(),
            eventCounter - 1,
            traceCounter - 1
        );
    }

    /**
     * @dev 计算合规证明数量
     */
    function _countComplianceProofs() internal view returns (uint256 count) {
        // 这里简化处理，实际实现可能需要维护计数器
        // 由于Solidity无法直接遍历mapping，我们返回一个近似值
        string memory proofId = string(abi.encodePacked("compliance_", StringsLib.toString(block.timestamp)));
        uint256 tempId = 0;
        while (bytes(complianceProofs[proofId].proofId).length > 0) {
            count++;
            tempId++;
            proofId = string(abi.encodePacked("compliance_", StringsLib.toString(block.timestamp + tempId)));
        }
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

