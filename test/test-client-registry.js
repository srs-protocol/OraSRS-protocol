import BlockchainConnector from '../blockchain-connector.js';

async function main() {
    console.log("Testing BlockchainConnector with Registry...");

    const connector = new BlockchainConnector({
        endpoint: 'http://127.0.0.1:8545', // Local Hardhat
        registryAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3' // Fixed Registry Address
    });

    // 1. Connect
    const connected = await connector.connect();
    if (!connected) {
        console.error("Failed to connect to blockchain.");
        process.exit(1);
    }

    // 2. Resolve Address Manually
    console.log("Resolving 'ThreatIntelligenceCoordination'...");
    const address = await connector.resolveContractAddress("ThreatIntelligenceCoordination");
    console.log("Resolved Address:", address);

    if (!address) {
        console.error("Failed to resolve address.");
        process.exit(1);
    }

    // 3. Test getThreatData (which uses internal resolution)
    console.log("Testing getThreatData('8.8.8.8')...");

    // Debug: Generate expected data using ethers
    const { ethers } = await import("ethers");
    const abiCoder = new ethers.AbiCoder();
    // Selector for queryThreatData(string) - assuming 0x620a9830
    const selector = "0x620a9830";
    const expectedData = selector + abiCoder.encode(["string"], ["8.8.8.8"]).slice(2);
    console.log("Expected Data:", expectedData);

    const data = await connector.getThreatData('8.8.8.8');
    console.log("Threat Data:", JSON.stringify(data, null, 2));

    if (data && data.response && data.response.risk_level) {
        console.log("SUCCESS: Client integration verified.");
    } else {
        console.error("FAILURE: Invalid threat data response.");
        process.exit(1);
    }
}

main().catch(console.error);
