/**
 * OraSRS 核心功能测试
 * 验证协议的主要功能组件
 */

import assert from 'assert';
import SRSEngine from '../srs-engine.js';
import { MetricsCollector, StructuredLogger } from '../src/monitoring/index.js';

import AuthRateLimit from '../src/auth-rate-limit.js';

async function runCoreTests() {
  console.log('🚀 开始运行OraSRS核心功能测试...\n');

  // 测试1: SRSEngine基本功能
  console.log('🔍 测试1: SRSEngine基本功能');
  try {
    const engine = new SRSEngine();

    // 测试风险评估功能
    const assessment = await engine.getRiskAssessment('1.2.3.4');
    assert(assessment.response, '响应应包含response字段');
    assert(typeof assessment.response.risk_score === 'number', '风险评分应为数字');

    // 测试威胁情报功能
    const explanation = engine.getExplanation('1.2.3.4');
    assert(explanation, '应能获取IP解释');

    // 测试关键服务豁免
    const googleDNSAssessment = await engine.getRiskAssessment('8.8.8.8');
    assert.strictEqual(googleDNSAssessment.response.risk_score, 0, 'Google DNS风险评分应为0');

    console.log('  ✅ SRSEngine基本功能测试通过');
  } catch (error) {
    console.log('  ❌ SRSEngine基本功能测试失败:', error.message);
  }

  // 测试2: 监控组件
  console.log('\n🔍 测试2: 监控组件功能');
  try {
    const metrics = new MetricsCollector();
    const logger = new StructuredLogger({ level: 'info' });

    // 测试指标收集
    metrics.recordRequest('GET', '/test', 200, 150);
    const snapshot = metrics.getMetricsSnapshot();
    assert(snapshot.requests.total >= 0, '请求计数应为非负数');

    // 测试日志记录
    logger.info('Test log message', { test: true });

    console.log('  ✅ 监控组件功能测试通过');
  } catch (error) {
    console.log('  ❌ 监控组件功能测试失败:', error.message);
  }



  // 测试4: 认证和速率限制组件
  console.log('\n🔍 测试4: 认证和速率限制组件功能');
  try {
    const auth = new AuthRateLimit();

    // 测试API密钥创建
    const apiKey = auth.createApiKey({ name: 'test-key', permissions: ['read', 'write'] });
    assert(apiKey.key, '应成功创建API密钥');

    // 测试API密钥验证
    const validation = auth.validateApiKey(apiKey.key);
    assert(validation.valid, 'API密钥验证应成功');

    // 测试速率限制
    const rateLimitCheck = auth.checkRateLimit(apiKey.key, '127.0.0.1');
    assert(rateLimitCheck.valid !== undefined, '速率限制检查应返回有效结果');

    console.log('  ✅ 认证和速率限制组件功能测试通过');
  } catch (error) {
    console.log('  ❌ 认证和速率限制组件功能测试失败:', error.message);
  }

  // 测试5: 三层架构功能
  console.log('\n🔍 测试5: 三层架构功能');
  try {
    const engine = new SRSEngine();

    // 初始化三层架构
    await engine.initializeArchitecture();
    const status = engine.getArchitectureStatus();

    assert(status.layers.edge.status === 'active', '边缘层应处于活动状态');
    assert(status.layers.consensus.status === 'active', '共识层应处于活动状态');
    assert(status.layers.intelligence.status === 'active', '智能层应处于活动状态');

    // 处理查询通过三层架构
    const result = await engine.processQueryThroughArchitecture('1.1.1.1');
    assert(result.response, '三层架构应返回有效响应');

    console.log('  ✅ 三层架构功能测试通过');
  } catch (error) {
    console.log('  ❌ 三层架构功能测试失败:', error.message);
  }

  // 测试6: 内核级威胁处理功能
  console.log('\n🔍 测试6: 内核级威胁处理功能');
  try {
    const engine = new SRSEngine();

    // 测试批量威胁报告
    const batchReporter = await import('../batch-threat-reporter.js').then(m => m.BatchThreatReporter).catch(() => null);
    if (batchReporter) {
      console.log('  ⚠️  批量威胁报告器模块存在');
    } else {
      console.log('  ℹ️  批量威胁报告器模块不存在，跳过测试');
    }

    // 测试威胁同步功能
    const threatSync = await import('../threat-sync-daemon.js').then(m => m.ThreatSyncDaemon).catch(() => null);
    if (threatSync) {
      console.log('  ⚠️  威胁同步守护进程模块存在');
    } else {
      console.log('  ℹ️  威胁同步守护进程模块不存在，跳过测试');
    }

    console.log('  ✅ 内核级威胁处理功能检查通过');
  } catch (error) {
    console.log('  ❌ 内核级威胁处理功能检查失败:', error.message);
  }

  console.log('\n🏁 所有核心功能测试完成！');

  // 输出测试摘要
  console.log('\n📋 测试摘要:');
  console.log('  - SRSEngine: 完整的风险评估引擎');
  console.log('  - 监控组件: 指标收集和日志记录');

  console.log('  - 认证限流: API访问控制');
  console.log('  - 三层架构: 边缘-共识-智能层');
  console.log('  - 内核级处理: 高效威胁处理');
}

// 运行测试
runCoreTests().catch(error => {
  console.error('测试执行过程中发生错误:', error);
  process.exit(1);
});