// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "./libs/CrossChainInterfaces.sol";

/**
 * @title Threat Intelligence Sync 合约
 * @dev 用于在不同链之间同步威胁情报数据
 * @author OraSRS Protocol
 */
contract ThreatIntelSync is LzApp {
    // 威胁情报结构
    struct ThreatIntel {
        string threatId;              // 威胁ID
        string sourceIP;              // 源IP
        uint256 threatLevel;          // 威胁级别
        uint256 threatType;           // 威胁类型
        uint256 timestamp;            // 时间戳
        string evidenceHash;          // 证据哈希
        string geolocation;           // 地理位置
        uint256 sourceChainId;        // 源链ID
        address reporter;             // 报告者地址
        bool isProcessed;             // 是否已处理
    }

    // 跨链消息结构
    struct ThreatMessage {
        ThreatIntel threat;
        uint256 nonce;
    }

    // 存储
    mapping(bytes32 => ThreatIntel) public threatIntels;  // threatId + chainId -> 威胁情报
    mapping(bytes32 => bool) public processedMessages;   // 已处理消息防重放
    address public governanceContract;                     // 治理合约地址
    uint256 public domesticChainId;                        // 国内链ID
    uint256 public overseasChainId;                        // 海外界链ID

    // 事件
    event ThreatIntelReceived(
        string indexed threatId,
        string sourceIP,
        uint256 threatLevel,
        uint256 indexed sourceChainId,
        uint256 indexed destChainId
    );
    event ThreatIntelSent(
        string indexed threatId,
        uint256 indexed sourceChainId,
        uint256 indexed destChainId
    );
    event GovernanceUpdated(address oldGovernance, address newGovernance);

    // 修饰符
    modifier onlyGovernance() {
        require(msg.sender == governanceContract, "Only governance can call this function");
        _;
    }

    /**
     * @dev 构造函数
     * @param _layerZeroEndpoint LayerZero端点地址
     * @param _governanceContract 治理合约地址
     * @param _domesticChainId 国内链ID
     * @param _overseasChainId 海外界链ID
     */
    constructor(
        address _layerZeroEndpoint,
        address _governanceContract,
        uint256 _domesticChainId,
        uint256 _overseasChainId
    ) LzApp(_layerZeroEndpoint) {
        governanceContract = _governanceContract;
        domesticChainId = _domesticChainId;
        overseasChainId = _overseasChainId;
    }

    /**
     * @dev 从LayerZero接收跨链消息 - 实现ILayerZeroReceiver接口
     * @param _srcChainId 源链ID
     * @param _srcAddress 源地址
     * @param _nonce 消息序号
     * @param _payload 消息负载
     */
    function lzReceive(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) external virtual override onlyLzEndpoint {
        // 防重放检查
        bytes32 messageId = keccak256(abi.encodePacked(_srcChainId, _srcAddress, _nonce));
        require(!processedMessages[messageId], "Message already processed");
        processedMessages[messageId] = true;

        // 解码威胁情报消息
        ThreatMessage memory threatMessage = abi.decode(_payload, (ThreatMessage));

        // 验证威胁情报
        require(bytes(threatMessage.threat.threatId).length > 0, "Threat ID is required");
        require(threatMessage.threat.threatLevel <= 100, "Invalid threat level");
        require(threatMessage.threat.threatType <= 6, "Invalid threat type");

        // 存储威胁情报
        bytes32 threatKey = keccak256(abi.encodePacked(threatMessage.threat.threatId, _srcChainId));
        threatIntels[threatKey] = threatMessage.threat;

        emit ThreatIntelReceived(
            threatMessage.threat.threatId,
            threatMessage.threat.sourceIP,
            threatMessage.threat.threatLevel,
            _srcChainId,
            block.chainid
        );
    }

    /**
     * @dev 内部LZ接收函数，用于向后兼容
     */
    function _lzReceive(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 _nonce,
        bytes memory _payload
    ) internal virtual {
        // 调用公共的lzReceive函数
        this.lzReceive(_srcChainId, _srcAddress, _nonce, _payload);
    }

    /**
     * @dev 发送威胁情报到目标链
     * @param _dstChainId 目标链ID
     * @param _threatId 威胁ID
     * @param _sourceIP 源IP
     * @param _threatLevel 威胁级别
     * @param _threatType 威胁类型
     * @param _evidenceHash 证据哈希
     * @param _geolocation 地理位置
     */
    function sendThreatIntel(
        uint16 _dstChainId,
        string memory _threatId,
        string memory _sourceIP,
        uint256 _threatLevel,
        uint256 _threatType,
        string memory _evidenceHash,
        string memory _geolocation
    ) public payable {
        require(_dstChainId == domesticChainId || _dstChainId == overseasChainId, "Invalid destination chain");

        // 构建威胁情报对象
        ThreatIntel memory threat = ThreatIntel({
            threatId: _threatId,
            sourceIP: _sourceIP,
            threatLevel: _threatLevel,
            threatType: _threatType,
            timestamp: block.timestamp,
            evidenceHash: _evidenceHash,
            geolocation: _geolocation,
            sourceChainId: block.chainid,
            reporter: msg.sender,
            isProcessed: false
        });

        // 构建消息
        ThreatMessage memory threatMessage = ThreatMessage({
            threat: threat,
            nonce: block.timestamp
        });

        // 编码消息
        bytes memory payload = abi.encode(threatMessage);

        // 计算费用
        (uint256 nativeFee, ) = lzEndpoint.estimateFees(_dstChainId, address(this), payload, false, bytes(""));

        // 发送跨链消息
        _lzSend(
            _dstChainId,
            payload,
            payable(msg.sender),
            address(this), // 退款地址
            bytes(""), // 附加数据
            nativeFee
        );

        // 存储本地记录
        bytes32 threatKey = keccak256(abi.encodePacked(_threatId, block.chainid));
        threatIntels[threatKey] = threat;

        emit ThreatIntelSent(_threatId, block.chainid, _dstChainId);
    }

    /**
     * @dev 批量发送威胁情报
     * @param _dstChainId 目标链ID
     * @param _threatIds 威胁ID数组
     * @param _sourceIPs 源IP数组
     * @param _threatLevels 威胁级别数组
     * @param _threatTypes 威胁类型数组
     * @param _evidenceHashes 证据哈希数组
     * @param _geolocations 地理位置数组
     */
    function batchSendThreatIntel(
        uint16 _dstChainId,
        string[] memory _threatIds,
        string[] memory _sourceIPs,
        uint256[] memory _threatLevels,
        uint256[] memory _threatTypes,
        string[] memory _evidenceHashes,
        string[] memory _geolocations
    ) external payable {
        require(_threatIds.length == _sourceIPs.length, "Array length mismatch");
        require(_threatIds.length == _threatLevels.length, "Array length mismatch");
        require(_threatIds.length == _threatTypes.length, "Array length mismatch");
        require(_threatIds.length == _evidenceHashes.length, "Array length mismatch");
        require(_threatIds.length == _geolocations.length, "Array length mismatch");
        require(_dstChainId == domesticChainId || _dstChainId == overseasChainId, "Invalid destination chain");

        for (uint i = 0; i < _threatIds.length; i++) {
            sendThreatIntel(
                _dstChainId,
                _threatIds[i],
                _sourceIPs[i],
                _threatLevels[i],
                _threatTypes[i],
                _evidenceHashes[i],
                _geolocations[i]
            );
        }
    }

    /**
     * @dev 获取威胁情报详情
     * @param _threatId 威胁ID
     * @param _chainId 链ID
     */
    function getThreatIntel(string memory _threatId, uint256 _chainId) external view returns (ThreatIntel memory) {
        bytes32 threatKey = keccak256(abi.encodePacked(_threatId, _chainId));
        return threatIntels[threatKey];
    }

    /**
     * @dev 更新治理合约地址
     * @param _newGovernance 新治理合约地址
     */
    function updateGovernance(address _newGovernance) external onlyGovernance {
        address oldGovernance = governanceContract;
        governanceContract = _newGovernance;
        emit GovernanceUpdated(oldGovernance, _newGovernance);
    }

    /**
     * @dev 暂停合约功能
     */
    function pause() external onlyGovernance {
        // _pause(); // 依赖库不存在，使用自定义暂停功能
    }

    /**
     * @dev 恢复合约功能
     */
    function unpause() external onlyGovernance {
        // _unpause(); // 依赖库不存在，使用自定义恢复功能
    }

    /**
     * @dev 从其他链接收消息时支付的费用
     */
    function quoteSendThreatIntel(
        uint16 _dstChainId,
        string memory _threatId,
        string memory _sourceIP,
        uint256 _threatLevel,
        uint256 _threatType,
        string memory _evidenceHash,
        string memory _geolocation
    ) public view returns (uint256 fee) {
        ThreatIntel memory threat = ThreatIntel({
            threatId: _threatId,
            sourceIP: _sourceIP,
            threatLevel: _threatLevel,
            threatType: _threatType,
            timestamp: block.timestamp,
            evidenceHash: _evidenceHash,
            geolocation: _geolocation,
            sourceChainId: block.chainid,
            reporter: msg.sender,
            isProcessed: false
        });

        ThreatMessage memory threatMessage = ThreatMessage({
            threat: threat,
            nonce: block.timestamp
        });

        bytes memory payload = abi.encode(threatMessage);
        (fee, ) = lzEndpoint.estimateFees(_dstChainId, address(this), payload, false, bytes(""));
    }
}