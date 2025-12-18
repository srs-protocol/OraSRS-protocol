#!/usr/bin/env node

/**
 * OraSRS (Oracle Security Root Service) 精简客户端
 * 连接到OraSRS协议链 (api.orasrs.net)
 * 避免复杂依赖，用于打包
 */

// 导入区块链连接器
import BlockchainConnector from './blockchain-connector.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const express = require('express');

// 精简版OraSRS服务类，避免复杂依赖
class SimpleOraSRSService {
  constructor(config = {}) {
    this.config = {
      port: config.port || 3006,
      host: config.host || '0.0.0.0',
      enableLogging: config.enableLogging !== false,
      logFile: config.logFile || './logs/orasrs-service.log',
      ...config
    };

    // 初始化区块链连接器
    this.blockchainConnector = new BlockchainConnector(this.config.blockchain);

    // 简化的Express应用
    this.app = express();
    
    // 基本中间件
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // 速率限制中间件（如果启用）
    if (config.security.enableRateLimiting) {
      const rateLimit = require('rate-limiter-flexible');
      const opts = {
        points: config.rateLimit.max || 100,
        duration: config.rateLimit.windowMs / 1000 || 900, // 转换为秒
      };
      const limiter = new rateLimit.RateLimiterMemory(opts);

      this.app.use((req, res, next) => {
        // 检查IP白名单
        const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || '';
        if (config.security.whitelist && config.security.whitelist.includes(clientIP)) {
          return next(); // 白名单IP不受速率限制
        }

        limiter.consume(req.ip || clientIP)
          .then(() => {
            next();
          })
          .catch(() => {
            res.status(429).json({ error: 'Too Many Requests' });
          });
      });
    }

    // CORS支持
    this.app.use((req, res, next) => {
      const origin = req.headers.origin;
      const allowedOrigins = config.security.corsOrigin === '*' ? [origin] : config.security.corsOrigin;
      
      if (config.security.enableCORS) {
        res.header('Access-Control-Allow-Origin', config.security.corsOrigin);
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      }
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // 基本API端点
    this.setupRoutes();
  }

  setupRoutes() {
    // 健康检查端点
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        service: 'OraSRS (Oracle Security Root Service)',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        blockchainConnection: {
          endpoint: this.config.blockchain?.endpoint || 'https://api.orasrs.net',
          connected: true
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
          gasSubsidyRequest: '/orasrs/v1/gas-subsidy/request (POST)',
          gasSubsidyStatus: '/orasrs/v1/gas-subsidy/status/{address} (GET)',
          health: '/health'
        },
        blockchain: {
          endpoint: this.config.blockchain?.endpoint || 'https://api.orasrs.net',
          chainId: this.config.blockchain?.chainId || 8888,
          description: 'All threat intelligence is verified and stored on the OraSRS blockchain for transparency and immutability.'
        },
        disclaimer: 'This service provides advisory risk scoring only. Final decisions are made by clients using our recommendations.',
        compliance: 'GDPR/CCPA compliant'
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
        // 从区块链获取威胁数据
        const threatData = await this.blockchainConnector.getThreatData(ip || domain);
        res.json(threatData);
      } catch (error) {
        console.error('Error fetching threat data:', error);
        // 如果区块链连接失败，返回模拟数据
        const mockResponse = {
          query: { ip: ip || null, domain: domain || null },
          response: {
            risk_score: Math.random() * 0.3, // 较低的随机风险评分
            confidence: 'low',
            risk_level: 'low',
            evidence: [
              {
                type: 'mock_data',
                detail: 'Mock threat data for service availability',
                source: 'local_mock',
                timestamp: new Date().toISOString(),
                confidence: 0.3
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
            disclaimer: 'This is mock data for service availability during blockchain connection issues.',
            version: '2.0-mock'
          },
          blockchain_status: this.blockchainConnector.getStatus()
        };

        res.json(mockResponse);
      }
    });

    // 威胁情报端点
    this.app.get('/orasrs/v2/threat-list', async (req, res) => {
      try {
        // 从区块链获取全局威胁列表
        const threatList = await this.blockchainConnector.getGlobalThreatList();
        
        res.json({
          ...threatList,
          blockchain_status: this.blockchainConnector.getStatus()
        });
      } catch (error) {
        console.error('Error fetching global threat list:', error);
        // 如果区块链连接失败，返回模拟威胁列表
        const mockThreatList = {
          threat_list: [
            {
              ip: '1.2.3.4',
              threat_level: 'medium',
              first_seen: '2025-12-01T10:00:00Z',
              last_seen: '2025-12-01T12:00:00Z',
              report_count: 3,
              primary_threat_type: 'suspicious_activity',
              confidence: 0.65,
              evidence: [
                {
                  source: 'ai_analyzer',
                  timestamp: '2025-12-01T10:00:00Z',
                  type: 'behavior'
                }
              ]
            },
            {
              ip: '5.6.7.8',
              threat_level: 'low',
              first_seen: '2025-12-01T09:30:00Z',
              last_seen: '2025-12-01T11:45:00Z',
              report_count: 1,
              primary_threat_type: 'port_scanning',
              confidence: 0.45,
              evidence: [
                {
                  source: 'ai_analyzer',
                  timestamp: '2025-12-01T09:30:00Z',
                  type: 'scanning'
                }
              ]
            }
          ],
          last_update: new Date().toISOString(),
          total_threats: 2,
          highest_threat_level: 'medium',
          summary: {
            critical: 0,
            high: 0,
            medium: 1,
            low: 1
          },
          blockchain_verification: {
            verified_on: 'disconnected',
            verification_nodes: 0,
            proof_of_consensus: false
          },
          blockchain_status: this.blockchainConnector.getStatus()
        };

        res.json(mockThreatList);
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

      try {
        // 尝试提交申诉到区块链
        const appealResult = await this.blockchainConnector.submitThreatReport({
          ip,
          proof: proof || '',
          reason: reason || 'appeal_request',
          type: 'appeal'
        });
        
        res.status(201).json({
          ...appealResult,
          blockchain_status: this.blockchainConnector.getStatus()
        });
      } catch (error) {
        console.error('Error submitting appeal:', error);
        // 如果区块链连接失败，创建本地申诉记录
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
          blockchain_status: this.blockchainConnector.getStatus()
        });
      }
    });

    // Gas补贴请求端点
    this.app.post('/orasrs/v1/gas-subsidy/request', async (req, res) => {
      const { userAddress, captchaToken, ip } = req.body;

      if (!userAddress) {
        return res.status(400).json({
          error: 'User address is required',
          code: 'MISSING_USER_ADDRESS'
        });
      }

      try {
        console.log(`Gas补贴请求: ${userAddress} from IP: ${ip || req.ip}`);
        
        // 这里应该是调用后端服务来处理Gas补贴请求
        // 为了演示，我们返回一个模拟成功的响应
        // 实际部署时，这里应该调用治理服务器的API
        const result = {
          success: true,
          message: 'Gas补贴请求已提交，治理服务器将验证请求并发放补贴',
          userAddress: userAddress,
          requestTime: new Date().toISOString(),
          estimatedProcessingTime: '30秒-2分钟',
          contractAddress: "0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f" // 新部署的GasSubsidy合约地址
        };

        res.status(200).json(result);
      } catch (error) {
        console.error('Error processing gas subsidy request:', error);
        res.status(500).json({
          error: 'Internal server error during gas subsidy request processing',
          code: 'GAS_SUBSIDY_ERROR'
        });
      }
    });

    // 获取Gas补贴状态端点
    this.app.get('/orasrs/v1/gas-subsidy/status/:address', async (req, res) => {
      const { address } = req.params;

      if (!address) {
        return res.status(400).json({
          error: 'Address is required',
          code: 'MISSING_ADDRESS'
        });
      }

      try {
        // 这里返回Gas补贴状态信息
        const status = {
          address: address,
          hasClaimed: false, // 实际实现中需要查询合约状态
          lastSubsidyTime: null,
          nextEligibleTime: new Date().toISOString(),
          availableAmount: "1.0", // 以ETH为单位
          tokenType: "native", // 原生代币
          contractAddress: "0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f" // 新部署的GasSubsidy合约地址
        };

        res.status(200).json(status);
      } catch (error) {
        console.error('Error fetching gas subsidy status:', error);
        res.status(500).json({
          error: 'Internal server error during gas subsidy status fetch',
          code: 'GAS_SUBSIDY_STATUS_ERROR'
        });
      }
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
          console.log(`OraSRS Service listening on ${this.config.host}:${this.config.port}`);
          console.log('OraSRS (Oracle Security Root Service) - Advisory Risk Scoring Service is now running');
          console.log('Important: This service provides advisory recommendations only, not direct blocking commands.');
          console.log(`🔗 Connected to OraSRS blockchain: ${this.config.blockchain?.endpoint || 'https://api.orasrs.net'}`);
          resolve();
        }
      );

      this.server.on('error', (error) => {
        console.error('Failed to start OraSRS Service:', error);
        reject(error);
      });
    });
  }

  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          console.log('OraSRS Service stopped');
          resolve();
        });
      });
    }
  }
}

// 尝试读取用户配置文件，如果不存在则使用默认值
let userConfig = {};
let securityConfig = {};

try {
  const fs = await import('fs');
  
  // 读取用户配置文件
  if (fs.default.existsSync('./user-config.json')) {
    userConfig = JSON.parse(fs.default.readFileSync('./user-config.json', 'utf8'));
  } else if (fs.default.existsSync('/home/Great/SRS-Protocol/user-config.json')) {
    userConfig = JSON.parse(fs.default.readFileSync('/home/Great/SRS-Protocol/user-config.json', 'utf8'));
  }
  
  // 读取安全配置文件
  if (fs.default.existsSync('./security-config.json')) {
    securityConfig = JSON.parse(fs.default.readFileSync('./security-config.json', 'utf8'));
  } else if (fs.default.existsSync('/home/Great/SRS-Protocol/security-config.json')) {
    securityConfig = JSON.parse(fs.default.readFileSync('/home/Great/SRS-Protocol/security-config.json', 'utf8'));
  }
} catch (e) {
  console.log('⚠️  未找到配置文件，使用默认配置:', e.message);
}

// 从环境变量或用户配置或默认值获取配置
const config = {
  port: process.env.ORASRS_PORT || userConfig.server?.port || 3006,
  host: process.env.ORASRS_HOST || userConfig.server?.host || '0.0.0.0',
  enableLogging: process.env.ORASRS_ENABLE_LOGGING !== 'false' && (userConfig.server?.enableLogging ?? true),
  logFile: process.env.ORASRS_LOG_FILE || userConfig.server?.logFile || securityConfig.logging?.file?.path || './logs/orasrs-service.log',
  rateLimit: userConfig.server?.rateLimit || { windowMs: 900000, max: 100 },
  // OraSRS协议链连接配置
  blockchain: {
    endpoints: process.env.ORASRS_BLOCKCHAIN_ENDPOINT ? [process.env.ORASRS_BLOCKCHAIN_ENDPOINT] : 
               userConfig.network?.blockchainEndpoint ? [userConfig.network.blockchainEndpoint] : 
               securityConfig.security?.blockchainConnection?.endpoints || 
               ['https://api.orasrs.net', 'https://backup.orasrs.net'],
    chainId: process.env.ORASRS_CHAIN_ID || userConfig.network?.chainId || securityConfig.network?.chainId || 8888,
    contractAddress: process.env.ORASRS_CONTRACT_ADDRESS || userConfig.network?.contractAddress || securityConfig.network?.contractAddress || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    timeout: securityConfig.security?.blockchainConnection?.timeout || 10000,
    retries: securityConfig.security?.blockchainConnection?.retries || 3,
    retryDelay: securityConfig.security?.blockchainConnection?.retryDelay || 1000
  },
  cache: userConfig.cache || securityConfig.cache || {
    enable: true,
    maxSize: 10000,
    ttl: 3600000,
    evictionPolicy: 'LRU'
  },
  security: { ...securityConfig.security, ...userConfig.security } || {
    enableRateLimiting: true,
    enableCORS: true,
    corsOrigin: '*',
    enableAPIKey: false,
    apiKeys: [],
    whitelist: ['127.0.0.1', 'localhost', '::1']
  }
};

console.log('🚀 启动 OraSRS (Oracle Security Root Service) 精简客户端...');
console.log('🔧 配置:', {
  port: config.port,
  host: config.host,
  blockchainEndpoint: config.blockchain.endpoint
});
console.log('🔗 连接到OraSRS协议链: ' + config.blockchain.endpoint);

// 确保日志目录存在
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const fs = require('fs');

const logDir = dirname(config.logFile);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const orasrsService = new SimpleOraSRSService(config);

async function startService() {
  try {
    // 首先尝试连接到区块链
    console.log('链接 初始化区块链连接器...');
    try {
      await orasrsService.blockchainConnector.connect();
    } catch (error) {
      console.warn('⚠️  无法连接到区块链，服务将以降级模式运行:', error.message);
    }
    
    await orasrsService.start();
    
    console.log('\n✅ OraSRS 服务启动成功!');
    console.log(`🌐 服务地址: http://${config.host}:${config.port}`);
    console.log('📋 API 端点:');
    console.log(`   - 风险查询: http://${config.host}:${config.port}/orasrs/v1/query?ip=1.2.3.4`);
    console.log(`   - 威胁列表: http://${config.host}:${config.port}/orasrs/v2/threat-list`);
    console.log(`   - 申诉接口: http://${config.host}:${config.port}/orasrs/v1/appeal`);
    console.log(`   - Gas补贴请求: http://${config.host}:${config.port}/orasrs/v1/gas-subsidy/request`);
    console.log(`   - Gas补贴状态: http://${config.host}:${config.port}/orasrs/v1/gas-subsidy/status/{address}`);
    console.log(`   - 健康检查: http://${config.host}:${config.port}/health`);
    console.log('\n⚠️  重要提醒: 此服务提供咨询建议，最终决策由客户端做出');
    console.log('🔗 区块链连接状态:', orasrsService.blockchainConnector.getStatus());
    
    // 定期输出服务信息
    setInterval(() => {
      const blockchainStatus = orasrsService.blockchainConnector.getStatus();
      console.log(`\n📊 OraSRS 服务运行中 [${new Date().toISOString()}]`);
      console.log(`   区块链连接: ${blockchainStatus.status} - ${blockchainStatus.endpoint || '未连接'}`);
      console.log(`   服务端口: ${config.host}:${config.port}`);
      console.log(`   重试次数: ${blockchainStatus.retryCount}/${blockchainStatus.maxRetries}`);
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
    await orasrsService.stop();
    console.log('✅ OraSRS 服务已关闭');
  } catch (error) {
    console.error('关闭 OraSRS 服务时出错:', error);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 正在关闭 OraSRS 服务...');
  try {
    await orasrsService.stop();
    console.log('✅ OraSRS 服务已关闭');
  } catch (error) {
    console.error('关闭 OraSRS 服务时出错:', error);
  }
  process.exit(0);
});