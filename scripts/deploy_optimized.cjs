const hre = require("hardhat");

async function main() {
    console.log("Deploying OptimizedThreatRegistry...");

    const OptimizedThreatRegistry = await hre.ethers.getContractFactory("OptimizedThreatRegistry");
    const registry = await OptimizedThreatRegistry.deploy();

    await registry.waitForDeployment();

    const address = await registry.getAddress();
    console.log("OptimizedThreatRegistry deployed to:", address);

    // Save address to a file for Oracle to read
    const fs = require('fs');
    fs.writeFileSync('oracle/contract_address.txt', address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
