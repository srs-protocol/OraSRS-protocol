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
    
    event ThreatIntelAdded(string indexed ip, ThreatLevel level, string threatType, uint256 timestamp);
    event ThreatIntelRemoved(string indexed ip, uint256 timestamp);
    
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
        
        emit ThreatIntelAdded(_ip, _threatLevel, _threatType, block.timestamp);
    }
    
    /**
     * @dev 移除威胁情报
     */
    function removeThreatIntel(string memory _ip) external {
        threatIntels[_ip].isActive = false;
        isThreatIP[_ip] = false;
        
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
}