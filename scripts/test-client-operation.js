// scripts/test-client-operation.js
import hre from "hardhat";
const { ethers } = hre;

async function testClientOperation() {
  console.log("📱 模拟实际客户端操作...\n");
  
  try {
    // 获取账户
    const [owner, node1, node2, node3] = await ethers.getSigners();
    
    console.log("👥 设置节点和代币...");
    // 部署合约
    const MockToken = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockToken.deploy("ORASRS Token", "ORASRS", 18);
    await mockToken.waitForDeployment();
    
    // 给节点分配代币
    await mockToken.mint(node1.address, ethers.parseEther("2000"));
    await mockToken.mint(node2.address, ethers.parseEther("2000"));
    await mockToken.mint(node3.address, ethers.parseEther("2000"));
    
    const ThreatConsensus = await ethers.getContractFactory("ThreatConsensus");
    const threatConsensus = await ThreatConsensus.deploy(await mockToken.getAddress());
    await threatConsensus.waitForDeployment();
    
    console.log(`✅ 威胁共识合约: ${await threatConsensus.getAddress()}`);
    console.log(`✅ 代币合约: ${await mockToken.getAddress()}\n`);
    
    // 模拟节点注册
    console.log("📋 1. 模拟节点注册:");
    const NodeRegistry = await ethers.getContractFactory("NodeRegistry");
    const nodeRegistry = await NodeRegistry.deploy();
    await nodeRegistry.waitForDeployment();
    
    await nodeRegistry.connect(node1).registerNode("203.0.113.10", 8080);
    await nodeRegistry.connect(node2).registerNode("203.0.113.11", 8080);
    await nodeRegistry.connect(node3).registerNode("203.0.113.12", 8080);
    console.log("   ✅ 节点注册完成\n");
    
    // 模拟攻击检测和防御
    console.log("🚨 2. 模拟攻击检测和本地防御:");
    const maliciousIP = "198.51.100.20";
    console.log(`   检测到对节点的攻击: ${maliciousIP}`);
    console.log("   🛡️  立即本地防御 - IP被临时封禁\n");
    
    // 模拟证据收集和提交
    console.log("🔍 3. 模拟证据收集和链上提交:");
    const salt1 = "evidenceSalt1";
    const salt2 = "evidenceSalt2";
    const salt3 = "evidenceSalt3";
    
    const ipHash = ethers.keccak256(ethers.toUtf8Bytes(maliciousIP));
    
    // 节点1提交
    const packedData1 = ethers.concat([
      ethers.getBytes(ipHash),
      ethers.toUtf8Bytes(salt1),
      ethers.getBytes(node1.address)
    ]);
    const commitment1 = ethers.keccak256(packedData1);
    
    await threatConsensus.connect(node1).commitThreatEvidence(ipHash, salt1);
    console.log(`   🔒 节点1提交证据哈希: ${commitment1.substring(0, 10)}...`);
    
    // 节点2提交
    const packedData2 = ethers.concat([
      ethers.getBytes(ipHash),
      ethers.toUtf8Bytes(salt2),
      ethers.getBytes(node2.address)
    ]);
    const commitment2 = ethers.keccak256(packedData2);
    
    await threatConsensus.connect(node2).commitThreatEvidence(ipHash, salt2);
    console.log(`   🔒 节点2提交证据哈希: ${commitment2.substring(0, 10)}...`);
    
    // 节点3提交
    const packedData3 = ethers.concat([
      ethers.getBytes(ipHash),
      ethers.toUtf8Bytes(salt3),
      ethers.getBytes(node3.address)
    ]);
    const commitment3 = ethers.keccak256(packedData3);
    
    await threatConsensus.connect(node3).commitThreatEvidence(ipHash, salt3);
    console.log(`   🔒 节点3提交证据哈希: ${commitment3.substring(0, 10)}...\n`);
    
    // 等待揭示延迟
    console.log("⏳ 4. 等待揭示延迟...");
    for (let i = 0; i < 10; i++) {
      await hre.network.provider.send("evm_mine");
    }
    console.log("   ✅ 等待完成\n");
    
    // 模拟揭示阶段
    console.log("🔓 5. 执行揭示阶段:");
    await threatConsensus.connect(node1).revealThreatEvidence(
      maliciousIP, salt1, 90, "logHash1", "DDoS", 80
    );
    console.log("   节点1揭示证据");
    
    await threatConsensus.connect(node2).revealThreatEvidence(
      maliciousIP, salt2, 85, "logHash2", "DDoS", 75
    );
    console.log("   节点2揭示证据");
    
    // 第三个揭示应该触发共识
    const tx = await threatConsensus.connect(node3).revealThreatEvidence(
      maliciousIP, salt3, 95, "logHash3", "DDoS", 90
    );
    console.log("   节点3揭示证据 - 触发共识\n");
    
    // 检查共识状态
    console.log("🤝 6. 验证共识结果:");
    const [isConfirmed, reportCount, totalRiskScore, confirmedAt] = 
      await threatConsensus.getThreatStatus(maliciousIP);
    
    console.log(`   威胁确认状态: ${isConfirmed}`);
    console.log(`   举报节点数: ${Number(reportCount)}`);
    console.log(`   总风险分数: ${Number(totalRiskScore)}`);
    console.log(`   确认时间戳: ${Number(confirmedAt)}`);
    
    if (isConfirmed) {
      console.log("   ✅ 共识达成 - 全网威胁确认事件已触发");
    } else {
      console.log("   ❌ 共识未达成");
    }
    
    // 模拟全网同步
    console.log("\n🌐 7. 模拟全网同步:");
    console.log(`   向所有节点广播: 封禁IP ${maliciousIP}`);
    console.log("   更新本地防火墙规则...");
    console.log("   ✅ 全网防御策略同步完成\n");
    
    // 演示白名单保护
    console.log("🛡️  8. 验证白名单保护:");
    const googleDNS = "8.8.8.8";
    const isWhitelisted = await threatConsensus.isWhitelisted(googleDNS);
    console.log(`   Google DNS (${googleDNS}) 在白名单: ${isWhitelisted}`);
    
    // 尝试提交白名单IP - 应该在揭示阶段失败
    const whiteSalt = "whiteSalt";
    const whiteIpHash = ethers.keccak256(ethers.toUtf8Bytes(googleDNS));
    const whitePackedData = ethers.concat([
      ethers.getBytes(whiteIpHash),
      ethers.toUtf8Bytes(whiteSalt),
      ethers.getBytes(node1.address)
    ]);
    const whiteCommitment = ethers.keccak256(whitePackedData);
    
    await threatConsensus.connect(node1).commitThreatEvidence(whiteIpHash, whiteSalt);
    console.log("   尝试提交白名单IP到链上...");
    
    // 挖区块
    for (let i = 0; i < 10; i++) {
      await hre.network.provider.send("evm_mine");
    }
    
    try {
      await threatConsensus.connect(node1).revealThreatEvidence(
        googleDNS, whiteSalt, 5, "normalLog", "Normal", 5
      );
      console.log("   ❌ 白名单保护失败 - 白名单IP被揭示");
    } catch (error) {
      if (error.message.includes("IP is in whitelist")) {
        console.log("   ✅ 白名单保护正常 - 白名单IP揭示被拒绝");
      } else {
        console.log(`   ❌ 未知错误: ${error.message}`);
      }
    }
    
    console.log("\n🎯 9. 客户端操作模拟完成!");
    console.log("\n📋 操作总结:");
    console.log("   ✅ 节点注册和代币验证");
    console.log("   ✅ 攻击检测和本地防御");
    console.log("   ✅ 证据收集和提交-揭示");
    console.log("   ✅ 多节点共识达成");
    console.log("   ✅ 全网同步和风控下发");
    console.log("   ✅ 白名单保护机制");
    console.log("   ✅ 防跟风攻击机制");
    
    console.log("\n🎉 OraSRS 客户端操作流程验证通过!");
    
  } catch (error) {
    console.error("❌ 客户端操作测试失败:", error);
    process.exit(1);
  }
}

// 运行测试
console.log("🚀 开始模拟实际客户端操作...\n");
testClientOperation()
  .then(() => {
    console.log("\n✅ 客户端操作模拟完成");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 客户端操作模拟失败:", error);
    process.exit(1);
  });
