// advanced-orasrs-client.js
// 高级OraSRS协议链客户端测试脚本

import { ethers } from "ethers";
import fs from 'fs';

// OraSRS协议链配置
const ORASRS_CONFIG = {
  rpcUrl: "https://api.orasrs.net",
  chainId: 8888, // OraSRS协议链ID
};

// 加载合约地址
let contractAddresses = {};
function loadContractAddresses() {
  try {
    if (fs.existsSync('all-deployments.json')) {
      contractAddresses = JSON.parse(fs.readFileSync('all-deployments.json', 'utf8'));
      console.log("✓ 从 all-deployments.json 加载合约地址");
    } else if (fs.existsSync('deployed_addresses/full-deployments.json')) {
      contractAddresses = JSON.parse(fs.readFileSync('deployed_addresses/full-deployments.json', 'utf8'));
      console.log("✓ 从 full-deployments.json 加载合约地址");
    } else {
      console.log("⚠️  未找到部署信息文件，将使用默认/已知地址");
      // 使用从README中获取的已知地址
      contractAddresses = {
        oraTokenAddress: "0x0165878A594ca255338adfa4d48449f69242Eb8F",
        nodeRegistryAddress: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853", 
        threatIntelligenceCoordinationAddress: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
        oraSRSReaderAddress: "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
        threatStatsAddress: "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1",
        governanceAddress: "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c",
        faucetAddress: "0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE"
      };
    }
  } catch (error) {
    console.error("加载部署信息时出错:", error);
  }
}

// 通用合约ABI定义
const CONTRACT_ABIS = {
  oraToken: [
    "function name() view returns (string)",
    "function symbol() view returns (string)", 
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "event Transfer(address indexed from, address indexed to, uint256 value)"
  ],
  nodeRegistry: [
    "function getRegisteredNodeCount() view returns (uint256)",
    "function isNodeRegistered(address node) view returns (bool)",
    "function registerNode(string memory nodeInfo) returns (bool)",
    "function getNodeInfo(address node) view returns (string, uint256, bool)",
    "event NodeRegistered(address indexed node, string nodeInfo)"
  ],
  threatIntelligence: [
    "function getThreatScore(string memory ip) view returns (uint256)",
    "function submitThreatReport(string memory ip, uint8 threatType, string memory evidence, uint256 severity) returns (bool)",
    "function getThreatReport(string memory ip) view returns (uint256 score, uint8 threatType, uint256 timestamp, string memory reporter, uint256 severity)",
    "event ThreatReported(string ip, uint8 threatType, address reporter, uint256 score)"
  ],
  oraSRSReader: [
    "function checkMultipleIPs(string[] memory ips, uint256 threshold) view returns ((string ip, uint256 score, uint8 riskLevel, bool shouldBlock)[] memory)",
    "function checkSingleIP(string memory ip, uint256 threshold) view returns (string memory ipResult, uint256 score, uint8 riskLevel, bool shouldBlock)",
    "function checkMultipleIPsFiltered(string[] memory ips, uint256 threshold) view returns ((string ip, uint256 score, uint8 riskLevel, bool shouldBlock)[] memory)",
    "function getThreatIPs(string[] memory ips) view returns ((string ip, uint256 score, uint8 riskLevel, uint8 threatLevel, uint256 timestamp, string threatType, bool isActive)[] memory)",
    "function getAllThreatInfo(string[] memory ips) view returns ((string ip, uint256 score, uint8 riskLevel, uint8 threatLevel, uint256 timestamp, string threatType, bool isActive)[] memory)"
  ],
  threatIntelligence: [
    "function getThreatScore(string memory ip) view returns (uint256)",
    "function submitThreatReport(string memory ip, uint8 threatType, string memory evidence, uint256 severity) returns (bool)",
    "function getThreatReport(string memory ip) view returns (uint256 score, uint8 threatType, uint256 timestamp, string memory reporter, uint256 severity)",
    "function isThreatSource(string memory ip) view returns (bool)",
    "function getThreatIntel(string memory ip) view returns (string memory sourceIP, string memory targetIP, uint8 threatLevel, uint256 timestamp, string memory threatType, bool isActive)",
    "event ThreatReported(string ip, uint8 threatType, address reporter, uint256 score)"
  ],
  threatStats: [
    "function getDashboardStats() view returns (uint256 total, string memory mostDangerousIp, uint256 maxScore, uint256[] memory typeDistribution)",
    "function getAttackTypeCount(uint8 attackType) view returns (uint256 count)",
    "function totalThreatsDetected() view returns (uint256)"
  ],
  governance: [
    "function owner() view returns (address)",
    "function isGovernor(address account) view returns (bool)"
  ],
  faucet: [
    "function withdraw() returns (bool)",
    "function owner() view returns (address)",
    "function token() view returns (address)"
  ]
};

// 客户端类
class OraSRSClient {
  constructor(rpcUrl = ORASRS_CONFIG.rpcUrl) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.rpcUrl = rpcUrl;
    this.contracts = {};
  }

  // 初始化合约实例
  async initializeContracts() {
    console.log("\n🔧 初始化OraSRS合约实例...");
    
    try {
      // 初始化各合约实例
      if (contractAddresses.oraTokenAddress) {
        this.contracts.token = new ethers.Contract(
          contractAddresses.oraTokenAddress, 
          CONTRACT_ABIS.oraToken, 
          this.provider
        );
        console.log("✓ Token合约已初始化");
      }

      if (contractAddresses.nodeRegistryAddress) {
        this.contracts.nodeRegistry = new ethers.Contract(
          contractAddresses.nodeRegistryAddress, 
          CONTRACT_ABIS.nodeRegistry, 
          this.provider
        );
        console.log("✓ NodeRegistry合约已初始化");
      }

      if (contractAddresses.threatIntelligenceCoordinationAddress) {
        this.contracts.threatIntel = new ethers.Contract(
          contractAddresses.threatIntelligenceCoordinationAddress, 
          CONTRACT_ABIS.threatIntelligence,
          this.provider
        );
        console.log("✓ ThreatIntelligence合约已初始化");
      }

      if (contractAddresses.oraSRSReaderAddress) {
        this.contracts.reader = new ethers.Contract(
          contractAddresses.oraSRSReaderAddress,
          CONTRACT_ABIS.oraSRSReader,
          this.provider
        );
        console.log("✓ OraSRSReader合约已初始化");
      }

      if (contractAddresses.threatStatsAddress) {
        this.contracts.threatStats = new ethers.Contract(
          contractAddresses.threatStatsAddress,
          CONTRACT_ABIS.threatStats,
          this.provider
        );
        console.log("✓ ThreatStats合约已初始化");
      }

      if (contractAddresses.governanceAddress) {
        this.contracts.governance = new ethers.Contract(
          contractAddresses.governanceAddress,
          CONTRACT_ABIS.governance,
          this.provider
        );
        console.log("✓ Governance合约已初始化");
      }

      if (contractAddresses.faucetAddress) {
        this.contracts.faucet = new ethers.Contract(
          contractAddresses.faucetAddress,
          CONTRACT_ABIS.faucet,
          this.provider
        );
        console.log("✓ Faucet合约已初始化");
      }

      console.log("✅ 所有合约实例初始化完成");
      return true;
    } catch (error) {
      console.error("❌ 合约初始化失败:", error);
      return false;
    }
  }

  // 测试连接
  async testConnection() {
    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      
      console.log("\n🌐 OraSRS协议链连接测试:");
      console.log(`   链ID: ${network.chainId}`);
      console.log(`   当前区块: ${blockNumber}`);
      console.log(`   RPC端点: ${this.rpcUrl}`);
      
      return { success: true, network, blockNumber };
    } catch (error) {
      console.error("❌ 连接测试失败:", error.message);
      return { success: false, error: error.message };
    }
  }

  // 获取代币信息
  async getTokenInfo() {
    if (!this.contracts.token) {
      console.log("⚠️  Token合约未初始化");
      return null;
    }

    try {
      const [name, symbol, totalSupply] = await Promise.all([
        this.contracts.token.name(),
        this.contracts.token.symbol(),
        this.contracts.token.totalSupply()
      ]);

      console.log("\n💰 OraSRS代币信息:");
      console.log(`   名称: ${name}`);
      console.log(`   符号: ${symbol}`);
      console.log(`   总供应量: ${ethers.formatEther(totalSupply)} ${symbol}`);

      return { name, symbol, totalSupply: ethers.formatEther(totalSupply) };
    } catch (error) {
      console.error("❌ 获取代币信息失败:", error.message);
      return null;
    }
  }

  // 查询IP威胁分数
  async getIPThreatScore(ip) {
    if (!this.contracts.threatIntel) {
      console.log("⚠️  ThreatIntelligence合约未初始化");
      return null;
    }

    try {
      const score = await this.contracts.threatIntel.getThreatScore(ip);
      console.log(`\n🛡️  IP ${ip} 威胁分数: ${score.toString()}`);
      
      // 使用风险计算器评估风险等级 (如果可用)
      if (this.contracts.reader) {
        try {
          const [, , riskLevel] = await this.contracts.reader.checkSingleIP(ip, 0);
          const levels = ["安全", "可疑", "高危", "极度危险"];
          console.log(`   风险等级: ${riskLevel} (${levels[riskLevel] || '未知'})`);
        } catch (e) {
          console.log(`   风险等级: 无法评估`);
        }
      }
      
      return { ip, score: score.toString() };
    } catch (error) {
      console.error(`❌ 获取IP ${ip} 威胁分数失败:`, error.message);
      return null;
    }
  }

  // 批量查询IP威胁分数
  async getMultipleIPThreatScores(ips, threshold = 50) {
    if (!this.contracts.reader) {
      console.log("⚠️  OraSRSReader合约未初始化");
      return null;
    }

    try {
      const results = await this.contracts.reader.checkMultipleIPs(ips, threshold);
      
      console.log(`\n📊 批量IP威胁查询结果 (阈值: ${threshold}):`);
      results.forEach((result, index) => {
        const levels = ["安全", "可疑", "高危", "极度危险"];
        const levelText = levels[result.riskLevel] || '未知';
        console.log(`   ${result.ip}: 分数=${result.score}, 等级=${result.riskLevel}(${levelText}), 拦截=${result.shouldBlock}`);
      });
      
      return results;
    } catch (error) {
      console.error("❌ 批量IP查询失败:", error.message);
      return null;
    }
  }

  // 获取威胁统计数据
  async getThreatStats() {
    if (!this.contracts.threatStats) {
      console.log("⚠️  ThreatStats合约未初始化");
      return null;
    }

    try {
      const stats = await this.contracts.threatStats.getDashboardStats();
      const totalThreats = await this.contracts.threatStats.totalThreatsDetected();
      
      console.log("\n📈 威胁统计数据:");
      console.log(`   总威胁数: ${totalThreats.toString()}`);
      console.log(`   最危险IP: ${stats[1]}`);
      console.log(`   最高威胁分: ${stats[2].toString()}`);
      console.log(`   攻击类型分布:`, stats[3].map((count, i) => `${i}:${count.toString()}`).join(', '));
      
      return { 
        totalThreats: totalThreats.toString(),
        topThreatIp: stats[1],
        topThreatScore: stats[2].toString(),
        typeDistribution: stats[3].map(c => c.toString())
      };
    } catch (error) {
      console.error("❌ 获取威胁统计数据失败:", error.message);
      return null;
    }
  }

  // 获取注册节点信息
  async getNodeInfo() {
    if (!this.contracts.nodeRegistry) {
      console.log("⚠️  NodeRegistry合约未初始化");
      return null;
    }

    try {
      const nodeCount = await this.contracts.nodeRegistry.getRegisteredNodeCount();
      
      console.log("\n🔗 节点注册信息:");
      console.log(`   已注册节点数: ${nodeCount.toString()}`);
      
      return { nodeCount: nodeCount.toString() };
    } catch (error) {
      console.error("❌ 获取节点信息失败:", error.message);
      return null;
    }
  }

  // 获取威胁IP列表
  async getThreatIPs(ips) {
    if (!this.contracts.reader) {
      console.log("⚠️  OraSRSReader合约未初始化");
      return null;
    }

    try {
      const threatIPs = await this.contracts.reader.getThreatIPs(ips);
      
      console.log(`\n⚠️  威胁IP列表:`);
      if (threatIPs.length === 0) {
        console.log("   未发现威胁IP");
      } else {
        threatIPs.forEach((threat, index) => {
          const threatLevels = ["信息", "警告", "严重", "紧急"];
          const riskLevels = ["安全", "可疑", "高危", "极度危险"];
          console.log(`   ${threat.ip}: 分数=${threat.score}, 风险等级=${riskLevels[threat.riskLevel] || '未知'}, ` +
                     `威胁等级=${threatLevels[threat.threatLevel] || '未知'}, ` +
                     `类型="${threat.threatType}", 活跃=${threat.isActive}`);
        });
      }
      
      return threatIPs;
    } catch (error) {
      console.error("❌ 获取威胁IP列表失败:", error.message);
      return null;
    }
  }

  // 获取所有IP的威胁信息
  async getAllThreatInfo(ips) {
    if (!this.contracts.reader) {
      console.log("⚠️  OraSRSReader合约未初始化");
      return null;
    }

    try {
      const allThreatInfo = await this.contracts.reader.getAllThreatInfo(ips);
      
      console.log(`\n📋 所有IP威胁信息:`);
      allThreatInfo.forEach((info, index) => {
        const threatLevels = ["信息", "警告", "严重", "紧急"];
        const riskLevels = ["安全", "可疑", "高危", "极度危险"];
        const status = info.isActive ? "活跃" : "非活跃";
        console.log(`   ${info.ip}: 分数=${info.score}, 风险等级=${riskLevels[info.riskLevel] || '未知'}, ` +
                   `威胁等级=${threatLevels[info.threatLevel] || '未知'}, ` +
                   `类型="${info.threatType}", 状态=${status}`);
      });
      
      return allThreatInfo;
    } catch (error) {
      console.error("❌ 获取所有威胁信息失败:", error.message);
      return null;
    }
  }

  // 同步协议链下发的异常IP
  async syncChainThreatIPs() {
    console.log("\n🔄 开始同步协议链下发的异常IP...");
    
    if (!this.contracts.threatIntel || !this.contracts.reader) {
      console.log("⚠️  威胁情报合约或读取合约未初始化");
      return null;
    }

    try {
      // 获取协议链上已知的威胁IP列表（包括我们添加的测试IP）
      const knownIPs = [
        "8.8.8.8",    // Google DNS
        "1.1.1.1",    // Cloudflare DNS
        "127.0.0.1",  // 本地回环
        "192.168.1.1", // 常见网关
        "10.0.0.1",   // 私有网络
        "172.16.0.1",  // 私有网络
        "1.2.3.4",    // 测试威胁IP
        "5.6.7.8",    // 测试威胁IP
        "9.10.11.12", // 测试威胁IP
        "13.14.15.16" // 测试威胁IP
      ];

      // 批量获取威胁IP信息
      const threatInfo = await this.getAllThreatInfo(knownIPs);
      
      // 提取真正的威胁IP
      const threatIPs = threatInfo.filter(info => info.isActive && info.score > 0);
      
      console.log(`\n📡 从协议链同步到 ${threatIPs.length} 个异常IP:`);
      threatIPs.forEach((info, index) => {
        const threatLevels = ["信息", "警告", "严重", "紧急"];
        const riskLevels = ["安全", "可疑", "高危", "极度危险"];
        console.log(`   ${index + 1}. ${info.ip}`);
        console.log(`      - 风险分数: ${info.score}`);
        console.log(`      - 风险等级: ${riskLevels[info.riskLevel] || '未知'}`);
        console.log(`      - 威胁等级: ${threatLevels[info.threatLevel] || '未知'}`);
        console.log(`      - 威胁类型: ${info.threatType}`);
        console.log(`      - 添加时间: ${new Date(Number(info.timestamp) * 1000).toISOString()}`);
      });

      // 可以在这里添加将威胁IP同步到本地防火墙或系统黑名单的逻辑
      console.log(`\n✅ 异常IP同步完成，共 ${threatIPs.length} 个威胁IP已接收`);
      
      return threatIPs;
    } catch (error) {
      console.error("❌ 同步协议链威胁IP失败:", error.message);
      return null;
    }
  }

  // 完整功能测试
  async runFullTest() {
    console.log("🧪 开始OraSRS协议链客户端完整功能测试...");
    
    // 测试连接
    const connectionResult = await this.testConnection();
    if (!connectionResult.success) {
      console.log("❌ 连接失败，终止测试");
      return;
    }
    
    // 初始化合约
    const contractsInitialized = await this.initializeContracts();
    if (!contractsInitialized) {
      console.log("❌ 合约初始化失败，终止测试");
      return;
    }
    
    // 并行运行各种测试
    await Promise.all([
      this.getTokenInfo(),
      this.getIPThreatScore("8.8.8.8"),
      this.getIPThreatScore("1.1.1.1"),
      this.getMultipleIPThreatScores(["8.8.8.8", "1.1.1.1", "127.0.0.1"], 50),
      this.getThreatStats(),
      this.getNodeInfo()
    ]);
    
    // 特定的威胁IP功能测试
    await this.getThreatIPs(["8.8.8.8", "1.1.1.1", "127.0.0.1", "192.168.1.1"]);
    await this.getAllThreatInfo(["8.8.8.8", "1.1.1.1", "127.0.0.1", "192.168.1.1"]);
    await this.syncChainThreatIPs();
    
    console.log("\n✅ OraSRS协议链客户端功能测试完成！");
    console.log("   客户端可以成功连接到 https://api.orasrs.net 协议链");
  }
}

// 主函数
async function main() {
  // 加载合约地址
  loadContractAddresses();
  
  // 创建客户端并运行测试
  const client = new OraSRSClient();
  await client.runFullTest();
}

// 如果直接运行此脚本
if (import.meta.url === new URL(import.meta.url).href) {
  main().catch(console.error);
}

export { OraSRSClient, ORASRS_CONFIG };
