// test/orasrs-contract-tests.js
const { ethers } = require("ethers");
const { expect } = require("chai");

describe("OraSRS完整合约套件测试", function() {
  let governance, threatEvidence, threatIntelligence, enhancedVerification, privacyVerification, auditTrail;
  let deployer, otherAccount;
  let addresses;

  before(async function() {
    [deployer, otherAccount] = await ethers.getSigners();
    
    // 读取部署的合约地址
    const fs = require('fs');
    if (fs.existsSync('deployments.json')) {
      addresses = JSON.parse(fs.readFileSync('deployments.json', 'utf8'));
    } else {
      throw new Error("请先部署合约");
    }
  });

  beforeEach(async function() {
    // 连接到已部署的合约
    const Governance = await ethers.getContractFactory("OraSRSGovernance");
    governance = await Governance.attach(addresses.governance);

    const ThreatEvidence = await ethers.getContractFactory("ThreatEvidence");
    threatEvidence = await ThreatEvidence.attach(addresses.threatEvidence);

    const ThreatIntelligence = await ethers.getContractFactory("ThreatIntelligenceCoordination");
    threatIntelligence = await ThreatIntelligence.attach(addresses.threatIntelligence);

    const EnhancedVerification = await ethers.getContractFactory("EnhancedThreatVerification");
    enhancedVerification = await EnhancedVerification.attach(addresses.enhancedVerification);

    const PrivacyVerification = await ethers.getContractFactory("PrivacyProtectedVerification");
    privacyVerification = await PrivacyVerification.attach(addresses.privacyVerification);

    const AuditTrail = await ethers.getContractFactory("VerifiableAuditTrail");
    auditTrail = await AuditTrail.attach(addresses.auditTrail);
  });

  describe("治理合约测试", function() {
    it("应该允许授权节点", async function() {
      await governance.addAuthorizedNode(otherAccount.address, "test-node");
      expect(await governance.hasSufficientReputation(otherAccount.address)).to.equal(true);
    });
  });

  describe("威胁证据合约测试", function() {
    it("应该允许提交威胁报告", async function() {
      // 准备威胁报告数据
      const threatData = {
        threatType: 0, // DDoS
        sourceIP: "192.168.1.1",
        targetIP: "10.0.0.1",
        threatLevel: 2, // Critical
        context: "DDoS attack detected",
        evidenceHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test evidence")),
        geolocation: "Beijing, China"
      };

      // 提交威胁报告
      await expect(threatEvidence.connect(otherAccount).submitThreatReport(
        threatData,
        Math.floor(Math.random() * 1000000)
      )).to.emit(threatEvidence, "ThreatReportSubmitted");
    });
  });

  describe("威胁情报协调合约测试", function() {
    it("应该允许添加全局威胁", async function() {
      // 先注册节点
      await threatIntelligence.registerNode(otherAccount.address, "test-node-1");
      
      // 添加全局威胁
      await expect(threatIntelligence.connect(otherAccount).addGlobalThreat(
        "threat-test-001",
        "1.2.3.4",
        80, // 威胁级别
        0,  // 威胁类型
        90, // 置信度
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test evidence hash")),
        "Test threat context",
        true, // 全球威胁
        "Global"
      )).to.emit(threatIntelligence, "GlobalThreatAdded");
    });
  });

  describe("增强威胁验证合约测试", function() {
    it("应该允许开始威胁验证", async function() {
      // 授权节点
      await enhancedVerification.addAuthorizedPrivacyNode(otherAccount.address);
      
      // 开始威胁验证
      await expect(enhancedVerification.connect(otherAccount).startThreatVerification(
        "verification-test-001",
        deployer.address,
        75, // 威胁级别
        1   // 威胁类型
      )).to.emit(enhancedVerification, "ThreatVerificationStarted");
    });

    it("应该支持Commit-Reveal机制", async function() {
      // 授权节点
      await enhancedVerification.addAuthorizedPrivacyNode(otherAccount.address);
      
      // 开始验证
      await enhancedVerification.connect(otherAccount).startThreatVerification(
        "verification-test-002",
        deployer.address,
        75, // 威胁级别
        1   // 威胁类型
      );

      // 提交哈希 (Commit阶段)
      const score = 80;
      const reason = "Valid threat detected";
      const salt = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("random-salt-123"));
      const commitmentHash = ethers.utils.keccak256(
        ethers.utils.concat([
          ethers.utils.arrayify(ethers.utils.hexZeroPad(ethers.utils.hexlify(score), 32)),
          ethers.utils.toUtf8Bytes(reason),
          ethers.utils.arrayify(salt)
        ])
      );

      await expect(enhancedVerification.connect(otherAccount).commitVerification(
        "verification-test-002",
        commitmentHash
      )).to.emit(enhancedVerification, "VerificationCommitted");

      // 揭示原始值 (Reveal阶段)
      await expect(enhancedVerification.connect(otherAccount).revealVerification(
        "verification-test-002",
        score,
        reason,
        salt
      )).to.emit(enhancedVerification, "VerificationRevealed");
    });
  });

  describe("隐私保护验证合约测试", function() {
    it("应该允许提交隐私保护报告", async function() {
      // 授权节点
      await privacyVerification.addAuthorizedPrivacyNode(otherAccount.address);
      
      // 提交隐私保护报告
      await expect(privacyVerification.connect(otherAccount).submitPrivacyProtectedReport(
        "privacy-test-001",
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("private threat data")),
        "public attributes",
        85, // 威胁级别
        2,  // 威胁类型
        ["aux1", "aux2"]
      )).to.emit(privacyVerification, "PrivacyProtectedReportSubmitted");
    });
  });

  describe("可验证审计合约测试", function() {
    it("应该记录审计事件", async function() {
      // 记录审计事件
      const eventId = await privacyVerification.connect(otherAccount).callStatic.submitPrivacyProtectedReport(
        "audit-test-001",
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("audit test data")),
        "audit attributes",
        70,
        0,
        ["audit", "test"]
      );

      // 等待交易完成
      await privacyVerification.connect(otherAccount).submitPrivacyProtectedReport(
        "audit-test-001",
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("audit test data")),
        "audit attributes",
        70,
        0,
        ["audit", "test"]
      );
    });
  });

  describe("集成测试", function() {
    it("应该测试完整的威胁验证流程", async function() {
      // 1. 提交威胁报告
      const threatData = {
        threatType: 1, // Malware
        sourceIP: "10.0.0.100",
        targetIP: "192.168.1.100",
        threatLevel: 3, // Emergency
        context: "Malware detected in network",
        evidenceHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("malware evidence")),
        geolocation: "Shanghai, China"
      };

      await threatEvidence.connect(otherAccount).submitThreatReport(threatData, 123456);
      
      // 2. 验证威胁
      await threatEvidence.addAuthorizedValidator(otherAccount.address);
      await threatEvidence.connect(otherAccount).verifyThreatReport("threat_10.0.0.100_"+(Date.now()/1000).toFixed(0).toString(), { gasLimit: 500000 });
      
      // 3. 添加到全局威胁情报
      await threatIntelligence.registerNode(otherAccount.address, "verifier-node");
      await threatIntelligence.connect(otherAccount).addGlobalThreat(
        "global-threat-test",
        "10.0.0.100",
        95,
        1,
        90,
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("global evidence")),
        "Global malware threat",
        true,
        "Global"
      );

      // 验证威胁已被添加
      expect(await threatIntelligence.isGlobalThreat("global-threat-test")).to.equal(true);
    });
  });
});