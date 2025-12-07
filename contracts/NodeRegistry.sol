// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract NodeRegistry {
    struct NodeInfo {
        string ip;
        uint16 port;
        address wallet;
    }

    NodeInfo[] public activeNodes;

    // 注册节点
    function registerNode(string memory _ip, uint16 _port) public {
        activeNodes.push(NodeInfo(_ip, _port, msg.sender));
    }

    // 获取所有节点（客户端将调用此方法）
    function getNodes() public view returns (NodeInfo[] memory) {
        return activeNodes;
    }
}