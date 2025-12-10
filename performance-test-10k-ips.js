/**
 * OraSRS 10000个IP性能测试脚本
 */

import SRSEngine from './srs-engine.js';
import fs from 'fs/promises';
import path from 'path';

async function generateTestIPs(count) {
  const ips = [];
  for (let i = 0; i < count; i++) {
    const ip = `192.168.${Math.floor(i / 256)}.${i % 256}`;
    ips.push(ip);
  }
  return ips;
}

async function runPerformanceTest() {
  console.log('开始10000个IP的性能测试...');
  
  const srsEngine = new SRSEngine();
  const testIPs = await generateTestIPs(10000);
  
  const startTime = Date.now();
  const results = [];
  let totalRiskScore = 0;
  
  console.log(`测试开始: ${new Date().toISOString()}`);
  
  // 逐个测试IP，记录性能数据
  for (let i = 0; i < testIPs.length; i++) {
    const ip = testIPs[i];
    const ipStartTime = Date.now();
    
    try {
      const result = await srsEngine.getRiskAssessment(ip);
      const ipEndTime = Date.now();
      const ipProcessingTime = ipEndTime - ipStartTime;
      
      results.push({
        ip,
        risk_score: result.response.risk_score,
        processing_time: ipProcessingTime,
        timestamp: new Date().toISOString()
      });
      
      totalRiskScore += result.response.risk_score;
      
      // 每1000个IP输出一次进度
      if ((i + 1) % 1000 === 0) {
        console.log(`进度: ${i + 1}/${testIPs.length}, 最后一个IP处理时间: ${ipProcessingTime}ms`);
      }
    } catch (error) {
      console.error(`处理IP ${ip} 时出错:`, error.message);
      results.push({
        ip,
        error: error.message,
        processing_time: -1,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  const avgProcessingTime = totalRiskScore > 0 ? totalTime / testIPs.length : 0;
  const avgRiskScore = totalRiskScore / testIPs.length;
  
  console.log(`\\n测试完成: ${new Date().toISOString()}`);
  console.log(`总处理时间: ${totalTime}ms`);
  console.log(`平均处理时间: ${avgProcessingTime.toFixed(4)}ms/IP`);
  console.log(`总IP数: ${testIPs.length}`);
  console.log(`平均风险评分: ${avgRiskScore.toFixed(4)}`);
  
  // 生成详细报告
  const report = {
    test_config: {
      total_ips: testIPs.length,
      test_type: '10000_ip_performance_test',
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString()
    },
    performance_metrics: {
      total_processing_time_ms: totalTime,
      avg_processing_time_per_ip_ms: avgProcessingTime.toFixed(4),
      total_test_duration_seconds: (totalTime / 1000).toFixed(2),
      requests_per_second: (testIPs.length / (totalTime / 1000)).toFixed(2)
    },
    risk_assessment_stats: {
      total_ips_tested: testIPs.length,
      average_risk_score: avgRiskScore.toFixed(4),
      total_risk_score: totalRiskScore.toFixed(4)
    },
    results: results
  };
  
  // 保存测试日志
  const logDir = './logs';
  await fs.mkdir(logDir, { recursive: true });
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('Z')[0];
  const logFileName = `performance-test-10k-ips-${timestamp}.json`;
  const logFilePath = path.join(logDir, logFileName);
  
  await fs.writeFile(logFilePath, JSON.stringify(report, null, 2));
  console.log(`\\n测试日志已保存至: ${logFilePath}`);
  
  // 生成摘要日志
  const summaryLog = {
    test_summary: {
      test_name: '10000 IP Performance Test',
      total_ips: testIPs.length,
      total_time_ms: totalTime,
      avg_time_per_ip_ms: avgProcessingTime.toFixed(4),
      requests_per_second: (testIPs.length / (totalTime / 1000)).toFixed(2),
      avg_risk_score: avgRiskScore.toFixed(4),
      timestamp: new Date().toISOString()
    }
  };
  
  const summaryFileName = `performance-test-10k-ips-summary-${timestamp}.json`;
  const summaryFilePath = path.join(logDir, summaryFileName);
  
  await fs.writeFile(summaryFilePath, JSON.stringify(summaryLog, null, 2));
  console.log(`摘要日志已保存至: ${summaryFilePath}`);
  
  return report;
}

// 运行测试
runPerformanceTest()
  .then(() => {
    console.log('\\n10000个IP性能测试完成！');
    process.exit(0);
  })
  .catch(error => {
    console.error('测试执行失败:', error);
    process.exit(1);
  });