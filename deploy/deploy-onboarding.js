import hre from "hardhat";
import fs from 'fs';

async function main() {
    console.log("🚀 部署 OraSRS 完整测试环境...\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("部署账户:", deployer.address);
    console.log("账户余额:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

    // 1. 部署 Gas Subsidy Contract
    console.log("1️⃣  部署 Gas Subsidy Contract...");
    const GasSubsidy = await hre.ethers.getContractFactory("contracts/OnboardingContracts.sol:GasSubsidy");
    const gasSubsidy = await GasSubsidy.deploy({ value: hre.ethers.parseEther("100") }); // 初始资金 100 ORA
    await gasSubsidy.waitForDeployment();
    const gasSubsidyAddress = await gasSubsidy.getAddress();
    console.log("   ✅ GasSubsidy:", gasSubsidyAddress);
    console.log("   余额:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(gasSubsidyAddress)), "ORA\n");

    // 2. 部署 Token Faucet Contract
    console.log("2️⃣  部署 Token Faucet Contract...");
    const TokenFaucet = await hre.ethers.getContractFactory("contracts/OnboardingContracts.sol:TokenFaucet");
    const tokenFaucet = await TokenFaucet.deploy();
    await tokenFaucet.waitForDeployment();
    const tokenFaucetAddress = await tokenFaucet.getAddress();
    console.log("   ✅ TokenFaucet:", tokenFaucetAddress);
    console.log("   总供应量:", hre.ethers.formatEther(await tokenFaucet.totalSupply()), "ORA\n");

    // 3. 部署 Node Registry Contract
    console.log("3️⃣  部署 Node Registry Contract...");
    const NodeRegistry = await hre.ethers.getContractFactory("contracts/OnboardingContracts.sol:NodeRegistry");
    const nodeRegistry = await NodeRegistry.deploy();
    await nodeRegistry.waitForDeployment();
    const nodeRegistryAddress = await nodeRegistry.getAddress();
    console.log("   ✅ NodeRegistry:", nodeRegistryAddress, "\n");

    // 4. 更新 Registry 合约（假设已部署）
    console.log("4️⃣  更新合约注册表...");
    const registryAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // 固定地址
    const registryABI = [
        "function updateAddress(string memory name, address contractAddress) external"
    ];
    const registry = new hre.ethers.Contract(registryAddress, registryABI, deployer);

    try {
        let tx = await registry.updateAddress("GasSubsidy", gasSubsidyAddress);
        await tx.wait();
        console.log("   ✅ GasSubsidy 已注册");

        tx = await registry.updateAddress("TokenFaucet", tokenFaucetAddress);
        await tx.wait();
        console.log("   ✅ TokenFaucet 已注册");

        tx = await registry.updateAddress("NodeRegistry", nodeRegistryAddress);
        await tx.wait();
        console.log("   ✅ NodeRegistry 已注册\n");
    } catch (error) {
        console.log("   ⚠️  注册表更新失败（可能未部署）:", error.message, "\n");
    }

    // 5. 保存部署信息
    console.log("5️⃣  保存部署信息...");
    const deployment = {
        network: hre.network.name,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            GasSubsidy: {
                address: gasSubsidyAddress,
                subsidyAmount: "1 ORA",
                initialBalance: hre.ethers.formatEther(await hre.ethers.provider.getBalance(gasSubsidyAddress))
            },
            TokenFaucet: {
                address: tokenFaucetAddress,
                faucetAmount: "1000 ORA",
                totalSupply: hre.ethers.formatEther(await tokenFaucet.totalSupply())
            },
            NodeRegistry: {
                address: nodeRegistryAddress,
                totalNodes: (await nodeRegistry.totalNodes()).toString()
            }
        }
    };

    fs.mkdirSync('./deployments', { recursive: true });
    fs.writeFileSync(
        './deployments/onboarding-deployment.json',
        JSON.stringify(deployment, null, 2)
    );
    console.log("   ✅ 部署信息已保存\n");

    // 6. 创建客户端配置
    console.log("6️⃣  创建客户端配置模板...");
    const clientConfig = {
        blockchainEndpoint: "http://127.0.0.1:8545",
        registryAddress: registryAddress,
        port: 3006,
        publicIP: "localhost",
        configPath: "/etc/orasrs/node-config.json"
    };

    fs.mkdirSync('./config', { recursive: true });
    fs.writeFileSync(
        './config/client-config.json',
        JSON.stringify(clientConfig, null, 2)
    );
    console.log("   ✅ 客户端配置已创建\n");

    // 7. 显示测试命令
    console.log("=".repeat(60));
    console.log("✅ 部署完成！\n");
    console.log("📋 测试命令:");
    console.log("=".repeat(60));
    console.log("\n# 测试 Gas Subsidy:");
    console.log(`npx hardhat run scripts/test-gas-subsidy.js --network localhost`);
    console.log("\n# 测试 Token Faucet:");
    console.log(`npx hardhat run scripts/test-token-faucet.js --network localhost`);
    console.log("\n# 测试 Node Registry:");
    console.log(`npx hardhat run scripts/test-node-registry.js --network localhost`);
    console.log("\n# 运行完整初始化:");
    console.log(`node test-onboarding.js`);
    console.log("\n" + "=".repeat(60));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
