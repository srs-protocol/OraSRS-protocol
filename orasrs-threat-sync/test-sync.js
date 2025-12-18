// test-sync.js
// 测试威胁情报同步功能

const ThreatIntelligenceSync = require('./ThreatIntelligenceSync');
const config = require('./config.json');

async function testSync() {
  console.log('🧪 开始测试威胁情报同步功能...');
  console.log('');

  const { 
    providerUrl, 
    contracts: {
      threatIntelligenceCoordination,
      simpleSecurityActionContract,
      nodeRegistry
    } 
  } = config;

  // 创建同步器实例（不启动事件监听）
  const syncer = new ThreatIntelligenceSync(
    providerUrl,
    threatIntelligenceCoordination,
    simpleSecurityActionContract,
    nodeRegistry
  );

  console.log('✅ 同步器实例创建成功');
  console.log('');

  // 测试连接
  try {
    console.log('🔗 测试区块链连接...');
    const provider = syncer.provider;
    const blockNumber = await provider.getBlockNumber();
    console.log(`✅ 区块链连接正常，当前区块高度: ${blockNumber}`);
  } catch (error) {
    console.error('❌ 区块链连接测试失败:', error.message);
  }
  console.log('');

  // 测试获取节点列表
  try {
    console.log('📋 测试获取节点列表...');
    const nodes = await syncer.getNodeList();
    console.log(`✅ 获取到 ${nodes.length} 个节点:`);
    nodes.forEach((node, index) => {
      console.log(`   ${index + 1}. ${node.ip}:${node.port} (${node.wallet})`);
    });
  } catch (error) {
    console.error('❌ 获取节点列表测试失败:', error.message);
  }
  console.log('');

  // 测试系统命令执行（仅在测试模式下）
  console.log('🔧 测试本地命令执行功能...');
  try {
    // 在测试环境中，我们不实际执行iptables命令，只是测试函数
    const result = await syncer.executeCommand('echo "Test successful"');
    console.log('✅ 命令执行功能正常:', result.trim());
  } catch (error) {
    console.error('❌ 命令执行测试失败:', error.message);
  }
  console.log('');

  console.log('✅ 所有测试完成！');
  console.log('');
  console.log('📋 架构总结:');
  console.log('   1. 链上威胁情报同步 (On-Chain Sync)');
  console.log('   2. 本地安全执行 (Local Firewall Action)');
  console.log('   3. 无需P2P网络，直接使用区块链作为公告板');
  console.log('   4. 威胁情报发布者 -> 区块链 -> 订阅者 -> 本地执行');
}

if (require.main === module) {
  testSync().catch(console.error);
}

module.exports = testSync;