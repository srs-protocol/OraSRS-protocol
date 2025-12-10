// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IP 风险计算器
 * @notice 纯逻辑合约，定义风险评分算法
 */
contract IPRiskCalculator {
    
    enum AttackType {
        UNKNOWN,
        BRUTE_FORCE,  // 暴力破解
        DDOS,         // 拒绝服务
        MALWARE,      // 恶意软件传播
        SCANNING,     // 端口扫描
        PHISHING      // 钓鱼节点
    }

    // 基础分数表
    mapping(AttackType => uint256) public baseScores;

    constructor() {
        // 初始化评分标准 (可以由治理合约修改)
        baseScores[AttackType.BRUTE_FORCE] = 20;
        baseScores[AttackType.DDOS] = 50;
        baseScores[AttackType.MALWARE] = 80;
        baseScores[AttackType.SCANNING] = 10;
        baseScores[AttackType.PHISHING] = 60;
    }

    /**
     * @notice 计算单次攻击后的风险分
     * @param currentScore 当前分数
     * @param attackType 攻击类型
     * @param frequency 24小时内攻击次数
     * @return newScore 新的风险分
     */
    function calculateRisk(
        uint256 currentScore, 
        uint8 attackType, 
        uint256 frequency
    ) external view returns (uint256 newScore) {
        uint256 base = baseScores[AttackType(attackType)];
        if (base == 0) base = 10; // 默认分

        // 算法：新分数 = 旧分数 + (基础分 * 频率加成)
        // 频率越高，加成越狠
        uint256 multiplier = 1;
        if (frequency > 10) multiplier = 2;
        if (frequency > 100) multiplier = 5;

        newScore = currentScore + (base * multiplier);

        // 封顶 1000 分
        if (newScore > 1000) return 1000;
        return newScore;
    }

    /**
     * @notice 风险等级评估
     * @return level 0:安全, 1:可疑, 2:高危, 3:极度危险
     */
    function evaluateRiskLevel(uint256 score) external pure returns (uint8 level) {
        if (score < 50) return 0;
        if (score < 200) return 1;
        if (score < 600) return 2;
        return 3;
    }
    
    /**
     * @notice 更新基础评分标准
     * @param attackType 攻击类型
     * @param newScore 新的评分
     */
    function updateBaseScore(AttackType attackType, uint256 newScore) external {
        require(newScore <= 100, "Score cannot exceed 100");
        baseScores[attackType] = newScore;
    }
}