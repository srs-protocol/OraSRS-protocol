const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Starting Full System Deployment (Ethers v6)...");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    // 1. Deploy ContractRegistry FIRST to get deterministic address 0x5FbDB...
    console.log("\n1. Deploying ContractRegistry...");
    const ContractRegistry = await ethers.getContractFactory("ContractRegistry");
    const registry = await ContractRegistry.deploy();
    await registry.waitForDeployment();
    console.log("✓ ContractRegistry deployed to:", registry.target);

    if (registry.target !== "0x5FbDB2315678afecb367f032d93F642f64180aa3") {
        console.warn("⚠️  WARNING: Registry address mismatch! Expected 0x5FbDB2315678afecb367f032d93F642f64180aa3");
    }

    // 2. Deploy OraSRSToken
    console.log("\n2. Deploying OraSRSToken...");
    const OraSRSToken = await ethers.getContractFactory("OraSRSToken");
    const token = await OraSRSToken.deploy();
    await token.waitForDeployment();
    console.log("✓ OraSRSToken deployed to:", token.target);

    // 3. Deploy GasSubsidy
    console.log("\n3. Deploying GasSubsidy...");
    const GasSubsidy = await ethers.getContractFactory("contracts/core/GasSubsidy.sol:GasSubsidy");
    const gasSubsidy = await GasSubsidy.deploy(deployer.address, deployer.address);
    await gasSubsidy.waitForDeployment();
    console.log("✓ GasSubsidy deployed to:", gasSubsidy.target);

    // Fund GasSubsidy
    await deployer.sendTransaction({
        to: gasSubsidy.target,
        value: ethers.parseEther("10.0")
    });
    console.log("  ✓ Funded GasSubsidy with 10 ETH");

    // 4. Deploy TokenFaucet (FaucetUpgradeable)
    console.log("\n4. Deploying TokenFaucet...");
    const Faucet = await ethers.getContractFactory("FaucetUpgradeable");
    const faucet = await Faucet.deploy(token.target);
    await faucet.waitForDeployment();
    console.log("✓ TokenFaucet deployed to:", faucet.target);

    // Fund Faucet with Tokens
    await token.transfer(faucet.target, ethers.parseEther("1000000"));
    console.log("  ✓ Funded TokenFaucet with 1M ORA");

    // 5. Deploy NodeRegistry
    console.log("\n5. Deploying NodeRegistry...");
    const NodeRegistry = await ethers.getContractFactory("contracts/NodeRegistry.sol:NodeRegistry");
    const nodeRegistry = await NodeRegistry.deploy();
    await nodeRegistry.waitForDeployment();
    console.log("✓ NodeRegistry deployed to:", nodeRegistry.target);

    // 6. Deploy ThreatIntelligenceCoordination
    console.log("\n6. Deploying ThreatIntelligenceCoordination...");
    const TIC = await ethers.getContractFactory("ThreatIntelligenceCoordination");
    const tic = await TIC.deploy();
    await tic.waitForDeployment();
    console.log("✓ ThreatIntelligenceCoordination deployed to:", tic.target);

    // 7. Deploy GlobalWhitelist
    console.log("\n7. Deploying GlobalWhitelist...");
    const GlobalWhitelist = await ethers.getContractFactory("GlobalWhitelist");
    const whitelist = await GlobalWhitelist.deploy();
    await whitelist.waitForDeployment();
    console.log("✓ GlobalWhitelist deployed to:", whitelist.target);

    // 8. Deploy OraSRSGovernance
    console.log("\n8. Deploying OraSRSGovernance...");
    const Governance = await ethers.getContractFactory("OraSRSGovernance");
    const governance = await Governance.deploy();
    await governance.waitForDeployment();
    console.log("✓ OraSRSGovernance deployed to:", governance.target);

    // 9. Deploy OptimizedThreatRegistry (for Lite Client)
    console.log("\n9. Deploying OptimizedThreatRegistry...");
    const OptimizedThreatRegistry = await ethers.getContractFactory("OptimizedThreatRegistry");
    const optimizedRegistry = await OptimizedThreatRegistry.deploy();
    await optimizedRegistry.waitForDeployment();
    console.log("✓ OptimizedThreatRegistry deployed to:", optimizedRegistry.target);

    // --- Register Contracts ---
    console.log("\n📝 Registering contracts in Registry...");

    await registry.updateAddress("GasSubsidy", gasSubsidy.target);
    await registry.updateAddress("TokenFaucet", faucet.target);
    await registry.updateAddress("NodeRegistry", nodeRegistry.target);
    await registry.updateAddress("ThreatIntelligenceCoordination", tic.target);
    await registry.updateAddress("GlobalWhitelist", whitelist.target);
    await registry.updateAddress("OraSRSGovernance", governance.target);
    await registry.updateAddress("OptimizedThreatRegistry", optimizedRegistry.target);

    console.log("✓ All contracts registered.");

    console.log("\n===========================================");
    console.log("✅ System Deployment Complete");
    console.log("===========================================");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
