// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract NodeRegistry is Ownable {
    struct NodeInfo {
        string ip;
        uint16 port;
        address wallet;
        uint256 registeredAt;
        bool active;
    }

    NodeInfo[] public activeNodes;
    mapping(address => uint256) public nodeIndex; // 钱包地址到节点索引的映射
    mapping(string => bool) public ipRegistered; // IP是否已注册

    event NodeRegistered(address indexed wallet, string ip, uint16 port);
    event NodeDeactivated(address indexed wallet, string ip);
    event NodeReactivated(address indexed wallet, string ip);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev 注册节点
     * @param _ip 节点IP地址
     * @param _port 节点端口
     */
    function registerNode(string memory _ip, uint16 _port) external {
        require(bytes(_ip).length > 0, "IP cannot be empty");
        require(_port > 0, "Port must be greater than 0");
        require(!ipRegistered[_ip], "IP already registered");
        
        // 检查是否已注册
        if (nodeIndex[msg.sender] == 0) {
            // 新节点注册
            activeNodes.push(NodeInfo({
                ip: _ip,
                port: _port,
                wallet: msg.sender,
                registeredAt: block.timestamp,
                active: true
            }));
            
            uint256 nodeIdx = activeNodes.length - 1;
            nodeIndex[msg.sender] = nodeIdx + 1; // +1 因为 0 表示未注册
            ipRegistered[_ip] = true;
            
            emit NodeRegistered(msg.sender, _ip, _port);
        } else {
            // 重新激活已注册的节点
            uint256 nodeIdx = nodeIndex[msg.sender] - 1;
            NodeInfo storage node = activeNodes[nodeIdx];
            
            require(!node.active, "Node already active");
            
            node.ip = _ip;
            node.port = _port;
            node.active = true;
            ipRegistered[_ip] = true;
            
            emit NodeReactivated(msg.sender, _ip);
        }
    }

    /**
     * @dev 注销节点
     */
    function unregisterNode() external {
        require(nodeIndex[msg.sender] != 0, "Node not registered");
        
        uint256 nodeIdx = nodeIndex[msg.sender] - 1;
        NodeInfo storage node = activeNodes[nodeIdx];
        
        require(node.active, "Node not active");
        
        node.active = false;
        ipRegistered[node.ip] = false;
        
        emit NodeDeactivated(msg.sender, node.ip);
    }

    /**
     * @dev 获取所有活跃节点
     */
    function getActiveNodes() external view returns (NodeInfo[] memory) {
        NodeInfo[] memory result = new NodeInfo[](0);
        uint256 count = 0;
        
        // 先计算活跃节点数量
        for (uint256 i = 0; i < activeNodes.length; i++) {
            if (activeNodes[i].active) {
                count++;
            }
        }
        
        // 创建正确大小的数组
        result = new NodeInfo[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < activeNodes.length; i++) {
            if (activeNodes[i].active) {
                result[index] = activeNodes[i];
                index++;
            }
        }
        
        return result;
    }

    /**
     * @dev 获取活跃节点数量
     */
    function getActiveNodeCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < activeNodes.length; i++) {
            if (activeNodes[i].active) {
                count++;
            }
        }
        return count;
    }

    /**
     * @dev 治理功能：强制注销节点
     * @param _wallet 要注销的钱包地址
     */
    function forceUnregisterNode(address _wallet) external onlyOwner {
        require(nodeIndex[_wallet] != 0, "Node not registered");
        
        uint256 nodeIdx = nodeIndex[_wallet] - 1;
        NodeInfo storage node = activeNodes[nodeIdx];
        
        node.active = false;
        ipRegistered[node.ip] = false;
        
        emit NodeDeactivated(_wallet, node.ip);
    }

    /**
     * @dev 检查节点是否已注册并活跃
     */
    function isNodeActive(address _wallet) external view returns (bool) {
        if (nodeIndex[_wallet] == 0) {
            return false;
        }
        
        uint256 nodeIdx = nodeIndex[_wallet] - 1;
        return activeNodes[nodeIdx].active;
    }
}