const hre = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("🚀 Deploying ThreatReport Contract...");

    // 1. Get ContractRegistry address
    // We assume ContractRegistry is already deployed. 
    // We can read it from local-config.json or use the known address.
    let registryAddress;
    try {
        const config = JSON.parse(fs.readFileSync('local-config.json', 'utf8'));
        registryAddress = config.network.registryAddress;
    } catch (e) {
        console.log("⚠️  Could not read local-config.json, using default address");
        registryAddress = '0xb9bEECD1A582768711dE1EE7B0A1d582D9d72a6C'; // From previous step
    }

    console.log(`Using ContractRegistry at: ${registryAddress}`);
    const ContractRegistry = await hre.ethers.getContractFactory("ContractRegistry");
    const registry = ContractRegistry.attach(registryAddress);

    // 2. Deploy ThreatReport
    const ThreatReport = await hre.ethers.getContractFactory("ThreatReport");
    const threatReport = await ThreatReport.deploy();
    await threatReport.waitForDeployment();
    const threatReportAddress = await threatReport.getAddress();
    console.log("✅ ThreatReport deployed to:", threatReportAddress);

    // 3. Register Contract
    console.log("Registering ThreatReport in ContractRegistry...");
    try {
        await registry.updateAddress("ThreatReport", threatReportAddress);
        console.log("✅ Registered successfully");
    } catch (e) {
        console.error("❌ Failed to register (are you owner?):", e.message);
        // If we are on localhost and using the same account, it should work.
    }

    // 4. Save address for Oracle
    fs.writeFileSync('oracle/threat_report_address.txt', threatReportAddress);

    // Update local-config.json to include this new contract?
    // Clients usually look up via Registry, but we can add it for reference.
    try {
        const config = JSON.parse(fs.readFileSync('local-config.json', 'utf8'));
        config.network.threatReportAddress = threatReportAddress;
        fs.writeFileSync('local-config.json', JSON.stringify(config, null, 2));
        console.log("✅ Updated local-config.json");
    } catch (e) {
        console.error("Failed to update config:", e.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
