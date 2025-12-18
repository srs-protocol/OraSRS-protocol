// test/contract-test.mjs
import { ethers } from "ethers";
import { readFile } from "fs/promises";

async function testContractInteraction() {
  console.log("开始测试OraSRS合约交互...");
  
  // 连接到本地Hardhat节点
  const provider = new ethers.JsonRpcProvider('https://api.orasrs.net');
  
  // 获取部署的合约地址
  const deploymentInfo = JSON.parse(await readFile('./deployment-info.json', 'utf8'));
  console.log("部署的合约地址:", deploymentInfo);
  
  // 合约ABI - 从编译的合约中获取
  const threatIntelABI = [
    "function addThreatIntel(string memory _ip, uint8 _threatLevel, string memory _threatType) external",
    "function removeThreatIntel(string memory _ip) external",
    "function isThreatSource(string memory _ip) external view returns (bool)",
    "function getThreatIntel(string memory _ip) external view returns (string memory sourceIP, string memory targetIP, uint8 threatLevel, uint256 timestamp, string memory threatType, bool isActive)"
  ];

  const securityActionABI = [
    "function blockIP(string memory _ip) external",
    "function unblockIP(string memory _ip) external",
    "function isIPBlocked(string memory _ip) external view returns (bool)"
  ];
  
  // 创建合约实例
  const threatIntelContract = new ethers.Contract(
    deploymentInfo.threatIntelContract, 
    threatIntelABI, 
    provider
  );
  
  const securityActionContract = new ethers.Contract(
    deploymentInfo.securityActionContract, 
    securityActionABI, 
    provider
  );
  
  // 获取钱包（使用Hardhat的默认账户）
  const wallet = new ethers.Wallet(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // Hardhat默认私钥
    provider
  );
  
  // 重新创建合约实例以进行写操作
  const threatIntelWrite = threatIntelContract.connect(wallet);
  const securityActionWrite = securityActionContract.connect(wallet);
  
  console.log("1. 测试威胁情报合约功能...");
  
  // 测试添加威胁
  try {
    console.log("  添加威胁IP: 192.168.1.100");
    let tx = await threatIntelWrite.addThreatIntel("192.168.1.100", 2, "malware");
    await tx.waitForDeployment ? tx.waitForDeployment() : tx.wait();
    console.log("  ✓ 威胁IP添加成功");
    
    // 检查威胁状态
    const isThreat = await threatIntelContract.isThreatSource("192.168.1.100");
    console.log("  威胁IP状态:", isThreat ? "是威胁" : "非威胁");
    
    // 获取威胁详情
    const threatInfo = await threatIntelContract.getThreatIntel("192.168.1.100");
    console.log("  威胁详情:", {
      sourceIP: threatInfo.sourceIP,
      threatLevel: Number(threatInfo.threatLevel),
      threatType: threatInfo.threatType,
      isActive: threatInfo.isActive
    });
  } catch (error) {
    console.error("  ✗ 威胁情报合约测试失败:", error.message);
  }
  
  console.log("\n2. 测试安全操作合约功能...");
  
  // 测试IP阻断
  try {
    console.log("  阻断IP: 104.28.29.30");
    tx = await securityActionWrite.blockIP("104.28.29.30");
    await tx.waitForDeployment ? tx.waitForDeployment() : tx.wait();
    console.log("  ✓ IP阻断成功");
    
    // 检查IP阻断状态
    const isBlocked = await securityActionContract.isIPBlocked("104.28.29.30");
    console.log("  IP阻断状态:", isBlocked ? "已阻断" : "未阻断");
    
    // 解除IP阻断
    tx = await securityActionWrite.unblockIP("104.28.29.30");
    await tx.waitForDeployment ? tx.waitForDeployment() : tx.wait();
    console.log("  ✓ IP解除阻断成功");
    
    // 检查IP解除阻断后状态
    const isBlockedAfter = await securityActionContract.isIPBlocked("104.28.29.30");
    console.log("  IP解除阻断后状态:", isBlockedAfter ? "已阻断" : "未阻断");
  } catch (error) {
    console.error("  ✗ 安全操作合约测试失败:", error.message);
  }
  
  console.log("\n3. 测试客户端API交互...");
  
  // 测试与OraSRS服务的API交互
  try {
    const response = await fetch('http://localhost:3006/health');
    const healthData = await response.json();
    console.log("  OraSRS服务健康状态:", healthData.status);
    
    // 测试风险查询API
    const queryResponse = await fetch('http://localhost:3006/orasrs/v1/query?ip=192.168.1.100');
    const queryData = await queryResponse.json();
    console.log("  风险查询结果:", queryData);
  } catch (error) {
    console.error("  API交互测试失败:", error.message);
  }
  
  console.log("\n合约交互测试完成！");
}

// 运行测试
testContractInteraction().catch(console.error);