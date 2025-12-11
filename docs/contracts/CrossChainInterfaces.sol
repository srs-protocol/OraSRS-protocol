// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

// LayerZero Endpoint 接口
interface ILayerZeroEndpoint {
    // 事件
    event PacketSent(
        uint16 indexed srcChainId,
        address indexed srcAddress,
        address indexed dstAddress,
        uint64 nonce,
        bytes payload
    );
    
    event PacketReceived(
        uint16 indexed srcChainId,
        address indexed srcAddress,
        address indexed dstAddress,
        uint64 nonce,
        bytes payload
    );

    // 发送跨链消息
    function send(
        uint16 _dstChainId,
        bytes calldata _destination,
        bytes calldata _payload,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) external payable;
    
    // 估算费用
    function estimateFees(
        uint16 _dstChainId,
        address _userApplication,
        bytes calldata _payload,
        bool _payInZRO,
        bytes memory _adapterParam
    ) external view returns (uint256 nativeFee, uint256 zroFee);
    
    // 接收来自LayerZero的消息
    function receivePayload(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        address _dstAddress,
        uint64 _nonce,
        uint256 _gasLimit,
        bytes calldata _payload
    ) external;
}

// LayerZero 接收器接口
interface ILayerZeroReceiver {
    function lzReceive(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) external;
}

// 跨链应用基类
abstract contract LzApp is ILayerZeroReceiver {
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
            abi.encodePacked(address(this)),
            _payload,
            _refundAddress,
            _zroPaymentAddress,
            _adapterParams
        );
    }

    // 子合约需要实现此函数来处理接收到的消息
    function lzReceive(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) external virtual override;
}