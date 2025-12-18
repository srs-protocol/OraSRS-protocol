// test/Faucet.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Faucet Contract", function () {
  let faucet;
  let oraToken;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // 部署ORA代币合约
    const OraSRSToken = await ethers.getContractFactory("OraSRSToken");
    oraToken = await OraSRSToken.deploy();
    await oraToken.deployed();

    // 部署水龙头合约
    const Faucet = await ethers.getContractFactory("FaucetUpgradeable");
    faucet = await Faucet.deploy(oraToken.address);
    await faucet.deployed();

    // 向水龙头合约发送代币
    const faucetInitialBalance = ethers.utils.parseEther("1000000"); // 100万代币
    await oraToken.transfer(faucet.address, faucetInitialBalance);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await faucet.owner()).to.equal(owner.address);
    });

    it("Should set the right token address", async function () {
      expect(await faucet.oraToken()).to.equal(oraToken.address);
    });
  });

  describe("Withdraw Tokens", function () {
    it("Should allow user to withdraw tokens", async function () {
      const withdrawAmount = await faucet.withdrawAmount();
      
      await expect(() => faucet.connect(user1).withdrawTokens())
        .to.changeTokenBalance(oraToken, user1, withdrawAmount);

      // 检查水龙头余额减少
      const faucetBalance = await oraToken.balanceOf(faucet.address);
      const expectedBalance = ethers.utils.parseEther("1000000").sub(withdrawAmount);
      expect(faucetBalance).to.equal(expectedBalance);
    });

    it("Should prevent user from withdrawing twice within cooldown period", async function () {
      await faucet.connect(user1).withdrawTokens();
      
      await expect(faucet.connect(user1).withdrawTokens())
        .to.be.revertedWith("Must wait for cooldown period");
    });

    it("Should allow user to withdraw again after cooldown period", async function () {
      // 修改冷却时间为0秒以便测试
      await faucet.setCooldownPeriod(0);
      
      // 第一次领取
      await faucet.connect(user1).withdrawTokens();
      
      // 第二次领取应该成功
      const withdrawAmount = await faucet.withdrawAmount();
      await expect(() => faucet.connect(user1).withdrawTokens())
        .to.changeTokenBalance(oraToken, user1, withdrawAmount);
    });
  });

  describe("Batch Distribute", function () {
    it("Should allow owner to distribute tokens in batch", async function () {
      const recipients = [user1.address, user2.address];
      const withdrawAmount = await faucet.withdrawAmount();
      const totalAmount = withdrawAmount.mul(2);
      
      const initialUser1Balance = await oraToken.balanceOf(user1.address);
      const initialUser2Balance = await oraToken.balanceOf(user2.address);
      
      await faucet.connect(owner).batchDistribute(recipients);
      
      const finalUser1Balance = await oraToken.balanceOf(user1.address);
      const finalUser2Balance = await oraToken.balanceOf(user2.address);
      
      expect(finalUser1Balance.sub(initialUser1Balance)).to.equal(withdrawAmount);
      expect(finalUser2Balance.sub(initialUser2Balance)).to.equal(withdrawAmount);
    });

    it("Should prevent non-owner from calling batchDistribute", async function () {
      const recipients = [user1.address, user2.address];
      
      await expect(faucet.connect(user1).batchDistribute(recipients))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Deposit Tokens", function () {
    it("Should allow owner to deposit tokens to faucet", async function () {
      // 首先给owner一些代币用于存入
      const depositAmount = ethers.utils.parseEther("1000");
      await oraToken.transfer(faucet.address, depositAmount);
      
      const faucetBalance = await oraToken.balanceOf(faucet.address);
      const expectedBalance = ethers.utils.parseEther("1000000").add(depositAmount);
      expect(faucetBalance).to.equal(expectedBalance);
    });
  });

  describe("Access Control", function () {
    it("Should prevent non-owner from changing parameters", async function () {
      await expect(faucet.connect(user1).setWithdrawAmount(ethers.utils.parseEther("2000")))
        .to.be.revertedWith("Ownable: caller is not the owner");
        
      await expect(faucet.connect(user1).setCooldownPeriod(2 * 24 * 60 * 60)) // 2 days
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});