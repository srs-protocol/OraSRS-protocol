/**
 * Add IPs to GlobalWhitelist contract
 * Usage: npx hardhat run scripts/add-to-whitelist.cjs --network localhost
 */

const hre = require("hardhat");

async function main() {
    // Get GlobalWhitelist contract address from registry
    const registryAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

    const Registry = await hre.ethers.getContractAt("ContractRegistry", registryAddress);
    const whitelistAddress = await Registry.getContractAddress("GlobalWhitelist");

    console.log(`📋 GlobalWhitelist address: ${whitelistAddress}`);

    // Get contract instance
    const GlobalWhitelist = await hre.ethers.getContractAt("GlobalWhitelist", whitelistAddress);

    // IPs to whitelist
    const ipsToAdd = [
        // Test protocol chain address
        "142.171.74.13",

        // Common safe IPs
        "127.0.0.1",
        "::1",

        // Public DNS servers
        "8.8.8.8",        // Google DNS
        "8.8.4.4",
        "1.1.1.1",        // Cloudflare DNS
        "1.0.0.1",
        "208.67.222.222", // OpenDNS
        "208.67.220.220",
        "9.9.9.9",        // Quad9 DNS
        "149.112.112.112"
    ];

    console.log(`\n📝 Adding ${ipsToAdd.length} IPs to whitelist...`);

    // Batch add
    const tx = await GlobalWhitelist.batchAddToWhitelist(ipsToAdd);
    console.log(`📤 Transaction sent: ${tx.hash}`);

    await tx.wait();
    console.log(`✅ Transaction confirmed!`);

    // Verify
    console.log(`\n🔍 Verifying whitelist entries:`);
    for (const ip of ipsToAdd) {
        const isWhitelisted = await GlobalWhitelist.isWhitelisted(ip);
        console.log(`  ${ip}: ${isWhitelisted ? '✅' : '❌'}`);
    }

    console.log(`\n✅ Successfully added ${ipsToAdd.length} IPs to whitelist!`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
