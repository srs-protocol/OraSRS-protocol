const hre = require("hardhat");

async function main() {
    const contractAddress = "0xE6E340D132b5f46d1e472DebcD681B2aBc16e57E";
    const ip = "162.243.103.246";

    console.log(`Checking IP ${ip} on contract ${contractAddress}...`);

    const OptimizedThreatRegistry = await hre.ethers.getContractFactory("OptimizedThreatRegistry");
    const contract = OptimizedThreatRegistry.attach(contractAddress);

    // Convert IP to bytes4
    const ipParts = ip.split('.').map(Number);
    const ipBytes = Buffer.from(ipParts);
    const ipHex = "0x" + ipBytes.toString('hex');

    console.log(`IP Hex: ${ipHex}`);

    try {
        const threat = await contract.getThreat(ipHex);
        console.log("Threat Data:", threat);

        console.log(`Expiry: ${threat.expiry}`);
        console.log(`Risk Level: ${threat.riskLevel}`);
        console.log(`Mask: ${threat.mask}`);
        console.log(`Source Mask: ${threat.sourceMask}`);

        const now = Math.floor(Date.now() / 1000);
        if (threat.expiry > now && threat.riskLevel > 0) {
            console.log("✅ IP is ACTIVE threat.");
        } else {
            console.log("❌ IP is NOT active threat (Expired or Level 0).");
        }

    } catch (error) {
        console.error("Error querying contract:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
