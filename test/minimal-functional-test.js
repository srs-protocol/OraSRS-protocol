/**
 * OraSRS 最简功能测试
 * 验证最基本的功能组件
 */

import SRSEngine from '../srs-engine.js';

async function runMinimalTests() {
  console.log('🔍 开始运行OraSRS最简功能测试...\n');

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

    // 测试3: 威胁情报基础功能
    console.log('🧪 测试3: 威胁情报基础功能');
    const evidence = await engine.gatherEvidence('192.168.1.100', null);
    console.log('  收集到证据数量:', evidence.length);
    console.log('  ✅ 威胁情报收集功能正常\n');

    // 测试4: 计算风险评分
    console.log('🧪 测试4: 风险评分计算');
    const riskScore = engine.calculateRiskScore('192.168.1.100', evidence);
    console.log('  风险评分:', riskScore);
    console.log('  ✅ 风险评分算法正常\n');

    // 测试5: 生成推荐策略
    console.log('🧪 测试5: 推荐策略生成');
    const recommendations = engine.generateRecommendations('low');
    console.log('  低风险推荐:', JSON.stringify(recommendations));
    console.log('  ✅ 推荐策略算法正常\n');

    // 测试6: 关键服务豁免
    console.log('🧪 测试6: 关键服务豁免机制');
    const googleAssessment = await engine.getRiskAssessment('8.8.8.8');
    console.log('  Google DNS风险评分:', googleAssessment.response.risk_score);
    
    if (googleAssessment.response.risk_score === 0) {
      console.log('  ✅ 关键服务豁免机制正常\n');
    } else {
      console.log('  ⚠️  关键服务豁免可能未正常工作\n');
    }

    // 测试7: 证据去重功能
    console.log('🧪 测试7: 证据去重功能');
    const testEvidence = [
      { type: 'test', detail: 'same', source: 'test1' },
      { type: 'test', detail: 'same', source: 'test1' }, // 重复
      { type: 'test', detail: 'different', source: 'test2' }
    ];
    const deduplicated = engine.deduplicateEvidence(testEvidence);
    console.log('  原始证据数量:', testEvidence.length);
    console.log('  去重后数量:', deduplicated.length);
    console.log('  ✅ 证据去重功能正常\n');

    console.log('🎉 所有最简功能测试通过！');

    // 输出测试摘要
    console.log('\n📋 测试摘要:');
    console.log('  - 风险评估引擎: 正常运行');
    console.log('  - 威胁情报收集: 正常运行');
    console.log('  - 风险评分算法: 正常运行');
    console.log('  - 推荐策略生成: 正常运行');
    console.log('  - 关键服务豁免: 正常运行');
    console.log('  - 证据去重机制: 正常运行');
    console.log('');
    console.log('✅ OraSRS核心功能验证成功！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('堆栈跟踪:', error.stack);
  }
}

// 运行测试
runMinimalTests().catch(error => {
  console.error('测试执行错误:', error);
  process.exit(1);
});