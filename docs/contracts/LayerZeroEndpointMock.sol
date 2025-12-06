// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// 完整的LayerZero Endpoint v2 接口
interface ILayerZeroEndpointV2 {
    // LayerZero endpoint 事件
    event PacketReceived(uint16 indexed srcChainId, address indexed srcAddress, address indexed dstAddress, uint64 nonce, bytes payload);
    event PacketSent(uint16 indexed dstChainId, address indexed srcAddress, address indexed dstAddress, uint64 nonce, bytes payload, bytes adapterParams);

    // 发送跨链消息
    function send(
        uint16 _dstChainId,
        bytes calldata _destination,
        bytes calldata _payload,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) external payable;

    // 估算跨链费用
    function estimateFees(
        uint16 _dstChainId,
        address _userApplication,
        bytes calldata _payload,
        bool _payInZRO,
        bytes memory _adapterParam
    ) external view returns (uint256 nativeFee, uint256 zroFee);

    // 接收跨链消息（由LayerZero调用）
    function receivePayload(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        address _dstAddress,
        uint64 _nonce,
        uint256 _gasLimit,
        bytes calldata _payload
    ) external;
}

// 适配器参数结构
library AdapterParams {
    // 适配器类型
    uint16 constant public ADPT_TYPE_STANDARD = 1;
    uint16 constant public ADPT_TYPE_L1_RESULT = 2;
    uint16 constant public ADPT_TYPE_L2_RESULT = 3;

    // 构建标准适配器参数
    function buildAdapterParams(
        uint16 _adapterType,
        uint256 _gasLimit
    ) internal pure returns (bytes memory) {
        return abi.encodePacked(_adapterType, _gasLimit);
    }
}

/**
 * @title LayerZero Mock Endpoint for Testing
 * @notice Mock implementation of LayerZero Endpoint for testing purposes
 */
contract LayerZeroEndpointMock is ILayerZeroEndpointV2 {
    // 模拟跨链消息存储
    struct CrossChainMessage {
        uint16 srcChainId;
        bytes srcAddress;
        address dstAddress;
        uint64 nonce;
        bytes payload;
        bool received;
    }

    // 存储跨链消息
    mapping(uint256 => CrossChainMessage) public messages;
    uint256 public messageCount;

    // 模拟跨链目标链
    mapping(uint16 => address) public chainAddresses;
    
    // 防重放相关
    mapping(uint16 => mapping(bytes => mapping(uint64 => bool))) public receivedPayloads;

    modifier validateEndpoint(address _userApplication) {
        require(_userApplication != address(0), "LayerZero: invalid user application");
        _;
    }

    /**
     * @notice 设置链地址映射
     */
    function setChainAddress(uint16 _chainId, address _addr) external {
        chainAddresses[_chainId] = _addr;
    }

    /**
     * @notice 发送跨链消息
     */
    function send(
        uint16 _dstChainId,
        bytes calldata _destination,
        bytes calldata _payload,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) external payable override validateEndpoint(msg.sender) {
        uint64 nonce = uint64(messageCount);
        
        // 存储消息
        messages[messageCount] = CrossChainMessage({
            srcChainId: getChainId(),
            srcAddress: abi.encodePacked(msg.sender),
            dstAddress: address(uint160(bytes20(_destination))),
            nonce: nonce,
            payload: _payload,
            received: false
        });

        emit PacketSent(_dstChainId, msg.sender, address(uint160(bytes20(_destination))), nonce, _payload, _adapterParams);

        // 模拟跨链传递 - 直接调用目标链上的合约
        address dstAddress = chainAddresses[_dstChainId];
        if (dstAddress != address(0)) {
            // 创建接收负载
            (, uint256 gasLimit) = abi.decode(_adapterParams, (uint16, uint256));
            (bool success, ) = dstAddress.call(
                abi.encodeWithSignature(
                    "receivePayload(uint16,bytes,address,uint64,uint256,bytes)",
                    getChainId(),
                    abi.encodePacked(msg.sender),
                    address(uint160(bytes20(_destination))),
                    nonce,
                    gasLimit,
                    _payload
                )
            );
            
            if (success) {
                messages[messageCount].received = true;
            }
        }

        unchecked {
            messageCount++;
        }
    }

    /**
     * @notice 估算跨链费用
     */
    function estimateFees(
        uint16, // _dstChainId
        address, // _userApplication
        bytes calldata, // _payload
        bool, // _payInZRO
        bytes memory // _adapterParam
    ) external pure override returns (uint256 nativeFee, uint256 zroFee) {
        // 模拟费用 - 在真实环境中这会根据目标链和负载大小而变化
        nativeFee = 200000000000000000; // 0.2 ETH
        zroFee = 0;
    }

    /**
     * @notice 接收跨链消息 - LayerZero调用此函数
     */
    function receivePayload(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        address _dstAddress,
        uint64 _nonce,
        uint256 _gasLimit,
        bytes calldata _payload
    ) external override {
        // 防重放检查
        require(
            !receivedPayloads[_srcChainId][_srcAddress][_nonce],
            "LayerZero: payload already received"
        );

        // 标记此消息已接收
        receivedPayloads[_srcChainId][_srcAddress][_nonce] = true;

        // 发送事件
        emit PacketReceived(_srcChainId, address(uint160(bytes20(_srcAddress))), _dstAddress, _nonce, _payload);

        // 调用目标合约的接收函数
        bool success = ILayerZeroReceiver(_dstAddress).lzReceive{gas: _gasLimit}(
            _srcChainId,
            _srcAddress,
            _nonce,
            _payload
        );
        
        require(success, "LayerZero: failed to deliver payload");
    }

    /**
     * @notice 获取当前链ID
     */
    function getChainId() public view returns (uint16) {
        return uint16(block.chainid);
    }
}

/**
 * @title LayerZero 接收器接口
 * @notice 实现此接口的合约可以接收LayerZero消息
 */
interface ILayerZeroReceiver {
    function lzReceive(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) external;
}

/**
 * @title LayerZero 发送器接口
 * @notice 实现此接口的合约可以发送LayerZero消息
 */
interface ILayerZeroSender {
    function send(
        uint16 _dstChainId,
        bytes calldata _destination,
        bytes calldata _payload,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) external payable;
}