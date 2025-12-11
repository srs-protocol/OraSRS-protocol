// scripts/test-commit-reveal.js
import hre from "hardhat";
const { ethers } = hre;

async function testCommitReveal() {
  console.log("🔍 详细测试提交-揭示机制...\n");
  
  try {
    // 获取账户
    const [owner, client1] = await ethers.getSigners();
    
    // 部署合约
    const MockToken = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockToken.deploy("ORASRS Token", "ORASRS", 18);
    await mockToken.waitForDeployment();
    
    await mockToken.mint(client1.address, ethers.parseEther("2000"));
    
    const ThreatConsensus = await ethers.getContractFactory("ThreatConsensus");
    const threatConsensus = await ThreatConsensus.deploy(await mockToken.getAddress());
    await threatConsensus.waitForDeployment();
    
    console.log("✅ 合约部署完成\n");
    
    // 测试数据
    const testIP = "192.168.1.100";
    const salt = "testSalt123";
    const ipHash = ethers.keccak256(ethers.toUtf8Bytes(testIP));
    
    console.log(`📝 测试数据:`);
    console.log(`   原始IP: ${testIP}`);
    console.log(`   IP哈希: ${ipHash}`);
    console.log(`   盐值: ${salt}`);
    console.log(`   客户端地址: ${client1.address}\n`);
    
    // 执行提交
    console.log("🔒 执行提交阶段...");
    const commitTx = await threatConsensus.connect(client1).commitThreatEvidence(ipHash, salt);
    const commitReceipt = await commitTx.wait();
    console.log(`✅ 提交成功: ${commitTx.hash}`);
    console.log(`   交易块号: ${commitReceipt.blockNumber}\n`);
    
    // 计算承诺 - 使用与合约中完全相同的方法
    // 合约中: keccak256(abi.encodePacked(ipHash, salt, msg.sender))
    const packedData = ethers.concat([
      ethers.getBytes(ipHash),
      ethers.toUtf8Bytes(salt),
      ethers.getBytes(client1.address)
    ]);
    const commitment = ethers.keccak256(packedData);
    
    console.log(`🔍 承诺计算验证:`);
    console.log(`   打包数据: ${packedData}`);
    console.log(`   承诺哈希: ${commitment}\n`);
    
    // 从合约中获取承诺数据
    const storedCommitment = await threatConsensus.commitments(commitment);
    console.log(`📋 存储的承诺数据:`);
    console.log(`   哈希: ${storedCommitment.hash}`);
    console.log(`   提交块: ${storedCommitment.commitBlock.toString()}`);
    console.log(`   已揭示: ${storedCommitment.revealed}`);
    
    // 验证数据是否匹配
    if (storedCommitment.hash === ipHash && storedCommitment.commitBlock > 0) {
      console.log("✅ 承诺存储正确\n");
    } else {
      console.log("❌ 承诺存储不正确!\n");
    }
    
    // 等待揭示延迟
    console.log("⏳ 等待揭示延迟 (挖10个区块)...");
    for (let i = 0; i < 10; i++) {
      await hre.network.provider.send("evm_mine");
    }
    console.log("✅ 区块已挖完\n");
    
    // 执行揭示
    console.log("🔓 执行揭示阶段...");
    const revealTx = await threatConsensus.connect(client1).revealThreatEvidence(
      testIP,
      salt,
      80, // cpuLoad
      "logHash123", // logHash
      "DDoS", // attackType
      50 // riskScore
    );
    const revealReceipt = await revealTx.wait();
    console.log(`✅ 揭示成功: ${revealTx.hash}`);
    console.log(`   交易块号: ${revealReceipt.blockNumber}\n`);
    
    // 验证承诺现在被标记为已揭示
    const updatedCommitment = await threatConsensus.commitments(commitment);
    console.log(`📋 更新后的承诺数据:`);
    console.log(`   哈希: ${updatedCommitment.hash}`);
    console.log(`   已揭示: ${updatedCommitment.revealed}`);
    
    if (updatedCommitment.revealed) {
      console.log("✅ 承诺已正确标记为已揭示\n");
    } else {
      console.log("❌ 承诺未被标记为已揭示\n");
    }
    
    // 检查威胁状态
    const [isConfirmed, reportCount, totalRiskScore, confirmedAt] = 
      await threatConsensus.getThreatStatus(testIP);
    console.log(`📊 威胁状态:`);
    console.log(`   已确认: ${isConfirmed}`);
    console.log(`   举报数: ${Number(reportCount)}`);
    console.log(`   风险分: ${Number(totalRiskScore)}`);
    console.log(`   确认时间: ${Number(confirmedAt)}`);
    
    console.log("\n🎉 提交-揭示机制测试完成!");
    
  } catch (error) {
    console.error("❌ 测试失败:", error);
    process.exit(1);
  }
}

// 运行测试
testCommitReveal()
  .then(() => {
    console.log("\n✅ 测试完成");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 测试失败:", error);
    process.exit(1);
  });