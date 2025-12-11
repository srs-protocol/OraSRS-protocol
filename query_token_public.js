import { ethers } from "ethers";

async function queryTokenInfoPublic() {
  // 使用公网API端点
  const provider = new ethers.JsonRpcProvider('https://api.orasrs.net');
  
  // 使用已知的代币合约地址
  const tokenAddress = '0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1';
  
  // 创建合约实例
  const tokenABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)", 
    "function totalSupply() view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address) view returns (uint256)"
  ];
  
  const tokenContract = new ethers.Contract(tokenAddress, tokenABI, provider);
  
  console.log('正在通过公网API查询OraSRS代币信息...');
  
  try {
    // 查询代币信息
    const name = await tokenContract.name();
    const symbol = await tokenContract.symbol();
    const totalSupply = await tokenContract.totalSupply();
    const decimals = await tokenContract.decimals();
    
    console.log('==================================================');
    console.log('OraSRS (ORA) 代币信息 (通过公网API):');
    console.log('==================================================');
    console.log(`代币名称: ${name}`);
    console.log(`代币符号: ${symbol}`);
    console.log(`代币精度: ${decimals}`);
    console.log(`总供应量: ${ethers.formatUnits(totalSupply, decimals)} ${symbol}`);
    console.log(`合约地址: ${tokenAddress}`);
    console.log('==================================================');
    
    // 获取部署者余额
    const deployerAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    const balance = await tokenContract.balanceOf(deployerAddress);
    console.log(`部署者 (${deployerAddress}) 余额: ${ethers.formatUnits(balance, decimals)} ${symbol}`);
    
    // 查询一些其他地址的余额
    const otherAddresses = [
      '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
    ];
    
    for (const addr of otherAddresses) {
      try {
        const balance = await tokenContract.balanceOf(addr);
        console.log(`地址 ${addr} 余额: ${ethers.formatUnits(balance, decimals)} ${symbol}`);
      } catch (error) {
        console.log(`地址 ${addr} 查询失败: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('查询代币信息时出错:', error);
  }
}

// 运行查询
queryTokenInfoPublic().catch(console.error);