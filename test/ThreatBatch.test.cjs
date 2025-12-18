// test/ThreatBatch.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ThreatBatch Contract", function () {
  let threatBatch;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const ThreatBatch = await ethers.getContractFactory("ThreatBatch");
    threatBatch = await ThreatBatch.deploy();
    await threatBatch.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await threatBatch.owner()).to.equal(owner.address);
    });

    it("Should have correct default ban durations", async function () {
      expect(await threatBatch.TIER_1()).to.equal(86400); // 24h
      expect(await threatBatch.TIER_2()).to.equal(259200); // 3d
      expect(await threatBatch.TIER_3()).to.equal(604800); // 7d
    });
  });

  describe("reportBatch", function () {
    it("Should allow owner to report batch threats", async function () {
      const ips = ["192.168.1.1", "192.168.1.2"];
      const scores = [100, 200];

      await expect(threatBatch.connect(owner).reportBatch(ips, scores))
        .to.emit(threatBatch, "PunishBatch")
        .withArgs(ips, [86400, 86400]); // First offense -> TIER_1

      // Check that profiles were updated
      const [time1, count1, score1] = await threatBatch.getProfile("192.168.1.1");
      expect(score1).to.equal(100);
      expect(count1).to.equal(1);
    });

    it("Should not allow non-owner to report batch threats", async function () {
      const ips = ["192.168.1.1"];
      const scores = [100];

      await expect(
        threatBatch.connect(addr1).reportBatch(ips, scores)
      ).to.be.revertedWithCustomError(threatBatch, "OwnableUnauthorizedAccount");
    });

    it("Should prevent length mismatch", async function () {
      const ips = ["192.168.1.1"];
      const scores = [100, 200];

      await expect(
        threatBatch.connect(owner).reportBatch(ips, scores)
      ).to.be.revertedWith("Length mismatch");
    });

    it("Should update scores cumulatively", async function () {
      const ip = "192.168.1.1";
      
      // First report
      await threatBatch.connect(owner).reportBatch([ip], [100]);
      let [, , score] = await threatBatch.getProfile(ip);
      expect(score).to.equal(100);
      
      // Second report
      await threatBatch.connect(owner).reportBatch([ip], [50]);
      [, , score] = await threatBatch.getProfile(ip);
      expect(score).to.equal(150);
    });

    it("Should enforce batch size limit", async function () {
      const largeBatchSize = 101; // Exceeds MAX_BATCH_SIZE of 100
      const ips = Array(largeBatchSize).fill().map((_, i) => `192.168.1.${i}`);
      const scores = Array(largeBatchSize).fill(100);

      await expect(
        threatBatch.connect(owner).reportBatch(ips, scores)
      ).to.be.revertedWith("Batch too large");
    });
  });

  describe("getProfilesBatch", function () {
    it("Should return profiles for multiple IPs", async function () {
      const ips = ["192.168.1.1", "192.168.1.2", "192.168.1.3"];
      const scores = [100, 200, 300];

      await threatBatch.connect(owner).reportBatch(ips, scores);

      const [timestamps, counts, riskScores] = await threatBatch.getProfilesBatch(ips);
      
      expect(riskScores[0]).to.equal(100);
      expect(riskScores[1]).to.equal(200);
      expect(riskScores[2]).to.equal(300);
      expect(counts[0]).to.equal(1);
      expect(counts[1]).to.equal(1);
      expect(counts[2]).to.equal(1);
    });
  });

  describe("getBanDuration", function () {
    it("Should return correct duration based on offense count", async function () {
      expect(await threatBatch.getBanDuration(1)).to.equal(86400);  // TIER_1
      expect(await threatBatch.getBanDuration(2)).to.equal(259200); // TIER_2
      expect(await threatBatch.getBanDuration(3)).to.equal(604800); // TIER_3
      expect(await threatBatch.getBanDuration(10)).to.equal(604800); // TIER_3 (max)
    });
  });

  describe("updateBanDuration", function () {
    it("Should allow owner to update ban durations", async function () {
      await threatBatch.connect(owner).updateBanDuration(43200, 129600, 259200); // 12h, 1.5d, 3d
      
      expect(await threatBatch.TIER_1()).to.equal(43200);
      expect(await threatBatch.TIER_2()).to.equal(129600);
      expect(await threatBatch.TIER_3()).to.equal(259200);
    });

    it("Should not allow non-owner to update ban durations", async function () {
      await expect(
        threatBatch.connect(addr1).updateBanDuration(43200, 129600, 259200)
      ).to.be.revertedWithCustomError(threatBatch, "OwnableUnauthorizedAccount");
    });

    it("Should validate duration sequence", async function () {
      await expect(
        threatBatch.connect(owner).updateBanDuration(100000, 50000, 259200) // TIER_1 > TIER_2
      ).to.be.revertedWith("Invalid duration sequence");
    });
  });

  describe("emergencyClearProfile", function () {
    it("Should allow owner to clear a profile", async function () {
      const ip = "192.168.1.1";
      await threatBatch.connect(owner).reportBatch([ip], [100]);
      
      // Verify profile exists
      let [, , score] = await threatBatch.getProfile(ip);
      expect(score).to.equal(100);
      
      // Clear profile
      await threatBatch.connect(owner).emergencyClearProfile(ip);
      
      // Verify profile is cleared
      [, , score] = await threatBatch.getProfile(ip);
      expect(score).to.equal(0);
    });
  });
});