// performance-benchmark.js
// OraSRS协议性能基准测试

import { OraSRSClient } from './advanced-orasrs-client.js';
import { performance } from 'perf_hooks';

async function runPerformanceBenchmark() {
  console.log('🚀 开始OraSRS协议性能基准测试...\n');

  // 初始化客户端
  const client = new OraSRSClient();
  await client.initializeContracts();
  
  // 测试1: 单连接性能
  console.log('🧪 测试1: 协议链连接性能');
  const connectStart = performance.now();
  const connectionResult = await client.testConnection();
  const connectEnd = performance.now();
  console.log(`  连接时间: ${(connectEnd - connectStart).toFixed(2)}ms`);
  console.log(`  链ID: ${connectionResult.network.chainId}`);
  console.log(`  当前区块: ${connectionResult.blockNumber}\n`);

  // 测试2: 单风险评估性能
  console.log('🧪 测试2: 风险评估性能');
  const testIPs = ['1.2.3.4', '5.6.7.8', '9.10.11.12', '13.14.15.16', '8.8.8.8'];
  const assessmentTimes = [];
  
  for (const ip of testIPs) {
    const start = performance.now();
    const result = await client.getIPThreatScore(ip);
    const end = performance.now();
    const time = end - start;
    assessmentTimes.push(time);
    
    if (result) {
      console.log(`  ${ip}: ${(time).toFixed(2)}ms, 分数=${result.score}`);
    }
  }
  
  const avgAssessmentTime = assessmentTimes.reduce((a, b) => a + b, 0) / assessmentTimes.length;
  console.log(`  平均风险评估时间: ${avgAssessmentTime.toFixed(2)}ms\n`);

  // 测试3: 批量查询性能
  console.log('🧪 测试3: 批量查询性能');
  const batchStart = performance.now();
  const batchResult = await client.getMultipleIPThreatScores(testIPs, 50);
  const batchEnd = performance.now();
  console.log(`  批量查询时间: ${(batchEnd - batchStart).toFixed(2)}ms`);
  console.log(`  查询IP数量: ${testIPs.length}`);
  console.log(`  平均每IP时间: ${((batchEnd - batchStart) / testIPs.length).toFixed(2)}ms\n`);

  // 测试4: 大量IP查询性能 (模拟10万级黑名单场景)
  console.log('🧪 测试4: 大量IP查询性能测试');
  const largeIPList = [];
  for (let i = 0; i < 1000; i++) {  // 使用1000个IP来模拟(完整10万会耗时太久)
    largeIPList.push(`192.168.${Math.floor(i/256)}.${i%256}`);
  }
  
  // 添加一些已知的威胁IP以确保有返回结果
  largeIPList.push('1.2.3.4');
  largeIPList.push('5.6.7.8');
  
  console.log(`  准备查询 ${largeIPList.length} 个IP...`);
  const largeBatchStart = performance.now();
  // 由于数量大，我们分批处理
  const batchSize = 100;
  let processed = 0;
  
  for (let i = 0; i < largeIPList.length; i += batchSize) {
    const batch = largeIPList.slice(i, i + batchSize);
    await client.getMultipleIPThreatScores(batch, 0); // 阈值设为0以获取所有结果
    processed += batch.length;
    console.log(`    已处理 ${processed}/${largeIPList.length} 个IP`);
  }
  
  const largeBatchEnd = performance.now();
  console.log(`  大量查询总时间: ${(largeBatchEnd - largeBatchStart).toFixed(2)}ms`);
  console.log(`  平均每IP处理时间: ${((largeBatchEnd - largeBatchStart) / largeIPList.length).toFixed(4)}ms\n`);

  // 测试5: 威胁IP同步性能
  console.log('🧪 测试5: 威胁IP同步性能');
  const syncStart = performance.now();
  const syncResult = await client.syncChainThreatIPs();
  const syncEnd = performance.now();
  console.log(`  同步时间: ${(syncEnd - syncStart).toFixed(2)}ms`);
  console.log(`  同步威胁IP数量: ${syncResult ? syncResult.length : 0}\n`);

  // 测试6: 代币信息查询性能
  console.log('🧪 测试6: 代币合约查询性能');
  const tokenStart = performance.now();
  const tokenResult = await client.getTokenInfo();
  const tokenEnd = performance.now();
  console.log(`  代币查询时间: ${(tokenEnd - tokenStart).toFixed(2)}ms`);
  if (tokenResult) {
    console.log(`  代币名称: ${tokenResult.name}`);
    console.log(`  代币符号: ${tokenResult.symbol}`);
    console.log(`  总供应量: ${tokenResult.totalSupply}\n`);
  }

  // 汇总性能数据
  console.log('📊 性能测试汇总:');
  console.log(`  - 协议链连接: ${(connectEnd - connectStart).toFixed(2)}ms`);
  console.log(`  - 平均风险评估: ${avgAssessmentTime.toFixed(2)}ms/次`);
  console.log(`  - 批量查询: ${(batchEnd - batchStart).toFixed(2)}ms (${testIPs.length} IPs)`);
  console.log(`  - 大量IP查询: ${((largeBatchEnd - largeBatchStart) / largeIPList.length).toFixed(4)}ms/IP`);
  console.log(`  - 威胁IP同步: ${(syncEnd - syncStart).toFixed(2)}ms`);
  console.log(`  - 代币信息查询: ${(tokenEnd - tokenStart).toFixed(2)}ms\n`);

  // 计算TPS (Transactions Per Second)
  const assessmentTPS = (testIPs.length / (assessmentTimes.reduce((a, b) => a + b, 0) / 1000)).toFixed(2);
  console.log(`📈 估算TPS: ${assessmentTPS} (基于风险评估)`);
  
  // 内存使用情况
  const used = process.memoryUsage();
  for (let key in used) {
    console.log(`📝 ${key}: ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
  }

  console.log('\n✅ 性能基准测试完成！');

  // 返回性能数据用于论文
  return {
    connectionTime: connectEnd - connectStart,
    avgAssessmentTime: avgAssessmentTime,
    batchQueryTime: batchEnd - batchStart,
    largeBatchTimePerIP: (largeBatchEnd - largeBatchStart) / largeIPList.length,
    syncTime: syncEnd - syncStart,
    totalIPsTested: largeIPList.length,
    tps: assessmentTPS,
    memoryUsage: used,
    threatsSynced: syncResult ? syncResult.length : 0
  };
}

// 运行性能基准测试
runPerformanceBenchmark()
  .then(results => {
    console.log('\n📋 基准测试结果已生成，可用于论文数据:');
    console.log(JSON.stringify(results, null, 2));
  })
  .catch(error => {
    console.error('❌ 性能测试执行错误:', error);
    process.exit(1);
  });
