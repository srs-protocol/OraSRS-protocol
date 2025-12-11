#!/usr/bin/env node

/**
 * OraSRS (Oracle Security Root Service) 客户端启动脚本 - 调试版本
 * 打包版本 - 支持连接OraSRS协议链 (api.orasrs.net)
 */

console.log('开始加载 OraSRS 服务...');

try {
  const OraSRSServiceModule = require('./srs-service');
  console.log('srs-service 加载成功:', typeof OraSRSServiceModule);
  
  // 检查导出的内容
  console.log('导出的内容:', Object.keys(OraSRSServiceModule || {}).join(', '));
  
  // 获取 OraSRSService 类
  const OraSRSService = OraSRSServiceModule.default || OraSRSServiceModule;
  console.log('OraSRSService 类:', typeof OraSRSService);
  
  if (typeof OraSRSService !== 'function') {
    console.error('错误: OraSRSService 不是函数');
    console.error('实际类型:', typeof OraSRSService);
    process.exit(1);
  }
  
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

  console.log('创建 OraSRSService 实例...');
  const orasrsService = new OraSRSService(config);
  console.log('OraSRSService 实例创建成功');

  async function startService() {
    try {
      await orasrsService.start();
      
      console.log('\n✅ OraSRS 服务启动成功!');
      console.log(`🌐 服务地址: http://${config.host}:${config.port}`);
      console.log('📋 API 端点:');
      console.log(`   - 风险查询: http://${config.host}:${config.port}/orasrs/v1/query?ip=1.2.3.4`);
      console.log(`   - 威胁情报API: http://${config.host}:${config.port}/orasrs/v2/threat-list`);
      console.log('\n⚠️  重要提醒: 此服务提供咨询建议，最终决策由客户端做出');
      console.log('🔗 服务已连接到OraSRS协议链: ' + config.blockchain.endpoint);
      
      // 保持进程运行
      setInterval(() => {
        console.log(`服务运行中... [${new Date().toISOString()}]`);
      }, 30000);
      
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
      if (orasrsService.stop) {
        await orasrsService.stop();
      }
      console.log('✅ OraSRS 服务已关闭');
    } catch (error) {
      console.error('关闭 OraSRS 服务时出错:', error);
    }
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 正在关闭 OraSRS 服务...');
    try {
      if (orasrsService.stop) {
        await orasrsService.stop();
      }
      console.log('✅ OraSRS 服务已关闭');
    } catch (error) {
      console.error('关闭 OraSRS 服务时出错:', error);
    }
    process.exit(0);
  });
} catch (error) {
  console.error('加载 OraSRS 服务时出错:', error);
  console.error('错误堆栈:', error.stack);
  process.exit(1);
}
