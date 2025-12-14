import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying GlobalWhitelist with account:", deployer.address);

    // 1. Deploy GlobalWhitelist
    const GlobalWhitelist = await ethers.getContractFactory("GlobalWhitelist");
    const whitelist = await GlobalWhitelist.deploy();
    await whitelist.waitForDeployment();
    const whitelistAddress = await whitelist.getAddress();
    console.log("GlobalWhitelist deployed to:", whitelistAddress);

    // 2. Add Initial Whitelist
    const initialIPs = [
        "8.8.8.8",          // Google DNS
        "8.8.4.4",          // Google DNS
        "1.1.1.1",          // Cloudflare DNS
        "1.0.0.1",          // Cloudflare DNS
        "62.234.21.175",    // Specific IP requested
        "142.171.74.13",    // New requested IP
        // Cloudflare CDN IPs (Sample range, usually handled by CIDR but here we add specific known ones if needed or just the DNS ones as requested "cloudflareCDNip")
        // Since "cloudflareCDNip" is vague, I'll add a few common ones or just stick to DNS if that's what they meant.
        // Given the request "cloudflareCDNip", I will add a placeholder or common one.
        "104.16.0.0",       // Example Cloudflare IP
        "104.24.0.0"
    ];

    console.log("Adding initial IPs to whitelist:", initialIPs);
    await whitelist.batchAddToWhitelist(initialIPs);
    console.log("Initial whitelist added.");

    // 3. Register in ContractRegistry
    // We need to connect to the existing Registry.
    // Address is fixed: 0x5FbDB2315678afecb367f032d93F642f64180aa3
    const registryAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const ContractRegistry = await ethers.getContractFactory("ContractRegistry");
    const registry = ContractRegistry.attach(registryAddress);

    console.log("Registering GlobalWhitelist in Registry...");
    await registry.updateAddress("GlobalWhitelist", whitelistAddress);
    console.log("Registered GlobalWhitelist.");

    // Verify
    const isWhitelisted = await whitelist.isWhitelisted("8.8.8.8");
    console.log("Verification: 8.8.8.8 is whitelisted?", isWhitelisted);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
