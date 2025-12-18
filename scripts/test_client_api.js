import BlockchainConnector from '../blockchain-connector.js';

async function testClient() {
    console.log('测试客户端连接和查询...\n');

    const config = {
        endpoint: 'https://api.orasrs.net',
        contractAddress: '0xE6E340D132b5f46d1e472DebcD681B2aBc16e57E',
        contractNames: {
            threatCoordination: "OptimizedThreatRegistry",
            globalWhitelist: "GlobalWhitelist"
        }
    };

    const connector = new BlockchainConnector(config);

    // Test IPs from Oracle
    const testIPs = ['162.243.103.246', '15.204.219.215', '167.86.75.145'];

    for (const ip of testIPs) {
        console.log(`\n查询 IP: ${ip}`);
        try {
            const result = await connector.getThreatData(ip);
            console.log(`  风险等级: ${result.response.risk_level}`);
            console.log(`  风险评分: ${result.response.risk_score}`);
            console.log(`  建议: ${result.response.recommendations?.default || 'N/A'}`);
        } catch (error) {
            console.error(`  错误: ${error.message}`);
        }
    }
}

testClient().catch(console.error);
