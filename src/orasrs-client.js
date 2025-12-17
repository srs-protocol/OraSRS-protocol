#!/usr/bin/env node

/**
 * OraSRS (Oracle Security Root Service) 客户端启动脚本
 * 打包版本 - 支持连接OraSRS协议链 (api.orasrs.net)
 */

const OraSRSService = require('./srs-service').default || require('./srs-service');

// 从环境变量或默认值获取配置
const config = {
  port: process.env.ORASRS_PORT || 3006,
  host: process.env.ORASRS_HOST || '0.0.0.0',
  enableLogging: process.env.ORASRS_ENABLE_LOGGING !== 'false',
  logFile: process.env.ORASRS_LOG_FILE || './logs/orasrs-service.log',
  // OraSRS协议链连接配置
  blockchain: {
    endpoint: process.env.ORASRS_BLOCKCHAIN_ENDPOINT || 'https://api.orasrs.net',
    chainId: process.env.ORASRS_CHAIN_ID || 8888,
    contractAddress: process.env.ORASRS_CONTRACT_ADDRESS || '0x0B306BF915C4d645ff596e518fAf3F9669b97016'
  }
};

console.log('🚀 启动 OraSRS (Oracle Security Root Service) 客户端...');
console.log('🔧 配置:', {
  port: config.port,
  host: config.host,
  blockchainEndpoint: config.blockchain.endpoint
});
console.log('🔗 连接到OraSRS协议链: ' + config.blockchain.endpoint);

// 确保日志目录存在
const fs = require('fs');
const path = require('path');
const logDir = path.dirname(config.logFile);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const orasrsService = new OraSRSService(config);

async function startService() {
  try {
    await orasrsService.start();
    
    console.log('\n✅ OraSRS 服务启动成功!');
    console.log(`🌐 服务地址: http://${config.host}:${config.port}`);
    console.log('📋 API 端点:');
    console.log(`   - 风险查询: http://${config.host}:${config.port}/orasrs/v1/query?ip=1.2.3.4`);
    console.log(`   - 批量查询: http://${config.host}:${config.port}/orasrs/v1/bulk-query`);
    console.log(`   - 快速查询: http://${config.host}:${config.port}/orasrs/v1/lookup/1.2.3.4`);
    console.log(`   - 申诉接口: http://${config.host}:${config.port}/orasrs/v1/appeal`);
    console.log(`   - 透明化: http://${config.host}:${config.port}/orasrs/v1/explain?ip=1.2.3.4`);
    console.log(`   - 健康检查: http://${config.host}:${config.port}/health`);
    console.log(`   - 监控指标: http://${config.host}:${config.port}/metrics`);
    console.log(`   - 服务状态: http://${config.host}:${config.port}/status`);
    console.log('\n⚠️  重要提醒: 此服务提供咨询建议，最终决策由客户端做出');
    console.log('🔗 服务已连接到OraSRS协议链: ' + config.blockchain.endpoint);
    
    // 定期输出服务统计（每5分钟）
    setInterval(() => {
      const stats = orasrsService.getStats();
      const metrics = orasrsService.metricsCollector.getMetricsSnapshot();
      console.log(`\n📊 OraSRS 服务统计 [${new Date().toISOString()}]`);
      console.log(`   缓存评估数: ${stats.engineStats.cachedAssessments}`);
      console.log(`   待处理申诉: ${stats.engineStats.pendingAppeals}`);
      console.log(`   关键服务白名单: ${stats.engineStats.criticalServiceWhitelistSize}`);
      console.log(`   总请求数: ${metrics.requests.total}`);
      console.log(`   平均响应时间: ${metrics.responseTime.avg.toFixed(2)}ms`);
      console.log(`   活跃连接数: ${metrics.activeConnections}`);
      console.log(`   错误总数: ${metrics.errors.total}`);
      console.log(`   区块链连接: 已连接到 ${config.blockchain.endpoint}`);
    }, 5 * 60 * 1000); // 5分钟
    
  } catch (error) {
    console.error('❌ 启动 OraSRS 服务失败:', error);
    process.exit(1);
  }
}

// 启动服务
startService();

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n🛑 正在关闭 OraSRS 服务...');
  try {
    await orasrsService.stop();
    console.log('✅ OraSRS 服务已关闭');
  } catch (error) {
    console.error('关闭 OraSRS 服务时出错:', error);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 正在关闭 OraSRS 服务...');
  try {
    await orasrsService.stop();
    console.log('✅ OraSRS 服务已关闭');
  } catch (error) {
    console.error('关闭 OraSRS 服务时出错:', error);
  }
  process.exit(0);
});