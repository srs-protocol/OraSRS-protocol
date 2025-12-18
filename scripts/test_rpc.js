import { ethers } from 'ethers';

async function testRPC() {
    const endpoints = [
        'https://api.orasrs.net',
        'http://127.0.0.1:8545'
    ];

    for (const endpoint of endpoints) {
        console.log(`\n测试 ${endpoint}...`);
        try {
            const provider = new ethers.JsonRpcProvider(endpoint);
            const network = await provider.getNetwork();
            const blockNumber = await provider.getBlockNumber();

            console.log(`✅ 连接成功`);
            console.log(`  Chain ID: ${network.chainId}`);
            console.log(`  Network Name: ${network.name}`);
            console.log(`  Block Number: ${blockNumber}`);

            // Test contract read
            const contractAddress = '0xE6E340D132b5f46d1e472DebcD681B2aBc16e57E';
            const code = await provider.getCode(contractAddress);
            console.log(`  Contract at ${contractAddress}: ${code === '0x' ? '不存在' : '已部署'}`);

        } catch (error) {
            console.log(`❌ 连接失败: ${error.message}`);
        }
    }
}

testRPC().catch(console.error);
