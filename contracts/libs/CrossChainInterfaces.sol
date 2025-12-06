// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

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
abstract contract LzApp {
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
    ) internal virtual;
}