import { ethers } from "ethers";

async function queryGovernanceContract() {
  console.log("查询OraSRSGovernance合约信息...\n");
  
  // 连接到公网API
  const provider = new ethers.JsonRpcProvider('https://api.orasrs.net');
  
  // OraSRSGovernance合约地址
  const governanceAddress = '0x3Aa5ebB10DC797CAC828524e59A333d0A371443c';
  
  try {
    // 查询合约余额
    const balance = await provider.getBalance(governanceAddress);
    console.log("OraSRSGovernance合约原生代币余额:", ethers.formatEther(balance), "ETH");
    
    // 尝试获取合约相关信息
    const governanceABI = [
      "function owner() external view returns (address)",
      "function proposalCount() external view returns (uint256)",
      "function votingPeriod() external view returns (uint256)",
      "function proposalThreshold() external view returns (uint256)",
      "function quorumPercentage() external view returns (uint256)",
      "function timelock() external view returns (address)",
      "function threatIntelligenceCoordination() external view returns (address)"
    ];
    
    const governanceContract = new ethers.Contract(governanceAddress, governanceABI, provider);
    
    try {
      const owner = await governanceContract.owner();
      console.log("治理合约所有者:", owner);
    } catch (e) {
      console.log("无法查询治理合约所有者:", e.message);
    }
    
    try {
      const proposalCount = await governanceContract.proposalCount();
      console.log("提案总数:", proposalCount.toString());
    } catch (e) {
      console.log("无法查询提案总数:", e.message);
    }
    
    try {
      const votingPeriod = await governanceContract.votingPeriod();
      console.log("投票期:", votingPeriod.toString(), "秒");
    } catch (e) {
      console.log("无法查询投票期:", e.message);
    }
    
    try {
      const threshold = await governanceContract.proposalThreshold();
      console.log("提案门槛:", ethers.formatEther(threshold), "ORA");
    } catch (e) {
      console.log("无法查询提案门槛:", e.message);
    }
    
    try {
      const quorum = await governanceContract.quorumPercentage();
      console.log("法定人数百分比:", quorum.toString(), "（百万分之一，即", Number(quorum) / 10000, "%）");
    } catch (e) {
      console.log("无法查询法定人数百分比:", e.message);
    }
    
  } catch (error) {
    console.error("查询治理合约时出错:", error);
  }
  
  console.log("\n关于删除治理合约:");
  console.log("根据合约代码，治理合约包含destroy()和destroyAndSendTo()函数，");
  console.log("但这些函数只能由合约所有者调用。删除合约会使用selfdestruct指令，");
  console.log("将合约余额发送到所有者地址并从区块链中移除合约。");
}

// 运行查询
queryGovernanceContract().catch(console.error);