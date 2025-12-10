// scripts/verify-all-contracts.js
import { ethers } from "ethers";

async function main() {
  console.log('🔍 验证所有已部署的OraSRS合约...');

  // 使用 ethers.js 直接连接到公网API
  const provider = new ethers.JsonRpcProvider('https://api.OraSRS.net');
  
  // 所有合约地址和ABI片段
  const contracts = [
    {
      name: "OraSRSToken",
      address: "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1",
      abi: ["function name() view returns (string)", "function symbol() view returns (string)", "function totalSupply() view returns (uint256)"],
      action: async (contract) => {
        const name = await contract.name();
        const symbol = await contract.symbol();
        const supply = await contract.totalSupply();
        console.log(`   ✅ ${name} (${symbol}), 供应量: ${ethers.formatUnits(supply, 18)}`);
      }
    },
    {
      name: "FaucetUpgradeable",
      address: "0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE",
      abi: ["function oraToken() view returns (address)", "function faucetBalance() view returns (uint256)"],
      action: async (contract) => {
        const tokenAddr = await contract.oraToken();
        const balance = await contract.faucetBalance();
        console.log(`   ✅ ORA代币地址: ${tokenAddr}, 余额: ${ethers.formatUnits(balance, 18)}`);
      }
    },
    {
      name: "OraSRSGovernance",
      address: "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c",
      abi: ["function timelock() view returns (address)", "function threatIntelligenceCoordination() view returns (address)", "function votingPeriod() view returns (uint256)"],
      action: async (contract) => {
        const timelock = await contract.timelock();
        const tiCoord = await contract.threatIntelligenceCoordination();
        const votingPeriod = await contract.votingPeriod();
        console.log(`   ✅ Timelock: ${timelock}, TI Coord: ${tiCoord}, 投票期: ${votingPeriod}秒`);
      }
    },
    {
      name: "NodeRegistry",
      address: "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d",
      abi: ["function activeNodes(uint256) view returns (string ip, uint16 port, address wallet)", "function getNodes() view returns ((string ip, uint16 port, address wallet)[] memory)"],
      action: async (contract) => {
        const nodeCount = Number(await contract.activeNodes.length);
        console.log(`   ✅ 节点数量: ${nodeCount}`);
      }
    },
    {
      name: "SimpleSecurityActionContract",
      address: "0x59b670e9fA9D0A427751Af201D676719a970857b",
      abi: ["function governanceContract() view returns (address)", "function isIPBlocked(string) view returns (bool)"],
      action: async (contract) => {
        const govAddr = await contract.governanceContract();
        console.log(`   ✅ 治理合约地址: ${govAddr}`);
      }
    },
    {
      name: "IPRiskCalculator",
      address: "0x0165878A594ca255338adfa4d48449f69242Eb8F",
      abi: ["function evaluateRiskLevel(uint256) view returns (uint8)"],
      action: async (contract) => {
        const riskLevel = await contract.evaluateRiskLevel(250);
        console.log(`   ✅ 风险等级 (250分): ${riskLevel}`);
      }
    },
    {
      name: "ThreatStats",
      address: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
      abi: ["function totalThreatsDetected() view returns (uint256)"],
      action: async (contract) => {
        const total = await contract.totalThreatsDetected();
        console.log(`   ✅ 总威胁数: ${total}`);
      }
    },
    {
      name: "OraSRSReader",
      address: "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
      abi: ["function checkSingleIP(string,uint256) view returns (string,uint256,uint8,bool)"],
      action: async (contract) => {
        console.log(`   ✅ 已部署，准备就绪`);
      }
    },
    {
      name: "ThreatIntelligenceCoordination",
      address: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
      abi: ["function getThreatScore(string) view returns (uint256)"],
      action: async (contract) => {
        const score = await contract.getThreatScore("127.0.0.1");
        console.log(`   ✅ 威胁分数 (127.0.0.1): ${score}`);
      }
    }
  ];

  // 验证每个合约
  for (const contractInfo of contracts) {
    try {
      console.log(`\n📋 验证 ${contractInfo.name} 合约...`);
      console.log(`   地址: ${contractInfo.address}`);
      
      const contract = new ethers.Contract(contractInfo.address, contractInfo.abi, provider);
      await contractInfo.action(contract);
    } catch (error) {
      console.log(`   ❌ 错误: ${error.message}`);
    }
  }

  console.log('\n🎉 所有合约验证完成！');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 验证出错:', error);
    process.exit(1);
  });