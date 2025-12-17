/**
 * OraSRS 客户端初始化测试
 * 测试完整的 onboarding 流程
 */

import ClientOnboarding from './client-onboarding.js';
import fs from 'fs';

async function main() {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║  OraSRS 客户端初始化测试                                 ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    // 加载配置
    const config = JSON.parse(fs.readFileSync('./config/client-config.json', 'utf8'));

    // 创建 onboarding 实例
    const onboarding = new ClientOnboarding(config);

    try {
        // 执行完整初始化流程
        const result = await onboarding.initialize();

        console.log('\n╔══════════════════════════════════════════════════════════╗');
        console.log('║  初始化结果                                              ║');
        console.log('╚══════════════════════════════════════════════════════════╝');
        console.log('\n✅ 初始化成功！\n');
        console.log('节点地址:', result.address);
        console.log('余额:', result.balance, 'ORA');
        console.log('节点已注册:', result.nodeRegistered ? '是' : '否');

        // 显示节点状态
        const status = await onboarding.getStatus();
        console.log('\n📊 节点状态:');
        console.log('  - 已初始化:', status.initialized);
        console.log('  - 合约数量:', status.contracts);
        console.log('  - 配置文件:', status.configPath);

        console.log('\n🎉 OraSRS 客户端已准备就绪！');
        console.log('\n下一步:');
        console.log('  1. 启动 OraSRS 客户端: npm start');
        console.log('  2. 查看节点状态: curl http://localhost:3006/orasrs/v1/status');
        console.log('  3. 查看配置: cat', status.configPath);

    } catch (error) {
        console.error('\n❌ 初始化失败:', error.message);
        console.error('\n错误详情:', error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
