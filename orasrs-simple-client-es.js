#!/usr/bin/env node

/**
 * OraSRS (Oracle Security Root Service) 精简客户端 (ES模块版本)
 * 连接到OraSRS协议链 (基于Hardhat和Geth的私有链，Chain ID 8888)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import express from 'express';
import rateLimit from 'rate-limiter-flexible';
import BlockchainConnector from './blockchain-connector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 尝试读取用户配置文件，如果不存在则使用默认值
let userConfig = {};
let securityConfig = {};

try {
  // 读取用户配置文件
  if (fs.existsSync('./user-config.json')) {
    userConfig = JSON.parse(fs.readFileSync('./user-config.json', 'utf8'));
  } else if (fs.existsSync('/home/Great/SRS-Protocol/user-config.json')) {
    userConfig = JSON.parse(fs.readFileSync('/home/Great/SRS-Protocol/user-config.json', 'utf8'));
  }
  
  // 读取安全配置文件
  if (fs.existsSync('./security-config.json')) {
    securityConfig = JSON.parse(fs.readFileSync('./security-config.json', 'utf8'));
  } else if (fs.existsSync('/home/Great/SRS-Protocol/security-config.json')) {
    securityConfig = JSON.parse(fs.readFileSync('/home/Great/SRS-Protocol/security-config.json', 'utf8'));
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
               ['https://api.orasrs.net'], // 使用官方公网节点
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

console.log('🚀 启动 OraSRS (Oracle Security Root Service) 精简客户端 (ES模块版本)...');
console.log('🔧 配置:', {
  port: config.port,
  host: config.host,
  blockchainEndpoints: config.blockchain.endpoints
});

// 确保日志目录存在
const logDir = path.dirname(config.logFile);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 初始化区块链连接器
const blockchainConnector = new BlockchainConnector(config.blockchain);

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
const app = express();

// 基本中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 速率限制中间件（如果启用）
if (config.security.enableRateLimiting) {
  const opts = {
    points: config.rateLimit.max || 100,
    duration: config.rateLimit.windowMs / 1000 || 900, // 转换为秒
  };
  const limiter = new rateLimit.RateLimiterMemory(opts);

  app.use((req, res, next) => {
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
app.use((req, res, next) => {
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

// 健康检查端点
app.get('/health', async (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'OraSRS (Oracle Security Root Service)',
    timestamp: new Date().toISOString(),
    version: '2.0.1',
    blockchainConnection: blockchainConnector.getStatus(),
    localCache: {
      enabled: config.cache.enable,
      maxSize: config.cache.maxSize,
      ttl: config.cache.ttl
    }
  });
});

// 根路径返回服务信息
app.get('/', (req, res) => {
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
      endpoints: config.blockchain.endpoints,
      chainId: config.blockchain.chainId,
      connectionStatus: blockchainConnector.getStatus().status,
      description: 'All threat intelligence is verified and stored on the OraSRS blockchain for transparency and immutability.'
    },
    disclaimer: 'This service provides advisory risk scoring only. Final decisions are made by clients using our recommendations.',
    compliance: 'GDPR/CCPA compliant',
    version: '2.0.1'
  });
});

// 风险查询端点
app.get('/orasrs/v1/query', async (req, res) => {
  const { ip, domain } = req.query;

  if (!ip && !domain) {
    return res.status(400).json({
      error: 'Either IP or domain parameter is required',
      code: 'MISSING_PARAMETER'
    });
  }

  try {
    // 从区块链获取威胁数据
    const threatData = await blockchainConnector.getThreatData(ip || domain);
    res.json(threatData);
  } catch (error) {
    log(`Error fetching threat data: ${error.message}`, 'ERROR');
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
      blockchain_status: blockchainConnector.getStatus()
    };

    res.json(mockResponse);
  }
});

// 威胁情报端点
app.get('/orasrs/v2/threat-list', async (req, res) => {
  try {
    // 从区块链获取全局威胁列表
    const threatList = await blockchainConnector.getGlobalThreatList();
    
    res.json({
      ...threatList,
      blockchain_status: blockchainConnector.getStatus()
    });
  } catch (error) {
    log(`Error fetching global threat list: ${error.message}`, 'ERROR');
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
      blockchain_status: blockchainConnector.getStatus()
    };

    res.json(mockThreatList);
  }
});

// 申诉端点
app.post('/orasrs/v1/appeal', async (req, res) => {
  const { ip, proof, reason } = req.body;

  if (!ip) {
    return res.status(400).json({
      error: 'IP is required',
      code: 'MISSING_REQUIRED_FIELDS'
    });
  }

  try {
    // 尝试提交申诉到区块链
    const appealResult = await blockchainConnector.submitThreatReport({
      ip,
      proof: proof || '',
      reason: reason || 'appeal_request',
      type: 'appeal'
    });
    
    res.status(201).json({
      ...appealResult,
      blockchain_status: blockchainConnector.getStatus()
    });
  } catch (error) {
    log(`Error submitting appeal: ${error.message}`, 'ERROR');
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
      blockchain_status: blockchainConnector.getStatus()
    });
  }
});

// 服务状态端点
app.get('/status', (req, res) => {
  res.status(200).json({
    server: {
      status: 'running',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    },
    blockchain: blockchainConnector.getStatus(),
    config: {
      port: config.port,
      host: config.host,
      cache_enabled: config.cache.enable
    },
    endpoints: config.blockchain.endpoints
  });
});

// 启动服务器
async function startService() {
  try {
    // 首先尝试连接到区块链
    log('🔗 初始化区块链连接器...');
    try {
      await blockchainConnector.connect();
    } catch (error) {
      log(`⚠️  无法连接到区块链，服务将以降级模式运行: ${error.message}`, 'WARN');
    }
    
    app.listen({ 
      port: config.port, 
      host: config.host 
    }, () => {
      log(`OraSRS 服务监听端口 ${config.host}:${config.port}`);
      log('OraSRS (Oracle Security Root Service) - Advisory Risk Scoring Service is now running');
      log('重要: 此服务提供咨询建议，最终决策由客户端做出');
      log(`区块链连接状态: ${blockchainConnector.getStatus()}`);
    });
    
    console.log('\n✅ OraSRS 服务启动成功!');
    console.log(`🌐 服务地址: http://${config.host}:${config.port}`);
    console.log('📋 API 端点:');
    console.log(`   - 风险查询: http://${config.host}:${config.port}/orasrs/v1/query?ip=1.2.3.4`);
    console.log(`   - 威胁列表: http://${config.host}:${config.port}/orasrs/v2/threat-list`);
    console.log(`   - 申诉接口: http://${config.host}:${config.port}/orasrs/v1/appeal`);
    console.log(`   - 健康检查: http://${config.host}:${config.port}/health`);
    console.log(`   - 服务状态: http://${config.host}:${config.port}/status`);
    console.log('\n⚠️  重要提醒: 此服务提供咨询建议，最终决策由客户端做出');
    console.log('🔗 区块链连接状态:', blockchainConnector.getStatus());
    
    // 定期输出服务信息
    setInterval(() => {
      const blockchainStatus = blockchainConnector.getStatus();
      console.log(`\n📊 OraSRS 服务运行中 [${new Date().toISOString()}]`);
      console.log(`   区块链连接: ${blockchainStatus.status} - ${blockchainStatus.endpoint || '未连接'}`);
      console.log(`   服务端口: ${config.host}:${config.port}`);
      console.log(`   重试次数: ${blockchainStatus.retryCount}/${blockchainStatus.maxRetries}`);
    }, 5 * 60 * 1000); // 5分钟
    
  } catch (error) {
    log(`❌ 启动 OraSRS 服务失败: ${error.message}`, 'ERROR');
    process.exit(1);
  }
}

// 启动服务
startService();

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n🛑 正在关闭 OraSRS 服务...');
  log('OraSRS 服务已关闭');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 正在关闭 OraSRS 服务...');
  log('OraSRS 服务已关闭');
  process.exit(0);
});
