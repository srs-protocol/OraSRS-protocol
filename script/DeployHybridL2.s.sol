// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";

// 从ThreatIntelSync合约中复制的接口和基类定义
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

contract LzApp {
    ILayerZeroEndpoint public lzEndpoint;
    mapping(uint16 => bytes) public trustedRemoteLookup;

    event UaForceResumeReceive(uint16 indexed _srcChainId, bytes indexed _srcAddress);
    event UaForceResumeSend(uint16 indexed _dstChainId, bytes indexed _dstAddress);

    error LzAppInvalidEndpoint(address endpoint);
    error LzAppNoAdapterParams();
    error LzAppInvalidPath(uint16 srcChainId, bytes trustedRemote, bytes source);
    error LzAppInsufficientFee(uint256 required, uint256 provided);

    modifier onlyLzEndpoint() {
        if (msg.sender != address(lzEndpoint)) {
            revert LzAppInvalidEndpoint(msg.sender);
        }
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
        if (_adapterParams.length == 0) revert LzAppNoAdapterParams();

       lzEndpoint.send{value: _nativeFee}(
            _dstChainId,
            trustedRemoteLookup[_dstChainId],
            _payload,
            _refundAddress,
            _zroPaymentAddress,
            _adapterParams
        );
    }

    function _lzReceive(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 _nonce,
        bytes memory _payload
    ) internal virtual {}
}

// 简化的ThreatIntelSync合约用于部署
contract ThreatIntelSync is LzApp {
    address public governanceContract;
    uint256 public domesticChainId;
    uint256 public overseasChainId;

    event ThreatIntelSent(string indexed threatId, uint256 indexed sourceChainId, uint256 indexed destChainId);

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
        
        // 构建消息
        bytes memory payload = abi.encode(_threatId, _sourceIP, _threatLevel, _threatType, _evidenceHash, _geolocation);

        // 计算费用
        (uint256 nativeFee, ) = lzEndpoint.estimateFees(_dstChainId, address(this), payload, false, bytes(""));

        // 发送跨链消息
        _lzSend(
            _dstChainId,
            payload,
            payable(msg.sender),
            address(this),
            bytes(""),
            nativeFee
        );

        emit ThreatIntelSent(_threatId, block.chainid, _dstChainId);
    }

    function quoteSendThreatIntel(
        uint16 _dstChainId,
        string memory _threatId,
        string memory _sourceIP,
        uint256 _threatLevel,
        uint256 _threatType,
        string memory _evidenceHash,
        string memory _geolocation
    ) public view returns (uint256 fee) {
        bytes memory payload = abi.encode(_threatId, _sourceIP, _threatLevel, _threatType, _evidenceHash, _geolocation);
        (fee, ) = lzEndpoint.estimateFees(_dstChainId, address(this), payload, false, bytes(""));
    }
}

// 简化的GovernanceMirror合约用于部署
contract GovernanceMirror is LzApp {
    address public governanceContract;
    address public threatIntelSyncContract;
    uint256 public domesticChainId;
    uint256 public overseasChainId;
    uint256 public quorumPercentage;
    uint256 public votingPeriod;

    event ProposalCreated(uint256 indexed id, address indexed proposer, uint256 indexed sourceChainId, string sourceProposalId);

    enum ProposalType { ParameterUpdate, ContractUpgrade, EmergencyAction, NodeManagement, ThreatIntelSync }

    constructor(
        address _layerZeroEndpoint,
        address _governanceContract,
        address _threatIntelSyncContract,
        uint256 _domesticChainId,
        uint256 _overseasChainId
    ) LzApp(_layerZeroEndpoint) {
        governanceContract = _governanceContract;
        threatIntelSyncContract = _threatIntelSyncContract;
        domesticChainId = _domesticChainId;
        overseasChainId = _overseasChainId;
        quorumPercentage = 100000;  // 10% 法定人数
        votingPeriod = 7 days;      // 7天投票期
    }

    function createCrossChainProposal(
        uint16 _targetChainId,
        string memory _description,
        ProposalType _proposalType,
        address[] memory _targets,
        uint256[] memory _values,
        bytes[] memory _calldatas
    ) external payable returns (uint256 proposalId) {
        require(_targetChainId == domesticChainId || _targetChainId == overseasChainId, "Invalid target chain");

        // 发送跨链消息
        bytes memory payload = abi.encode(_description, _proposalType, _targets, _values, _calldatas);

        // 计算费用并发送
        (uint256 nativeFee, ) = lzEndpoint.estimateFees(_targetChainId, address(this), payload, false, bytes(""));
        require(msg.value >= nativeFee, "Insufficient fee");

        _lzSend(
            _targetChainId,
            payload,
            payable(msg.sender),
            address(this),
            bytes(""),
            nativeFee
        );

        proposalId = 1; // 简化：固定返回1
        emit ProposalCreated(proposalId, msg.sender, block.chainid, "src_1");
    }
}

contract DeployHybridL2 is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // 部署ThreatIntelSync合约 (国内L2)
        ThreatIntelSync threatIntelSync = new ThreatIntelSync(
            0x1A440761EcAd8B5eD7b6E54B273754e183586c57, // LayerZero测试网Endpoint
            0x1234567890123456789012345678901234567890, // 治理合约地址
            31337, // 国内L2 Chain ID (开发环境)
            11155420 // OP Sepolia Chain ID
        );

        console.log("ThreatIntelSync deployed at:", address(threatIntelSync));

        // 部署GovernanceMirror合约 (国内L2)
        GovernanceMirror governanceMirror = new GovernanceMirror(
            0x1A440761EcAd8B5eD7b6E54B273754e183586c57, // LayerZero测试网Endpoint
            0x1234567890123456789012345678901234567890, // 治理合约地址
            address(threatIntelSync), // 威胁情报同步合约地址
            31337, // 国内L2 Chain ID (开发环境)
            11155420 // OP Sepolia Chain ID
        );

        console.log("GovernanceMirror deployed at:", address(governanceMirror));

        vm.stopBroadcast();
    }
}