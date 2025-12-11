#!/usr/bin/env node

/**
 * OraSRS 本地测试服务器
 * 模拟API端点以供客户端测试
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 8545;

// 中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'OraSRS Local Test Server',
    timestamp: new Date().toISOString(),
    version: '2.0.1',
    blockchainConnection: {
      endpoint: 'http://localhost:8545',
      connected: true
    }
  });
});

// 风险查询端点
app.get('/orasrs/v1/query', (req, res) => {
  const { ip, domain } = req.query;

  if (!ip && !domain) {
    return res.status(400).json({
      error: 'Either IP or domain parameter is required',
      code: 'MISSING_PARAMETER'
    });
  }

  // 模拟风险评估
  const mockResponse = {
    query: { ip: ip || null, domain: domain || null },
    response: {
      risk_score: Math.random() * 0.5, // 随机0-0.5之间的风险评分
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
      disclaimer: 'This is advisory only. Final decision rests with the client.',
      version: '2.0'
    }
  };

  res.json(mockResponse);
});

// 威胁列表端点
app.get('/orasrs/v2/threat-list', (req, res) => {
  const mockThreatList = {
    threat_list: [
      {
        id: 1,
        ip: '1.2.3.4',
        threat_level: 'critical',
        first_seen: '2025-12-01T10:00:00Z',
        last_seen: '2025-12-01T12:00:00Z',
        report_count: 15,
        primary_threat_type: 'ddos_attack',
        confidence: 0.92,
        evidence: [
          {
            source: 'node-abc123',
            timestamp: '2025-12-01T10:00:00Z',
            type: 'behavior'
          }
        ]
      },
      {
        id: 2,
        ip: '5.6.7.8',
        threat_level: 'high',
        first_seen: '2025-12-01T09:30:00Z',
        last_seen: '2025-12-01T11:45:00Z',
        report_count: 8,
        primary_threat_type: 'malware_distribution',
        confidence: 0.85,
        evidence: [
          {
            source: 'node-def456',
            timestamp: '2025-12-01T09:30:00Z',
            type: 'malware'
          }
        ]
      }
    ],
    last_update: new Date().toISOString(),
    total_threats: 2,
    highest_threat_level: 'critical',
    summary: {
      critical: 1,
      high: 1,
      medium: 0,
      low: 0
    },
    blockchain_verification: {
      verified_on: 'http://localhost:8545',
      verification_nodes: 3,
      proof_of_consensus: true
    }
  };

  res.json(mockThreatList);
});

// 申诉端点
app.post('/orasrs/v1/appeal', (req, res) => {
  const { ip, proof, reason } = req.body;

  if (!ip) {
    return res.status(400).json({
      error: 'IP is required',
      code: 'MISSING_REQUIRED_FIELDS'
    });
  }

  const appealId = `appeal_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  
  res.status(201).json({
    appeal_id: appealId,
    status: 'received',
    message: 'Appeal request received. Risk score temporarily reduced during review.',
    estimated_resolution_time: '24-48 hours',
    blockchain_record: {
      tx_hash: `0x${Math.random().toString(16).substring(2, 10)}...`,
      on_chain: true,
      verification_required: 3
    }
  });
});

// 模拟区块链RPC端点
app.post('/', (req, res) => {
  const { method } = req.body;
  
  if (method === 'eth_blockNumber') {
    // 返回模拟的区块高度
    res.json({
      jsonrpc: "2.0",
      id: req.body.id,
      result: "0x123456" // 模拟区块高度
    });
  } else if (method === 'eth_getBalance') {
    // 返回模拟余额
    res.json({
      jsonrpc: "2.0",
      id: req.body.id,
      result: "0x123456789ABCDEF000" // 模拟余额
    });
  } else {
    // 对于其他RPC方法，返回通用响应
    res.json({
      jsonrpc: "2.0",
      id: req.body.id,
      result: "0x1"
    });
  }
});

// 启动服务器
app.listen(PORT, 'localhost', () => {
  console.log(`🚀 OraSRS 本地测试服务器启动在 http://localhost:${PORT}`);
  console.log('🔧 模拟 OraSRS 协议链端点');
  console.log('📋 可用端点:');
  console.log('   - GET /health');
  console.log('   - GET /orasrs/v1/query?ip=1.2.3.4');
  console.log('   - GET /orasrs/v2/threat-list');
  console.log('   - POST /orasrs/v1/appeal');
  console.log('   - POST / (区块链RPC)');
  console.log('\n💡 使用 Ctrl+C 停止服务器');
});