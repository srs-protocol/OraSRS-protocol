import axios from 'axios';

async function queryTokenViaHTTP() {
  const rpcUrl = 'https://api.orasrs.net';
  const tokenAddress = '0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1';
  
  // ABI编码查询数据
  const nameData = '0x06fdde03'; // name()函数选择器
  const symbolData = '0x95d89b41'; // symbol()函数选择器
  const totalSupplyData = '0x18160ddd'; // totalSupply()函数选择器
  const decimalsData = '0x313ce567'; // decimals()函数选择器
  const balanceOfData = '0x70a08231000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266'; // balanceOf(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266)函数选择器+地址

  console.log('正在通过HTTP请求查询OraSRS代币信息...');
  
  try {
    // 查询代币名称
    let response = await axios.post(rpcUrl, {
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{
        to: tokenAddress,
        data: nameData
      }, 'latest'],
      id: 1
    });
    
    let name = '';
    if (response.data.result && response.data.result !== '0x') {
      // 解码返回的字符串
      const hexString = response.data.result;
      const strStart = parseInt('0x' + hexString.substring(10, 74), 16) * 2 + 74;
      const strLength = parseInt('0x' + hexString.substring(74, 138), 16) * 2;
      const strHex = hexString.substring(strStart, strStart + strLength);
      name = Buffer.from(strHex, 'hex').toString();
    }
    
    // 查询代币符号
    response = await axios.post(rpcUrl, {
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{
        to: tokenAddress,
        data: symbolData
      }, 'latest'],
      id: 2
    });
    
    let symbol = '';
    if (response.data.result && response.data.result !== '0x') {
      const hexString = response.data.result;
      const strStart = parseInt('0x' + hexString.substring(10, 74), 16) * 2 + 74;
      const strLength = parseInt('0x' + hexString.substring(74, 138), 16) * 2;
      const strHex = hexString.substring(strStart, strStart + strLength);
      symbol = Buffer.from(strHex, 'hex').toString();
    }
    
    // 查询总供应量
    response = await axios.post(rpcUrl, {
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{
        to: tokenAddress,
        data: totalSupplyData
      }, 'latest'],
      id: 3
    });
    
    let totalSupply = '0';
    if (response.data.result && response.data.result !== '0x') {
      totalSupply = response.data.result;
      totalSupply = BigInt(totalSupply).toString();
    }
    
    // 查询精度
    response = await axios.post(rpcUrl, {
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{
        to: tokenAddress,
        data: decimalsData
      }, 'latest'],
      id: 4
    });
    
    let decimals = 0;
    if (response.data.result && response.data.result !== '0x') {
      decimals = parseInt(response.data.result, 16);
    }
    
    // 查询部署者余额
    response = await axios.post(rpcUrl, {
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{
        to: tokenAddress,
        data: balanceOfData
      }, 'latest'],
      id: 5
    });
    
    let balance = '0';
    if (response.data.result && response.data.result !== '0x') {
      balance = response.data.result;
      balance = BigInt(balance).toString();
    }
    
    console.log('==================================================');
    console.log('OraSRS (ORA) 代币信息 (通过HTTP请求查询):');
    console.log('==================================================');
    console.log(`代币名称: ${name}`);
    console.log(`代币符号: ${symbol}`);
    console.log(`代币精度: ${decimals}`);
    console.log(`总供应量: ${Number(totalSupply) / 1e18} ${symbol}`);
    console.log(`合约地址: ${tokenAddress}`);
    console.log(`部署者余额: ${Number(balance) / 1e18} ${symbol}`);
    console.log('==================================================');
    
  } catch (error) {
    console.error('通过HTTP查询代币信息时出错:', error.message);
    if (error.response) {
      console.error('错误详情:', error.response.data);
    }
  }
}

queryTokenViaHTTP().catch(console.error);