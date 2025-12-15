const hre = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("🚀 Starting deployment of Whitelist-Fixed System...");

    // 1. Deploy ContractRegistry
    console.log("\n1. Deploying ContractRegistry...");
    const ContractRegistry = await hre.ethers.getContractFactory("ContractRegistry");
    const registry = await ContractRegistry.deploy();
    await registry.waitForDeployment();
    const registryAddress = await registry.getAddress();
    console.log("✅ ContractRegistry deployed to:", registryAddress);

    // 2. Deploy GlobalWhitelist (Fixed version)
    console.log("\n2. Deploying GlobalWhitelist...");
    const GlobalWhitelist = await hre.ethers.getContractFactory("GlobalWhitelist");
    const whitelist = await GlobalWhitelist.deploy();
    await whitelist.waitForDeployment();
    const whitelistAddress = await whitelist.getAddress();
    console.log("✅ GlobalWhitelist deployed to:", whitelistAddress);

    // 3. Deploy OptimizedThreatRegistry
    console.log("\n3. Deploying OptimizedThreatRegistry...");
    const OptimizedThreatRegistry = await hre.ethers.getContractFactory("OptimizedThreatRegistry");
    const threatRegistry = await OptimizedThreatRegistry.deploy();
    await threatRegistry.waitForDeployment();
    const threatRegistryAddress = await threatRegistry.getAddress();
    console.log("✅ OptimizedThreatRegistry deployed to:", threatRegistryAddress);

    // 4. Register contracts
    console.log("\n4. Registering contracts...");
    await registry.updateAddress("GlobalWhitelist", whitelistAddress);
    await registry.updateAddress("OptimizedThreatRegistry", threatRegistryAddress);
    // Also register as ThreatIntelligenceCoordination for backward compatibility if needed
    await registry.updateAddress("ThreatIntelligenceCoordination", threatRegistryAddress);
    console.log("✅ Contracts registered");

    // 5. Add initial whitelist IPs
    console.log("\n5. Adding initial whitelist IPs...");
    const ipsToAdd = [
        "142.171.74.13", // Test protocol chain address
        "127.0.0.1",
        "::1",
        "8.8.8.8",
        "8.8.4.4",
        "1.1.1.1",
        "1.0.0.1",
        "208.67.222.222",
        "208.67.220.220",
        "9.9.9.9",
        "149.112.112.112"
    ];
    await whitelist.batchAddToWhitelist(ipsToAdd);
    console.log(`✅ Added ${ipsToAdd.length} IPs to whitelist`);

    // 6. Save configuration
    console.log("\n6. Saving configuration...");

    // Save for Oracle
    fs.writeFileSync('oracle/contract_address.txt', threatRegistryAddress);

    // Save for Client
    const config = {
        network: {
            registryAddress: registryAddress,
            contractAddress: threatRegistryAddress
        }
    };
    fs.writeFileSync('local-config.json', JSON.stringify(config, null, 2));

    // Update blockchain-connector.js default registry address (optional, but good for consistency)
    // We won't modify the code file here, but print instructions
    console.log("\n⚠️  IMPORTANT: Please update your client configuration with:");
    console.log(`Registry Address: ${registryAddress}`);
    console.log(`Threat Registry: ${threatRegistryAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
