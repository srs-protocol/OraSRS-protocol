// scripts/deployFaucet.js
const { ethers } = require("hardhat");
const config = require("../config/deploy-config.js");

async function main() {
  // 获取当前网络
  const network = hre.network.name;
  console.log("当前网络:", network);
  
  // 获取部署配置
  const deployConfig = config[network] || config.default;
  console.log("部署配置:", deployConfig);

  console.log("\n开始部署OraSRS水龙头合约...");

  // 获取部署者账户
  const [deployer] = await ethers.getSigners();
  console.log("部署者地址:", deployer.address);

  // 检查部署者余额
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("部署者余额:", ethers.utils.formatEther(balance), "ETH");

  // 检查是否有足够的ETH
  if (balance.lt(ethers.utils.parseEther("0.1"))) {
    console.warn("警告: 部署者余额较低，可能无法完成部署");
  }

  // 部署ORA代币合约
  console.log("\n正在部署OraSRSToken合约...");
  const OraSRSToken = await ethers.getContractFactory("OraSRSToken");
  const oraToken = await OraSRSToken.deploy();
  await oraToken.deployed();
  console.log("OraSRSToken合约已部署到:", oraToken.address);

  // 等待几秒确保交易完成
  await new Promise(resolve => setTimeout(resolve, 5000));

  // 部署水龙头合约
  console.log("\n正在部署FaucetUpgradeable合约...");
  const Faucet = await ethers.getContractFactory("FaucetUpgradeable");
  const faucet = await Faucet.deploy(oraToken.address);
  await faucet.deployed();
  console.log("FaucetUpgradeable合约已部署到:", faucet.address);

  // 等待几秒确保交易完成
  await new Promise(resolve => setTimeout(resolve, 5000));

  // 向水龙头合约发送代币
  console.log("\n正在向水龙头合约发送代币...");
  const faucetInitialBalance = ethers.utils.parseEther(deployConfig.faucetInitialBalance.toString());
  const transferTx = await oraToken.transfer(faucet.address, faucetInitialBalance);
  await transferTx.wait();
  console.log(`已向水龙头合约发送${deployConfig.faucetInitialBalance} ORA代币`);

  // 验证水龙头余额
  const faucetBalance = await oraToken.balanceOf(faucet.address);
  console.log("水龙头合约当前余额:", ethers.utils.formatEther(faucetBalance), "ORA");

  // 如果网络不是localhost，可能需要设置冷却时间
  if (network !== "localhost") {
    console.log("\n正在设置水龙头参数...");
    // 设置冷却时间（如果与默认值不同）
    if (deployConfig.cooldownPeriod !== 86400) { // 默认24小时
      await faucet.setCooldownPeriod(deployConfig.cooldownPeriod);
      console.log(`已设置冷却时间为 ${deployConfig.cooldownPeriod} 秒`);
    }
    
    // 设置每次领取数量（如果与默认值不同）
    if (deployConfig.withdrawAmount !== "1000") {
      const newWithdrawAmount = ethers.utils.parseEther(deployConfig.withdrawAmount.toString());
      await faucet.setWithdrawAmount(newWithdrawAmount);
      console.log(`已设置每次领取数量为 ${deployConfig.withdrawAmount} ORA`);
    }
  }

  console.log("\n=== 部署完成 ===");
  console.log("OraSRSToken地址:", oraToken.address);
  console.log("FaucetUpgradeable地址:", faucet.address);
  console.log("\n水龙头功能:");
  console.log(`- 用户可以调用 withdrawTokens() 领取${deployConfig.withdrawAmount} ORA代币`);
  console.log(`- 每个地址有${deployConfig.cooldownPeriod}秒冷却时间 (${(deployConfig.cooldownPeriod / 3600).toFixed(2)}小时)`);
  console.log("- 合约所有者可以调用 depositTokens() 补充代币");
  console.log("- 合约所有者可以调用 batchDistribute() 批量分发代币");

  // 输出合约验证信息
  console.log("\n=== 验证信息 ===");
  console.log("若要在Etherscan等平台验证合约，请使用以下命令:");
  console.log(`npx hardhat verify --network ${network} ${oraToken.address}`);
  console.log(`npx hardhat verify --network ${network} ${faucet.address} ${oraToken.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });