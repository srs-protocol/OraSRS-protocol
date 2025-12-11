// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ThreatBatch
 * @dev 高效的威胁情报批量处理合约，优化Gas使用并支持批量查询
 */
contract ThreatBatch is Ownable, ReentrancyGuard {
    
    struct CompactProfile {
        uint40 lastOffenseTime; // 上次违规时间 (节省空间)
        uint16 offenseCount;    // 违规次数
        uint16 riskScore;       // 风险分
    }

    mapping(string => CompactProfile) public profiles;

    // 批量事件，大大减少客户端的事件监听压力
    event PunishBatch(string[] ips, uint32[] durations);
    event ProfileUpdated(string ip, uint16 newScore, uint16 newOffenseCount, uint40 lastOffenseTime);

    // 常量定义
    uint32 public immutable TIER_1;   // 24小时
    uint32 public immutable TIER_2;   // 3天
    uint32 public immutable TIER_3;   // 7天
    
    // 限制单次批量操作的大小，防止Gas耗尽
    uint256 public constant MAX_BATCH_SIZE = 100;

    constructor() Ownable(msg.sender) {
        TIER_1 = 86400;   // 24小时
        TIER_2 = 259200;  // 3天
        TIER_3 = 604800;  // 7天
    }

    /**
     * @dev 批量上报威胁，极大降低交互频率
     * @param ips IP地址数组
     * @param scores 对应的风险分数
     */
    function reportBatch(string[] calldata ips, uint16[] calldata scores) external onlyOwner nonReentrant {
        require(ips.length == scores.length, "Length mismatch");
        require(ips.length > 0, "Empty batch");
        require(ips.length <= MAX_BATCH_SIZE, "Batch too large");
        
        uint32[] memory durations = new uint32[](ips.length);

        for (uint i = 0; i < ips.length; i++) {
            string memory ip = ips[i];
            CompactProfile storage p = profiles[ip];

            // 1. 更新分数
            uint256 newScore = uint256(p.riskScore) + uint256(scores[i]);
            require(newScore <= type(uint16).max, "Score overflow");
            p.riskScore = uint16(newScore);

            // 2. 计算阶梯与时长
            // 简单防抖：1小时内不重复计数
            if (block.timestamp > p.lastOffenseTime + 1 hours) {
                require(p.offenseCount < type(uint16).max, "Offense count overflow");
                p.offenseCount++;
                p.lastOffenseTime = uint40(block.timestamp);
            } else if (p.offenseCount == 0) {
                p.offenseCount = 1;
            }

            // 3. 判定时长
            if (p.offenseCount == 1) {
                durations[i] = TIER_1;
            } else if (p.offenseCount == 2) {
                durations[i] = TIER_2;
            } else {
                durations[i] = TIER_3;
            }
            
            // 发出详细更新事件
            emit ProfileUpdated(ip, p.riskScore, p.offenseCount, p.lastOffenseTime);
        }

        // 4. 发送一次批量事件
        emit PunishBatch(ips, durations);
    }
    
    /**
     * @dev 查询单个IP的威胁档案
     * @param ip IP地址
     * @return lastOffenseTime 上次违规时间
     * @return offenseCount 违规次数
     * @return riskScore 风险分数
     */
    function getProfile(string memory ip) external view returns (uint40, uint16, uint16) {
        CompactProfile storage p = profiles[ip];
        return (p.lastOffenseTime, p.offenseCount, p.riskScore);
    }
    
    /**
     * @dev 批量查询多个IP的威胁档案
     * @param ips IP地址数组
     * @return lastOffenseTimes 上次违规时间数组
     * @return offenseCounts 违规次数数组
     * @return riskScores 风险分数数组
     */
    function getProfilesBatch(string[] calldata ips) external view returns (uint40[] memory, uint16[] memory, uint16[] memory) {
        uint256 length = ips.length;
        uint40[] memory lastOffenseTimes = new uint40[](length);
        uint16[] memory offenseCounts = new uint16[](length);
        uint16[] memory riskScores = new uint16[](length);

        for (uint i = 0; i < length; i++) {
            CompactProfile storage p = profiles[ips[i]];
            lastOffenseTimes[i] = p.lastOffenseTime;
            offenseCounts[i] = p.offenseCount;
            riskScores[i] = p.riskScore;
        }
        
        return (lastOffenseTimes, offenseCounts, riskScores);
    }
    
    /**
     * @dev 获取封禁时长（基于违规次数）
     * @param offenseCount 违规次数
     * @return 封禁时长（秒）
     */
    function getBanDuration(uint16 offenseCount) external view returns (uint32) {
        if (offenseCount == 1) {
            return TIER_1;
        } else if (offenseCount == 2) {
            return TIER_2;
        } else {
            return TIER_3;
        }
    }
    
    /**
     * @dev 紧急清除功能，仅在极端情况下使用
     */
    function emergencyClearProfile(string memory ip) external onlyOwner {
        delete profiles[ip];
    }
}