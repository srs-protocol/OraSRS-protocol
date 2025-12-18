const hre = require("hardhat");

async function main() {
    const registryAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const newContractName = "OptimizedThreatRegistry";
    const newContractAddress = "0xE6E340D132b5f46d1e472DebcD681B2aBc16e57E";

    console.log(`Registering ${newContractName} at ${newContractAddress}...`);

    const ContractRegistry = await hre.ethers.getContractFactory("ContractRegistry");
    const registry = ContractRegistry.attach(registryAddress);

    const tx = await registry.updateAddress(newContractName, newContractAddress);
    await tx.wait();

    console.log(`Successfully registered ${newContractName} in ContractRegistry.`);

    // Verify
    const registeredAddress = await registry.getContractAddress(newContractName);
    console.log(`Verification: ${newContractName} -> ${registeredAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
