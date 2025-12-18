import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    // 1. Setup
    const [deployer] = await ethers.getSigners();

    console.log("Deploying Registry...");
    const ContractRegistry = await ethers.getContractFactory("ContractRegistry");
    const registry = await ContractRegistry.deploy();
    await registry.waitForDeployment();
    const registryAddress = await registry.getAddress();
    console.log("Registry deployed at:", registryAddress);

    // 2. Register a dummy address
    const dummyAddress = "0x0000000000000000000000000000000000001234";
    console.log("Registering 'TestContract' ->", dummyAddress);
    await registry.updateAddress("TestContract", dummyAddress);

    // 3. Query
    const queriedAddress = await registry.getContractAddress("TestContract");
    console.log("Queried 'TestContract':", queriedAddress);

    if (queriedAddress === dummyAddress) {
        console.log("SUCCESS: Address matches.");
    } else {
        console.error("FAILURE: Address mismatch.");
        process.exit(1);
    }

    // 4. Hot Update
    const newAddress = "0x0000000000000000000000000000000000005678";
    console.log("Updating 'TestContract' ->", newAddress);
    await registry.updateAddress("TestContract", newAddress);

    // 5. Query again
    const queriedAddress2 = await registry.getContractAddress("TestContract");
    console.log("Queried 'TestContract' (after update):", queriedAddress2);

    if (queriedAddress2 === newAddress) {
        console.log("SUCCESS: Hot update verified.");
    } else {
        console.error("FAILURE: Hot update failed.");
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
