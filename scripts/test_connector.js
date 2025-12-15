import BlockchainConnector from '../blockchain-connector.js';

async function main() {
    const config = {
        endpoint: 'http://127.0.0.1:8545', // Use local node directly
        contractAddress: '0xE6E340D132b5f46d1e472DebcD681B2aBc16e57E',
        contractNames: {
            threatCoordination: "OptimizedThreatRegistry",
            globalWhitelist: "GlobalWhitelist"
        }
    };

    const connector = new BlockchainConnector(config);
    const ip = "162.243.103.246";

    console.log(`Testing connector for IP ${ip}...`);

    // Force connection
    await connector.connect();

    const result = await connector.getThreatData(ip);
    console.log("Result:", JSON.stringify(result, null, 2));
}

main().catch(console.error);
