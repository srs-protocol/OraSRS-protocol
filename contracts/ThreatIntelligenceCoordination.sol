// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ThreatIntelligenceCoordination {
    // 威胁级别枚举
    enum ThreatLevel { Info, Warning, Critical, Emergency }
    
    // 威胁情报结构
    struct ThreatIntel {
        string sourceIP;
        string targetIP;
        ThreatLevel threatLevel;
        uint256 timestamp;
        string threatType;
        bool isActive;
    }
    
    // 存储威胁情报
    mapping(string => ThreatIntel) public threatIntels;  // IP -> ThreatIntel
    mapping(string => bool) public isThreatIP;          // IP -> 是否为威胁IP
    mapping(string => uint256) public threatScores;     // IP -> 威胁分数
    
    // 为了支持获取所有IP，我们需要一个数组来存储IP地址
    string[] public allThreatIPs;
    mapping(string => uint256) private ipIndex;  // IP到数组索引的映射，用于快速删除
    
    event ThreatIntelAdded(string indexed ip, ThreatLevel level, string threatType, uint256 timestamp);
    event ThreatIntelRemoved(string indexed ip, uint256 timestamp);
    event ThreatScoreUpdated(string indexed ip, uint256 score, uint256 timestamp);
    
    /**
     * @dev 构造函数
     */
    constructor() {
    }
    
    /**
     * @dev 添加威胁情报
     */
    function addThreatIntel(
        string memory _ip,
        ThreatLevel _threatLevel,
        string memory _threatType
    ) external {
        require(bytes(_ip).length > 0, "IP cannot be empty");
        
        threatIntels[_ip] = ThreatIntel({
            sourceIP: _ip,
            targetIP: "",
            threatLevel: _threatLevel,
            timestamp: block.timestamp,
            threatType: _threatType,
            isActive: true
        });
        
        isThreatIP[_ip] = true;
        
        // 如果IP不在列表中，则添加到列表
        if (ipIndex[_ip] == 0) {
            allThreatIPs.push(_ip);
            ipIndex[_ip] = allThreatIPs.length; // 存储索引，从1开始，0表示不存在
        }
        
        emit ThreatIntelAdded(_ip, _threatLevel, _threatType, block.timestamp);
    }
    
    /**
     * @dev 更新威胁分数
     */
    function updateThreatScore(string memory _ip, uint256 _score) external {
        require(bytes(_ip).length > 0, "IP cannot be empty");
        threatScores[_ip] = _score;
        
        emit ThreatScoreUpdated(_ip, _score, block.timestamp);
    }
    
    /**
     * @dev 获取威胁分数
     */
    function getThreatScore(string memory _ip) external view returns (uint256) {
        return threatScores[_ip];
    }
    
    /**
     * @dev 移除威胁情报
     */
    function removeThreatIntel(string memory _ip) external {
        threatIntels[_ip].isActive = false;
        isThreatIP[_ip] = false;
        
        // 从数组中移除IP
        uint256 index = ipIndex[_ip];
        if (index > 0 && index <= allThreatIPs.length) {
            // 将最后一个元素移到被删除元素的位置
            string memory lastIP = allThreatIPs[allThreatIPs.length - 1];
            allThreatIPs[index - 1] = lastIP;
            // 更新最后一个元素的索引
            ipIndex[lastIP] = index;
            // 删除最后一个元素
            allThreatIPs.pop();
            // 重置被删除IP的索引
            delete ipIndex[_ip];
        }
        
        emit ThreatIntelRemoved(_ip, block.timestamp);
    }
    
    /**
     * @dev 检查IP是否为威胁IP
     */
    function isThreatSource(string memory _ip) external view returns (bool) {
        return isThreatIP[_ip] && threatIntels[_ip].isActive;
    }
    
    /**
     * @dev 获取威胁情报
     */
    function getThreatIntel(string memory _ip) external view returns (
        string memory sourceIP,
        string memory targetIP,
        ThreatLevel threatLevel,
        uint256 timestamp,
        string memory threatType,
        bool isActive
    ) {
        ThreatIntel memory intel = threatIntels[_ip];
        return (
            intel.sourceIP,
            intel.targetIP,
            intel.threatLevel,
            intel.timestamp,
            intel.threatType,
            intel.isActive
        );
    }
    
    /**
     * @dev 批量更新多个IP的威胁分数
     */
    function batchUpdateThreatScores(string[] memory _ips, uint256[] memory _scores) external {
        require(_ips.length == _scores.length, "IP and score arrays must have same length");
        
        for (uint i = 0; i < _ips.length; i++) {
            threatScores[_ips[i]] = _scores[i];
            emit ThreatScoreUpdated(_ips[i], _scores[i], block.timestamp);
        }
    }
    
    /**
     * @dev 获取多个IP的威胁分数
     */
    function getThreatScores(string[] memory _ips) external view returns (uint256[] memory) {
        uint256[] memory scores = new uint256[](_ips.length);
        for (uint i = 0; i < _ips.length; i++) {
            scores[i] = threatScores[_ips[i]];
        }
        return scores;
    }
    
    /**
     * @dev 获取所有威胁IP的数量
     */
    function getThreatIPsCount() external view returns (uint256) {
        return allThreatIPs.length;
    }
    
    /**
     * @dev 获取指定范围内的威胁IP
     */
    function getThreatIPs(uint256 offset, uint256 count) external view returns (string[] memory ips) {
        require(offset < allThreatIPs.length, "Offset out of bounds");
        
        uint256 actualCount = count;
        if (offset + actualCount > allThreatIPs.length) {
            actualCount = allThreatIPs.length - offset;
        }
        
        ips = new string[](actualCount);
        for (uint256 i = 0; i < actualCount; i++) {
            ips[i] = allThreatIPs[offset + i];
        }
    }
    
    /**
     * @dev 获取所有威胁IP（限制数量以防止gas耗尽）
     */
    function getAllThreatIPs(uint256 maxCount) external view returns (string[] memory ips) {
        uint256 count = allThreatIPs.length;
        if (maxCount < count) {
            count = maxCount;
        }
        
        ips = new string[](count);
        for (uint256 i = 0; i < count; i++) {
            ips[i] = allThreatIPs[i];
        }
    }
}