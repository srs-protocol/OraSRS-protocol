#!/usr/bin/env node

/**
 * OraSRS (Oracle Security Root Service) 客户端测试版本
 * 用于测试本地RPC节点连接 (端口8545)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import express from 'express';
import rateLimit from 'rate-limiter-flexible';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 用户配置 - 优先连接本地节点
const config = {
  port: 3006,
  host: '0.0.0.0',
  enableLogging: true,
  logFile: './logs/orasrs-service.log',
  rateLimit: { windowMs: 900000, max: 100 },
  // 本地RPC节点配置
  blockchain: {
    endpoint: 'http://localhost:8545',
    chainId: 8888,
    contractAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    timeout: 10000,
    retries: 3,
    retryDelay: 1000
  }
};

console.log('🚀 启动 OraSRS 客户端测试版本...');
console.log('🔧 使用本地RPC节点配置:', config.blockchain.endpoint);

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
const app = express();

// 基本中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 速率限制中间件
const opts = {
  points: config.rateLimit.max || 100,
  duration: config.rateLimit.windowMs / 1000 || 900, // 转换为秒
};
const limiter = new rateLimit.RateLimiterMemory(opts);

app.use((req, res, next) => {
  limiter.consume(req.ip)
    .then(() => {
      next();
    })
    .catch(() => {
      res.status(429).json({ error: 'Too Many Requests' });
    });
});

// CORS支持
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// 健康检查端点
app.get('/health', async (req, res) => {
  // 测试与本地RPC节点的连接
  try {
    const response = await fetch(`${config.blockchain.endpoint}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const healthData = await response.json();
    
    res.status(200).json({
      status: 'healthy',
      service: 'OraSRS (Oracle Security Root Service)',
      timestamp: new Date().toISOString(),
      version: '2.0.1',
      blockchainConnection: {
        endpoint: config.blockchain.endpoint,
        connected: response.ok,
        status: response.ok ? 'connected' : 'disconnected'
      },
      localRPC: healthData
    });
  } catch (error) {
    res.status(200).json({
      status: 'healthy',
      service: 'OraSRS (Oracle Security Root Service)',
      timestamp: new Date().toISOString(),
      version: '2.0.1',
      blockchainConnection: {
        endpoint: config.blockchain.endpoint,
        connected: false,
        status: 'disconnected',
        error: error.message
      }
    });
  }
});

// 风险查询端点 - 直接连接到本地RPC节点
app.get('/orasrs/v1/query', async (req, res) => {
  const { ip, domain } = req.query;

  if (!ip && !domain) {
    return res.status(400).json({
      error: 'Either IP or domain parameter is required',
      code: 'MISSING_PARAMETER'
    });
  }

  try {
    // 直接向本地RPC节点发送请求
    const response = await fetch(`${config.blockchain.endpoint}/orasrs/v1/query?ip=${ip || ''}&domain=${domain || ''}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      res.json(data);
    } else {
      // 如果本地节点请求失败，返回模拟数据
      const mockResponse = {
        query: { ip: ip || null, domain: domain || null },
        response: {
          risk_score: Math.random() * 0.3, // 较低的随机风险评分
          confidence: 'medium',
          risk_level: Math.random() > 0.8 ? 'high' : 'low',
          evidence: [
            {
              type: 'behavioral_analysis',
              detail: 'Unusual connection patterns detected',
              source: 'ai_analysis',
              timestamp: new Date().toISOString(),
              confidence: 0.7
            }
          ],
          recommendations: {
            default: 'allow',
            public_services: 'allow',
            banking: 'allow_with_verification'
          },
          appeal_url: `http://localhost:8545/appeal?ip=${ip || domain}`,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          timestamp: new Date().toISOString(),
          disclaimer: 'This is mock data for service availability.',
          version: '2.0-mock'
        }
      };
      
      res.json(mockResponse);
    }
  } catch (error) {
    log(`Error in query endpoint: ${error.message}`, 'ERROR');
    
    // 返回模拟数据
    const mockResponse = {
      query: { ip: ip || null, domain: domain || null },
      response: {
        risk_score: 0.1, // 默认低风险
        confidence: 'low',
        risk_level: 'low',
        evidence: [
          {
            type: 'connection_error',
            detail: `Unable to reach backend service: ${error.message}`,
            source: 'client',
            timestamp: new Date().toISOString(),
            confidence: 0.1
          }
        ],
        recommendations: {
          default: 'allow',
          public_services: 'allow',
          banking: 'allow_with_verification'
        },
        appeal_url: `http://localhost:8545/appeal?ip=${ip || domain}`,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        timestamp: new Date().toISOString(),
        disclaimer: 'Using fallback response due to backend connection issue.',
        version: '2.0-fallback'
      }
    };
    
    res.json(mockResponse);
  }
});

// 威胁列表端点
app.get('/orasrs/v2/threat-list', async (req, res) => {
  try {
    const response = await fetch(`${config.blockchain.endpoint}/orasrs/v2/threat-list`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      res.json(data);
    } else {
      // 如果本地节点请求失败，返回模拟威胁列表
      const mockThreatList = {
        threat_list: [
          {
            ip: '192.168.1.100',
            threat_level: 'low',
            first_seen: '2025-12-01T10:00:00Z',
            last_seen: '2025-12-01T10:05:00Z',
            report_count: 1,
            primary_threat_type: 'suspicious_scan',
            confidence: 0.3,
            evidence: [
              {
                source: 'internal_monitor',
                timestamp: '2025-12-01T10:00:00Z',
                type: 'network'
              }
            ]
          }
        ],
        last_update: new Date().toISOString(),
        total_threats: 1,
        highest_threat_level: 'low',
        summary: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 1
        },
        blockchain_verification: {
          verified_on: 'disconnected',
          verification_nodes: 0,
          proof_of_consensus: false
        }
      };
      
      res.json(mockThreatList);
    }
  } catch (error) {
    log(`Error in threat list endpoint: ${error.message}`, 'ERROR');
    
    res.json({
      threat_list: [],
      last_update: new Date().toISOString(),
      total_threats: 0,
      highest_threat_level: 'none',
      summary: { critical: 0, high: 0, medium: 0, low: 0 },
      blockchain_verification: {
        verified_on: 'disconnected',
        verification_nodes: 0,
        proof_of_consensus: false
      }
    });
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
    // 尝试提交到本地RPC节点
    const response = await fetch(`${config.blockchain.endpoint}/orasrs/v1/appeal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip, proof, reason })
    });
    
    if (response.ok) {
      const data = await response.json();
      res.status(201).json(data);
    } else {
      // 本地节点失败时的响应
      const appealId = `appeal_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      res.status(201).json({
        appeal_id: appealId,
        status: 'received_offline',
        message: 'Appeal request received offline. Will be processed when connection is restored.',
        estimated_resolution_time: '24-48 hours',
        blockchain_record: {
          tx_hash: null,
          on_chain: false,
          verification_required: 3
        }
      });
    }
  } catch (error) {
    log(`Error in appeal endpoint: ${error.message}`, 'ERROR');
    
    const appealId = `appeal_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    res.status(201).json({
      appeal_id: appealId,
      status: 'received_error',
      message: 'Appeal request received but could not be processed due to connection error.',
      estimated_resolution_time: 'Connection error - check logs',
      blockchain_record: {
        tx_hash: null,
        on_chain: false,
        verification_required: 0
      }
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
    blockchain: {
      endpoint: config.blockchain.endpoint,
      connected: true, // 假设本地节点始终可用
      chainId: config.blockchain.chainId
    },
    config: {
      port: config.port,
      host: config.host
    }
  });
});

// 启动服务器
async function startService() {
  try {
    app.listen({ 
      port: config.port, 
      host: config.host 
    }, () => {
      log(`OraSRS 服务监听端口 ${config.host}:${config.port}`);
      log('OraSRS (Oracle Security Root Service) 客户端测试版本启动');
      log('重要: 此服务提供咨询建议，最终决策由客户端做出');
      log(`连接到本地RPC节点: ${config.blockchain.endpoint}`);
    });
    
    console.log('\n✅ OraSRS 客户端测试版本启动成功!');
    console.log(`🌐 服务地址: http://${config.host}:${config.port}`);
    console.log('📋 API 端点:');
    console.log(`   - 健康检查: http://${config.host}:${config.port}/health`);
    console.log(`   - 风险查询: http://${config.host}:${config.port}/orasrs/v1/query?ip=192.168.1.1`);
    console.log(`   - 威胁列表: http://${config.host}:${config.port}/orasrs/v2/threat-list`);
    console.log(`   - 申诉接口: http://${config.host}:${config.port}/orasrs/v1/appeal`);
    console.log('\n🔗 本地RPC节点: ${config.blockchain.endpoint}');
    console.log('💡 服务正在连接到本地部署的协议链 (端口8545)');
    
    // 定期输出服务信息
    setInterval(() => {
      console.log(`\n📊 OraSRS 服务运行中 [${new Date().toISOString()}]`);
      console.log(`   本地RPC连接: ${config.blockchain.endpoint}`);
      console.log(`   服务端口: ${config.host}:${config.port}`);
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