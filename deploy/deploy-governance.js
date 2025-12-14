import hre from "hardhat";
import fs from 'fs';

async function main() {
    console.log("Deploying OraSRS Governance Contract...");

    // Get the deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // Get account balance
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

    // Deploy OraSRSGovernance
    const OraSRSGovernance = await hre.ethers.getContractFactory("OraSRSGovernance");
    const governance = await OraSRSGovernance.deploy();
    await governance.waitForDeployment();

    const governanceAddress = await governance.getAddress();
    console.log("✅ OraSRSGovernance deployed to:", governanceAddress);

    // Save deployment info
    const deploymentInfo = {
        network: hre.network.name,
        governanceAddress: governanceAddress,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        blockNumber: await hre.ethers.provider.getBlockNumber()
    };

    const deploymentPath = './deployments/governance-deployment.json';
    fs.mkdirSync('./deployments', { recursive: true });
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("📝 Deployment info saved to:", deploymentPath);

    // Verify initial state
    console.log("\n📊 Initial Contract State:");
    console.log("  Developer:", await governance.developer());
    console.log("  Paused:", await governance.paused());
    console.log("  Appeal Count:", (await governance.appealCount()).toString());

    // Update config file with governance address
    const configPath = './config/governance-config.json';
    const config = {
        governanceAddress: governanceAddress,
        timelockDelay: 24 * 60 * 60, // 24 hours in seconds
        emergencyDelay: 0,
        votingThreshold: 3,
        nodeQualificationCriteria: {
            maxRiskScore: 10,
            minUptime: 72 * 60 * 60, // 72 hours in seconds
            minReputation: 60
        }
    };
    fs.mkdirSync('./config', { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log("📝 Config saved to:", configPath);

    console.log("\n✅ Deployment complete!");
    console.log("\nNext steps:");
    console.log("1. Update orasrs-simple-client.js with governance address");
    console.log("2. Configure voting module in config file");
    console.log("3. Start client with voting enabled");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
