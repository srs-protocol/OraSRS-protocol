// test/ThreatConsensus-updated.test.js
import { expect } from "chai";
import { ethers, network } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("ThreatConsensus Contract - Updated Features", function () {
  async function deployThreatConsensusFixture() {
    const [owner, attacker1, attacker2, attacker3, other] = await ethers.getSigners();
    
    // 部署一个模拟的ERC20代币合约用于测试
    const MockToken = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockToken.deploy("ORASRS Token", "ORASRS", ethers.parseEther("1000000"));
    await mockToken.waitForDeployment();
    
    // 铸造代币给测试账户
    await mockToken.transfer(attacker1.address, ethers.parseEther("2000"));
    await mockToken.transfer(attacker2.address, ethers.parseEther("2000"));
    await mockToken.transfer(attacker3.address, ethers.parseEther("2000"));
    
    // 部署威胁共识合约
    const ThreatConsensus = await ethers.getContractFactory("ThreatConsensus");
    const threatConsensus = await ThreatConsensus.deploy(mockToken.getAddress());
    await threatConsensus.waitForDeployment();
    
    return {
      threatConsensus,
      mockToken,
      owner,
      attacker1,
      attacker2,
      attacker3,
      other,
    };
  }

  describe("Deployment", function () {
    it("Should set the right token address and owner", async function () {
      const { threatConsensus, mockToken, owner } = await loadFixture(deployThreatConsensusFixture);

      expect(await threatConsensus.orasrsToken()).to.equal(await mockToken.getAddress());
      expect(await threatConsensus.owner()).to.equal(owner.address);
    });

    it("Should initialize whitelist with default IPs", async function () {
      const { threatConsensus } = await loadFixture(deployThreatConsensusFixture);

      expect(await threatConsensus.isWhitelisted("8.8.8.8")).to.equal(true);
      expect(await threatConsensus.isWhitelisted("8.8.4.4")).to.equal(true);
      expect(await threatConsensus.isWhitelisted("1.1.1.1")).to.equal(true);
      expect(await threatConsensus.isWhitelisted("1.0.0.1")).to.equal(true);
    });
  });

  describe("Token Balance Validation", function () {
    it("Should reject evidence submission from users with insufficient tokens", async function () {
      const { threatConsensus, other } = await loadFixture(deployThreatConsensusFixture);

      const ipHash = ethers.keccak256(ethers.toUtf8Bytes("192.168.1.100"));
      const salt = "randomsalt123";
      
      await expect(
        threatConsensus.connect(other).commitThreatEvidence(ipHash, salt)
      ).to.be.revertedWith("Insufficient token balance for threat reporting");
    });
  });

  describe("Commit-Reveal Mechanism", function () {
    it("Should allow evidence submission with sufficient tokens via commit-reveal", async function () {
      const { threatConsensus, mockToken, attacker1 } = await loadFixture(deployThreatConsensusFixture);

      const testIP = "192.168.1.100";
      const salt = "randomsalt123";
      const ipHash = ethers.keccak256(ethers.toUtf8Bytes(testIP));
      
      // 提交阶段
      const tx = await threatConsensus.connect(attacker1).commitThreatEvidence(ipHash, salt);
      await tx.wait();
      
      // 生成承诺
      const commitment = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
        ['bytes32', 'string', 'address'], 
        [ipHash, salt, attacker1.address]
      ));
      
      // 验证承诺已存储
      const storedCommitment = await threatConsensus.commitments(commitment);
      expect(storedCommitment.hash).to.equal(ipHash);
      expect(storedCommitment.revealed).to.equal(false);
      
      // 由于REVEAL_DELAY设置为10个区块，我们需要等待足够的区块
      // 在测试中，我们可以直接模拟这种情况
      for (let i = 0; i < 10; i++) {
        await network.provider.send("evm_mine"); // 挖10个区块
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
        .withArgs(testIP, attacker1.address, salt)
        .to.emit(threatConsensus, "LocalDefenseActive")
        .withArgs(testIP, attacker1.address);
    });

    it("Should reject reveal if delay not reached", async function () {
      const { threatConsensus, mockToken, attacker1 } = await loadFixture(deployThreatConsensusFixture);

      const testIP = "192.168.1.200";
      const salt = "randomsalt456";
      const ipHash = ethers.keccak256(ethers.toUtf8Bytes(testIP));
      
      // 提交阶段
      await threatConsensus.connect(attacker1).commitThreatEvidence(ipHash, salt);
      
      // 立即尝试揭示（不等待延迟）
      await expect(
        threatConsensus.connect(attacker1).revealThreatEvidence(
          testIP,
          salt,
          80, // cpuLoad
          "loghash456", // logHash
          "DDoS", // attackType
          50 // riskScore
        )
      ).to.be.revertedWith("Reveal delay not reached");
    });

    it("Should reject reveal with wrong hash", async function () {
      const { threatConsensus, mockToken, attacker1 } = await loadFixture(deployThreatConsensusFixture);

      const testIP = "192.168.1.300";
      const salt = "randomsalt789";
      const ipHash = ethers.keccak256(ethers.toUtf8Bytes(testIP));
      
      // 提交阶段
      await threatConsensus.connect(attacker1).commitThreatEvidence(ipHash, salt);
      
      // 等待足够的区块
      for (let i = 0; i < 10; i++) {
        await network.provider.send("evm_mine"); // 挖10个区块
      }
      
      // 使用错误的IP揭示（导致hash不匹配）
      await expect(
        threatConsensus.connect(attacker1).revealThreatEvidence(
          "192.168.1.999", // wrong IP
          salt,
          80, // cpuLoad
          "loghash789", // logHash
          "DDoS", // attackType
          50 // riskScore
        )
      ).to.be.revertedWith("Hash mismatch");
    });
  });

  describe("Whitelist Protection", function () {
    it("Should reject evidence submission for whitelisted IPs", async function () {
      const { threatConsensus, mockToken, attacker1 } = await loadFixture(deployThreatConsensusFixture);

      const whitelistedIP = "8.8.8.8"; // Google DNS
      const salt = "randomsalt999";
      const ipHash = ethers.keccak256(ethers.toUtf8Bytes(whitelistedIP));
      
      // 提交阶段
      await threatConsensus.connect(attacker1).commitThreatEvidence(ipHash, salt);
      
      // 等待足够的区块
      for (let i = 0; i < 10; i++) {
        await network.provider.send("evm_mine"); // 挖10个区块
      }
      
      // 揭示阶段 - 应该失败，因为IP在白名单中
      await expect(
        threatConsensus.connect(attacker1).revealThreatEvidence(
          whitelistedIP,
          salt,
          80, // cpuLoad
          "loghash999", // logHash
          "DDoS", // attackType
          50 // riskScore
        )
      ).to.be.revertedWith("IP is in whitelist");
    });

    it("Should allow governance to add/remove IPs from whitelist", async function () {
      const { threatConsensus, owner, other } = await loadFixture(deployThreatConsensusFixture);

      const newIP = "192.168.100.100";
      
      // 非治理账户尝试添加应该失败
      await expect(
        threatConsensus.connect(other).addToWhitelist(newIP)
      ).to.be.revertedWith("Ownable: caller is not the owner");
      
      // 治理账户添加IP到白名单
      await expect(threatConsensus.connect(owner).addToWhitelist(newIP))
        .to.emit(threatConsensus, "WhitelistUpdated")
        .withArgs(newIP, true);
      
      expect(await threatConsensus.isWhitelisted(newIP)).to.equal(true);
      
      // 治理账户从白名单移除IP
      await expect(threatConsensus.connect(owner).removeFromWhitelist(newIP))
        .to.emit(threatConsensus, "WhitelistUpdated")
        .withArgs(newIP, false);
      
      expect(await threatConsensus.isWhitelisted(newIP)).to.equal(false);
    });
  });

  describe("Consensus Mechanism", function () {
    it("Should confirm threat when threshold is reached", async function () {
      const { threatConsensus, mockToken, attacker1, attacker2, attacker3 } = await loadFixture(deployThreatConsensusFixture);

      const testIP = "203.0.113.10";
      const salt1 = "salt1";
      const salt2 = "salt2";
      const salt3 = "salt3";
      
      // 三个不同的攻击者提交证据
      const ipHash = ethers.keccak256(ethers.toUtf8Bytes(testIP));
      
      await threatConsensus.connect(attacker1).commitThreatEvidence(ipHash, salt1);
      await threatConsensus.connect(attacker2).commitThreatEvidence(ipHash, salt2);
      await threatConsensus.connect(attacker3).commitThreatEvidence(ipHash, salt3);
      
      // 等待足够的区块
      for (let i = 0; i < 10; i++) {
        await network.provider.send("evm_mine"); // 挖10个区块
      }
      
      // 三个攻击者揭示证据
      await threatConsensus.connect(attacker1).revealThreatEvidence(
        testIP, salt1, 80, "log1", "DDoS", 50
      );
      
      await threatConsensus.connect(attacker2).revealThreatEvidence(
        testIP, salt2, 85, "log2", "DDoS", 60
      );
      
      // 第三个揭示应该触发全局确认
      await expect(
        threatConsensus.connect(attacker3).revealThreatEvidence(
          testIP, salt3, 90, "log3", "DDoS", 70
        )
      ).to.emit(threatConsensus, "GlobalThreatConfirmed")
        .withArgs(testIP, "DDoS");
      
      // 验证威胁状态
      const [isConfirmed, reportCount, totalRiskScore, confirmedAt] = await threatConsensus.getThreatStatus(testIP);
      expect(isConfirmed).to.equal(true);
      expect(reportCount).to.equal(3n); // 3次举报
      expect(totalRiskScore).to.equal(180n); // 50+60+70
      expect(confirmedAt).to.be.greaterThan(0n);
    });
  });
});

// Mock ERC20 token contract for testing
// 这应该在单独的文件中，但为了简化测试，我们将其包含在内
// 在实际项目中，这应该在contracts/mocks/MockERC20.sol中