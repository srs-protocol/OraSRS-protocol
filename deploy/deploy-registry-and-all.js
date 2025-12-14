import pkg from 'hardhat';
const { ethers } = pkg;
import fs from 'fs';

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

    // 1. Deploy ContractRegistry (First, to get fixed address)
    // On a fresh Hardhat node, account 0 nonce 0 always produces the same address.
    console.log("\n1. Deploying ContractRegistry...");
    const ContractRegistry = await ethers.getContractFactory("ContractRegistry");
    // Optional: Check if we can attach to an existing one if we want to support hot updates without redeploying registry
    // But for "fixed address" on local testnet restart, we usually redeploy.
    const registry = await ContractRegistry.deploy();
    await registry.waitForDeployment();
    const registryAddress = await registry.getAddress();
    console.log("ContractRegistry deployed to:", registryAddress);
    console.log("NOTE: This address should be fixed if deployed first on a fresh node.");

    // 2. Deploy OraSRSToken
    console.log("\n2. Deploying OraSRSToken...");
    const OraSRSToken = await ethers.getContractFactory("OraSRSToken");
    const oraToken = await OraSRSToken.deploy();
    await oraToken.waitForDeployment();
    const oraTokenAddress = await oraToken.getAddress();
    console.log("OraSRSToken deployed to:", oraTokenAddress);

    // Register OraSRSToken
    await registry.updateAddress("OraSRSToken", oraTokenAddress);
    console.log("Registered OraSRSToken in Registry.");

    // 3. Deploy NodeRegistry
    console.log("\n3. Deploying NodeRegistry...");
    const NodeRegistry = await ethers.getContractFactory("NodeRegistry");
    const nodeRegistry = await NodeRegistry.deploy();
    await nodeRegistry.waitForDeployment();
    const nodeRegistryAddress = await nodeRegistry.getAddress();
    console.log("NodeRegistry deployed to:", nodeRegistryAddress);

    // Register NodeRegistry
    await registry.updateAddress("NodeRegistry", nodeRegistryAddress);
    console.log("Registered NodeRegistry in Registry.");

    // 4. Deploy ThreatIntelligenceCoordination
    console.log("\n4. Deploying ThreatIntelligenceCoordination...");
    const ThreatIntelligenceCoordination = await ethers.getContractFactory("ThreatIntelligenceCoordination");
    const threatIntelCoord = await ThreatIntelligenceCoordination.deploy();
    await threatIntelCoord.waitForDeployment();
    const threatIntelCoordAddress = await threatIntelCoord.getAddress();
    console.log("ThreatIntelligenceCoordination deployed to:", threatIntelCoordAddress);

    // Register ThreatIntelligenceCoordination
    await registry.updateAddress("ThreatIntelligenceCoordination", threatIntelCoordAddress);
    console.log("Registered ThreatIntelligenceCoordination in Registry.");

    // 5. Deploy SimpleSecurityActionContract
    console.log("\n5. Deploying SimpleSecurityActionContract...");
    const SimpleSecurityActionContract = await ethers.getContractFactory("SimpleSecurityActionContract");
    const simpleSecurityAction = await SimpleSecurityActionContract.deploy(deployer.address);
    await simpleSecurityAction.waitForDeployment();
    const simpleSecurityActionAddress = await simpleSecurityAction.getAddress();
    console.log("SimpleSecurityActionContract deployed to:", simpleSecurityActionAddress);

    // Register SimpleSecurityActionContract
    await registry.updateAddress("SimpleSecurityActionContract", simpleSecurityActionAddress);
    console.log("Registered SimpleSecurityActionContract in Registry.");

    // 6. Deploy FaucetUpgradeable
    console.log("\n6. Deploying FaucetUpgradeable...");
    const FaucetUpgradeable = await ethers.getContractFactory("FaucetUpgradeable");
    const faucet = await FaucetUpgradeable.deploy(oraTokenAddress);
    await faucet.waitForDeployment();
    const faucetAddress = await faucet.getAddress();
    console.log("FaucetUpgradeable deployed to:", faucetAddress);

    // Register FaucetUpgradeable
    await registry.updateAddress("FaucetUpgradeable", faucetAddress);
    console.log("Registered FaucetUpgradeable in Registry.");

    console.log("\nAll contracts deployed and registered!");

    // Save deployment info
    const deploymentInfo = {
        registryAddress: registryAddress,
        oraTokenAddress: oraTokenAddress,
        nodeRegistryAddress: nodeRegistryAddress,
        threatIntelligenceCoordinationAddress: threatIntelCoordAddress,
        simpleSecurityActionAddress: simpleSecurityActionAddress,
        faucetAddress: faucetAddress,
        deployer: deployer.address,
        timestamp: new Date().toISOString()
    };

    fs.writeFileSync('registry-deployment.json', JSON.stringify(deploymentInfo, null, 2));
    console.log("Deployment info saved to registry-deployment.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
