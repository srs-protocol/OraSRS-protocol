/**
 * OraSRS 100000个IP在线查询测试脚本（使用合约接口）
 * 连接到 @api.orasrs.net 协议链进行真实网络测试
 */

import { ethers } from "ethers";
import fs from 'fs/promises';
import path from 'path';

// OraSRS协议链配置
const ORASRS_CONFIG = {
  rpcUrl: "https://api.orasrs.net",
  chainId: 8888, // OraSRS协议链ID
};

// OraSRSReader合约ABI（只包含我们需要的函数）
const OraSRSReaderABI = [
  "function checkMultipleIPs(string[] memory ips, uint256 threshold) view returns ((string ip, uint256 score, uint8 riskLevel, bool shouldBlock)[] memory)",
  "function checkSingleIP(string memory ip, uint256 threshold) view returns (string memory ipResult, uint256 score, uint8 riskLevel, bool shouldBlock)",
  "function getThreatIPs(string[] memory ips) view returns ((string ip, uint256 score, uint8 riskLevel, uint8 threatLevel, uint256 timestamp, string threatType, bool isActive)[] memory)",
  "function getAllThreatInfo(string[] memory ips) view returns ((string ip, uint256 score, uint8 riskLevel, uint8 threatLevel, uint256 timestamp, string threatType, bool isActive)[] memory)"
];

// 加载合约地址
function loadContractAddresses() {
  try {
    if (fs.existsSyncSync('all-deployments.json')) {
      return JSON.parse(fs.readFileSyncSync('all-deployments.json', 'utf8'));
    } else if (fs.existsSyncSync('deployed_addresses/full-deployments.json')) {
      return JSON.parse(fs.readFileSyncSync('deployed_addresses/full-deployments.json', 'utf8'));
    } else {
      console.log("⚠️  未找到部署信息文件，将使用默认/已知地址");
      // 使用从代码中获取的已知地址
      return {
        oraSRSReaderAddress: "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6"
      };
    }
  } catch (error) {
    console.error("加载部署信息时出错:", error);
    return {
      oraSRSReaderAddress: "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6"
    };
  }
}

async function generateTestIPs(count) {
  const ips = [];
  for (let i = 0; i < count; i++) {
    // 生成格式为 192.168.x.y 的IP地址
    const ip = `192.168.${Math.floor(i / 256)}.${i % 256}`;
    ips.push(ip);
  }
  return ips;
}

async function runOnlineTest() {
  console.log('开始100000个IP的在线查询测试...');
  console.log('目标协议链: https://api.orasrs.net');
  
  const testIPs = await generateTestIPs(100000);
  
  const provider = new ethers.JsonRpcProvider(ORASRS_CONFIG.rpcUrl);
  
  // 获取合约地址和初始化合约
  const contractAddresses = loadContractAddresses();
  const readerContract = new ethers.Contract(
    contractAddresses.oraSRSReaderAddress,
    OraSRSReaderABI,
    provider
  );
  
  const startTime = Date.now();
  const results = [];
  let successCount = 0;
  let errorCount = 0;
  let totalRiskScore = 0;
  
  console.log(`测试开始: ${new Date().toISOString()}`);
  console.log(`总共需要查询的IP数量: ${testIPs.length}`);
  
  // 分批处理，避免单次查询过多IP
  const batchSize = 100; // 每批处理100个IP
  const delayBetweenBatches = 100; // 批次间延迟100ms
  
  for (let i = 0; i < testIPs.length; i += batchSize) {
    const batch = testIPs.slice(i, i + batchSize);
    
    try {
      const batchStartTime = Date.now();
      
      // 调用合约批量查询IP威胁分数
      const batchResults = await readerContract.checkMultipleIPs(batch, 0);
      
      const batchEndTime = Date.now();
      const batchProcessingTime = batchEndTime - batchStartTime;
      
      // 处理结果
      batchResults.forEach((result, index) => {
        const ip = result.ip;
        const score = Number(result.score);
        const riskLevel = Number(result.riskLevel);
        const shouldBlock = result.shouldBlock;
        
        totalRiskScore += score;
        successCount++;
        
        results.push({
          ip,
          score,
          riskLevel,
          shouldBlock,
          processing_time: batchProcessingTime / batch.length, // 平均处理时间
          timestamp: new Date().toISOString()
        });
      });
      
      // 记录进度
      const processed = Math.min(i + batchSize, testIPs.length);
      console.log(`进度: ${processed}/${testIPs.length}, 成功: ${successCount}, 失败: ${errorCount}`);
    } catch (error) {
      console.error(`批量查询失败 (批次 ${i}-${Math.min(i + batchSize - 1, testIPs.length - 1)}):`, error.message);
      errorCount += batchSize;
      
      // 为失败的批次添加错误记录
      for (let j = i; j < Math.min(i + batchSize, testIPs.length); j++) {
        results.push({
          ip: testIPs[j],
          error: error.message,
          processing_time: -1,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // 批次间延迟，避免对协议链造成过大压力
    if (i + batchSize < testIPs.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  const avgProcessingTime = successCount > 0 ? totalTime / successCount : 0;
  const avgRiskScore = successCount > 0 ? totalRiskScore / successCount : 0;
  
  console.log(`\n在线测试完成: ${new Date().toISOString()}`);
  console.log(`总处理时间: ${totalTime}ms`);
  console.log(`成功查询: ${successCount}`);
  console.log(`查询失败: ${errorCount}`);
  console.log(`总查询数: ${results.length}`);
  console.log(`平均处理时间: ${avgProcessingTime.toFixed(4)}ms/成功查询`);
  console.log(`平均风险评分: ${avgRiskScore.toFixed(4)}`);
  
  // 生成详细报告
  const report = {
    test_config: {
      total_ips: testIPs.length,
      test_type: '100000_ip_contract_online_test',
      target_api: 'https://api.orasrs.net',
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString()
    },
    performance_metrics: {
      total_processing_time_ms: totalTime,
      successful_queries: successCount,
      failed_queries: errorCount,
      total_queries: results.length,
      avg_processing_time_per_success_query_ms: avgProcessingTime.toFixed(4),
      total_test_duration_seconds: (totalTime / 1000).toFixed(2),
      requests_per_second: (successCount / (totalTime / 1000)).toFixed(2),
      success_rate: ((successCount / results.length) * 100).toFixed(2) + '%'
    },
    risk_assessment_stats: {
      total_successful_assessments: successCount,
      average_risk_score: avgRiskScore.toFixed(4),
      total_risk_score: totalRiskScore.toFixed(4)
    },
    results: results
  };
  
  // 保存测试日志
  const logDir = './logs';
  await fs.mkdir(logDir, { recursive: true });
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('Z')[0];
  const logFileName = `online-test-100k-ips-contract-${timestamp}.json`;
  const logFilePath = path.join(logDir, logFileName);
  
  await fs.writeFile(logFilePath, JSON.stringify(report, null, 2));
  console.log(`\n在线测试日志已保存至: ${logFilePath}`);
  
  // 生成摘要日志
  const summaryLog = {
    test_summary: {
      test_name: '100000 IP Online Contract API Test',
      total_ips: testIPs.length,
      target_api: 'https://api.orasrs.net',
      successful_queries: successCount,
      failed_queries: errorCount,
      total_time_ms: totalTime,
      avg_time_per_query_ms: avgProcessingTime.toFixed(4),
      requests_per_second: (successCount / (totalTime / 1000)).toFixed(2),
      success_rate: ((successCount / results.length) * 100).toFixed(2) + '%',
      avg_risk_score: avgRiskScore.toFixed(4),
      timestamp: new Date().toISOString()
    }
  };
  
  const summaryFileName = `online-test-100k-ips-contract-summary-${timestamp}.json`;
  const summaryFilePath = path.join(logDir, summaryFileName);
  
  await fs.writeFile(summaryFilePath, JSON.stringify(summaryLog, null, 2));
  console.log(`摘要日志已保存至: ${summaryFilePath}`);
  
  return report;
}

// 运行测试
console.log('注意：此测试将向 OraSRS 协议链发送大量查询请求，请确保您有权限执行此操作');
runOnlineTest()
  .then(() => {
    console.log('\n100000个IP在线合约查询测试完成！');
    process.exit(0);
  })
  .catch(error => {
    console.error('在线合约测试执行失败:', error);
    process.exit(1);
  });
