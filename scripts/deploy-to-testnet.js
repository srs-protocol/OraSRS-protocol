// scripts/deploy-to-testnet.js
// 部署合约到测试网的脚本

import hre from "hardhat";
import { ethers } from "ethers";

async function deployToTestnet() {
  console.log("🌍 开始部署到测试网...\n");
  
  try {
    // 检查环境变量
    if (!process.env.TESTNET_RPC_URL) {
      console.log("⚠️  未设置 TESTNET_RPC_URL 环境变量，使用默认值");
      process.env.TESTNET_RPC_URL = "https://sepolia.infura.io/v3/YOUR_PROJECT_ID";
    }
    
    if (!process.env.PRIVATE_KEY) {
      console.log("⚠️  未设置 PRIVATE_KEY 环境变量，使用默认值");
      console.log("💡  请设置您的私钥以部署合约到测试网");
      return;
    }
    
    console.log("📋 部署配置:");
    console.log(`   网络: ${hre.network.name}`);
    console.log(`   RPC URL: ${process.env.TESTNET_RPC_URL}\n`);
    
    // 获取部署者
    const [deployer] = await hre.ethers.getSigners();
    console.log(`👤 部署者地址: ${deployer.address}`);
    
    // 检查余额
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log(`💰 部署者余额: ${ethers.formatEther(balance)} ETH\n`);
    
    if (ethers.toBigInt(balance) < ethers.parseEther("0.1")) {
      console.log("⚠️  余额不足，请确保至少有0.1 ETH用于部署");
      return;
    }
    
    // 这里我们使用一个模拟的代币地址，实际部署时您需要先部署代币合约
    const tokenAddress = process.env.TOKEN_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // 示例地址
    
    console.log("🔄 部署 ThreatConsensus 合约到测试网...");
    const ThreatConsensus = await hre.ethers.getContractFactory("ThreatConsensus");
    
    // 部署合约
    const threatConsensus = await ThreatConsensus.connect(deployer).deploy(tokenAddress);
    console.log(`⏳ 等待部署完成... 合约地址: ${await threatConsensus.getAddress()}`);
    
    await threatConsensus.waitForDeployment();
    const contractAddress = await threatConsensus.getAddress();
    
    console.log("✅ ThreatConsensus 合约部署成功!");
    console.log(`📍 合约地址: ${contractAddress}\n`);
    
    // 验证部署
    console.log("🔍 验证部署...");
    try {
      const threshold = await threatConsensus.CONSENSUS_THRESHOLD();
      const isWhitelisted = await threatConsensus.isWhitelisted("8.8.8.8");
      
      console.log("✅ 合约验证通过!");
      console.log(`   共识阈值: ${threshold}`);
      console.log(`   Google DNS 白名单状态: ${isWhitelisted}`);
      console.log(`   代币合约地址: ${await threatConsensus.orasrsToken()}`);
    } catch (error) {
      console.log(`⚠️  合约验证时出现警告: ${error.message}`);
    }
    
    // 如果是在以太坊测试网上，可以尝试验证合约
    if (hre.network.name === "sepolia" || hre.network.name === "goerli") {
      console.log("\n🔍 准备验证合约...");
      try {
        console.log("⏳ 提交合约验证到 Etherscan...");
        await hre.run("verify:verify", {
          address: contractAddress,
          constructorArguments: [tokenAddress],
        });
        console.log("✅ 合约验证提交成功!");
      } catch (error) {
        console.log(`⚠️  合约验证提交失败: ${error.message}`);
        console.log("💡  这可能是因为合约尚未在区块链浏览器上同步，稍后可手动验证");
      }
    }
    
    // 保存部署信息
    const deploymentInfo = {
      threatConsensusAddress: contractAddress,
      tokenAddress: tokenAddress,
      deployer: deployer.address,
      network: hre.network.name,
      timestamp: new Date().toISOString(),
      rpcUrl: process.env.TESTNET_RPC_URL
    };
    
    await import('fs').then(fs => {
      fs.writeFileSync("testnet-deployment.json", JSON.stringify(deploymentInfo, null, 2));
    });
    
    console.log("\n💾 部署信息已保存到 testnet-deployment.json");
    
    console.log("\n🎯 测试网部署完成!");
    console.log("\n📋 部署摘要:");
    console.log(`   合约地址: ${contractAddress}`);
    console.log(`   网络: ${hre.network.name}`);
    console.log(`   部署者: ${deployer.address}`);
    console.log("   功能特性:");
    console.log("     - 代币验证 (1000+ 代币才能上传)");
    console.log("     - 提交-揭示防跟风机制");
    console.log("     - 白名单保护");
    console.log("     - 多节点共识");
    
    console.log("\n🚀 OraSRS 现已部署到公网测试网!");
    
  } catch (error) {
    console.error("❌ 部署失败:", error);
    console.log("\n💡 部署提示:");
    console.log("   1. 确保环境变量设置正确");
    console.log("   2. 确保账户有足够余额支付Gas费");
    console.log("   3. 确保网络连接正常");
    console.log("   4. 检查合约代码是否正确编译");
  }
}

// 运行部署
console.log("🚀 启动 OraSRS 测试网部署流程\n");
deployToTestnet()
  .then(() => {
    console.log("\n✅ 部署脚本执行完成");
  })
  .catch((error) => {
    console.error("\n💥 部署脚本执行失败:", error);
  });