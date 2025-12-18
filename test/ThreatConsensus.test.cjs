// test/ThreatConsensus.test.cjs
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ThreatConsensus Contract", function () {
  let threatConsensus;
  let owner;
  let addr1;
  let addr2;
  let addr3;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    const ThreatConsensus = await ethers.getContractFactory("ThreatConsensus");
    threatConsensus = await ThreatConsensus.deploy();
    await threatConsensus.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await threatConsensus.owner()).to.equal(owner.address);
    });

    it("Should have correct consensus threshold", async function () {
      expect(await threatConsensus.CONSENSUS_THRESHOLD()).to.equal(3);
    });
  });

  describe("submitThreatEvidence", function () {
    it("Should allow reporting of threats and store evidence", async function () {
      const ip = "192.168.1.1";
      const cpuLoad = 85;
      const logHash = "0x1234567890abcdef";
      const attackType = "DDoS";
      const riskScore = 50;

      await expect(
        threatConsensus.connect(addr1).submitThreatEvidence(
          ip, cpuLoad, logHash, attackType, riskScore
        )
      )
        .to.emit(threatConsensus, "LocalDefenseActive")
        .withArgs(ip, addr1.address);

      // Check that evidence was stored
      const evidenceCount = await threatConsensus.getEvidenceCount(ip);
      expect(evidenceCount).to.equal(1);

      // Check that report count was incremented
      const [isConfirmed, reportCount, totalRiskScore, confirmedAt] = await threatConsensus.getThreatStatus(ip);
      expect(isConfirmed).to.be.false;
      expect(reportCount).to.equal(1);
      expect(totalRiskScore).to.equal(riskScore);
    });

    it("Should not allow duplicate reports from same address", async function () {
      const ip = "192.168.1.1";
      const cpuLoad = 85;
      const logHash = "0x1234567890abcdef";
      const attackType = "DDoS";
      const riskScore = 50;

      // First report should succeed
      await threatConsensus.connect(addr1).submitThreatEvidence(
        ip, cpuLoad, logHash, attackType, riskScore
      );

      // Second report from same address should fail
      await expect(
        threatConsensus.connect(addr1).submitThreatEvidence(
          ip, cpuLoad, logHash, attackType, riskScore
        )
      ).to.be.revertedWith("Already reported this IP");
    });

    it("Should trigger GlobalThreatConfirmed when threshold is reached", async function () {
      const ip = "192.168.1.1";
      const cpuLoad = 85;
      const logHash = "0x1234567890abcdef";
      const attackType = "DDoS";
      const riskScore = 50;

      // First report
      await threatConsensus.connect(addr1).submitThreatEvidence(
        ip, cpuLoad, logHash, attackType, riskScore
      );

      // Second report
      await threatConsensus.connect(addr2).submitThreatEvidence(
        ip, cpuLoad, logHash, attackType, riskScore
      );

      // Check that consensus is not yet reached
      let [isConfirmed] = await threatConsensus.getThreatStatus(ip);
      expect(isConfirmed).to.be.false;

      // Third report - should trigger consensus
      await expect(
        threatConsensus.connect(addr3).submitThreatEvidence(
          ip, cpuLoad, logHash, attackType, riskScore
        )
      )
        .to.emit(threatConsensus, "GlobalThreatConfirmed")
        .withArgs(ip, attackType);

      // Check that consensus is now confirmed
      [isConfirmed] = await threatConsensus.getThreatStatus(ip);
      expect(isConfirmed).to.be.true;
    });

    it("Should validate CPU load range", async function () {
      const ip = "192.168.1.1";
      const invalidCpuLoad = 101; // Above 100
      const logHash = "0x1234567890abcdef";
      const attackType = "DDoS";
      const riskScore = 50;

      await expect(
        threatConsensus.connect(addr1).submitThreatEvidence(
          ip, invalidCpuLoad, logHash, attackType, riskScore
        )
      ).to.be.revertedWith("CPU load out of range");
    });
  });

  describe("revokeThreatReport", function () {
    it("Should allow revoking threat reports before consensus", async function () {
      const ip = "192.168.1.1";
      const cpuLoad = 85;
      const logHash = "0x1234567890abcdef";
      const attackType = "DDoS";
      const riskScore = 50;

      // Submit a report
      await threatConsensus.connect(addr1).submitThreatEvidence(
        ip, cpuLoad, logHash, attackType, riskScore
      );

      // Verify report exists
      let [isConfirmed, reportCount] = await threatConsensus.getThreatStatus(ip);
      expect(reportCount).to.equal(1);

      // Revoke the report
      await threatConsensus.connect(addr1).revokeThreatReport(ip);

      // Verify report count decreased
      [isConfirmed, reportCount] = await threatConsensus.getThreatStatus(ip);
      expect(reportCount).to.equal(0);
    });

    it("Should not allow revoking after consensus is reached", async function () {
      const ip = "192.168.1.1";
      const cpuLoad = 85;
      const logHash = "0x1234567890abcdef";
      const attackType = "DDoS";
      const riskScore = 50;

      // Reach consensus
      await threatConsensus.connect(addr1).submitThreatEvidence(
        ip, cpuLoad, logHash, attackType, riskScore
      );
      await threatConsensus.connect(addr2).submitThreatEvidence(
        ip, cpuLoad, logHash, attackType, riskScore
      );
      await threatConsensus.connect(addr3).submitThreatEvidence(
        ip, cpuLoad, logHash, attackType, riskScore
      );

      // Try to revoke after consensus - should fail
      await expect(
        threatConsensus.connect(addr1).revokeThreatReport(ip)
      ).to.be.revertedWith("Threat already confirmed");
    });
  });

  describe("forceConfirm and forceRevoke", function () {
    it("Should allow owner to force confirm a threat", async function () {
      const ip = "192.168.1.1";

      await expect(threatConsensus.connect(owner).forceConfirm(ip))
        .to.emit(threatConsensus, "GlobalThreatConfirmed")
        .withArgs(ip, "Governance Force Block");

      const [isConfirmed] = await threatConsensus.getThreatStatus(ip);
      expect(isConfirmed).to.be.true;
    });

    it("Should allow owner to force revoke a confirmed threat", async function () {
      const ip = "192.168.1.1";

      // First confirm
      await threatConsensus.connect(owner).forceConfirm(ip);
      let [isConfirmed] = await threatConsensus.getThreatStatus(ip);
      expect(isConfirmed).to.be.true;

      // Then revoke
      await threatConsensus.connect(owner).forceRevoke(ip);
      [isConfirmed] = await threatConsensus.getThreatStatus(ip);
      expect(isConfirmed).to.be.false;
    });

    it("Should not allow non-owner to force confirm/revoke", async function () {
      const ip = "192.168.1.1";

      await expect(
        threatConsensus.connect(addr1).forceConfirm(ip)
      ).to.be.revertedWithCustomError(threatConsensus, "OwnableUnauthorizedAccount");

      await expect(
        threatConsensus.connect(addr1).forceRevoke(ip)
      ).to.be.revertedWithCustomError(threatConsensus, "OwnableUnauthorizedAccount");
    });
  });
});