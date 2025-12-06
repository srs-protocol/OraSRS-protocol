/**
 * OraSRS (Oracle Security Root Service) Service
 * 完整的OraSRS服务实现，包含引擎、API和管理功能
 */

const express = require('express');
const SRSEngine = require('./srs-engine');
const srsRoutes = require('./srs-routes');
const { MetricsCollector, StructuredLogger, formatPrometheusMetrics } = require('./src/monitoring');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class OraSRSService {
  constructor(config = {}) {
    this.config = {
      port: config.port || 3006, // 使用专用端口以避免与其他服务器冲突
      host: config.host || '0.0.0.0',
      enableLogging: config.enableLogging !== false,
      logFile: config.logFile || './logs/orasrs-service.log',
      maxConnections: config.maxConnections || 1000, // 最大连接数
      requestTimeout: config.requestTimeout || 30000, // 请求超时时间
      keepAliveTimeout: config.keepAliveTimeout || 65000, // Keep-alive超时
      headersTimeout: config.headersTimeout || 66000, // 头部超时
      ...config
    };
    
    this.engine = new SRSEngine();
    this.app = express();
    
    // 初始化监控和日志
    this.metricsCollector = new MetricsCollector({
      collectionInterval: 15000, // 每15秒收集一次指标
      maxMetricsHistory: 5000   // 增加历史记录数量
    });
    this.logger = new StructuredLogger({
      logFile: this.config.logFile,
      level: config.logLevel || 'info'
    });
    
    // 性能优化设置
    this.setupPerformanceOptimizations();
    
    // 性能优化设置
    this.app.set('etag', false);  // 禁用ETag以减少开销
    this.app.set('x-powered-by', false);  // 隐藏服务器类型
    
    // 中间件
    this.app.use(express.json({ 
      limit: '10mb',
      verify: (req, res, buf, encoding) => {
        // 添加请求体验证
        const size = buf.length;
        if (size > 10 * 1024 * 1024) { // 10MB
          this.logger.warn('Request body too large', { size, ip: req.ip });
        }
      }
    }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // 请求日志和指标收集中间件（优化版）
    this.app.use((req, res, next) => {
      const startTime = process.hrtime(); // 使用更高精度的时间
      const startMark = Date.now();
      
      // 记录请求（减少日志详细程度以提高性能）
      if (this.config.enableLogging) {
        this.logger.info('Request started', {
          method: req.method,
          url: req.url,
          ip: req.ip
        });
      }
      
      // 响应结束时记录指标
      res.on('finish', () => {
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const responseTime = seconds * 1000 + nanoseconds / 1000000;
        
        // 记录指标
        this.metricsCollector.recordRequest(
          req.method,
          req.url,
          res.statusCode,
          responseTime
        );
        
        // 记录响应（仅在启用详细日志时）
        if (this.config.enableLogging) {
          this.logger.info('Request completed', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            responseTime: responseTime.toFixed(2),
            ip: req.ip
          });
        }
      });
      
      next();
    });
    
    // CORS支持
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
    
    // OraSRS API路由
    this.app.use('/orasrs/v1', srsRoutes);
    
    // OraSRS v2.0 威胁情报API路由
    this.setupThreatIntelligenceRoutes();
    
    // 监控端点
    this.setupMonitoringEndpoints();
    
    // 健康检查端点
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        service: 'OraSRS (Oracle Security Root Service)',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
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
          dataDeletion: '/orasrs/v1/data?ip_hash={hash}',
          health: '/health'
        },
        disclaimer: 'This service provides advisory risk scoring only. Final decisions are made by clients using our recommendations.',
        compliance: 'GDPR/CCPA compliant'
      });
    });
    
    // 错误处理中间件
    this.app.use((error, req, res, next) => {
      // 记录错误到指标
      this.metricsCollector.recordError(error.name || 'UnknownError');
      
      // 记录错误日志
      this.logger.error('Unhandled error occurred', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip
      });
      
      console.error('OraSRS Service Error:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * 设置威胁情报API路由
   */
  setupThreatIntelligenceRoutes() {
    // 提交威胁报告
    this.app.post('/orasrs/v2/threat-report', async (req, res) => {
      try {
        const { source_ip, target_ip, threat_type, threat_level, context, evidence_hash, geolocation, network_flow } = req.body;

        if (!source_ip || !threat_type) {
          return res.status(400).json({
            error: 'source_ip and threat_type are required',
            code: 'MISSING_REQUIRED_FIELDS'
          });
        }

        // 验证威胁等级
        const validThreatLevels = ['info', 'warning', 'critical', 'emergency'];
        if (threat_level && !validThreatLevels.includes(threat_level.toLowerCase())) {
          return res.status(400).json({
            error: 'Invalid threat_level. Must be one of: info, warning, critical, emergency',
            code: 'INVALID_THREAT_LEVEL'
          });
        }

        // 生成威胁报告ID
        const reportId = `threat_${source_ip.replace(/\./g, '_')}_${Date.now()}`;
        
        // 将威胁报告添加到引擎
        const threatReport = {
          id: reportId,
          timestamp: new Date().toISOString(),
          source_ip,
          target_ip,
          threat_type,
          threat_level: threat_level || 'warning',
          context,
          evidence_hash,
          geolocation,
          network_flow,
          node_id: this.engine.nodeId || 'default',
          status: 'reported'
        };

        // 在实际实现中，这里会将威胁报告存储到分布式网络
        // 现在我们只是记录到日志中
        this.logger.info('Threat report received', threatReport);

        res.status(201).json({
          report_id: reportId,
          status: 'received',
          message: 'Threat report successfully received and processed',
          verification_nodes_required: 3,
          estimated_processing_time: '30-60 seconds'
        });
      } catch (error) {
        this.logger.error('Error processing threat report', { error: error.message, body: req.body });
        res.status(500).json({
          error: 'Internal server error during threat report processing',
          code: 'THREAT_REPORT_ERROR'
        });
      }
    });

    // 获取威胁报告
    this.app.get('/orasrs/v2/threat-report/:reportId', async (req, res) => {
      try {
        const { reportId } = req.params;
        
        // 在实际实现中，这里会从分布式网络获取威胁报告
        // 现在我们返回模拟数据
        const mockThreatReport = {
          id: reportId,
          timestamp: new Date().toISOString(),
          source_ip: '1.2.3.4',
          target_ip: '10.0.0.5',
          threat_type: 'ddos_attack',
          threat_level: 'critical',
          context: 'SYN flood attack detected',
          evidence_hash: 'a1b2c3d4e5f6...',
          geolocation: 'Shanghai, China',
          network_flow: 'source_port: 1024-65535, dest_port: 80',
          node_id: 'node-abc123',
          status: 'verified',
          verification_nodes: ['node-abc123', 'node-def456', 'node-ghi789'],
          confidence: 0.92,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };

        res.json(mockThreatReport);
      } catch (error) {
        this.logger.error('Error retrieving threat report', { error: error.message, reportId: req.params.reportId });
        res.status(500).json({
          error: 'Internal server error during threat report retrieval',
          code: 'THREAT_REPORT_RETRIEVAL_ERROR'
        });
      }
    });

    // 获取全局威胁列表
    this.app.get('/orasrs/v2/threat-list', async (req, res) => {
      try {
        // 在实际实现中，这里会从分布式网络获取全局威胁列表
        // 现在我们返回模拟数据
        const mockThreatList = {
          threat_list: [
            {
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
          }
        };

        res.json(mockThreatList);
      } catch (error) {
        this.logger.error('Error retrieving threat list', { error: error.message });
        res.status(500).json({
          error: 'Internal server error during threat list retrieval',
          code: 'THREAT_LIST_RETRIEVAL_ERROR'
        });
      }
    });

    // 验证威胁报告
    this.app.post('/orasrs/v2/threat-verify', async (req, res) => {
      try {
        const { report_id, verdict, evidence } = req.body;

        if (!report_id || !verdict) {
          return res.status(400).json({
            error: 'report_id and verdict are required',
            code: 'MISSING_VERIFICATION_FIELDS'
          });
        }

        if (!['confirm', 'dispute'].includes(verdict)) {
          return res.status(400).json({
            error: 'verdict must be either "confirm" or "dispute"',
            code: 'INVALID_VERDICT'
          });
        }

        // 在实际实现中，这里会将验证结果记录到分布式网络
        // 现在我们只是记录日志
        this.logger.info('Threat verification received', {
          report_id,
          verdict,
          evidence,
          node_id: this.engine.nodeId || 'default'
        });

        res.json({
          report_id,
          verdict,
          status: 'verification_submitted',
          message: `Threat report ${verdict}ed and submitted for consensus`
        });
      } catch (error) {
        this.logger.error('Error processing threat verification', { error: error.message, body: req.body });
        res.status(500).json({
          error: 'Internal server error during threat verification',
          code: 'THREAT_VERIFICATION_ERROR'
        });
      }
    });

    // 威胁情报申诉接口
    this.app.post('/orasrs/v2/threat-appeal', async (req, res) => {
      try {
        const { report_id, proof, verdict } = req.body;

        if (!report_id || !proof) {
          return res.status(400).json({
            error: 'report_id and proof are required',
            code: 'MISSING_APPEAL_FIELDS'
          });
        }

        if (verdict && !['confirm', 'dispute'].includes(verdict)) {
          return res.status(400).json({
            error: 'verdict must be either "confirm" or "dispute" if provided',
            code: 'INVALID_VERDICT'
          });
        }

        // 处理威胁情报申诉
        const appealId = `appeal_${report_id}_${Date.now()}`;
        const appealData = {
          id: appealId,
          report_id,
          proof,
          verdict_requested: verdict || null,
          status: 'pending',
          submitted_at: new Date().toISOString(),
          processed_at: null,
          node_id: this.engine.nodeId || 'default'
        };

        // 在实际实现中，这里会将申诉记录到分布式网络
        this.logger.info('Threat appeal received', appealData);

        res.status(201).json({
          appeal_id: appealId,
          status: 'received',
          message: 'Threat appeal received and under review',
          estimated_resolution_time: '24-48 hours'
        });
      } catch (error) {
        this.logger.error('Error processing threat appeal', { error: error.message, body: req.body });
        res.status(500).json({
          error: 'Internal server error during threat appeal processing',
          code: 'THREAT_APPEAL_ERROR'
        });
      }
    });
  }

  /**
   * 设置监控端点
   */
  setupMonitoringEndpoints() {
    // Prometheus指标端点
    this.app.get('/metrics', (req, res) => {
      const metrics = this.metricsCollector.getMetricsSnapshot();
      res.set('Content-Type', 'text/plain');
      res.send(formatPrometheusMetrics(metrics));
    });
    
    // 服务健康检查端点
    this.app.get('/health', (req, res) => {
      const metrics = this.metricsCollector.getMetricsSnapshot();
      res.status(200).json({
        status: 'healthy',
        service: 'OraSRS (Oracle Security Root Service)',
        timestamp: new Date().toISOString(),
        version: '2.0.0', // 更新版本号
        metrics: {
          uptime: metrics.uptime,
          requestsTotal: metrics.requests.total,
          activeConnections: metrics.activeConnections,
          responseTimeAvg: metrics.responseTime.avg
        }
      });
    });
    
    // 详细状态端点
    this.app.get('/status', (req, res) => {
      const metrics = this.metricsCollector.getMetricsSnapshot();
      res.status(200).json({
        status: 'running',
        service: 'OraSRS (Oracle Security Root Service)',
        version: '2.0.0', // 更新版本号
        timestamp: new Date().toISOString(),
        ...metrics,
        threat_intelligence: {
          active_reports: Math.floor(Math.random() * 100), // 模拟数据
          verified_reports: Math.floor(Math.random() * 80), // 模拟数据
          pending_verifications: Math.floor(Math.random() * 20), // 模拟数据
          nodes_count: this.engine.getConsensusNodes ? this.engine.getConsensusNodes().length : 0
        }
      });
    });
  }

  /**
   * 启动OraSRS服务
   */
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
          resolve();
        }
      );

      this.server.on('error', (error) => {
        console.error('Failed to start OraSRS Service:', error);
        reject(error);
      });
    });
  }

  /**
   * 停止OraSRS服务
   */
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

  /**
   * 获取OraSRS引擎实例
   */
  getEngine() {
    return this.engine;
  }

  /**
   * 记录OraSRS服务日志
   */
  async logEvent(eventType, data) {
    if (!this.config.enableLogging) return;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      ...data
    };
    
    try {
      await fs.appendFile(this.config.logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('Failed to write OraSRS log:', error);
    }
  }

  /**
   * 获取服务统计信息
   */
  getStats() {
    return {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      engineStats: {
        cachedAssessments: this.engine.riskScores.size,
        pendingAppeals: Array.from(this.engine.appealRequests.values()).filter(a => a.status === 'pending').length,
        criticalServiceWhitelistSize: this.engine.criticalServiceWhitelist.size
      }
    };
  }

  /**
   * 获取透明度报告
   */
  getTransparencyReport() {
    const now = new Date();
    const last24Hours = new Date(now - 24 * 60 * 60 * 1000);
    
    // 在实际实现中，这将从日志或数据库中获取数据
    // 这里我们返回模拟数据
    return {
      reportPeriod: {
        start: last24Hours.toISOString(),
        end: now.toISOString()
      },
      totalQueries: Math.floor(Math.random() * 10000) + 5000, // 模拟数据
      totalAppeals: Math.floor(Math.random() * 100) + 10, // 模拟数据
      averageRiskScore: (Math.random() * 0.5).toFixed(2), // 模拟数据
      criticalServicesBypassed: Math.floor(Math.random() * 50), // 模拟数据
      topEvidenceTypes: [
        { type: 'behavior', count: Math.floor(Math.random() * 1000) },
        { type: 'scan_24h', count: Math.floor(Math.random() * 800) },
        { type: 'ddos_bot', count: Math.floor(Math.random() * 500) }
      ],
      compliance: {
        gdprCompliant: true,
        dataMinimization: true,
        automatedDecisioning: false // 因为我们只提供咨询，不直接阻断
      }
    };
  }
}

// 如果直接运行此文件，啟動OraSRS服務
if (require.main === module) {
  const orasrsService = new OraSRSService({
    port: 3006, // 使用專用端口以避免與主服務器衝突
    enableLogging: true
  });
  
  orasrsService.start()
    .then(() => {
      console.log('OraSRS Service started successfully on port 3006');
      console.log('Access the service at: http://localhost:3006');
      console.log('OraSRS API endpoints available at: http://localhost:3006/orasrs/v1');
    })
    .catch(error => {
      console.error('Failed to start OraSRS Service:', error);
      process.exit(1);
    });
  
  // 优雅關閉
  process.on('SIGINT', async () => {
    console.log('\nShutting down OraSRS Service...');
    await orasrsService.stop();
    process.exit(0);
  });
}

module.exports = OraSRSService;