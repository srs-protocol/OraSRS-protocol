// test/threat-consensus-full.test.js
import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("ThreatConsensus - Full Feature Test", function () {
  let threatConsensus;
  let mockToken;
  let owner, attacker1, attacker2, attacker3, other;

  beforeEach(async function () {
    [owner, attacker1, attacker2, attacker3, other] = await ethers.getSigners();
    
    // 部署模拟代币
    const MockToken = await ethers.getContractFactory("MockERC20");
    mockToken = await MockToken.deploy("ORASRS Token", "ORASRS", 18);
    await mockToken.waitForDeployment();
    
    // 铸造代币给测试账户
    await mockToken.mint(attacker1.address, ethers.parseEther("2000"));
    await mockToken.mint(attacker2.address, ethers.parseEther("2000"));
    await mockToken.mint(attacker3.address, ethers.parseEther("2000"));
    
    // 部署威胁共识合约
    const ThreatConsensus = await ethers.getContractFactory("ThreatConsensus");
    threatConsensus = await ThreatConsensus.deploy(await mockToken.getAddress());
    await threatConsensus.waitForDeployment();
  });

  it("Should test full client registration, IP blocking, and consensus flow", async function () {
    // 1. 测试代币验证
    console.log("✅ 1. 代币验证测试");
    await expect(
      threatConsensus.connect(other).commitThreatEvidence(ethers.keccak256(ethers.toUtf8Bytes("192.168.1.100")), "salt")
    ).to.be.revertedWith("Insufficient token balance for threat reporting");
    
    // 2. 测试白名单功能
    console.log("✅ 2. 白名单保护测试");
    expect(await threatConsensus.isWhitelisted("8.8.8.8")).to.equal(true);
    expect(await threatConsensus.isWhitelisted("1.1.1.1")).to.equal(true);
    
    // 3. 测试提交-揭示机制
    console.log("✅ 3. 提交-揭示机制测试");
    const testIP = "192.168.1.100";
    const salt = "randomsalt123";
    const ipHash = ethers.keccak256(ethers.toUtf8Bytes(testIP));
    
    // 提交阶段
    const commitTx = await threatConsensus.connect(attacker1).commitThreatEvidence(ipHash, salt);
    await commitTx.wait();
    
    // 验证承诺已存储
    const commitment = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'string', 'address'], 
      [ipHash, salt, attacker1.address]
    ));
    
    const storedCommitment = await threatConsensus.commitments(commitment);
    expect(storedCommitment.hash).to.equal(ipHash);
    expect(storedCommitment.revealed).to.equal(false);
    
    // 挖10个区块以达到揭示延迟
    for (let i = 0; i < 15; i++) {
      await ethers.provider.send("evm_mine");
    }
    
    // 揭示阶段
    await expect(
      threatConsensus.connect(attacker1).revealThreatEvidence(
        testIP,
        salt,
        80, // cpuLoad
        "loghash123", // logHash
        "DDoS", // attackType
        50 // riskScore
      )
    )
      .to.emit(threatConsensus, "ThreatRevealed")
      .withArgs(testIP, attacker1.address, salt);
    
    // 4. 测试共识机制
    console.log("✅ 4. 共识机制测试");
    const consensusIP = "203.0.113.20";
    const salt2 = "salt2";
    const salt3 = "salt3";
    const salt4 = "salt4";
    
    const ipHash2 = ethers.keccak256(ethers.toUtf8Bytes(consensusIP));
    
    // 三个攻击者提交证据
    await threatConsensus.connect(attacker1).commitThreatEvidence(ipHash2, salt2);
    await threatConsensus.connect(attacker2).commitThreatEvidence(ipHash2, salt3);
    await threatConsensus.connect(attacker3).commitThreatEvidence(ipHash2, salt4);
    
    // 挖区块
    for (let i = 0; i < 15; i++) {
      await ethers.provider.send("evm_mine");
    }
    
    // 三个攻击者揭示证据
    await threatConsensus.connect(attacker1).revealThreatEvidence(
      consensusIP, salt2, 80, "log1", "DDoS", 50
    );
    await threatConsensus.connect(attacker2).revealThreatEvidence(
      consensusIP, salt3, 85, "log2", "DDoS", 60
    );
    
    // 第三个揭示应该触发全局确认
    await expect(
      threatConsensus.connect(attacker3).revealThreatEvidence(
        consensusIP, salt4, 90, "log3", "DDoS", 70
      )
    ).to.emit(threatConsensus, "GlobalThreatConfirmed")
      .withArgs(consensusIP, "DDoS");
    
    // 验证威胁状态
    const [isConfirmed, reportCount, totalRiskScore, confirmedAt] = await threatConsensus.getThreatStatus(consensusIP);
    expect(isConfirmed).to.equal(true);
    expect(reportCount).to.equal(3n);
    expect(totalRiskScore).to.equal(180n); // 50+60+70
    expect(confirmedAt).to.be.greaterThan(0n);
    
    // 5. 测试白名单保护（确保不能封禁白名单IP）
    console.log("✅ 5. 白名单保护验证");
    const whitelistedIP = "8.8.8.8";
    const whitelistSalt = "whitelistSalt";
    const whitelistIpHash = ethers.keccak256(ethers.toUtf8Bytes(whitelistedIP));
    
    // 提交
    await threatConsensus.connect(attacker1).commitThreatEvidence(whitelistIpHash, whitelistSalt);
    
    // 挖区块
    for (let i = 0; i < 15; i++) {
      await ethers.provider.send("evm_mine");
    }
    
    // 揭示应该失败，因为IP在白名单中
    await expect(
      threatConsensus.connect(attacker1).revealThreatEvidence(
        whitelistedIP,
        whitelistSalt,
        80, // cpuLoad
        "loghash", // logHash
        "DDoS", // attackType
        50 // riskScore
      )
    ).to.be.revertedWith("IP is in whitelist");
    
    console.log("✅ 所有测试通过！完整功能验证成功");
  });
});