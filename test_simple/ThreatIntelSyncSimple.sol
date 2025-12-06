// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

// 简化版本的跨链接口，避免外部依赖
interface ILayerZeroEndpoint {
    function send(
        uint16 _dstChainId,
        bytes calldata _destination,
        bytes calldata _payload,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) external payable;
    
    function estimateFees(
        uint16 _dstChainId,
        address _userApplication,
        bytes calldata _payload,
        bool _payInZRO,
        bytes memory _adapterParam
    ) external view returns (uint256 nativeFee, uint256 zroFee);
}

// 简化的跨链应用基类
contract LzApp {
    ILayerZeroEndpoint public lzEndpoint;

    modifier onlyLzEndpoint() {
        require(msg.sender == address(lzEndpoint), "LzApp: invalid endpoint");
        _;
    }

    constructor(address _endpoint) {
        lzEndpoint = ILayerZeroEndpoint(_endpoint);
    }

    function _lzSend(
        uint16 _dstChainId,
        bytes memory _payload,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes memory _adapterParams,
        uint256 _nativeFee
    ) internal virtual {
        require(_adapterParams.length > 0, "LzApp: no adapter params");

       lzEndpoint.send{value: _nativeFee}(
            _dstChainId,
            "0x", // 简化：使用空地址，实际使用时需要正确设置
            _payload,
            _refundAddress,
            _zroPaymentAddress,
            _adapterParams
        );
    }
}

/**
 * @title Threat Intelligence Sync 合约 - 简化版
 * @dev 用于在不同链之间同步威胁情报数据
 */
contract ThreatIntelSync is LzApp {
    // 威胁情报结构
    struct ThreatIntel {
        string threatId;
        string sourceIP;
        uint256 threatLevel;
        uint256 threatType;
        uint256 timestamp;
        string evidenceHash;
        string geolocation;
        uint256 sourceChainId;
        address reporter;
        bool isProcessed;
    }

    // 存储
    mapping(bytes32 => ThreatIntel) public threatIntels;
    address public governanceContract;
    uint256 public domesticChainId;
    uint256 public overseasChainId;

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

    /**
     * @dev 构造函数
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
     * @dev 发送威胁情报到目标链
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

        // 存储本地记录
        bytes32 threatKey = keccak256(abi.encodePacked(_threatId, block.chainid));
        threatIntels[threatKey] = threat;

        emit ThreatIntelSent(_threatId, block.chainid, _dstChainId);
    }

    /**
     * @dev 获取威胁情报详情
     */
    function getThreatIntel(string memory _threatId, uint256 _chainId) external view returns (ThreatIntel memory) {
        bytes32 threatKey = keccak256(abi.encodePacked(_threatId, _chainId));
        return threatIntels[threatKey];
    }
}