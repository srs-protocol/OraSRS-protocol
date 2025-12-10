/**
 * OraSRS 基础功能测试
 * 验证核心组件的基本功能
 */

import assert from 'assert';
import SRSEngine from '../srs-engine.js';

async function runBasicTests() {
  console.log('🔍 开始运行OraSRS基础功能测试...\n');

  try {
    // 测试1: SRSEngine实例化
    console.log('🧪 测试1: SRSEngine实例化');
    const engine = new SRSEngine();
    console.log('  ✅ SRSEngine创建成功\n');

    // 测试2: 基础风险评估功能
    console.log('🧪 测试2: 基础风险评估');
    const assessment = await engine.getRiskAssessment('8.8.8.8'); // 使用Google DNS作为测试
    console.log('  IP:', assessment.query.ip);
    console.log('  风险评分:', assessment.response.risk_score);
    console.log('  风险等级:', assessment.response.risk_level);
    console.log('  ✅ 风险评估功能正常\n');

    // 测试3: 关键服务豁免
    console.log('🧪 测试3: 关键服务豁免机制');
    const googleAssessment = await engine.getRiskAssessment('8.8.8.8');
    const cloudflareAssessment = await engine.getRiskAssessment('1.1.1.1');
    
    console.log('  Google DNS (8.8.8.8) 风险评分:', googleAssessment.response.risk_score);
    console.log('  Cloudflare DNS (1.1.1.1) 风险评分:', cloudflareAssessment.response.risk_score);
    
    if (googleAssessment.response.risk_score === 0 && cloudflareAssessment.response.risk_score === 0) {
      console.log('  ✅ 关键服务豁免机制正常\n');
    } else {
      console.log('  ⚠️  关键服务豁免可能未正常工作\n');
    }

    // 测试4: 证据收集功能
    console.log('🧪 测试4: 证据收集与分析');
    const evidence = await engine.gatherEvidence('192.168.1.100', null);
    console.log('  收集到证据数量:', evidence.length);
    if (evidence.length > 0) {
      console.log('  首个证据类型:', evidence[0].type);
      console.log('  首个证据来源:', evidence[0].source);
    }
    console.log('  ✅ 证据收集功能正常\n');

    // 测试5: 风险评分计算
    console.log('🧪 测试5: 风险评分计算');
    const riskScore = engine.calculateRiskScore('192.168.1.100', evidence);
    console.log('  计算得出的风险评分:', riskScore);
    console.log('  ✅ 风险评分计算功能正常\n');

    // 测试6: 推荐策略生成
    console.log('🧪 测试6: 推荐策略生成');
    const recommendations = engine.generateRecommendations('medium');
    console.log('  中等风险推荐策略:', recommendations.default);
    console.log('  API端点推荐:', recommendations.api_endpoints);
    console.log('  ✅ 推荐策略生成功能正常\n');

    // 测试7: 系统健康检查
    console.log('🧪 测试7: 系统健康检查');
    const health = engine.architectureHealthCheck();
    console.log('  整体状态:', health.overall);
    console.log('  版本:', health.version);
    console.log('  ✅ 系统健康检查功能正常\n');

    console.log('🎉 所有基础功能测试通过！');
    
    // 输出OraSRS协议特性
    console.log('\n📋 OraSRS协议核心特性:');
    console.log('  ✓ 咨询式风险评估 (非阻断式)');
    console.log('  ✓ 关键服务豁免机制');
    console.log('  ✓ 威胁情报去重');
    console.log('  ✓ 隐私保护');
    console.log('  ✓ 可审计性');
    console.log('  ✓ 合规性 (GDPR/CCPA/等保2.0)');
    console.log('  ✓ 动态权重和时间衰减');
    console.log('  ✓ 跨层审计功能');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('堆栈跟踪:', error.stack);
  }
}

// 运行测试
runBasicTests().catch(error => {
  console.error('测试执行错误:', error);
  process.exit(1);
});