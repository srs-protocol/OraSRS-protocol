import BlockchainConnector from '../blockchain-connector.js';

async function main() {
    console.log("Testing Global Whitelist Integration...");

    const connector = new BlockchainConnector({
        endpoint: 'http://127.0.0.1:8545',
        registryAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3'
    });

    // 1. Connect
    await connector.connect();

    // 2. Test Whitelisted IP (8.8.8.8)
    console.log("Checking 8.8.8.8 (Google DNS)...");
    const data1 = await connector.getThreatData('8.8.8.8');
    console.log("Response for 8.8.8.8:", JSON.stringify(data1, null, 2));

    if (data1.response.risk_level === '安全' && data1.response.version === '2.0-whitelist') {
        console.log("✅ 8.8.8.8 is correctly identified as whitelisted.");
    } else {
        console.error("❌ 8.8.8.8 check failed.");
        process.exit(1);
    }

    // 3. Test Whitelisted IP (62.234.21.175)
    console.log("Checking 62.234.21.175 (Specific IP)...");
    const data2 = await connector.getThreatData('62.234.21.175');

    if (data2.response.risk_level === '安全' && data2.response.version === '2.0-whitelist') {
        console.log("✅ 62.234.21.175 is correctly identified as whitelisted.");
    } else {
        console.error("❌ 62.234.21.175 check failed.");
        process.exit(1);
    }

    // 4. Test New Whitelisted IP (142.171.74.13)
    console.log("Checking 142.171.74.13 (New Request)...");
    const data3 = await connector.getThreatData('142.171.74.13');

    if (data3.response.risk_level === '安全' && data3.response.version === '2.0-whitelist') {
        console.log("✅ 142.171.74.13 is correctly identified as whitelisted.");
    } else {
        console.error("❌ 142.171.74.13 check failed.");
        process.exit(1);
    }

    // 5. Test Non-Whitelisted IP
    console.log("Checking 1.2.3.4 (Random IP)...");
    const data4 = await connector.getThreatData('1.2.3.4');
    // Should return "no-data" or actual threat data, but NOT whitelist response
    if (data4.response.version !== '2.0-whitelist') {
        console.log("✅ 1.2.3.4 is NOT whitelisted (Correct).");
    } else {
    }
}

main().catch(console.error);
