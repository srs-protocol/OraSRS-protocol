/**
 * OraSRS 1000个IP在线查询测试脚本（小规模测试）
 * 连接到 @api.orasrs.net 进行真实网络测试
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

async function generateTestIPs(count) {
  const ips = [];
  for (let i = 0; i < count; i++) {
    // 生成格式为 192.168.x.y 的IP地址
    const ip = `192.168.${Math.floor(i / 256)}.${i % 256}`;
    ips.push(ip);
  }
  return ips;
}

async function queryOraSRSAPI(ip) {
  try {
    // 使用实际的OraSRS API端点
    const response = await axios.post('https://api.orasrs.net/assess', {
      ip: ip,
      queryType: 'risk_assessment'
    }, {
      timeout: 10000, // 10秒超时
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'OraSRS-Test-Client/2.0'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(`查询IP ${ip} 时出错:`, error.message);
    return {
      ip,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

async function runOnlineTest() {
  console.log('开始1000个IP的在线查询测试...');
  console.log('目标API: https://api.orasrs.net');
  
  const testIPs = await generateTestIPs(1000);
  
  const startTime = Date.now();
  const results = [];
  let successCount = 0;
  let errorCount = 0;
  let totalRiskScore = 0;
  
  console.log(`测试开始: ${new Date().toISOString()}`);
  console.log(`总共需要查询的IP数量: ${testIPs.length}`);
  
  // 分批处理，避免对API造成过大压力
  const batchSize = 50; // 每批处理50个请求
  const delayBetweenBatches = 1000; // 批次间延迟1秒
  
  for (let i = 0; i < testIPs.length; i += batchSize) {
    const batch = testIPs.slice(i, i + batchSize);
    
    // 并行处理当前批次的请求
    const batchPromises = batch.map(async (ip) => {
      const ipStartTime = Date.now();
      
      try {
        const result = await queryOraSRSAPI(ip);
        const ipEndTime = Date.now();
        const ipProcessingTime = ipEndTime - ipStartTime;
        
        // 计算成功查询的统计数据
        if (result && result.response && result.response.risk_score !== undefined) {
          totalRiskScore += result.response.risk_score;
          successCount++;
        } else {
          errorCount++;
        }
        
        return {
          ip,
          result,
          processing_time: ipProcessingTime,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        errorCount++;
        return {
          ip,
          error: error.message,
          processing_time: -1,
          timestamp: new Date().toISOString()
        };
      }
    });
    
    // 等待当前批次完成
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // 记录进度
    const processed = Math.min(i + batchSize, testIPs.length);
    console.log(`进度: ${processed}/${testIPs.length}, 成功: ${successCount}, 失败: ${errorCount}`);
    
    // 批次间延迟，避免API过载
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
      test_type: '1000_ip_online_test',
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
  const logFileName = `online-test-1k-ips-${timestamp}.json`;
  const logFilePath = path.join(logDir, logFileName);
  
  await fs.writeFile(logFilePath, JSON.stringify(report, null, 2));
  console.log(`\n在线测试日志已保存至: ${logFilePath}`);
  
  // 生成摘要日志
  const summaryLog = {
    test_summary: {
      test_name: '1000 IP Online API Test',
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
  
  const summaryFileName = `online-test-1k-ips-summary-${timestamp}.json`;
  const summaryFilePath = path.join(logDir, summaryFileName);
  
  await fs.writeFile(summaryFilePath, JSON.stringify(summaryLog, null, 2));
  console.log(`摘要日志已保存至: ${summaryFilePath}`);
  
  return report;
}

// 运行测试
console.log('注意：此测试将向 api.orasrs.net 发送请求，请确保您有权限执行此操作');
runOnlineTest()
  .then(() => {
    console.log('\n1000个IP在线查询测试完成！');
    process.exit(0);
  })
  .catch(error => {
    console.error('在线测试执行失败:', error);
    process.exit(1);
  });
