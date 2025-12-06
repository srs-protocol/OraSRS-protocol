// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// 模拟LayerZero端点，用于测试环境
contract MockLayerZeroEndpoint {
    // 存储跨链消息
    struct CrossChainMessage {
        uint16 dstChainId;
        address dstAddr;
        bytes payload;
        address refundAddress;
        address zroPaymentAddress;
        bytes adapterParams;
        uint256 fee;
        uint256 blockNumber;
    }
    
    CrossChainMessage[] public messages;
    mapping(uint16 => address) public chainAddresses; // 目标链地址映射
    
    event MessageSent(uint256 indexed messageId, uint16 dstChainId, address dstAddr);
    event MessageReceived(uint256 indexed messageId, uint16 srcChainId, address srcAddr);

    function setChainAddress(uint16 _chainId, address _addr) external {
        chainAddresses[_chainId] = _addr;
    }

    function send(
        uint16 _dstChainId,
        bytes calldata _destination,
        bytes calldata _payload,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) external payable {
        CrossChainMessage memory msgObj = CrossChainMessage({
            dstChainId: _dstChainId,
            dstAddr: address(uint160(bytes20(_destination))),
            payload: _payload,
            refundAddress: _refundAddress,
            zroPaymentAddress: _zroPaymentAddress,
            adapterParams: _adapterParams,
            fee: msg.value,
            blockNumber: block.number
        });
        
        uint256 messageId = messages.length;
        messages.push(msgObj);
        
        emit MessageSent(messageId, _dstChainId, msgObj.dstAddr);
    }

    function estimateFees(
        uint16 _dstChainId,
        address _userApplication,
        bytes calldata _payload,
        bool _payInZRO,
        bytes memory _adapterParam
    ) external view returns (uint256 nativeFee, uint256 zroFee) {
        // 简化的费用估算：固定费用
        nativeFee = 0.1 ether; // 测试环境中使用固定费用
        zroFee = 0;
    }
    
    function getMessageCount() external view returns (uint256) {
        return messages.length;
    }
}