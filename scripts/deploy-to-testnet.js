/**
 * OraSRS 混合L2架构 - 真实测试网部署脚本
 * 用于在OP Sepolia和Sepolia测试网上部署合约
 */

const { ethers, run } = require("hardhat");

async function main() {
  console.log("==================================================");
  console.log("    OraSRS 混合L2架构 - 真实测试网部署");
  console.log("==================================================");

  // 获取部署者账户
  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);
  
  // 检查余额
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("部署者余额:", ethers.utils.formatEther(balance), "ETH");
  
  // 验证余额是否足够
  if (balance.lt(ethers.utils.parseEther("0.1"))) {
    console.log("⚠️  警告: 余额可能不足以支付部署费用，请确保有足够的测试ETH");
    return;
  }

  console.log("\n开始部署合约到测试网...");
  
  // 部署顺序：
  // 1. 首先部署LayerZero Endpoint (使用测试网的预部署地址或Mock)
  // 2. 部署ThreatIntelSync
  // 3. 部署GovernanceMirror
  
  try {
    // 注意：在真实环境中，LayerZero Endpoint通常是预部署的
    // 这里我们使用LayerZero提供的测试网地址
    console.log("\n步骤1: 获取LayerZero Endpoint地址...");
    
    // LayerZero Endpoint在不同测试网的地址
    const layerZeroEndpoints = {
      11155111: "0x902F09715B6303d32d349065971a75f10c95136b", // Sepolia
      11155420: "0x5530EaE9287d360d7FD83DdB95b132905410A3c9"  // OP Sepolia
    };
    
    const network = await ethers.provider.getNetwork();
    const currentChainId = network.chainId;
    let lzEndpointAddress = layerZeroEndpoints[currentChainId];
    
    if (!lzEndpointAddress) {
      console.log("⚠️  当前网络未配置LayerZero Endpoint，部署Mock版本...");
      const LayerZeroEndpointMock = await ethers.getContractFactory("LayerZeroEndpointMock");
      const lzEndpointMock = await LayerZeroEndpointMock.deploy();
      await lzEndpointMock.deployed();
      lzEndpointAddress = lzEndpointMock.address;
      console.log("Mock LayerZero Endpoint 部署成功:", lzEndpointAddress);
    } else {
      console.log("使用预配置的LayerZero Endpoint:", lzEndpointAddress);
    }

    console.log("\n步骤2: 部署ThreatIntelSync合约...");
    
    // 根据当前网络设置目标链ID
    let domesticChainId, overseasChainId;
    if (currentChainId === 11155420) { // OP Sepolia
      domesticChainId = 11155420; // OP Sepolia
      overseasChainId = 11155111; // Sepolia
    } else { // 假设是Sepolia
      domesticChainId = 11155111; // Sepolia
      overseasChainId = 11155420; // OP Sepolia
    }
    
    const ThreatIntelSync = await ethers.getContractFactory("ThreatIntelSync");
    console.log(`部署参数: Endpoint=${lzEndpointAddress}, Governance=${deployer.address}, DomesticChainId=${domesticChainId}, OverseasChainId=${overseasChainId}`);
    
    const threatIntelSync = await ThreatIntelSync.deploy(
      lzEndpointAddress,           // LayerZero端点
      deployer.address,            // 治理合约地址
      domesticChainId,             // 国内链ID (当前链)
      overseasChainId              // 海外界链ID (目标链)
    );
    
    await threatIntelSync.deployed();
    console.log("ThreatIntelSync部署成功:", threatIntelSync.address);

    console.log("\n步骤3: 部署GovernanceMirror合约...");
    
    const GovernanceMirror = await ethers.getContractFactory("GovernanceMirror");
    const governanceMirror = await GovernanceMirror.deploy(
      lzEndpointAddress,           // LayerZero端点
      deployer.address,            // 治理合约地址
      threatIntelSync.address,     // 威胁情报同步合约地址
      domesticChainId,             // 国内链ID
      overseasChainId              // 海外界链ID
    );
    
    await governanceMirror.deployed();
    console.log("GovernanceMirror部署成功:", governanceMirror.address);

    // 保存部署信息
    const fs = require('fs');
    const deploymentInfo = {
      network: network.name,
      chainId: currentChainId,
      deployer: deployer.address,
      contracts: {
        layerZeroEndpoint: lzEndpointAddress,
        threatIntelSync: threatIntelSync.address,
        governanceMirror: governanceMirror.address
      },
      deployedAt: new Date().toISOString(),
      config: {
        domesticChainId: domesticChainId,
        overseasChainId: overseasChainId
      }
    };
    
    if (!fs.existsSync('deployments')) {
      fs.mkdirSync('deployments');
    }
    
    const fileName = `deployment-${currentChainId}-${Date.now()}.json`;
    fs.writeFileSync(`deployments/${fileName}`, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n✓ 部署信息已保存到 deployments/${fileName}`);

    console.log("\n==================================================");
    console.log("合约部署完成!");
    console.log(`网络: ${network.name} (Chain ID: ${currentChainId})`);
    console.log(`ThreatIntelSync: ${threatIntelSync.address}`);
    console.log(`GovernanceMirror: ${governanceMirror.address}`);
    console.log("==================================================");

    // 验证合约（如果在支持的网络上）
    try {
      console.log("\n正在进行合约验证...");
      await run("verify:verify", {
        address: threatIntelSync.address,
        constructorArguments: [
          lzEndpointAddress,
          deployer.address,
          domesticChainId,
          overseasChainId
        ],
      });
      
      await run("verify:verify", {
        address: governanceMirror.address,
        constructorArguments: [
          lzEndpointAddress,
          deployer.address,
          threatIntelSync.address,
          domesticChainId,
          overseasChainId
        ],
      });
      
      console.log("✓ 合约验证提交成功");
    } catch (verificationError) {
      console.log("⚠️  合约验证失败（这在测试网中是正常的）:", verificationError.message);
    }

  } catch (error) {
    console.error("部署过程中出现错误:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("部署失败:", error);
    process.exit(1);
  });