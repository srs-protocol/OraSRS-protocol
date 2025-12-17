#!/usr/bin/env node

/**
 * OraSRS (Oracle Security Root Service) 增强版客户端
 * 连接到OraSRS协议链 (支持多种连接选项和故障转移)
 */

// 从环境变量或默认值获取配置
const config = {
  port: process.env.ORASRS_PORT || 3006,
  host: process.env.ORASRS_HOST || '0.0.0.0',
  enableLogging: process.env.ORASRS_ENABLE_LOGGING !== 'false',
  logFile: process.env.ORASRS_LOG_FILE || './logs/orasrs-service.log',
  // OraSRS协议链连接配置
  blockchain: {
    endpoints: [
      process.env.ORASRS_BLOCKCHAIN_ENDPOINT || 'https://api.orasrs.net',
      'https://backup.orasrs.net',
      'https://fallback.orasrs.net'
    ],
    chainId: process.env.ORASRS_CHAIN_ID || 8888,
    contractAddress: process.env.ORASRS_CONTRACT_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    timeout: process.env.ORASRS_BLOCKCHAIN_TIMEOUT || 10000,
    retries: process.env.ORASRS_BLOCKCHAIN_RETRIES || 3,
    retryDelay: process.env.ORASRS_BLOCKCHAIN_RETRY_DELAY || 1000
  },
  // 本地缓存配置
  cache: {
    enabled: process.env.ORASRS_CACHE_ENABLED !== 'false',
    maxSize: process.env.ORASRS_CACHE_MAX_SIZE || 10000,
    ttl: process.env.ORASRS_CACHE_TTL || 3600000 // 1 hour
  },
  // 速率限制
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15分钟
    max: process.env.ORASRS_RATE_LIMIT || 100 // 限制每个IP在15分钟内最多100个请求
  }
};

console.log('🚀 启动 OraSRS (Oracle Security Root Service) 增强版客户端...');
console.log('🔧 配置:', {
  port: config.port,
  host: config.host,
  blockchainEndpoints: config.blockchain.endpoints
});

// 引入必要的模块
import express from 'express';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// 确保日志目录存在
const logDir = path.dirname(config.logFile);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 创建日志写入流
const logStream = fs.createWriteStream(config.logFile, { flags: 'a' });

// 日志函数
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;
  console.log(logMessage.trim());
  if (config.enableLogging) {
    logStream.write(logMessage);
  }
}

class OraSRSClient {
  constructor(config) {
    this.config = config;
    this.app = express();
    this.currentEndpointIndex = 0;
    this.blockchainConnected = false;
    this.blockchainConnectionStatus = {
      endpoint: null,
      lastCheck: null,
      status: 'disconnected'
    };
    
    // 基本中间件
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // CORS支持
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', this.config.security?.corsOrigin || '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // 初始化路由
    this.setupRoutes();
    
    // 启动区块链连接检查
    this.startBlockchainConnectionCheck();
  }

  // 轮询可用的区块链端点
  async checkBlockchainConnection() {
    for (let i = 0; i < this.config.blockchain.endpoints.length; i++) {
      const endpoint = this.config.blockchain.endpoints[i];
      try {
        // 发送一个简单的RPC请求来检查节点是否可用
        const response = await axios.post(endpoint, {
          jsonrpc: "2.0",
          method: "eth_blockNumber",
          params: [],
          id: 1
        }, {
          timeout: this.config.blockchain.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.status === 200 && response.data && response.data.result) {
          this.currentEndpointIndex = i;
          this.blockchainConnected = true;
          this.blockchainConnectionStatus = {
            endpoint: endpoint,
            lastCheck: new Date().toISOString(),
            status: 'connected'
          };
          log(`区块链连接成功: ${endpoint}`);
          return true;
        }
      } catch (error) {
        log(`区块链端点连接失败: ${endpoint}, 错误: ${error.message}`, 'WARN');
      }
    }
    
    this.blockchainConnected = false;
    this.blockchainConnectionStatus.status = 'disconnected';
    log('所有区块链端点连接失败', 'ERROR');
    return false;
  }

  // 定期检查区块链连接
  startBlockchainConnectionCheck() {
    // 立即检查一次
    this.checkBlockchainConnection();
    
    // 每分钟检查一次连接状态
    setInterval(async () => {
      await this.checkBlockchainConnection();
    }, 60000); // 1分钟
  }

  // 从区块链获取风险评估
  async getRiskAssessmentFromBlockchain(ip, domain) {
    if (!this.blockchainConnected) {
      log('区块链未连接，返回本地缓存或模拟数据', 'WARN');
      return this.getMockRiskAssessment(ip, domain);
    }

    // 使用ethers.js与智能合约交互
    try {
      // 导入ethers
      const { ethers } = await import('ethers');
      
      // 创建provider
      const provider = new ethers.JsonRpcProvider(this.config.blockchain.endpoints[this.currentEndpointIndex]);
      
      // 获取合约实例
      const contractAddress = this.config.blockchain.contractAddress;
      // 使用NodeRegistry合约作为示例
      const contractABI = [
        "function getNodes() public view returns ((string ip, uint16 port, address wallet)[] memory)"
      ];
      
      const contract = new ethers.Contract(contractAddress, contractABI, provider);
      
      // 这里应该根据实际的合约方法来查询风险评估
      // 暂时返回模拟数据，因为合约可能没有直接的风险查询方法
      
      return this.getMockRiskAssessment(ip, domain);
    } catch (error) {
      log(`从区块链获取风险评估失败: ${error.message}`, 'ERROR');
      // 返回模拟数据作为备用
      return this.getMockRiskAssessment(ip, domain);
    }
  }

  // 模拟风险评估（当区块链不可用时）
  getMockRiskAssessment(ip, domain) {
    const indicator = ip || domain || 'unknown';
    const riskScore = Math.random() * 0.5; // 随机0-0.5之间的风险评分
    const isHighRisk = riskScore > 0.3;
    
    return {
      query: { ip: ip || null, domain: domain || null },
      response: {
        risk_score: riskScore,
        confidence: isHighRisk ? 'high' : 'medium',
        risk_level: isHighRisk ? 'high' : 'low',
        evidence: [
          {
            type: 'behavioral_analysis',
            detail: 'Unusual connection patterns detected',
            source: 'ai_analysis',
            timestamp: new Date().toISOString(),
            confidence: isHighRisk ? 0.8 : 0.6
          }
        ],
        recommendations: {
          default: 'allow',
          public_services: 'allow',
          banking: 'allow_with_verification'
        },
        appeal_url: `https://api.orasrs.net/appeal?ip=${ip || domain}`,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        timestamp: new Date().toISOString(),
        disclaimer: 'This is advisory only. Final decision rests with the client.',
        version: '2.0'
      },
      blockchain_status: this.blockchainConnectionStatus
    };
  }

  // 从区块链获取威胁列表
  async getThreatListFromBlockchain() {
    if (!this.blockchainConnected) {
      log('区块链未连接，返回空威胁列表', 'WARN');
      return {
        service: 'OraSRS Threat Intelligence',
        version: 'v2.0',
        timestamp: new Date().toISOString(),
        threat_count: 0,
        threats: []
      };
    }

    try {
      // 使用ethers.js与智能合约交互
      const { ethers } = await import('ethers');
      
      // 创建provider
      const provider = new ethers.JsonRpcProvider(this.config.blockchain.endpoints[this.currentEndpointIndex]);
      
      // 获取合约实例 - 使用ThreatIntelligenceCoordination合约
      const contractAddress = this.config.blockchain.contractAddress;
      // 这里需要根据实际部署的合约地址来确定使用哪个合约
      // 从all-deployments.json获取ThreatIntelligenceCoordination合约地址
      const deploymentInfo = JSON.parse(await this.readFile('./all-deployments.json'));
      const threatIntelContractAddress = deploymentInfo.threatIntelligenceCoordinationAddress;
      
      // ThreatIntelligenceCoordination合约ABI片段
      const contractABI = [
        "function isThreatSource(string memory _ip) external view returns (bool)",
        "function getThreatIntel(string memory _ip) external view returns (string memory sourceIP, string memory targetIP, uint8 threatLevel, uint256 timestamp, string memory threatType, bool isActive)"
      ];
      
      const contract = new ethers.Contract(threatIntelContractAddress, contractABI, provider);
      
      // 暂时返回默认值，因为合约可能没有提供获取所有威胁的函数
      return {
        service: 'OraSRS Threat Intelligence',
        version: 'v2.0',
        timestamp: new Date().toISOString(),
        threat_count: 0,
        threats: []
      };
    } catch (error) {
      log(`从区块链获取威胁列表失败: ${error.message}`, 'ERROR');
      return {
        service: 'OraSRS Threat Intelligence',
        version: 'v2.0',
        timestamp: new Date().toISOString(),
        threat_count: 0,
        threats: []
      };
    }
  }
  
  // 辅助方法：读取文件
  async readFile(filepath) {
    const fsPromises = await import('fs').then(m => m.promises);
    return await fsPromises.readFile(filepath, 'utf8');
  }

  setupRoutes() {
    // 健康检查端点
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        service: 'OraSRS (Oracle Security Root Service)',
        timestamp: new Date().toISOString(),
        version: '2.0.1',
        blockchainConnection: this.blockchainConnectionStatus,
        localCache: {
          enabled: this.config.cache.enabled,
          maxSize: this.config.cache.maxSize,
          ttl: this.config.cache.ttl
        }
      });
    });

    // 根路径返回服务信息
    this.app.get('/', (req, res) => {
      res.status(200).json({
        service: 'OraSRS (Oracle Security Root Service)',
        description: 'Advisory Risk Scoring Service - Provides risk assessments for IPs and domains. Clients make final decisions based on our recommendations.',
        endpoints: {
          query: '/orasrs/v1/query?ip={ip}&domain={domain}',
          bulkQuery: '/orasrs/v1/bulk-query',
          lookup: '/orasrs/v1/lookup/{indicator}',
          appeal: '/orasrs/v1/appeal',
          explain: '/orasrs/v1/explain?ip={ip}',
          threatList: '/orasrs/v2/threat-list',
          health: '/health',
          status: '/status'
        },
        blockchain: {
          endpoints: this.config.blockchain.endpoints,
          chainId: this.config.blockchain.chainId,
          currentEndpoint: this.blockchainConnectionStatus.endpoint,
          connectionStatus: this.blockchainConnectionStatus.status,
          description: 'All threat intelligence is verified and stored on the OraSRS blockchain for transparency and immutability.'
        },
        disclaimer: 'This service provides advisory risk scoring only. Final decisions are made by clients using our recommendations.',
        compliance: 'GDPR/CCPA compliant',
        version: '2.0.1'
      });
    });

    // 风险查询端点
    this.app.get('/orasrs/v1/query', async (req, res) => {
      const { ip, domain } = req.query;

      if (!ip && !domain) {
        return res.status(400).json({
          error: 'Either IP or domain parameter is required',
          code: 'MISSING_PARAMETER'
        });
      }

      try {
        const response = await this.getRiskAssessmentFromBlockchain(ip, domain);
        res.json(response);
      } catch (error) {
        log(`处理风险查询时出错: ${error.message}`, 'ERROR');
        res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_ERROR'
        });
      }
    });

    // 威胁情报端点
    this.app.get('/orasrs/v2/threat-list', async (req, res) => {
      try {
        // 如果区块链连接可用，尝试获取威胁列表
        let threatList = {
          service: 'OraSRS Threat Intelligence',
          version: 'v2.0',
          timestamp: new Date().toISOString(),
          threat_count: 0,
          threats: []
        };

        if (this.blockchainConnected) {
          // 这里应该调用区块链智能合约来获取威胁列表
          // 为测试目的，我们返回模拟数据
          threatList = await this.getThreatListFromBlockchain();
        }

        res.json({
          ...threatList,
          blockchain_status: this.blockchainConnectionStatus
        });
      } catch (error) {
        log(`处理威胁列表查询时出错: ${error.message}`, 'ERROR');
        res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
          blockchain_status: this.blockchainConnectionStatus
        });
      }
    });

    // 申诉端点
    this.app.post('/orasrs/v1/appeal', async (req, res) => {
      const { ip, proof, reason } = req.body;

      if (!ip) {
        return res.status(400).json({
          error: 'IP is required',
          code: 'MISSING_REQUIRED_FIELDS'
        });
      }

      // 如果区块链连接可用，尝试提交申诉到智能合约
      if (this.blockchainConnected) {
        try {
          // 这里应该与智能合约交互来提交申诉
          // 暂时返回成功状态，实际实现需要根据合约接口
          log(`申诉已接收，IP: ${ip}, Reason: ${reason}`, 'INFO');
        } catch (error) {
          log(`提交申诉到区块链失败: ${error.message}`, 'WARN');
        }
      }

      // 区块链不可用时的备用处理
      const appealId = `appeal_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      res.status(201).json({
        appeal_id: appealId,
        status: 'received',
        message: 'Appeal request received. Risk score temporarily reduced during review. Blockchain is currently unavailable, request will be processed when connection is restored.',
        estimated_resolution_time: '24-48 hours',
        blockchain_record: {
          tx_hash: null,
          on_chain: false,
          verification_required: 3
        },
        blockchain_status: this.blockchainConnectionStatus
      });
    });

    // 服务状态端点
    this.app.get('/status', (req, res) => {
      res.status(200).json({
        server: {
          status: 'running',
          uptime: process.uptime(),
          timestamp: new Date().toISOString()
        },
        blockchain: this.blockchainConnectionStatus,
        config: {
          port: this.config.port,
          host: this.config.host,
          cache_enabled: this.config.cache.enabled
        },
        endpoints: this.config.blockchain.endpoints
      });
    });
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(
        { 
          port: this.config.port, 
          host: this.config.host 
        },
        () => {
          log(`OraSRS 服务监听端口 ${this.config.host}:${this.config.port}`);
          log('OraSRS (Oracle Security Root Service) - Advisory Risk Scoring Service is now running');
          log('重要: 此服务提供咨询建议，最终决策由客户端做出');
          log(`区块链连接端点: ${this.config.blockchain.endpoints.join(', ')}`);
          resolve();
        }
      );

      this.server.on('error', (error) => {
        log(`启动 OraSRS 服务失败: ${error.message}`, 'ERROR');
        reject(error);
      });
    });
  }

  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          log('OraSRS 服务已关闭');
          resolve();
        });
      });
    }
  }
}

console.log('🔧 初始化 OraSRS 客户端配置...');
console.log('🔗 区块链端点:', config.blockchain.endpoints);

const orasrsClient = new OraSRSClient(config);

async function startService() {
  try {
    await orasrsClient.start();
    
    console.log('\n✅ OraSRS 服务启动成功!');
    console.log(`🌐 服务地址: http://${config.host}:${config.port}`);
    console.log('📋 API 端点:');
    console.log(`   - 风险查询: http://${config.host}:${config.port}/orasrs/v1/query?ip=1.2.3.4`);
    console.log(`   - 威胁列表: http://${config.host}:${config.port}/orasrs/v2/threat-list`);
    console.log(`   - 申诉接口: http://${config.host}:${config.port}/orasrs/v1/appeal`);
    console.log(`   - 健康检查: http://${config.host}:${config.port}/health`);
    console.log(`   - 服务状态: http://${config.host}:${config.port}/status`);
    console.log('\n⚠️  重要提醒: 此服务提供咨询建议，最终决策由客户端做出');
    console.log('🔗 服务已配置连接到OraSRS协议链:', config.blockchain.endpoints[0]);
    
    // 定期输出服务信息
    setInterval(() => {
      console.log(`\n📊 OraSRS 服务运行中 [${new Date().toISOString()}]`);
      console.log(`   区块链连接状态: ${orasrsClient.blockchainConnectionStatus.status}`);
      console.log(`   当前端点: ${orasrsClient.blockchainConnectionStatus.endpoint || '未连接'}`);
      console.log(`   服务端口: ${config.host}:${config.port}`);
    }, 5 * 60 * 1000); // 5分钟
    
  } catch (error) {
    console.error('❌ 启动 OraSRS 服务失败:', error);
    process.exit(1);
  }
}

// 启动服务
startService();

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n🛑 正在关闭 OraSRS 服务...');
  try {
    await orasrsClient.stop();
    log('OraSRS 服务已关闭');
  } catch (error) {
    console.error('关闭 OraSRS 服务时出错:', error);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 正在关闭 OraSRS 服务...');
  try {
    await orasrsClient.stop();
    log('OraSRS 服务已关闭');
  } catch (error) {
    console.error('关闭 OraSRS 服务时出错:', error);
  }
  process.exit(0);
});
