/**
 * OraSRS 区块链连接器
 * 处理与OraSRS协议链的连接，包括重试机制和错误处理
 */

import axios from 'axios';

// 使模块可导出

class BlockchainConnector {
  constructor(config = {}) {
    this.config = {
      endpoint: config.endpoint || 'https://api.orasrs.net',
      chainId: config.chainId || 8888,
      contractAddress: config.contractAddress || '0x0B306BF915C4d645ff596e518fAf3F9669b97016',
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      timeout: config.timeout || 10000,
      ...config
    };
    
    this.isConnected = false;
    this.lastConnectionAttempt = null;
    this.retryCount = 0;
  }

  async connect() {
    try {
      console.log(`🔗 尝试连接到OraSRS区块链: ${this.config.endpoint}`);
      
      // 尝试连接到区块链 - 首先尝试RPC端点
      try {
        const response = await axios.post(this.config.endpoint, {
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
          this.isConnected = true;
          this.lastConnectionAttempt = new Date();
          this.retryCount = 0;
          
          console.log(`✅ 成功连接到OraSRS区块链: ${this.config.endpoint}`);
          console.log(`📋 区块链信息:`, {
            endpoint: this.config.endpoint,
            chainId: this.config.chainId,
            blockNumber: response.data.result
          });
          
          return true;
        }
      } catch (rpcError) {
        console.log(`⚠️  RPC端点连接失败: ${rpcError.message}, 尝试HTTP端点...`);
      }
      
      // 如果RPC端点失败，尝试HTTP端点
      const httpResponse = await axios({
        method: 'GET',
        url: `${this.config.endpoint}/health`,
        timeout: this.config.timeout
      });
      
      if (httpResponse && httpResponse.data) {
        this.isConnected = true;
        this.lastConnectionAttempt = new Date();
        this.retryCount = 0;
        
        console.log(`✅ 成功连接到OraSRS区块链 (HTTP): ${this.config.endpoint}`);
        console.log(`📋 区块链信息:`, {
          endpoint: this.config.endpoint,
          chainId: this.config.chainId,
          status: httpResponse.data.status || 'unknown'
        });
        
        return true;
      } else {
        throw new Error('Invalid response from blockchain endpoint');
      }
    } catch (error) {
      this.isConnected = false;
      this.lastConnectionAttempt = new Date();
      
      console.error(`❌ 连接OraSRS区块链失败:`, error.message);
      
      // 如果还有重试次数，进行重试
      if (this.retryCount < this.config.maxRetries) {
        this.retryCount++;
        console.log(`🔄 重试连接 (#${this.retryCount}/${this.config.maxRetries})...`);
        
        // 等待一段时间后重试
        await this.delay(this.config.retryDelay * this.retryCount);
        return this.connect();
      }
      
      // 不抛出错误，而是记录错误并返回false
      console.error(`❌ 无法连接到OraSRS区块链: ${error.message}`);
      return false;
    }
  }

  async makeRequest(requestConfig) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      
      const response = await axios({
        ...requestConfig,
        timeout: this.config.timeout
      });
      
      return response;
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
      
      // 重新发送请求
      try {
        return await axios({
          ...requestConfig,
          timeout: this.config.timeout
        });
      } catch (retryError) {
        console.error(`❌ 重试请求也失败:`, retryError.message);
        return null;
      }
    }
  }

  async getThreatData(ipAddress) {
    // 如果无法连接到区块链，则直接返回模拟数据
    if (!this.isConnected) {
      await this.connect(); // 尝试连接一次
      if (!this.isConnected) {
        console.log(`⚠️  区块链未连接，返回模拟数据: ${ipAddress}`);
        return this.getMockThreatData(ipAddress);
      }
    }
    
    try {
      const response = await this.makeRequest({
        method: 'GET',
        url: `${this.config.endpoint}/api/threats/${ipAddress}`,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'OraSRS-Client/2.0.1'
        }
      });
      
      // 如果请求成功则返回数据，否则返回模拟数据
      if (response && response.data) {
        return response.data;
      } else {
        console.log(`⚠️  无法从区块链获取数据，返回模拟数据: ${ipAddress}`);
        return this.getMockThreatData(ipAddress);
      }
    } catch (error) {
      console.error(`❌ 获取威胁数据失败:`, error.message);
      // 返回模拟数据以确保服务可用
      return this.getMockThreatData(ipAddress);
    }
  }

  async submitThreatReport(reportData) {
    try {
      const response = await this.makeRequest({
        method: 'POST',
        url: `${this.config.endpoint}/api/threats`,
        data: reportData,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'OraSRS-Client/2.0.1'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error(`❌ 提交威胁报告失败:`, error.message);
      throw error;
    }
  }

  async getGlobalThreatList() {
    try {
      const response = await this.makeRequest({
        method: 'GET',
        url: `${this.config.endpoint}/api/threats/list`,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'OraSRS-Client/2.0.1'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error(`❌ 获取全局威胁列表失败:`, error.message);
      return { threat_list: [], last_update: new Date().toISOString() };
    }
  }

  getMockThreatData(ipAddress) {
    // 返回模拟威胁数据以确保服务在区块链连接失败时仍可用
    return {
      query: { ip: ipAddress },
      response: {
        risk_score: Math.random() * 0.3, // 随机低风险评分
        confidence: 'low',
        risk_level: 'low',
        evidence: [
          {
            type: 'mock_data',
            detail: 'Mock threat data for service availability',
            source: 'mock_generator',
            timestamp: new Date().toISOString(),
            confidence: 0.3
          }
        ],
        recommendations: {
          default: 'allow',
          public_services: 'allow',
          banking: 'allow_with_verification'
        },
        appeal_url: `https://api.orasrs.net/appeal?ip=${ipAddress}`,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        timestamp: new Date().toISOString(),
        disclaimer: 'This is mock data for service availability during blockchain connection issues.',
        version: '2.0-mock'
      }
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      endpoint: this.config.endpoint,
      chainId: this.config.chainId,
      lastConnectionAttempt: this.lastConnectionAttempt,
      retryCount: this.retryCount,
      maxRetries: this.config.maxRetries
    };
  }
}

export default BlockchainConnector;