// scripts/deploy.js
import hre from "hardhat";

async function main() {
  console.log("开始部署OraSRS跨链合约...");
  
  // 获取部署者账户
  const [deployer] = await hre.ethers.getSigners();
  console.log("部署者地址:", deployer.address);
  
  // 部署Mock LayerZero Endpoint (如果需要的话)
  console.log("部署Mock LayerZero Endpoint...");
  const MockLzEndpoint = await hre.ethers.getContractFactory("MockLayerZeroEndpoint");
  const lzEndpoint = await MockLzEndpoint.deploy();
  await lzEndpoint.waitForDeployment();
  console.log("Mock LayerZero Endpoint 部署成功:", await lzEndpoint.getAddress());
  
  // 部署威胁情报同步合约
  console.log("部署ThreatIntelSync合约...");
  const ThreatIntelSync = await hre.ethers.getContractFactory("ThreatIntelSync");
  const threatIntelSync = await ThreatIntelSync.deploy(
    await lzEndpoint.getAddress(),           // LayerZero端点
    deployer.address,             // 治理合约地址
    1001,                        // 国内链ID
    1002                         // 海外界链ID
  );
  await threatIntelSync.waitForDeployment();
  console.log("ThreatIntelSync部署成功:", await threatIntelSync.getAddress());
  
  // 部署治理镜像合约
  console.log("部署GovernanceMirror合约...");
  const GovernanceMirror = await hre.ethers.getContractFactory("GovernanceMirror");
  const governanceMirror = await GovernanceMirror.deploy(
    await lzEndpoint.getAddress(),           // LayerZero端点
    deployer.address,             // 治理合约地址
    await threatIntelSync.getAddress(),      // 威胁情报同步合约地址
    1001,                        // 国内链ID
    1002                         // 海外界链ID
  );
  await governanceMirror.waitForDeployment();
  console.log("GovernanceMirror部署成功:", await governanceMirror.getAddress());
  
  // 保存部署地址
  const fs = await import('fs');
  const addresses = {
    mockLayerZeroEndpoint: await lzEndpoint.getAddress(),
    threatIntelSync: await threatIntelSync.getAddress(),
    governanceMirror: await governanceMirror.getAddress(),
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };
  
  if (!fs.existsSync('deployed_addresses')) {
    fs.mkdirSync('deployed_addresses');
  }
  
  fs.writeFileSync('deployed_addresses/hardhat_addresses.json', JSON.stringify(addresses, null, 2));
  console.log("部署地址已保存到 deployed_addresses/hardhat_addresses.json");
  
  console.log("\n部署的合约地址:");
  console.log("- Mock LayerZero Endpoint:", await lzEndpoint.getAddress());
  console.log("- ThreatIntelSync:", await threatIntelSync.getAddress());
  console.log("- GovernanceMirror:", await governanceMirror.getAddress());
  
  // 验证是否可以进行基本交互
  console.log("\n验证合约功能...");
  try {
    const domesticChainId = await threatIntelSync.domesticChainId();
    const overseasChainId = await threatIntelSync.overseasChainId();
    console.log(`合约配置: 国内链ID=${domesticChainId}, 海外界链ID=${overseasChainId}`);
    
    console.log("合约部署和验证成功!");
  } catch (error) {
    console.error("合约验证失败:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });