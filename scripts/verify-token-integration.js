// scripts/verify-token-integration.js
import pkg from "hardhat";
import { ethers } from "ethers";

const { ethers: hardhatEthers } = pkg;

async function main() {
  console.log('🔍 验证代币合约集成...');

  // 使用 ethers.js 直接连接到公网API
  const provider = new ethers.JsonRpcProvider('https://api.OraSRS.net');
  
  // 验证OraSRSToken合约
  console.log('\n📋 验证 OraSRSToken 合约...');
  const tokenAddress = '0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1';
  const tokenAbi = [
    "function name() view returns (string)",
    "function symbol() view returns (string)", 
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)"
  ];
  
  const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, provider);
  
  try {
    const name = await tokenContract.name();
    const symbol = await tokenContract.symbol();
    const decimals = await tokenContract.decimals();
    const totalSupply = await tokenContract.totalSupply();
    
    console.log(`   ✅ 名称: ${name}`);
    console.log(`   ✅ 符号: ${symbol}`);
    console.log(`   ✅ 精度: ${decimals}`);
    console.log(`   ✅ 总供应量: ${ethers.formatUnits(totalSupply, 18)}`);
  } catch (error) {
    console.log(`   ❌ 错误: ${error.message}`);
  }

  // 验证Faucet合约
  console.log('\n📋 验证 Faucet 合约...');
  const faucetAddress = '0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE';
  const faucetAbi = [
    "function oraToken() view returns (address)",
    "function withdrawAmount() view returns (uint256)",
    "function cooldownPeriod() view returns (uint256)",
    "function faucetBalance() view returns (uint256)"
  ];
  
  const faucetContract = new ethers.Contract(faucetAddress, faucetAbi, provider);
  
  try {
    // 尝试不同的oraToken函数签名
    const functionSignatures = [
      { name: "oraToken()", signature: "oraToken()" },
      { name: "oraToken", signature: "oraToken()" },
      { name: "public oraToken", signature: "oraToken()" }
    ];
    
    for (const func of functionSignatures) {
      try {
        const tokenAddr = await faucetContract.oraToken();
        console.log(`   ✅ ORA代币地址: ${tokenAddr}`);
        break;
      } catch (e) {
        console.log(`   - 尝试 ${func.name} 失败: ${e.message}`);
      }
    }
    
    const withdrawAmount = await faucetContract.withdrawAmount();
    const cooldownPeriod = await faucetContract.cooldownPeriod();
    const faucetBalance = await faucetContract.faucetBalance();
    
    console.log(`   ✅ 每次提取数量: ${ethers.formatUnits(withdrawAmount, 18)} ORA`);
    console.log(`   ✅ 冷却时间: ${cooldownPeriod} 秒`);
    console.log(`   ✅ 水龙头余额: ${ethers.formatUnits(faucetBalance, 18)} ORA`);
  } catch (error) {
    console.log(`   ❌ 错误: ${error.message}`);
  }

  console.log('\n🎉 代币集成验证完成！');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 验证出错:', error);
    process.exit(1);
  });