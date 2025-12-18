// scripts/auto-register-client.js
import hre from 'hardhat';
import { exec } from 'child_process';
import fs from 'fs/promises';
import os from 'os';

async function getPublicIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('获取公网IP失败:', error);
    throw new Error('无法获取公网IP地址');
  }
}

async function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // 跳过内部回环和 IPv6 地址
      if (!interface.internal && interface.family === 'IPv4') {
        return interface.address;
      }
    }
  }
  return '127.0.0.1'; // 默认返回本地地址
}

async function main() {
  console.log("🔄 开始自动注册客户端到协议链...");

  try {
    // 获取公网IP和本地IP
    const publicIP = await getPublicIP();
    const localIP = await getLocalIP();
    
    console.log("🌐 公网IP地址:", publicIP);
    console.log("🏠 本地IP地址:", localIP);

    // 获取部署的合约地址
    let threatConsensusAddress;
    try {
      const deploymentInfo = JSON.parse(await fs.readFile('threat-consensus-deployment.json', 'utf8'));
      threatConsensusAddress = deploymentInfo.threatConsensusAddress;
    } catch (error) {
      console.error("❌ 未找到部署信息文件，正在部署 ThreatConsensus 合约...");
      // 如果没有部署文件，则先部署合约
      const deployResult = await import('./deploy-threat-consensus.js');
      threatConsensusAddress = await deployResult.main();
    }

    // 获取部署者账户
    const [deployer] = await hre.ethers.getSigners();
    console.log("👤 注册账户:", deployer.address);

    // 获取合约实例
    const ThreatConsensus = await hre.ethers.getContractFactory("ThreatConsensus");
    const threatConsensus = ThreatConsensus.attach(threatConsensusAddress);

    // 注册节点信息
    console.log("📋 准备注册节点信息...");
    console.log("   - 节点IP:", publicIP);
    console.log("   - 钱包地址:", deployer.address);

    // 这里我们假设有一个节点注册合约，如果不存在则创建或模拟注册
    // 由于没有现成的节点注册合约，我们创建一个 NodeRegistry 合约
    console.log("🏗️  检查节点注册合约...");
    
    let nodeRegistryAddress;
    try {
      const nodeRegistryInfo = JSON.parse(await fs.readFile('node-registry-deployment.json', 'utf8'));
      nodeRegistryAddress = nodeRegistryInfo.nodeRegistryAddress;
    } catch (error) {
      // 如果没有节点注册合约，则部署一个
      console.log("📦 部署节点注册合约...");
      const NodeRegistry = await hre.ethers.getContractFactory("NodeRegistry");
      const nodeRegistry = await NodeRegistry.connect(deployer).deploy();
      await nodeRegistry.waitForDeployment();
      nodeRegistryAddress = await nodeRegistry.getAddress();
      console.log("✅ 节点注册合约部署成功:", nodeRegistryAddress);
      
      // 保存部署信息
      const nodeRegistryInfo = {
        nodeRegistryAddress: nodeRegistryAddress,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        network: hre.network.name,
        chainId: hre.network.config.chainId || (await hre.ethers.provider.getNetwork()).chainId
      };
      await fs.writeFile("node-registry-deployment.json", JSON.stringify(nodeRegistryInfo, null, 2));
    }

    // 注册节点到注册合约
    const NodeRegistry = await hre.ethers.getContractFactory("NodeRegistry");
    const nodeRegistry = NodeRegistry.attach(nodeRegistryAddress);
    
    console.log("📤 向节点注册合约注册节点...");
    const registerTx = await nodeRegistry.connect(deployer).registerNode(publicIP, 8080); // 假设端口8080
    await registerTx.wait();
    console.log("✅ 节点注册成功!");
    
    // 检查代币余额
    console.log("🪙 检查代币余额...");
    try {
      const tokenAddress = process.env.TOKEN_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
      const tokenABI = [
        "function balanceOf(address account) external view returns (uint256)",
        "function transfer(address to, uint256 amount) external returns (bool)"
      ];
      const tokenContract = new hre.ethers.Contract(tokenAddress, tokenABI, deployer);
      const balance = await tokenContract.balanceOf(deployer.address);
      const minBalance = hre.ethers.parseEther("1000"); // 1000 代币 (假设18位小数)
      
      console.log(`📊 当前代币余额: ${(Number(balance) / 1e18).toFixed(2)}`);
      console.log(`📊 最小代币要求: 1000.00`);
      
      if (balance < minBalance) {
        console.warn("⚠️  警告: 代币余额不足，可能无法上传威胁情报");
        console.log("💡 提示: 请获取足够代币以进行威胁报告");
      } else {
        console.log("✅ 代币余额充足，可以进行威胁报告");
      }
    } catch (error) {
      console.warn("⚠️  无法检查代币余额，可能未部署代币合约或配置错误");
      console.log("💡 提示: 确保TOKEN_ADDRESS环境变量正确设置");
    }

    // 保存客户端配置
    const clientConfig = {
      threatConsensusContract: threatConsensusAddress,
      nodeRegistryContract: nodeRegistryAddress,
      nodeIP: publicIP,
      nodeLocalIP: localIP,
      nodeWallet: deployer.address,
      rpcUrl: hre.network.config.url || "https://api.orasrs.net",
      timestamp: new Date().toISOString()
    };
    
    await fs.writeFile("client-registration.json", JSON.stringify(clientConfig, null, 2));
    console.log("💾 客户端注册信息已保存到 client-registration.json");

    console.log("\n🎉 客户端自动注册完成!");
    console.log("📋 注册摘要:");
    console.log(`   - 节点公网IP: ${publicIP}`);
    console.log(`   - 节点本地IP: ${localIP}`);
    console.log(`   - 钱包地址: ${deployer.address}`);
    console.log(`   - 威胁共识合约: ${threatConsensusAddress}`);
    console.log(`   - 节点注册合约: ${nodeRegistryAddress}`);
    console.log(`   - RPC URL: ${hre.network.config.url || "https://api.orasrs.net"}`);
    
  } catch (error) {
    console.error("❌ 自动注册过程中发生错误:", error);
    process.exit(1);
  }
}

// 运行注册并处理错误
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 注册过程中发生错误:", error);
    process.exit(1);
  });
