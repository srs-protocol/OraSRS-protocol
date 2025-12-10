// add-tokens-to-gas-subsidy.mjs
// 向GasSubsidy合约添加原生代币 (ether)

import pkg from "hardhat";
const { ethers } = pkg;
import { readFileSync } from 'fs';

async function addTokensToGasSubsidy() {
  console.log("准备向GasSubsidy合约添加原生代币 (ether)...");

  // 从部署信息中获取合约地址
  const allDeployments = JSON.parse(readFileSync('all-deployments.json', 'utf8'));
  const gasSubsidyAddress = allDeployments.gasSubsidyAddress;

  console.log("GasSubsidy地址:", gasSubsidyAddress);

  // 获取部署者账户
  const [deployer] = await ethers.getSigners();
  console.log("使用账户:", deployer.address);

  // 检查账户原生代币余额
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("账户原生代币余额:", ethers.formatEther(balance));

  // 检查GasSubsidy合约当前的原生代币余额
  const gasSubsidyBalance = await ethers.provider.getBalance(gasSubsidyAddress);
  console.log("GasSubsidy合约当前原生代币余额:", ethers.formatEther(gasSubsidyBalance));

  // 要转账的原生代币数量 (1000个 ether，考虑18位小数)
  const tokenAmount = ethers.parseEther("1000");
  console.log("准备转账数量:", ethers.formatEther(tokenAmount), "个原生代币");

  // 执行转账 - 直接向合约发送原生代币
  console.log("正在执行原生代币转账...");
  const tx = await deployer.sendTransaction({
    to: gasSubsidyAddress,
    value: tokenAmount
  });
  console.log("交易已提交:", tx.hash);
  
  await tx.wait();
  console.log("交易已确认!");

  // 检查转账后的余额
  const newGasSubsidyBalance = await ethers.provider.getBalance(gasSubsidyAddress);
  console.log("GasSubsidy合约新余额:", ethers.formatEther(newGasSubsidyBalance));

  console.log("✅ 原生代币转账成功完成!");
}

// 执行函数
async function main() {
  try {
    await addTokensToGasSubsidy();
  } catch (error) {
    console.error("❌ 操作失败:", error);
    process.exit(1);
  }
}

main();