#!/usr/bin/env node

/**
 * OraSRS (Oracle Security Root Service) 简化测试客户端
 * 用于测试服务启动和基本功能
 */

// 从环境变量或默认值获取配置
const config = {
  port: process.env.ORASRS_PORT || 3006,
  host: process.env.ORASRS_HOST || '0.0.0.0',
  enableLogging: process.env.ORASRS_ENABLE_LOGGING !== 'false',
  logFile: process.env.ORASRS_LOG_FILE || './logs/orasrs-service.log',
  // 简化的区块链连接配置
  blockchain: {
    endpoints: [
      process.env.ORASRS_BLOCKCHAIN_ENDPOINT || 'http://127.0.0.1:8545',  // 使用本地端点
      'https://backup.orasrs.net',
      'https://fallback.orasrs.net'
    ],
    chainId: process.env.ORASRS_CHAIN_ID || 31337,  // 使用本地链ID
    contractAddress: process.env.ORASRS_CONTRACT_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    timeout: process.env.ORASRS_BLOCKCHAIN_TIMEOUT || 5000,  // 减少超时时间
    retries: process.env.ORASRS_BLOCKCHAIN_RETRIES || 1,
    retryDelay: process.env.ORASRS_BLOCKCHAIN_RETRY_DELAY || 100
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
  },
  // 安全配置
  security: {
    enableRateLimiting: true,
    enableCORS: true,
    corsOrigin: process.env.ORASRS_CORS_ORIGIN || '*',
    enableAPIKey: false,
    apiKeys: process.env.ORASRS_API_KEYS ? process.env.ORASRS_API_KEYS.split(',') : []
  }
};

console.log('🚀 启动 OraSRS (Oracle Security Root Service) 测试客户端...');
console.log('🔧 配置:', {
  port: config.port,
  host: config.host,
  blockchainEndpoints: config.blockchain.endpoints,
  chainId: config.blockchain.chainId
});

// 引入必要的模块
import express from 'express';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import rateLimit from 'rate-limiter-flexible';

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

// 创建Express应用
class OraSRSClient {
  constructor(config) {
    this.config = config;
    this.app = express();
    this.blockchainConnected = false;
    this.currentEndpointIndex = 0;
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

    // 设置速率限制（如果启用）
    if (this.config.security.enableRateLimiting) {
      const opts = {
        points: this.config.rateLimit.max,
        duration: this.config.rateLimit.windowMs / 1000, // 转换为秒
      };
      
      const limiter = new rateLimit.RateLimiterMemory(opts);
      
      this.app.use((req, res, next) => {
        limiter.consume(req.ip)
          .then(() => {
            next();
          })
          .catch(() => {
            res.status(429).send('Rate limit exceeded');
          });
      });
    }

    // 初始化路由
    this.setupRoutes();
    
    // 不立即启动区块链连接检查，而是稍后异步进行
    setTimeout(() => {
      this.startBlockchainConnectionCheck();
    }, 2000);  // 2秒后开始检查区块链连接
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
    log('所有区块链端点连接失败', 'WARN');  // 使用WARN而不是ERROR，避免启动失败
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

  // 设置路由
  setupRoutes() {
    // 风险评估查询
    this.app.get('/orasrs/v1/query', async (req, res) => {
      try {
        const ip = req.query.ip || req.query.address;
        const domain = req.query.domain;
        
        if (!ip && !domain) {
          return res.status(400).json({
            error: 'IP或域名参数缺失',
            message: '请提供IP地址或域名参数'
          });
        }

        // 尝试从区块链获取风险评估
        let blockchainResult = null;
        if (this.blockchainConnected) {
          try {
            blockchainResult = await this.getRiskAssessmentFromBlockchain(ip, domain);
          } catch (error) {
            log(`区块链查询失败: ${error.message}`, 'WARN');
          }
        }

        // 返回模拟结果（实际生产环境中，这里会结合区块链数据）
        const result = {
          service: 'OraSRS (Oracle Security Root Service)',
          indicator: ip || domain,
          type: ip ? 'ip' : 'domain',
          risk_score: blockchainResult?.risk_score || Math.random() * 0.5, // 默认低风险
          risk_level: 'low', // 默认低风险
          confidence: blockchainResult?.confidence || 0.7,
          last_updated: new Date().toISOString(),
          sources: ['blockchain', 'local_analysis'],
          blockchain_status: this.blockchainConnectionStatus.status,
          current_endpoint: this.blockchainConnectionStatus.endpoint,
          details: {
            threat_types: blockchainResult?.threat_types || [],
            severity: blockchainResult?.severity || 'info',
            evidence: blockchainResult?.evidence || [],
            behavior_patterns: blockchainResult?.behavior_patterns || []
          },
          explanation: 'This is a risk assessment from OraSRS (Oracle Security Root Service). The final decision should be made by the client based on this assessment.',
          appeal_url: `https://api.orasrs.net/appeal?ip=${ip || domain}`,
          timestamp: new Date().toISOString()
        };

        // 根据风险分数设置风险等级
        if (result.risk_score > 0.8) {
          result.risk_level = 'critical';
        } else if (result.risk_score > 0.6) {
          result.risk_level = 'high';
        } else if (result.risk_score > 0.4) {
          result.risk_level = 'medium';
        }

        res.json(result);
      } catch (error) {
        log(`查询处理失败: ${error.message}`, 'ERROR');
        res.status(500).json({
          error: '查询处理失败',
          message: error.message
        });
      }
    });

    // 威胁列表查询
    this.app.get('/orasrs/v2/threat-list', async (req, res) => {
      try {
        // 模拟从区块链获取威胁列表
        const threatList = {
          service: 'OraSRS (Oracle Security Root Service)',
          version: 'v2.0',
          total_threats: 0,
          threats: [],
          last_updated: new Date().toISOString(),
          blockchain_status: this.blockchainConnectionStatus.status,
          current_endpoint: this.blockchainConnectionStatus.endpoint
        };

        if (this.blockchainConnected) {
          try {
            // 尝试从区块链获取威胁列表
            const blockchainThreats = await this.getThreatListFromBlockchain();
            threatList.total_threats = blockchainThreats.length;
            threatList.threats = blockchainThreats;
          } catch (error) {
            log(`威胁列表查询失败: ${error.message}`, 'WARN');
          }
        }

        res.json(threatList);
      } catch (error) {
        log(`威胁列表查询失败: ${error.message}`, 'ERROR');
        res.status(500).json({
          error: '威胁列表查询失败',
          message: error.message
        });
      }
    });

    // 申诉接口
    this.app.post('/orasrs/v1/appeal', async (req, res) => {
      try {
        const { ip, domain, reason, evidence } = req.body;
        
        if (!ip && !domain) {
          return res.status(400).json({
            error: 'IP或域名参数缺失',
            message: '请提供IP地址或域名参数'
          });
        }

        // 模拟申诉处理
        const appealResult = {
          success: true,
          appeal_id: `appeal_${Date.now()}`,
          status: 'received',
          estimated_resolution_time: '24-48 hours',
          message: 'Appeal request received. Risk score temporarily reduced during review.',
          blockchain_status: this.blockchainConnectionStatus.status,
          current_endpoint: this.blockchainConnectionStatus.endpoint,
          details: {
            original_ip: ip || domain,
            submitted_at: new Date().toISOString(),
            reason: reason || 'not_specified',
            evidence_provided: !!evidence
          },
          explanation: 'Risk score temporarily reduced during review. Decision will be made based on blockchain verification and evidence review.'
        };

        // 如果区块链连接成功，尝试提交申诉到区块链
        if (this.blockchainConnected) {
          try {
            await this.submitAppealToBlockchain(ip, domain, reason, evidence);
            appealResult.status = 'submitted_to_blockchain';
            log(`申诉已提交到区块链: ${ip || domain}`);
          } catch (error) {
            log(`申诉提交到区块链失败: ${error.message}`, 'WARN');
          }
        }

        res.json(appealResult);
      } catch (error) {
        log(`申诉处理失败: ${error.message}`, 'ERROR');
        res.status(500).json({
          error: '申诉处理失败',
          message: error.message
        });
      }
    });

    // 威胁解释接口
    this.app.get('/orasrs/v1/explain', async (req, res) => {
      try {
        const ip = req.query.ip || req.query.address;
        const domain = req.query.domain;
        
        if (!ip && !domain) {
          return res.status(400).json({
            error: 'IP或域名参数缺失',
            message: '请提供IP地址或域名参数'
          });
        }

        // 模拟威胁解释
        const explanation = {
          service: 'OraSRS (Oracle Security Root Service)',
          indicator: ip || domain,
          type: ip ? 'ip' : 'domain',
          explanation: 'This risk assessment is based on multiple factors including threat intelligence feeds, behavioral analysis, and blockchain-verified evidence.',
          factors: [
            'Threat intelligence feeds',
            'Behavioral analysis',
            'Historical patterns',
            'Blockchain-verified evidence'
          ],
          transparency: {
            data_sources: [
              'Blockchain records',
              'Network observables',
              'Security research',
              'Community reports'
            ],
            verification_methods: [
              'Consensus verification',
              'Cross-referencing',
              'Temporal analysis',
              'Behavioral correlation'
            ],
            confidence_factors: [
              'Source credibility',
              'Evidence quality',
              'Consensus level',
              'Temporal relevance'
            ]
          },
          blockchain_status: this.blockchainConnectionStatus.status,
          current_endpoint: this.blockchainConnectionStatus.endpoint,
          timestamp: new Date().toISOString()
        };

        res.json(explanation);
      } catch (error) {
        log(`威胁解释查询失败: ${error.message}`, 'ERROR');
        res.status(500).json({
          error: '威胁解释查询失败',
          message: error.message
        });
      }
    });

    // 健康检查端点
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'OraSRS Client',
        version: '2.0.0',
        blockchain_status: this.blockchainConnectionStatus.status,
        current_endpoint: this.blockchainConnectionStatus.endpoint,
        timestamp: new Date().toISOString()
      });
    });

    // 根路径
    this.app.get('/', (req, res) => {
      res.json({
        service: 'OraSRS (Oracle Security Root Service)',
        version: '2.0.0',
        description: 'Advisory Risk Scoring Service',
        endpoints: {
          query: '/orasrs/v1/query?ip={ip}&domain={domain}',
          threatList: '/orasrs/v2/threat-list',
          appeal: '/orasrs/v1/appeal',
          explain: '/orasrs/v1/explain?ip={ip}',
        },
        blockchain_status: this.blockchainConnectionStatus.status,
        current_endpoint: this.blockchainConnectionStatus.endpoint,
        documentation: 'https://api.orasrs.net/docs',
        timestamp: new Date().toISOString()
      });
    });
  }

  // 从区块链获取风险评估（模拟）
  async getRiskAssessmentFromBlockchain(ip, domain) {
    // 这里应该是实际的区块链查询逻辑
    // 为测试目的，返回模拟数据
    return {
      risk_score: Math.random() * 0.3, // 模拟低风险
      confidence: 0.8,
      threat_types: [],
      severity: 'info',
      evidence: [],
      behavior_patterns: []
    };
  }

  // 从区块链获取威胁列表（模拟）
  async getThreatListFromBlockchain() {
    // 这里应该是实际的区块链查询逻辑
    // 为测试目的，返回空数组
    return [];
  }

  // 提交申诉到区块链（模拟）
  async submitAppealToBlockchain(ip, domain, reason, evidence) {
    // 这里应该是实际的区块链提交逻辑
    // 为测试目的，仅记录操作
    log(`模拟提交申诉到区块链: ${ip || domain}`);
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.app.listen({ port: this.config.port, host: this.config.host }, () => {
        log(`OraSRS 服务监听端口 ${this.config.host}:${this.config.port}`);
        log('OraSRS (Oracle Security Root Service) - Advisory Risk Scoring Service is now running');
        resolve();
      }).on('error', (err) => {
        log(`启动 OraSRS 服务失败: ${err.message}`, 'ERROR');
        reject(err);
      });
    });
  }

  async stop() {
    log('OraSRS 服务已关闭');
  }
}

// 启动客户端
console.log('🔧 初始化 OraSRS 客户端配置...');
const orasrsClient = new OraSRSClient(config);

// 启动服务
orasrsClient.start()
  .then(() => {
    console.log('\n✅ OraSRS 服务启动成功!');
    console.log(`   - 风险查询: http://${config.host}:${config.port}/orasrs/v1/query?ip=1.2.3.4`);
    console.log(`   - 威胁列表: http://${config.host}:${config.port}/orasrs/v2/threat-list`);
    console.log(`   - 申诉接口: http://${config.host}:${config.port}/orasrs/v1/appeal`);
    console.log(`   - 健康检查: http://${config.host}:${config.port}/health`);
    console.log(`\n📊 OraSRS 服务运行中 [${new Date().toISOString()}]`);
  })
  .catch((error) => {
    console.error('❌ 启动 OraSRS 服务失败:', error);
    process.exit(1);
  });

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n🛑 正在关闭 OraSRS 服务...');
  try {
    await orasrsClient.stop();
    console.log('✅ OraSRS 服务已关闭');
  } catch (error) {
    console.error('关闭 OraSRS 服务时出错:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 正在关闭 OraSRS 服务...');
  try {
    await orasrsClient.stop();
    console.log('✅ OraSRS 服务已关闭');
  } catch (error) {
    console.error('关闭 OraSRS 服务时出错:', error);
    process.exit(1);
  }
});
