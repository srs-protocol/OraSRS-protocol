// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title 威胁态势分析合约
 * @notice 用于分析宏观数据，提供仪表盘数据
 */
contract ThreatStats {
    // 统计每种攻击类型的总次数
    mapping(uint8 => uint256) public attackTypeCounts;
    
    // 全网总威胁数
    uint256 public totalThreatsDetected;

    // 最高危的 IP (简单的 Top 1 记录)
    string public topThreatIp;
    uint256 public topThreatScore;

    event GlobalStatsUpdated(uint256 total, string topIp);

    // 只有核心协调合约能调用此函数更新数据
    function updateStats(uint8 attackType, string calldata ip, uint256 newScore) external {
        // 1. 更新分类统计
        attackTypeCounts[attackType]++;
        
        // 2. 更新总量
        totalThreatsDetected++;

        // 3. 更新"头号公敌"
        if (newScore > topThreatScore) {
            topThreatScore = newScore;
            topThreatIp = ip;
        }

        emit GlobalStatsUpdated(totalThreatsDetected, topThreatIp);
    }

    // 获取仪表盘需要的所有统计数据
    function getDashboardStats() external view returns (
        uint256 total, 
        string memory mostDangerousIp, 
        uint256 maxScore,
        uint256[] memory typeDistribution
    ) {
        // 返回前 6 种攻击类型的统计分布
        uint256[] memory distribution = new uint256[](6);
        for(uint8 i=0; i<6; i++) {
            distribution[i] = attackTypeCounts[i];
        }

        return (totalThreatsDetected, topThreatIp, topThreatScore, distribution);
    }
    
    /**
     * @notice 获取指定攻击类型的统计数
     * @param attackType 攻击类型
     * @return count 统计数
     */
    function getAttackTypeCount(uint8 attackType) external view returns (uint256 count) {
        return attackTypeCounts[attackType];
    }
    
    /**
     * @notice 重置统计数据（治理合约权限）
     */
    function resetStats() external {
        // 此函数可由治理合约调用以重置统计数据
        totalThreatsDetected = 0;
        topThreatScore = 0;
        delete topThreatIp;
        
        for(uint8 i = 0; i < 6; i++) {
            attackTypeCounts[i] = 0;
        }
    }
}