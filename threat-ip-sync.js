// threat-ip-sync.js
// OraSRS协议链威胁IP同步模块

import { ethers } from "ethers";

// 威胁IP同步类
class ThreatIPSync {
  constructor(provider, contractAddresses) {
    this.provider = provider;
    this.contractAddresses = contractAddresses;
    this.readerContract = null;
    this.threatIntelContract = null;
  }

  // 初始化合约实例
  async initialize() {
    // OraSRSReader合约ABI (包含新增的威胁IP功能)
    const readerABI = [
      "function checkMultipleIPs(string[] memory ips, uint256 threshold) view returns ((string ip, uint256 score, uint8 riskLevel, bool shouldBlock)[] memory)",
      "function checkSingleIP(string memory ip, uint256 threshold) view returns (string memory ipResult, uint256 score, uint8 riskLevel, bool shouldBlock)",
      "function checkMultipleIPsFiltered(string[] memory ips, uint256 threshold) view returns ((string ip, uint256 score, uint8 riskLevel, bool shouldBlock)[] memory)",
      "function getThreatIPs(string[] memory ips) view returns ((string ip, uint256 score, uint8 riskLevel, uint8 threatLevel, uint256 timestamp, string threatType, bool isActive)[] memory)",
      "function getAllThreatInfo(string[] memory ips) view returns ((string ip, uint256 score, uint8 riskLevel, uint8 threatLevel, uint256 timestamp, string threatType, bool isActive)[] memory)",
      "function updateStorageContract(address newStorage) external",
      "function updateCalculatorContract(address newCalc) external"
    ];

    // 威胁情报合约ABI
    const threatIntelABI = [
      "function getThreatScore(string memory ip) view returns (uint256)",
      "function isThreatSource(string memory ip) view returns (bool)",
      "function getThreatIntel(string memory ip) view returns (string memory sourceIP, string memory targetIP, uint8 threatLevel, uint256 timestamp, string memory threatType, bool isActive)"
    ];

    // 初始化合约实例
    this.readerContract = new ethers.Contract(
      this.contractAddresses.oraSRSReaderAddress,
      readerABI,
      this.provider
    );

    this.threatIntelContract = new ethers.Contract(
      this.contractAddresses.threatIntelligenceCoordinationAddress,
      threatIntelABI,
      this.provider
    );
  }

  // 同步协议链上的威胁IP
  async syncThreatIPs(ipList = null) {
    if (!this.readerContract || !this.threatIntelContract) {
      throw new Error("合约未初始化，请先调用initialize()");
    }

    // 如果没有提供IP列表，使用默认的常见IP
    const ips = ipList || [
      "1.2.3.4",    // 测试威胁IP
      "5.6.7.8",    // 测试威胁IP
      "9.10.11.12", // 测试威胁IP
      "13.14.15.16", // 测试威胁IP
      "8.8.8.8",    // Google DNS
      "1.1.1.1",    // Cloudflare DNS
      "127.0.0.1",  // 本地回环
      "192.168.1.1", // 常见网关
      "10.0.0.1",   // 私有网络
      "172.16.0.1"  // 私有网络
    ];

    try {
      // 获取所有IP的威胁信息
      const allThreatInfo = await this.readerContract.getAllThreatInfo(ips);
      
      // 过滤出活跃的威胁IP
      const threatIPs = allThreatInfo.filter(info => info.isActive && info.score > 0);
      
      // 格式化威胁IP数据
      const formattedThreatIPs = threatIPs.map(info => {
        const threatLevels = ["信息", "警告", "严重", "紧急"];
        const riskLevels = ["安全", "可疑", "高危", "极度危险"];
        
        return {
          ip: info.ip,
          score: Number(info.score),
          riskLevel: riskLevels[info.riskLevel] || '未知',
          threatLevel: threatLevels[info.threatLevel] || '未知',
          threatType: info.threatType,
          isActive: info.isActive,
          timestamp: new Date(Number(info.timestamp) * 1000).toISOString(),
          rawInfo: info
        };
      });

      return {
        success: true,
        count: formattedThreatIPs.length,
        threatIPs: formattedThreatIPs,
        allChecked: ips.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        count: 0,
        threatIPs: [],
        allChecked: ips.length
      };
    }
  }

  // 获取特定威胁IP的详细信息
  async getThreatIPDetails(ip) {
    if (!this.threatIntelContract) {
      throw new Error("威胁情报合约未初始化");
    }

    try {
      const [sourceIP, targetIP, threatLevel, timestamp, threatType, isActive] = 
        await this.threatIntelContract.getThreatIntel(ip);
      
      const score = await this.threatIntelContract.getThreatScore(ip);
      
      const threatLevels = ["信息", "警告", "严重", "紧急"];
      const riskLevels = ["安全", "可疑", "高危", "极度危险"];
      
      return {
        ip,
        sourceIP,
        targetIP,
        score: Number(score),
        threatLevel: threatLevels[threatLevel] || '未知',
        riskLevel: riskLevels[Math.min(3, Math.floor(Number(score) / 250))] || '未知', // 简单风险等级计算
        timestamp: new Date(Number(timestamp) * 1000).toISOString(),
        threatType,
        isActive
      };
    } catch (error) {
      throw new Error(`获取IP ${ip} 详细信息失败: ${error.message}`);
    }
  }

  // 获取威胁IP列表用于防火墙同步
  async getThreatIPListForFirewall(minScore = 1) {
    if (!this.readerContract) {
      throw new Error("读取合约未初始化");
    }

    // 我们需要一个更大的IP列表来获取所有可能的威胁IP
    // 在实际应用中，这可能需要从合约中获取所有已知IP的机制
    const commonAndKnownIPs = [
      // 已知的威胁IP
      "1.2.3.4", "5.6.7.8", "9.10.11.12", "13.14.15.16",
      // 常见IP
      "8.8.8.8", "1.1.1.1", "127.0.0.1", "192.168.1.1", "10.0.0.1", "172.16.0.1",
      "203.0.113.1", "198.51.100.1", "192.0.2.1", "192.88.99.1", "203.0.113.2", "198.51.100.2",
      "192.0.2.2", "203.0.113.3", "198.51.100.3", "192.0.2.3", "192.0.2.4", "192.0.2.5",
      "192.0.2.6", "192.0.2.7", "192.0.2.8", "192.0.2.9", "192.0.2.10", "192.0.2.11",
      "192.0.2.12", "192.0.2.13", "192.0.2.14", "192.0.2.15", "192.0.2.16", "192.0.2.17",
      "192.0.2.18", "192.0.2.19", "192.0.2.20", "192.0.2.21", "192.0.2.22", "192.0.2.23",
      "192.0.2.24", "192.0.2.25", "192.0.2.26", "192.0.2.27", "192.0.2.28", "192.0.2.29",
      "192.0.2.30", "192.0.2.31", "192.0.2.32", "192.0.2.33", "192.0.2.34", "192.0.2.35",
      "192.0.2.36", "192.0.2.37", "192.0.2.38", "192.0.2.39", "192.0.2.40"
    ];

    const result = await this.syncThreatIPs(commonAndKnownIPs);
    
    // 过滤出分数大于等于最小分数的IP
    const filteredThreatIPs = result.threatIPs.filter(ip => ip.score >= minScore);
    
    // 返回适合防火墙使用的IP列表
    const firewallIPList = filteredThreatIPs.map(ip => ({
      ip: ip.ip,
      score: ip.score,
      reason: ip.threatType || 'High Risk IP',
      timestamp: ip.timestamp
    }));

    return {
      ...result,
      firewallIPList,
      filteredCount: firewallIPList.length
    };
  }
}

// 便捷函数：创建并初始化威胁IP同步器
async function createThreatIPSync(rpcUrl, contractAddresses) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const syncer = new ThreatIPSync(provider, contractAddresses);
  await syncer.initialize();
  return syncer;
}

export { ThreatIPSync, createThreatIPSync };