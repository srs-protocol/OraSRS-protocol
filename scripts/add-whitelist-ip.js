import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Adding IP to Whitelist with account:", deployer.address);

    // 1. Get Registry
    const registryAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const ContractRegistry = await ethers.getContractFactory("ContractRegistry");
    const registry = ContractRegistry.attach(registryAddress);

    // 2. Resolve GlobalWhitelist
    const whitelistAddress = await registry.getContractAddress("GlobalWhitelist");
    console.log("GlobalWhitelist address:", whitelistAddress);

    if (whitelistAddress === ethers.ZeroAddress) {
        console.error("GlobalWhitelist not found in Registry!");
        process.exit(1);
    }

    // 3. Attach GlobalWhitelist
    const GlobalWhitelist = await ethers.getContractFactory("GlobalWhitelist");
    const whitelist = GlobalWhitelist.attach(whitelistAddress);

    // 4. Add IP
    const ipToAdd = "142.171.74.13";
    console.log(`Adding ${ipToAdd} to whitelist...`);

    const tx = await whitelist.addToWhitelist(ipToAdd);
    await tx.wait();

    console.log(`Successfully added ${ipToAdd} to whitelist.`);

    // Verify
    const isWhitelisted = await whitelist.isWhitelisted(ipToAdd);
    console.log(`Verification: ${ipToAdd} is whitelisted?`, isWhitelisted);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
