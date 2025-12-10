import { ethers } from "ethers";

async function queryGasSubsidyBalance() {
  console.log("查询GasSubsidy合约的当前余额...\n");
  
  // 连接到公网API
  const provider = new ethers.JsonRpcProvider('https://api.orasrs.net');
  
  // GasSubsidy合约地址
  const gasSubsidyAddress = '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707';
  
  try {
    // 查询合约余额
    const balance = await provider.getBalance(gasSubsidyAddress);
    console.log("GasSubsidy合约原生代币余额:", ethers.formatEther(balance), "ETH");
    
    // 获取合约相关信息
    const gasSubsidyABI = [
      "function subsidyAmount() external view returns (uint256)",
      "function hasClaimed(address user) external view returns (bool)",
      "function relayerAddress() external view returns (address)",
      "function owner() external view returns (address)"
    ];
    
    const gasSubsidyContract = new ethers.Contract(gasSubsidyAddress, gasSubsidyABI, provider);
    
    try {
      const subsidyAmount = await gasSubsidyContract.subsidyAmount();
      console.log("每次补贴金额:", ethers.formatEther(subsidyAmount), "ETH");
    } catch (e) {
      console.log("无法查询补贴金额:", e.message);
    }
    
    try {
      const relayerAddress = await gasSubsidyContract.relayerAddress();
      console.log("Relayer地址:", relayerAddress);
    } catch (e) {
      console.log("无法查询Relayer地址:", e.message);
    }
    
    try {
      const ownerAddress = await gasSubsidyContract.owner();
      console.log("合约所有者地址:", ownerAddress);
    } catch (e) {
      console.log("无法查询合约所有者:", e.message);
    }
    
  } catch (error) {
    console.error("查询GasSubsidy合约时出错:", error);
  }
}

// 运行查询
queryGasSubsidyBalance().catch(console.error);