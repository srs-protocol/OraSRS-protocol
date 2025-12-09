// batch-threat-reporter.js
// 批量威胁报告处理模块 - 优化合约事件数量

import { ethers } from "ethers";

class BatchThreatReporter {
  constructor(provider, contractAddresses) {
    this.provider = provider;
    this.contractAddresses = contractAddresses;
    this.threatBatchContract = null;
    this.threatIntelContract = null;
  }

  // 初始化合约实例
  async initialize() {
    // ThreatBatch合约ABI (使用batch功能)
    const threatBatchABI = [
      "function reportBatch(string[] memory ips, uint16[] memory scores) external",
      "function getProfile(string memory ip) external view returns (uint40, uint16, uint16)",
      "function getProfilesBatch(string[] calldata ips) external view returns (uint40[] memory, uint16[] memory, uint16[] memory)",
      "function getBanDuration(uint16 offenseCount) external view returns (uint32)"
    ];

    // 威胁情报合约ABI
    const threatIntelABI = [
      "function getThreatScore(string memory ip) external view returns (uint256)",
      "function batchUpdateThreatScores(string[] memory _ips, uint256[] memory _scores) external"
    ];

    // 初始化合约实例
    this.threatBatchContract = new ethers.Contract(
      this.contractAddresses.threatBatchAddress,
      threatBatchABI,
      this.provider
    );

    this.threatIntelContract = new ethers.Contract(
      this.contractAddresses.threatIntelligenceCoordinationAddress,
      threatIntelABI,
      this.provider
    );
  }

  // 批量报告威胁IP - 减少事件数量的关键功能
  async batchReportThreats(threatData) {
    if (!this.threatBatchContract) {
      throw new Error("ThreatBatch合约未初始化");
    }

    try {
      // 分离IP和分数
      const ips = threatData.map(item => item.ip);
      const scores = threatData.map(item => {
        // 将分数转换为uint16格式（0-65535）
        // 合约中使用较小的数值范围
        return Math.min(65535, Math.floor(item.score / 10)); // 缩放分数
      });

      console.log(`📊 批量报告 ${ips.length} 个威胁IP...`);

      // 调用批量报告功能
      const tx = await this.threatBatchContract.reportBatch(ips, scores);
      await tx.wait();

      console.log(`✅ 批量报告完成，交易哈希: ${tx.hash}`);
      return { success: true, txHash: tx.hash, count: ips.length };
    } catch (error) {
      console.error('❌ 批量报告失败:', error.message);
      return { success: false, error: error.message, count: 0 };
    }
  }

  // 批量更新威胁分数 - 减少合约交互次数
  async batchUpdateScores(scoreData) {
    if (!this.threatIntelContract) {
      throw new Error("ThreatIntelligence合约未初始化");
    }

    try {
      // 分离IP和分数
      const ips = scoreData.map(item => item.ip);
      const scores = scoreData.map(item => item.score);

      console.log(`🔄 批量更新 ${ips.length} 个IP的威胁分数...`);

      // 调用批量更新功能
      const tx = await this.threatIntelContract.batchUpdateThreatScores(ips, scores);
      await tx.wait();

      console.log(`✅ 批量更新完成，交易哈希: ${tx.hash}`);
      return { success: true, txHash: tx.hash, count: ips.length };
    } catch (error) {
      console.error('❌ 批量更新失败:', error.message);
      return { success: false, error: error.message, count: 0 };
    }
  }

  // 获取批量IP配置信息
  async getBatchProfiles(ips) {
    if (!this.threatBatchContract) {
      throw new Error("ThreatBatch合约未初始化");
    }

    try {
      const [lastOffenseTimes, offenseCounts, riskScores] = 
        await this.threatBatchContract.getProfilesBatch(ips);

      // 格式化返回数据
      const profiles = ips.map((ip, index) => ({
        ip,
        lastOffenseTime: Number(lastOffenseTimes[index]),
        offenseCount: Number(offenseCounts[index]),
        riskScore: Number(riskScores[index])
      }));

      return { success: true, profiles };
    } catch (error) {
      console.error('❌ 获取批量配置失败:', error.message);
      return { success: false, error: error.message, profiles: [] };
    }
  }

  // 优化的威胁IP同步方法 - 结合批量操作和内核处理
  async optimizedThreatSync(threatIPs) {
    console.log(`⚡ 执行优化的威胁IP同步，处理 ${threatIPs.length} 个IP...`);

    // 首先使用批量报告功能更新合约层
    const batchResult = await this.batchReportThreats(threatIPs);
    
    if (!batchResult.success) {
      console.error('❌ 批量报告失败，跳过内核同步');
      return batchResult;
    }

    console.log('✅ 合约层批量更新完成');

    // 然后在内核层进行O(1)匹配配置
    // 这部分通常由threat-sync-daemon.js处理
    return {
      success: true,
      contractUpdate: batchResult,
      kernelUpdate: 'Scheduled by daemon',
      totalProcessed: threatIPs.length
    };
  }
}

// 便捷函数：创建并初始化批量威胁报告器
async function createBatchThreatReporter(rpcUrl, contractAddresses) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const reporter = new BatchThreatReporter(provider, contractAddresses);
  await reporter.initialize();
  return reporter;
}

export { BatchThreatReporter, createBatchThreatReporter };