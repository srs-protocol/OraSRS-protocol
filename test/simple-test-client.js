#!/usr/bin/env node

/**
 * 简单的OraSRS客户端测试
 */

import express from 'express';

const app = express();
const port = 3006;

app.use(express.json());

// 风险评估查询
app.get('/orasrs/v1/query', (req, res) => {
  const ip = req.query.ip || req.query.address;
  const domain = req.query.domain;
  
  if (!ip && !domain) {
    return res.status(400).json({
      error: 'IP或域名参数缺失',
      message: '请提供IP地址或域名参数'
    });
  }

  const result = {
    service: 'OraSRS (Oracle Security Root Service)',
    indicator: ip || domain,
    type: ip ? 'ip' : 'domain',
    risk_score: Math.random() * 0.5, // 随机低风险分数
    risk_level: 'low',
    confidence: 0.7,
    last_updated: new Date().toISOString(),
    sources: ['local_analysis'],
    details: {
      threat_types: [],
      severity: 'info',
      evidence: [],
      behavior_patterns: []
    },
    explanation: 'This is a risk assessment from OraSRS (Oracle Security Root Service).',
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
});

// 威胁列表查询
app.get('/orasrs/v2/threat-list', (req, res) => {
  const threatList = {
    service: 'OraSRS (Oracle Security Root Service)',
    version: 'v2.0',
    total_threats: 0,
    threats: [],
    last_updated: new Date().toISOString()
  };

  res.json(threatList);
});

// 申诉接口
app.post('/orasrs/v1/appeal', (req, res) => {
  const { ip, domain, reason } = req.body;
  
  if (!ip && !domain) {
    return res.status(400).json({
      error: 'IP或域名参数缺失',
      message: '请提供IP地址或域名参数'
    });
  }

  const appealResult = {
    success: true,
    appeal_id: `appeal_${Date.now()}`,
    status: 'received',
    estimated_resolution_time: '24-48 hours',
    message: 'Appeal request received. Risk score temporarily reduced during review.',
    details: {
      original_ip: ip || domain,
      submitted_at: new Date().toISOString(),
      reason: reason || 'not_specified'
    }
  };

  res.json(appealResult);
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'OraSRS Simple Client',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// 根路径
app.get('/', (req, res) => {
  res.json({
    service: 'OraSRS (Oracle Security Root Service)',
    version: '2.0.0',
    description: 'Advisory Risk Scoring Service',
    endpoints: {
      query: '/orasrs/v1/query?ip={ip}&domain={domain}',
      threatList: '/orasrs/v2/threat-list',
      appeal: '/orasrs/v1/appeal',
    },
    documentation: 'https://api.orasrs.net/docs',
    timestamp: new Date().toISOString()
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 OraSRS 简单测试客户端运行在 http://0.0.0.0:${port}`);
  console.log(`   - 风险查询: http://0.0.0.0:${port}/orasrs/v1/query?ip=1.2.3.4`);
  console.log(`   - 威胁列表: http://0.0.0.0:${port}/orasrs/v2/threat-list`);
  console.log(`   - 申诉接口: http://0.0.0.0:${port}/orasrs/v1/appeal`);
  console.log(`   - 健康检查: http://0.0.0.0:${port}/health`);
});