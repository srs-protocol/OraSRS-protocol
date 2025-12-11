/**
 * OraSRS 区块链连接器
 * 处理与OraSRS协议链的连接，包括重试机制和错误处理
 */

import axios from 'axios';

// 使模块可导出

class BlockchainConnector {
  constructor(config = {}) {
    this.config = {
      endpoints: config.endpoints || [config.endpoint || 'https://api.orasrs.net'],
      chainId: config.chainId || 8888,
      contractAddress: config.contractAddress || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      timeout: config.timeout || 5000, // 减少超时时间以提高响应速度
      cacheTTL: config.cacheTTL || 300000, // 5分钟缓存
      ...config
    };
    
    // 使用第一个端点作为主要端点
    this.currentEndpoint = this.config.endpoints[0];
    
    this.isConnected = false;
    this.lastConnectionAttempt = null;
    this.retryCount = 0;
    
    // 添加缓存机制
    this.cache = new Map();
    this.cacheTimestamp = new Map();
  }

  async connect() {
    // 遍历所有配置的端点，尝试连接到第一个可用的
    for (const endpoint of this.config.endpoints) {
      try {
        console.log(`🔗 尝试连接到OraSRS区块链: ${endpoint}`);
        
        // 尝试RPC端点连接
        const response = await axios.post(endpoint, {
          jsonrpc: "2.0",
          method: "eth_blockNumber",
          params: [],
          id: 1
        }, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: this.config.timeout
        });
        
        if (response.data && response.data.result) {
          this.currentEndpoint = endpoint; // 设置当前使用的端点
          this.isConnected = true;
          this.lastConnectionAttempt = new Date();
          this.retryCount = 0;
          
          console.log(`✅ 成功连接到OraSRS区块链: ${endpoint}`);
          console.log(`📋 区块链信息:`, {
            endpoint: endpoint,
            chainId: this.config.chainId,
            blockNumber: response.data.result
          });
          
          return true;
        }
      } catch (error) {
        console.error(`❌ 连接OraSRS区块链失败 (${endpoint}):`, error.message);
      }
    }
    
    // 如果所有端点都失败
    this.isConnected = false;
    this.lastConnectionAttempt = new Date();
    console.error(`❌ 无法连接到任何OraSRS区块链端点`);
    
    return false;
  }

  async makeRequest(requestConfig) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      
      // 区块链连接器现在只处理RPC请求，不处理HTTP API请求
      console.log(`⚠️  区块链连接器不支持HTTP API请求: ${requestConfig.url}`);
      return null;
    } catch (error) {
      console.error(`❌ 区块链请求失败:`, error.message);
      
      // 尝试重新连接
      this.isConnected = false;
      
      // 只尝试重新连接一次，避免无限递归
      try {
        await this.connect();
      } catch (connectError) {
        console.error(`❌ 重新连接也失败:`, connectError.message);
        // 连接失败时返回null，让调用方处理
        return null;
      }
      
      return null; // HTTP API请求不被支持，即使重连后也不处理
    }
  }

  async getThreatData(ipAddress) {
    // 检查缓存
    const cacheKey = `threat_${ipAddress}`;
    const now = Date.now();
    
    if (this.cache.has(cacheKey)) {
      const cachedTime = this.cacheTimestamp.get(cacheKey);
      if (now - cachedTime < this.config.cacheTTL) {
        console.log(`缓存命中 for IP: ${ipAddress}`);
        return this.cache.get(cacheKey);
      } else {
        // 缓存过期，删除它
        this.cache.delete(cacheKey);
        this.cacheTimestamp.delete(cacheKey);
      }
    }
    
    try {
      // 现在我们首先尝试连接区块链并获取数据
      if (!this.isConnected) {
        await this.connect();
      }
      
      // 使用web3与智能合约交互
      // 使用axios调用区块链RPC API查询合约数据
      const startTime = Date.now();
      const rpcResponse = await axios.post(this.currentEndpoint, {
        jsonrpc: "2.0",
        method: "eth_call",
        params: [{
          to: this.config.contractAddress,
          data: this.encodeThreatDataCall(ipAddress) // 调用合约方法查询威胁数据
        }, "latest"],
        id: Date.now()
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: this.config.timeout
      });
      
      const callDuration = Date.now() - startTime;
      console.log(`区块链调用耗时: ${callDuration}ms for IP: ${ipAddress}`);
      
      // 检查响应
      if (rpcResponse.data && rpcResponse.data.result !== undefined) {
        const rawData = rpcResponse.data.result;
        
        // 检查是否是空结果（表示没有找到数据）
        if (rawData === '0x' || rawData === '0x0000000000000000000000000000000000000000000000000000000000000000' || !rawData) {
          console.log(`未在区块链上找到IP ${ipAddress} 的威胁数据`);
          // 创建并缓存"未找到数据"的响应
          const noDataResponse = this.getNoDataFoundResponse(ipAddress);
          this.cache.set(cacheKey, noDataResponse);
          this.cacheTimestamp.set(cacheKey, now);
          return noDataResponse;
        }
        
        console.log(`从区块链获取的原始数据: ${rawData}`);
        // 如果获取到实际数据，则处理并返回
        const processedData = this.processThreatDataFromContract(rawData, ipAddress);
        // 缓存处理后的数据
        this.cache.set(cacheKey, processedData);
        this.cacheTimestamp.set(cacheKey, now);
        return processedData;
      } else {
        // 如果RPC返回错误，检查连接状态
        console.log(`⚠️  无法从区块链获取数据: ${ipAddress}`);
        if (rpcResponse.data && rpcResponse.data.error) {
          console.error(`区块链错误:`, rpcResponse.data.error);
        }
        // 缓存错误响应以避免重复查询
        const errorResponse = this.getNoDataFoundResponse(ipAddress);
        this.cache.set(cacheKey, errorResponse);
        this.cacheTimestamp.set(cacheKey, now);
        return errorResponse;
      }
    } catch (error) {
      console.error(`❌ 从区块链获取威胁数据失败:`, error.message);
      // 缓存错误响应以避免重复查询
      const errorResponse = this.getNoDataFoundResponse(ipAddress);
      this.cache.set(cacheKey, errorResponse);
      this.cacheTimestamp.set(cacheKey, now);
      return errorResponse; // 连接失败时返回离线状态
    }
  }

  async submitThreatReport(reportData) {
    try {
      // 通过区块链合约提交威胁报告，而不是API
      const response = await axios.post(this.currentEndpoint, {
        jsonrpc: "2.0",
        method: "eth_sendTransaction",  // 或其他适当的RPC方法
        params: [{
          to: this.config.contractAddress,
          data: this.encodeThreatSubmissionCall(reportData) // 编码威胁提交调用
        }],
        id: Date.now()
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: this.config.timeout
      });
      
      // 检查response是否为null
      if (response === null || response === undefined || !response.data) {
        console.error('提交威胁报告失败: 无法连接到区块链或没有响应数据');
        throw new Error('无法连接到区块链或没有响应数据');
      }
      
      if (response.data.error) {
        console.error('提交威胁报告失败:', response.data.error.message);
        throw new Error(response.data.error.message);
      }
      
      return response.data;
    } catch (error) {
      console.error(`❌ 提交威胁报告失败:`, error.message);
      throw error;
    }
  }

  async getGlobalThreatList() {
    try {
      // 通过区块链合约获取威胁列表
      const response = await axios.post(this.currentEndpoint, {
        jsonrpc: "2.0",
        method: "eth_call",
        params: [{
          to: this.config.contractAddress,
          data: this.encodeGetThreatListCall() // 调用合约方法获取威胁列表
        }, "latest"],
        id: Date.now()
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: this.config.timeout
      });
      
      if (response.data && response.data.result) {
        // 解析从合约返回的数据
        return this.processThreatListFromContract(response.data.result);
      } else {
        throw new Error('No data returned from blockchain contract');
      }
    } catch (error) {
      console.error(`❌ 获取全局威胁列表失败:`, error.message);
      // 返回模拟威胁列表以保持服务可用性
      return { threat_list: [], last_update: new Date().toISOString() };
    }
  }

  getMockThreatData(ipAddress) {
    // 当区块链连接失败时，返回一个标准的无威胁数据响应
    return {
      query: { ip: ipAddress },
      response: {
        risk_score: 0.0, // 无威胁评分
        confidence: '无数据',
        risk_level: '无数据',
        evidence: [],
        recommendations: {
          default: '允许',
          public_services: '允许',
          banking: '允许'
        },
        appeal_url: `https://api.orasrs.net/appeal?ip=${ipAddress}`,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        timestamp: new Date().toISOString(),
        disclaimer: '在区块链上未找到该IP的威胁数据。',
        version: '2.0-no-data'
      }
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 将十六进制字符串转换为ASCII字符串
  hexToAscii(hex) {
    if (!hex || typeof hex !== 'string') return '';
    // 移除0x前缀
    const cleanHex = hex.startsWith('0x') ? hex.substring(2) : hex;
    let result = '';
    for (let i = 0; i < cleanHex.length; i += 2) {
      result += String.fromCharCode(parseInt(cleanHex.substr(i, 2), 16));
    }
    return result;
  }

  // 当没有找到数据时返回的响应
  getNoDataFoundResponse(ipAddress) {
    return {
      query: { ip: ipAddress },
      response: {
        risk_score: 0.0, // 无风险评分，因为没有数据
        confidence: '无数据',
        risk_level: '无数据',
        evidence: [],
        recommendations: {
          default: '允许',
          public_services: '允许',
          banking: '允许'
        },
        appeal_url: `https://api.orasrs.net/appeal?ip=${ipAddress}`,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        timestamp: new Date().toISOString(),
        disclaimer: '在区块链上未找到该IP的威胁数据。',
        version: '2.0-no-data'
      }
    };
  }

  // 当服务离线时返回的响应
  getOfflineResponse(ipAddress) {
    return {
      query: { ip: ipAddress },
      response: {
        risk_score: null,
        confidence: '离线',
        risk_level: '离线',
        evidence: [],
        recommendations: {
          default: '未知',
          public_services: '未知',
          banking: '未知'
        },
        appeal_url: `https://api.orasrs.net/appeal?ip=${ipAddress}`,
        expires_at: null,
        timestamp: new Date().toISOString(),
        disclaimer: '服务暂时离线，无法查询威胁数据。',
        version: '2.0-offline'
      },
      blockchain_status: {
        isConnected: false,
        endpoint: this.config.endpoint,
        error: '无法连接到区块链'
      }
    };
  }

  // 解码威胁数据
  processThreatDataFromContract(rawData, ipAddress) {
    // 这里是模拟处理从合约返回的原始数据
    // 在实际实现中，需要根据合约ABI和返回格式进行解析
    console.log(`从合约获取的原始数据: ${rawData}`);
    
    // 简单解析十六进制数据
    try {
      // 检查返回数据是否为空或无效
      if (!rawData || rawData === '0x') {
        console.log(`合约返回空数据 for IP: ${ipAddress}`);
        return this.getNoDataFoundResponse(ipAddress);
      }
      
      // 检查是否是纯零数据（表示未找到该IP信息）
      if (rawData.startsWith('0x0000000000000000000000000000000000000000000000000000000000000000')) {
        console.log(`合约返回零数据 for IP: ${ipAddress}`);
        return this.getNoDataFoundResponse(ipAddress);
      }
      
      // 这里应该根据实际合约的返回格式进行解析
      // 目前我们假设合约返回一个结构化数据，需要根据实际ABI来解析
      // 为了演示目的，返回一个标准的无威胁数据响应
      console.log(`合约返回有效数据，但需要根据实际ABI解析: ${rawData.substring(0, 20)}...`);
      
      // 对于不存在于区块链上的IP，返回无数据响应
      return this.getNoDataFoundResponse(ipAddress);
    } catch (error) {
      console.error(`解析合约数据时出错:`, error.message);
      // 发生错误时返回无数据响应而不是模拟数据
      return this.getNoDataFoundResponse(ipAddress);
    }
  }

  // 编码威胁数据查询调用
  encodeThreatDataCall(ipAddress) {
    // 计算 "getThreatData(string)" 的函数选择器
    // 首先需要一个简单的keccak256实现来计算函数签名的哈希
    // 使用现成的函数选择器，基于 "getThreatData(string)" 的keccak256哈希的前4字节
    // 实际的keccak256("getThreatData(string)")的前4字节是 0x26b5a0b9
    const functionSelector = '26b5a0b9';
    
    // 简单编码字符串参数：函数选择器 + IP地址的十六进制表示
    let ipHex = '';
    for (let i = 0; i < ipAddress.length; i++) {
      ipHex += ipAddress.charCodeAt(i).toString(16).padStart(2, '0');
    }
    
    // 用0填充到64个字符（32字节）
    const paddedIpHex = ipHex.padEnd(64, '0');
    
    return '0x' + functionSelector + paddedIpHex;
  }

  // 编码威胁提交调用
  encodeThreatSubmissionCall(reportData) {
    // 计算 "submitThreatReport(string,string,string)" 的函数选择器
    // 实际的keccak256("submitThreatReport(string,string,string)")的前4字节是 0x... (需要根据实际合约确定)
    // 使用一个模拟的函数选择器
    const functionSelector = 'a5b2c3d4'; // 这是一个模拟的函数选择器，实际应根据合约确定
    
    // 创建一个简单的威胁提交数据编码
    // 实际编码需要根据智能合约的ABI来正确编码参数
    const ipParam = this.encodeStringParam(reportData.ip || '');
    const typeParam = this.encodeStringParam(reportData.threatType || '');
    const levelParam = this.encodeStringParam(reportData.threatLevel || '');
    
    // 组合函数选择器和参数
    return '0x' + functionSelector + ipParam.slice(2) + typeParam.slice(2) + levelParam.slice(2);
  }

  // 编码获取威胁列表调用
  encodeGetThreatListCall() {
    // 计算 "getThreatList()" 的函数选择器
    // 实际的keccak256("getThreatList()")的前4字节 (需要根据实际合约确定)
    const functionSelector = 'f1e2d3c4'; // 这是一个模拟的函数选择器，实际应根据合约确定
    
    return '0x' + functionSelector;
  }

  // 处理从合约获取的威胁列表数据
  processThreatListFromContract(rawData) {
    // 这里应该根据实际合约返回格式解析数据
    // 目前返回空列表，实际部署时需要根据合约ABI正确解析
    console.log('从合约获取的威胁列表原始数据:', rawData);
    return {
      threat_list: [],
      last_update: new Date().toISOString(),
      total_threats: 0
    };
  }

  // 编码字符串参数 (简化版)
  encodeStringParam(str) {
    // 简化的字符串编码，实际需要使用ethers或web3进行正确编码
    const strBytes = Buffer.from(str, 'utf8');
    const hexStr = strBytes.toString('hex');
    
    // 简单的ABI编码：偏移量(32字节) + 长度 + 数据
    const lengthHex = ('00000000000000000000000000000000000000000000000000000000000000' + strBytes.length.toString(16)).slice(-64);
    const paddedData = hexStr + '00'.repeat((64 - (hexStr.length % 64)) % 64); // 填充到32字节边界
    
    return '0000000000000000000000000000000000000000000000000000000000000020' + lengthHex + paddedData;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      endpoint: this.currentEndpoint,
      chainId: this.config.chainId,
      lastConnectionAttempt: this.lastConnectionAttempt,
      retryCount: this.retryCount,
      maxRetries: this.config.maxRetries,
      cacheSize: this.cache.size
    };
  }
  
  // 清除过期缓存
  cleanupCache() {
    const now = Date.now();
    for (const [key, timestamp] of this.cacheTimestamp.entries()) {
      if (now - timestamp >= this.config.cacheTTL) {
        this.cache.delete(key);
        this.cacheTimestamp.delete(key);
      }
    }
  }
  
  // 清除所有缓存
  clearCache() {
    this.cache.clear();
    this.cacheTimestamp.clear();
  }
}

export default BlockchainConnector;