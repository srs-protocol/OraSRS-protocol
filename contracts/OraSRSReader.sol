// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IThreatCoordination {
    function getThreatScore(string memory ip) external view returns (uint256);
    function isThreatSource(string memory ip) external view returns (bool);
    function getThreatIntel(string memory ip) external view returns (
        string memory sourceIP,
        string memory targetIP,
        uint8 threatLevel, // 使用uint8代替enum，因为interface中enum可能有问题
        uint256 timestamp,
        string memory threatType,
        bool isActive
    );
}

interface IRiskCalculator {
    function evaluateRiskLevel(uint256 score) external pure returns (uint8);
}

/**
 * @title OraSRSReader - 高效批量查询合约
 * @notice 为客户端（防火墙）提供批量查询功能
 */
contract OraSRSReader {
    
    IThreatCoordination public storageContract;
    IRiskCalculator public calculatorContract;

    constructor(address _storage, address _calc) {
        storageContract = IThreatCoordination(_storage);
        calculatorContract = IRiskCalculator(_calc);
    }

    struct BulkResult {
        string ip;
        uint256 score;
        uint8 riskLevel; // 0-3
        bool shouldBlock;
    }

    struct ThreatInfo {
        string ip;
        uint256 score;
        uint8 riskLevel;
        uint8 threatLevel; // 0-3 (Info, Warning, Critical, Emergency)
        uint256 timestamp;
        string threatType;
        bool isActive;
    }

    /**
     * @notice 批量查询接口：防火墙每分钟调用一次
     * @param ips 要查询的 IP 列表
     * @param threshold 封禁阈值 (例如 80 分)
     * @return 批量查询结果
     */
    function checkMultipleIPs(string[] calldata ips, uint256 threshold) 
        external 
        view 
        returns (BulkResult[] memory) 
    {
        BulkResult[] memory results = new BulkResult[](ips.length);

        for (uint i = 0; i < ips.length; i++) {
            // 1. 从存储合约读分
            uint256 score = storageContract.getThreatScore(ips[i]);
            
            // 2. 从计算合约读等级
            uint8 level = calculatorContract.evaluateRiskLevel(score);

            // 3. 决定是否建议拦截
            bool blockIt = score >= threshold;

            results[i] = BulkResult(ips[i], score, level, blockIt);
        }

        return results;
    }
    
    /**
     * @notice 获取单个IP的风险信息
     * @param ip 要查询的IP
     * @param threshold 封禁阈值
     * @return ipResult IP地址
     * @return score 风险分数
     * @return riskLevel 风险等级
     * @return shouldBlock 是否应该拦截
     */
    function checkSingleIP(string memory ip, uint256 threshold) 
        external 
        view 
        returns (
            string memory ipResult,
            uint256 score,
            uint8 riskLevel,
            bool shouldBlock
        ) 
    {
        uint256 score = storageContract.getThreatScore(ip);
        uint8 level = calculatorContract.evaluateRiskLevel(score);
        bool shouldBlock = score >= threshold;
        
        return (ip, score, level, shouldBlock);
    }
    
    /**
     * @notice 批量查询并返回过滤后的结果（仅返回高风险IP）
     * @param ips 要查询的 IP 列表
     * @param threshold 封禁阈值
     * @return 过滤后的高风险IP结果
     */
    function checkMultipleIPsFiltered(string[] calldata ips, uint256 threshold) 
        external 
        view 
        returns (BulkResult[] memory) 
    {
        // 首先计算总数
        uint256 highRiskCount = 0;
        for (uint i = 0; i < ips.length; i++) {
            uint256 score = storageContract.getThreatScore(ips[i]);
            if (score >= threshold) {
                highRiskCount++;
            }
        }
        
        // 创建结果数组
        BulkResult[] memory results = new BulkResult[](highRiskCount);
        uint256 index = 0;
        
        for (uint i = 0; i < ips.length; i++) {
            uint256 score = storageContract.getThreatScore(ips[i]);
            uint8 level = calculatorContract.evaluateRiskLevel(score);
            bool blockIt = score >= threshold;
            
            if (blockIt) {
                results[index] = BulkResult(ips[i], score, level, blockIt);
                index++;
            }
        }
        
        return results;
    }
    
    /**
     * @notice 获取威胁IP列表
     * @param ips 要检查的IP列表
     * @return 威胁IP信息数组
     */
    function getThreatIPs(string[] calldata ips) 
        external 
        view 
        returns (ThreatInfo[] memory) 
    {
        ThreatInfo[] memory threatIPs = new ThreatInfo[](ips.length);
        uint count = 0;

        for (uint i = 0; i < ips.length; i++) {
            bool isThreat = storageContract.isThreatSource(ips[i]);
            if (isThreat) {
                (, , uint8 tLevel, uint256 timestamp, string memory tType, bool isActive) = 
                    storageContract.getThreatIntel(ips[i]);
                
                uint256 score = storageContract.getThreatScore(ips[i]);
                uint8 riskLevel = calculatorContract.evaluateRiskLevel(score);

                threatIPs[count] = ThreatInfo({
                    ip: ips[i],
                    score: score,
                    riskLevel: riskLevel,
                    threatLevel: tLevel,
                    timestamp: timestamp,
                    threatType: tType,
                    isActive: isActive
                });
                
                count++;
            }
        }

        // 调整数组大小以仅包含实际的威胁IP
        ThreatInfo[] memory result = new ThreatInfo[](count);
        for (uint i = 0; i < count; i++) {
            result[i] = threatIPs[i];
        }
        
        return result;
    }
    
    /**
     * @notice 获取所有威胁IP的详细信息
     * @param ips 要检查的IP列表
     * @return 所有IP的威胁信息数组
     */
    function getAllThreatInfo(string[] calldata ips) 
        external 
        view 
        returns (ThreatInfo[] memory) 
    {
        ThreatInfo[] memory results = new ThreatInfo[](ips.length);

        for (uint i = 0; i < ips.length; i++) {
            bool isThreat = storageContract.isThreatSource(ips[i]);
            uint256 score = storageContract.getThreatScore(ips[i]);
            uint8 riskLevel = calculatorContract.evaluateRiskLevel(score);
            
            if (isThreat) {
                (, , uint8 tLevel, uint256 timestamp, string memory tType, bool isActive) = 
                    storageContract.getThreatIntel(ips[i]);
                
                results[i] = ThreatInfo({
                    ip: ips[i],
                    score: score,
                    riskLevel: riskLevel,
                    threatLevel: tLevel,
                    timestamp: timestamp,
                    threatType: tType,
                    isActive: isActive
                });
            } else {
                results[i] = ThreatInfo({
                    ip: ips[i],
                    score: score,
                    riskLevel: riskLevel,
                    threatLevel: 0,
                    timestamp: 0,
                    threatType: "",
                    isActive: false
                });
            }
        }
        
        return results;
    }
    
    /**
     * @notice 更新存储合约地址
     * @param newStorage 新的存储合约地址
     */
    function updateStorageContract(address newStorage) external {
        require(newStorage != address(0), "Invalid address");
        storageContract = IThreatCoordination(newStorage);
    }
    
    /**
     * @notice 更新风险计算器合约地址
     * @param newCalc 新的风险计算器合约地址
     */
    function updateCalculatorContract(address newCalc) external {
        require(newCalc != address(0), "Invalid address");
        calculatorContract = IRiskCalculator(newCalc);
    }
}