import BlockchainConnector from './blockchain-connector.js';

async function testWhitelist() {
    console.log('🔍 Testing Blockchain Whitelist...');

    const connector = new BlockchainConnector({
        endpoint: 'http://127.0.0.1:8545',
        chainId: 31337
    });

    try {
        const whitelist = await connector.getWhitelistedIPs();
        console.log(`📋 Found ${whitelist.length} whitelisted IPs:`);
        console.log(whitelist);

        const testIP = '142.171.74.13';
        if (whitelist.includes(testIP)) {
            console.log(`✅ SUCCESS: ${testIP} is in the whitelist!`);
        } else {
            console.error(`❌ FAILURE: ${testIP} is NOT in the whitelist.`);
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testWhitelist();
