import { ethers } from 'ethers';

// 连接到本地Hardhat节点
const provider = new ethers.JsonRpcProvider('http://localhost:8545');

async function testConnection() {
  try {
    console.log('正在连接到Hardhat节点...');
    
    // 获取网络信息
    const network = await provider.getNetwork();
    console.log('网络信息:', network);
    
    // 获取区块号
    const blockNumber = await provider.getBlockNumber();
    console.log('当前区块号:', blockNumber);
    
    // 获取一些账户
    const accounts = await provider.send('eth_accounts', []);
    console.log('可用账户:', accounts.slice(0, 3)); // 只显示前3个
    
    console.log('连接测试成功！');
  } catch (error) {
    console.error('连接失败:', error.message);
  }
}

testConnection();