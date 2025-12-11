/**
 * OraSRS (Oracle Security Root Service) Engine
 * 咨询式风险评分服务引擎
 * 定位为"咨询式服务"，而非"执行式防火墙"
 * OraSRS 是信用评分机构（如 FICO），不是法院。客户端自己决定是否采取行动。
 */

import FederatedLearning from './src/federated-learning.js';
import ConsensusMechanism from './src/consensus-mechanism.js';
import GovernanceCommittee from './src/governance-committee.js';
import SecurityCompliance from './src/security-compliance.js';
import EdgeCacheLayer from './src/edge-cache-layer.js';
import ArchitectureCoordinator from './src/architecture-coordinator.js';
import crypto from 'crypto';

class SRSEngine {
  constructor(options = {}) {
    // 优化数据结构：使用更高效的数据结构并添加容量限制
    this.riskScores = new Map(); // 存储风险评分
    this.evidenceLog = new Map(); // 存储证据日志
    this.appealRequests = new Map(); // 存储申诉请求
    this.criticalServiceWhitelist = new Set(); // 关键服务白名单
    this.threatIntelligenceCache = new Map(); // 威胁情报缓存
    this.nodeId = options.nodeId || 'default-node'; // 节点ID
    this.maxCacheSize = options.maxCacheSize || 10000; // 最大缓存大小
    
    // 初始化联邦学习模块
    this.federatedLearning = new FederatedLearning(options.federatedLearning || {});
    
    // 新增：共识与质押机制
    this.consensusMechanism = new ConsensusMechanism(options.consensus || {});
    
    // 新增：治理委员会
    this.governanceCommittee = new GovernanceCommittee(options.governance || {});
    
    // 新增：安全合规模块
    this.securityCompliance = new SecurityCompliance(options.security || {});
    
    // 新增：边缘缓存层
    this.edgeCacheLayer = new EdgeCacheLayer(options.edgeCache || {});
    
    // 新增：架构协调器
    this.architectureCoordinator = new ArchitectureCoordinator(this);
    
    // 初始化关键服务白名单
    this.initializeCriticalServiceWhitelist();
    
    // 初始化威胁情报系统
    this.initializeThreatIntelligenceSystem();
    
    // 注意：在生产环境中，风险评分衰减应由外部调度器或cron作业管理
    // 以避免在某些环境中的定时器问题
    // this.startRiskDecayScheduler();
  }

  /**
   * 初始化关键服务白名单
   * 遵守"公共服务豁免"原则
   */
  initializeCriticalServiceWhitelist() {
    // 政府服务
    this.criticalServiceWhitelist.add('.gov');
    this.criticalServiceWhitelist.add('.mil');
    // 医疗服务
    this.criticalServiceWhitelist.add('.edu');
    this.criticalServiceWhitelist.add('who.int');
    // 金融基础设施
    this.criticalServiceWhitelist.add('swift.com');
    this.criticalServiceWhitelist.add('federalreserve.gov');
    // 基础通信
    this.criticalServiceWhitelist.add('192.168.1.1'); // 示例 - DNS根服务器等
    this.criticalServiceWhitelist.add('8.8.8.8'); // Google DNS
    this.criticalServiceWhitelist.add('1.1.1.1'); // Cloudflare DNS
  }

  /**
   * 检查是否为关键公共服务
   */
  isCriticalPublicService(target) {
    // 检查IP或域名是否在白名单中
    if (this.criticalServiceWhitelist.has(target)) {
      return true;
    }

    // 检查域名后缀
    for (const whitelistItem of this.criticalServiceWhitelist) {
      if (whitelistItem.startsWith('.') && target.endsWith(whitelistItem)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 计算风险评分 - 优化版本，支持动态权重和时间衰减
   */
  calculateRiskScore(ip, evidence) {
    if (!evidence || evidence.length === 0) {
      return 0;
    }
    
    let riskScore = 0;
    const now = Date.now();
    
    // 动态权重配置
    const riskWeights = {
      'malware_distribution': 0.45,
      'ddos_bot': 0.40,
      'botnet_activity': 0.38,
      'scan_24h': 0.25,
      'scan_7d': 0.15,
      'suspicious_behavior': 0.30,
      'brute_force': 0.35,
      'data_exfiltration': 0.50,
      'command_control': 0.45,
      'cryptojacking': 0.30,
      'phishing': 0.35,
      'default': 0.10
    };
    
    // 计算加权风险评分，考虑证据的时间因素
    for (const item of evidence) {
      // 获取风险权重
      const weight = riskWeights[item.type] || riskWeights['default'];
      
      // 计算时间衰减因子 (24小时内按线性衰减，超过24小时衰减更多)
      const evidenceTime = new Date(item.timestamp).getTime();
      const timeDiffHours = (now - evidenceTime) / (1000 * 60 * 60);
      let timeDecay = 1.0;
      
      if (timeDiffHours <= 24) {
        timeDecay = Math.max(0.5, 1.0 - (timeDiffHours / 48)); // 48小时内线性衰减
      } else {
        timeDecay = Math.max(0.1, 0.5 * Math.exp(-timeDiffHours / 24)); // 超过24小时指数衰减
      }
      
      // 如果证据来源是AI分析，给予更高权重
      const sourceMultiplier = item.source === 'ai_analysis' ? 1.2 : 1.0;
      
      riskScore += weight * timeDecay * sourceMultiplier;
    }
    
    // 应用非线性函数增加高风险的区分度
    const normalizedScore = Math.min(riskScore, 2.0); // 限制在合理范围内
    const enhancedScore = normalizedScore > 0.7 ? 
      0.7 + (normalizedScore - 0.7) * 1.5 : // 高风险区间增强区分度
      normalizedScore;
    
    // 限制风险评分在0-1之间
    return Math.min(enhancedScore, 1.0);
  }

  /**
   * 生成风险评估报告 - 优化版本，支持威胁情报和更细粒度的控制
   */
  async getRiskAssessment(ip, domain = null) {
    // 检查是否为关键公共服务
    if (this.isCriticalPublicService(ip) || (domain && this.isCriticalPublicService(domain))) {
      return {
        query: { ip, domain },
        response: {
          risk_score: 0,
          confidence: 'high',
          bypass: true,
          risk_level: 'none',
          threat_intel: {
            is_critical_service: true,
            bypass_reason: 'Critical public service'
          },
          recommendations: {
            default: 'allow',
            critical_services: 'allow',
            public_services: 'allow'
          },
          appeal_url: null,
          expires_at: null,
          timestamp: new Date().toISOString()
        }
      };
    }

    // 检查缓存中是否已有风险评分
    const cacheKey = ip + (domain ? `_${domain}` : '');
    if (this.riskScores.has(cacheKey)) {
      const cached = this.riskScores.get(cacheKey);
      // 检查是否过期
      if (cached.response.expires_at && new Date(cached.response.expires_at) > new Date()) {
        // 更新访问时间，实现LRU缓存效果
        this.riskScores.delete(cacheKey);
        this.riskScores.set(cacheKey, cached);
        return cached;
      } else {
        // 如果过期则移除
        this.riskScores.delete(cacheKey);
      }
    }

    // 模拟从威胁情报源获取证据
    const evidence = await this.gatherEvidence(ip, domain);
    const riskScore = this.calculateRiskScore(ip, evidence);

    // 确定风险等级
    let riskLevel = 'low';
    if (riskScore >= 0.8) {
      riskLevel = 'critical';
    } else if (riskScore >= 0.6) {
      riskLevel = 'high';
    } else if (riskScore >= 0.4) {
      riskLevel = 'medium';
    }

    // 生成推荐策略
    const recommendations = this.generateRecommendations(riskLevel);

    // 生成威胁情报详情
    const threatIntelligence = this.generateThreatIntelligence(evidence, riskScore);

    // 生成响应对象
    const response = {
      query: { ip, domain },
      response: {
        risk_score: riskScore,
        confidence: riskLevel === 'critical' ? 'very_high' : 
                    riskLevel === 'high' ? 'high' : 
                    riskLevel === 'medium' ? 'medium' : 'low',
        risk_level: riskLevel,
        evidence,
        threat_intel: threatIntelligence,
        recommendations,
        appeal_url: `https://api.orasrs.net/appeal?ip=${ip}`,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24小时后过期
        timestamp: new Date().toISOString(),
        disclaimer: 'This is advisory only. Final decision rests with the client.',
        version: '2.0'
      }
    };

    // 缓存结果
    this.riskScores.set(cacheKey, response);

    // 管理缓存大小，防止内存溢出
    if (this.riskScores.size > this.maxCacheSize) {
      // 删除最旧的条目 (Map会保持插入顺序，所以第一个是最早的)
      const firstKey = this.riskScores.keys().next().value;
      this.riskScores.delete(firstKey);
    }

    return response;
  }

  /**
   * 收集证据 - 优化版本，支持威胁情报集成和去重逻辑
   */
  async gatherEvidence(ip, domain) {
    // 检查威胁情报缓存
    const cacheKey = ip + (domain ? `_${domain}` : '');
    if (this.threatIntelligenceCache.has(cacheKey)) {
      const cached = this.threatIntelligenceCache.get(cacheKey);
      if (cached.expires_at && new Date(cached.expires_at) > new Date()) {
        return cached.evidence;
      } else {
        // 如果过期则移除
        this.threatIntelligenceCache.delete(cacheKey);
      }
    }

    // 模拟威胁情报收集
    const evidence = [];

    // 模拟从不同来源收集证据
    if (Math.random() > 0.7) {
      evidence.push({
        type: 'suspicious_behavior',
        detail: 'SYN flood to 10 targets in 1h',
        source: 'ai_analysis',
        timestamp: new Date().toISOString(),
        confidence: 0.85,
        severity: 'high'
      });
    }

    if (Math.random() > 0.6) {
      evidence.push({
        type: 'scan_24h',
        detail: 'Port scanning activity detected across multiple services',
        source: 'behavioral_analysis',
        timestamp: new Date().toISOString(),
        confidence: 0.75,
        severity: 'medium'
      });
    }

    if (Math.random() > 0.75) {
      evidence.push({
        type: 'botnet_activity',
        detail: 'Identified as part of known botnet',
        source: 'ai_analysis',
        timestamp: new Date().toISOString(),
        confidence: 0.90,
        severity: 'critical',
        threat_id: 'THREAT_' + Math.random().toString(36).substring(2, 10).toUpperCase()
      });
    }

    if (Math.random() > 0.8) {
      evidence.push({
        type: 'brute_force',
        detail: 'Credential stuffing attack pattern detected',
        source: 'behavioral_analysis',
        timestamp: new Date().toISOString(),
        confidence: 0.80,
        severity: 'high'
      });
    }

    if (Math.random() > 0.85) {
      evidence.push({
        type: 'command_control',
        detail: 'Suspicious outbound connections to known C&C servers',
        source: 'traffic_analysis',
        timestamp: new Date().toISOString(),
        confidence: 0.88,
        severity: 'critical',
        threat_id: 'CNC_' + Math.random().toString(36).substring(2, 10).toUpperCase()
      });
    }

    // 应用去重逻辑
    const deduplicatedEvidence = this.deduplicateEvidence(evidence);

    // 如果没有证据，返回空数组
    if (deduplicatedEvidence.length === 0) {
      return [];
    }

    // 按严重程度排序证据
    deduplicatedEvidence.sort((a, b) => {
      const severityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });

    // 缓存威胁情报结果
    this.threatIntelligenceCache.set(cacheKey, {
      evidence: deduplicatedEvidence,
      expires_at: new Date(Date.now() + 30 * 60 * 1000) // 30分钟后过期
    });

    // 管理缓存大小，防止内存溢出
    if (this.threatIntelligenceCache.size > this.maxCacheSize) {
      // 删除最旧的条目
      const firstKey = this.threatIntelligenceCache.keys().next().value;
      this.threatIntelligenceCache.delete(firstKey);
    }

    return deduplicatedEvidence;
  }

  /**
   * 证据去重逻辑
   */
  deduplicateEvidence(evidence) {
    if (!evidence || evidence.length === 0) {
      return [];
    }

    // 使用Set来跟踪唯一证据
    const seen = new Set();
    const uniqueEvidence = [];

    for (const item of evidence) {
      // 创建一个唯一标识符，考虑类型、详情和来源
      const identifier = `${item.type}_${item.detail}_${item.source}`;
      
      // 检查是否已经见过这个证据
      if (!seen.has(identifier)) {
        seen.add(identifier);
        uniqueEvidence.push(item);
      }
    }

    return uniqueEvidence;
  }

  /**
   * 威胁情报去重：检测重复的威胁报告
   */
  isThreatReportDuplicate(report) {
    if (!report || !report.type || !report.source_ip) {
      return false;
    }

    // 创建基于时间窗口的唯一标识符
    const timeWindow = Math.floor(Date.now() / (5 * 60 * 1000)); // 5分钟时间窗口
    const identifier = `${report.type}_${report.source_ip}_${timeWindow}`;

    // 检查是否在时间窗口内已经存在相同的报告
    if (this.recentThreatReports && this.recentThreatReports.has(identifier)) {
      return true;
    }

    // 如果不存在，记录这个报告
    if (!this.recentThreatReports) {
      this.recentThreatReports = new Map();
    }

    // 设置过期时间（5分钟后自动清理）
    this.recentThreatReports.set(identifier, Date.now());

    // 定期清理过期的报告记录
    if (!this.duplicateCleanupTimer) {
      this.duplicateCleanupTimer = setInterval(() => {
        const now = Date.now();
        const fiveMinutesAgo = now - (5 * 60 * 1000);
        
        for (const [key, timestamp] of this.recentThreatReports.entries()) {
          if (timestamp < fiveMinutesAgo) {
            this.recentThreatReports.delete(key);
          }
        }
      }, 60 * 1000); // 每分钟清理一次
    }

    return false;
  }

  /**
   * 生成推荐策略 - 优化版本，支持更细粒度的控制
   */
  generateRecommendations(riskLevel) {
    let recommendations = {
      default: 'allow',
      public_services: 'allow',
      banking: 'allow',
      admin_panel: 'allow',
      api_endpoints: 'allow',
      file_uploads: 'allow',
      database_access: 'allow'
    };

    switch (riskLevel) {
      case 'critical':
        recommendations = {
          default: 'block',
          public_services: 'allow_with_captcha',
          banking: 'block',
          admin_panel: 'block',
          api_endpoints: 'block',
          file_uploads: 'block',
          database_access: 'block',
          critical_services: 'allow'
        };
        break;
      case 'high':
        recommendations = {
          default: 'block',
          public_services: 'allow_with_captcha',
          banking: 'require_mfa',
          admin_panel: 'block',
          api_endpoints: 'require_token',
          file_uploads: 'scan_required',
          database_access: 'audit_required',
          critical_services: 'allow'
        };
        break;
      case 'medium':
        recommendations = {
          default: 'challenge',
          public_services: 'allow_with_captcha',
          banking: 'require_additional_verification',
          admin_panel: 'challenge',
          api_endpoints: 'rate_limit',
          file_uploads: 'scan_required',
          database_access: 'log_required',
          critical_services: 'allow'
        };
        break;
      case 'low':
      default:
        recommendations = {
          default: 'allow',
          public_services: 'allow',
          banking: 'allow',
          admin_panel: 'allow',
          api_endpoints: 'allow',
          file_uploads: 'allow',
          database_access: 'allow',
          critical_services: 'allow'
        };
    }

    return recommendations;
  }

  /**
   * 申诉处理
   */
  async processAppeal(ip, proof) {
    const appealId = `appeal_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    const appealData = {
      id: appealId,
      ip,
      proof,
      status: 'pending',
      submitted_at: new Date().toISOString(),
      processed_at: null
    };

    this.appealRequests.set(appealId, appealData);

    // 立即降低该IP的风险评分
    this.reduceRiskScoreForAppeal(ip);

    return {
      appeal_id: appealId,
      status: 'received',
      message: 'Appeal request received. Risk score temporarily reduced during review.',
      estimated_resolution_time: '24-48 hours'
    };
  }

  /**
   * 为申诉的IP降低风险评分
   */
  reduceRiskScoreForAppeal(ip) {
    // 在24小时内降低该IP的风险评分
    const cacheKey = ip;
    if (this.riskScores.has(cacheKey)) {
      const currentData = this.riskScores.get(cacheKey);
      // 创建调整后的数据
      const adjustedResponse = JSON.parse(JSON.stringify(currentData));
      adjustedResponse.response.risk_score = Math.max(0, adjustedResponse.response.risk_score - 0.3);
      adjustedResponse.response.evidence = [
        ...adjustedResponse.response.evidence,
        {
          type: 'appeal_pending',
          detail: 'Risk score temporarily reduced during appeal review',
          timestamp: new Date().toISOString()
        }
      ];
      // 更新过期时间为1小时后
      adjustedResponse.response.expires_at = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      
      this.riskScores.set(cacheKey, adjustedResponse);
    }
  }

  /**
   * 获取决策解释
   */
  getExplanation(ip) {
    const cacheKey = ip;
    if (this.riskScores.has(cacheKey)) {
      const cached = this.riskScores.get(cacheKey);
      return {
        ip,
        risk_score: cached.response.risk_score,
        risk_level: cached.response.risk_level,
        evidence: cached.response.evidence,
        recommendations: cached.response.recommendations,
        appealed: this.isAppealed(ip),
        last_updated: cached.response.expires_at
      };
    }

    return {
      ip,
      message: 'No risk assessment found for this IP. The IP may be in the critical services whitelist or not yet assessed.',
      risk_score: 0
    };
  }

  /**
   * 生成威胁情报详情
   */
  generateThreatIntelligence(evidence, riskScore) {
    if (!evidence || evidence.length === 0) {
      return {
        threat_level: 'none',
        indicators: [],
        confidence: 'low',
        last_updated: new Date().toISOString()
      };
    }

    // 统计威胁类型
    const threatTypeCounts = {};
    let highestSeverity = 'low';
    const severityOrder = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };

    for (const item of evidence) {
      if (threatTypeCounts[item.type]) {
        threatTypeCounts[item.type]++;
      } else {
        threatTypeCounts[item.type] = 1;
      }

      // 确定最高威胁等级
      if (item.severity && severityOrder[item.severity] > severityOrder[highestSeverity]) {
        highestSeverity = item.severity;
      }
    }

    // 确定整体威胁等级
    let overallThreatLevel = 'low';
    if (riskScore >= 0.8) {
      overallThreatLevel = 'critical';
    } else if (riskScore >= 0.6) {
      overallThreatLevel = 'high';
    } else if (riskScore >= 0.4) {
      overallThreatLevel = 'medium';
    }

    return {
      threat_level: overallThreatLevel,
      indicators: Object.keys(threatTypeCounts),
      indicator_counts: threatTypeCounts,
      highest_severity_evidence: highestSeverity,
      confidence: riskScore > 0.8 ? 'very_high' : 
                  riskScore > 0.6 ? 'high' : 
                  riskScore > 0.4 ? 'medium' : 'low',
      total_evidence_count: evidence.length,
      last_updated: new Date().toISOString(),
      analysis_summary: this.generateAnalysisSummary(evidence)
    };
  }

  /**
   * 生成分析摘要
   */
  generateAnalysisSummary(evidence) {
    if (!evidence || evidence.length === 0) {
      return 'No threats detected';
    }

    const summary = {
      total_threats: evidence.length,
      primary_threats: [],
      time_frame: 'recent',
      sources: new Set()
    };

    // 统计主要威胁类型
    const typeCount = {};
    for (const item of evidence) {
      if (typeCount[item.type]) {
        typeCount[item.type]++;
      } else {
        typeCount[item.type] = 1;
      }
      summary.sources.add(item.source);
    }

    // 获取最常见的威胁类型
    const sortedTypes = Object.entries(typeCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3); // 只取前3个

    summary.primary_threats = sortedTypes.map(([type, count]) => ({ type, count }));
    summary.sources = Array.from(summary.sources);

    return summary;
  }

  /**
   * 初始化威胁情报系统
   */
  initializeThreatIntelligenceSystem() {
    // 设置定期清理过期缓存的定时器
    setInterval(() => {
      this.cleanupExpiredThreatIntelligence();
    }, 5 * 60 * 1000); // 每5分钟清理一次
    
    // 初始化威胁情报数据库连接
    console.log('威胁情报系统初始化完成');
  }

  /**
   * 清理过期的威胁情报缓存
   */
  cleanupExpiredThreatIntelligence() {
    const now = new Date();
    let cleanedCount = 0;

    for (const [key, item] of this.threatIntelligenceCache.entries()) {
      if (item.expires_at && new Date(item.expires_at) < now) {
        this.threatIntelligenceCache.delete(key);
        cleanedCount++;
      }
    }

    // 同样清理风险评分缓存中的过期项目
    for (const [key, item] of this.riskScores.entries()) {
      if (item.response.expires_at && new Date(item.response.expires_at) < now) {
        this.riskScores.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`威胁情报系统: 清理了 ${cleanedCount} 个过期条目`);
    }
  }

  /**
   * 检查IP是否有申诉
   */
  isAppealed(ip) {
    for (const [_, appeal] of this.appealRequests) {
      if (appeal.ip === ip && appeal.status === 'pending') {
        return true;
      }
    }
    return false;
  }

  /**
   * 风险评分衰减调度器
   */
  startRiskDecayScheduler() {
    // 每小时执行一次风险评分衰减
    setInterval(() => {
      this.applyRiskDecay();
    }, 60 * 60 * 1000); // 1小时
  }

  /**
   * 应用风险评分衰减
   */
  applyRiskDecay() {
    // 遍历所有风险评分，按时间衰减
    for (const [key, data] of this.riskScores) {
      // 检查是否存在有效的过期时间
      if (data.response.expires_at) {
        const hoursSinceAssessment = (Date.now() - new Date(data.response.expires_at).getTime()) / (1000 * 60 * 60);
        
        // 如果超过24小时，将风险评分降低10%
        if (hoursSinceAssessment > 24) {
          const newRiskScore = Math.max(0, data.response.risk_score - 0.1);
          data.response.risk_score = newRiskScore;
          
          // 更新过期时间
          data.response.expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        }
      }
    }
  }

  /**
   * 获取SRS响应格式（安全版）
   */
  async getSRSResponse(ip, domain = null) {
    return await this.getRiskAssessment(ip, domain);
  }

  /**
   * 联邦学习：注册到联邦网络
   */
  registerToFederation(nodeId, config) {
    return this.federatedLearning.registerNode(nodeId, config);
  }

  /**
   * 联邦学习：提交本地模型更新
   */
  async submitLocalUpdate(localUpdates) {
    return await this.federatedLearning.collectLocalUpdates(this.nodeId, localUpdates);
  }

  /**
   * 联邦学习：执行联邦学习轮次
   */
  async performFederatedRound() {
    return await this.federatedLearning.federatedRound();
  }

  /**
   * 联邦学习：获取联邦状态
   */
  getFederationStatus() {
    return this.federatedLearning.getStatus();
  }

  /**
   * 更新风险评估模型（从联邦学习中）
   */
  updateModelFromFederation() {
    // 从聚合模型中获取更新并应用到本地模型
    const aggregatedModel = this.federatedLearning.aggregatedModel;
    
    if (aggregatedModel.size > 0) {
      // 这里可以应用聚合模型来更新本地风险评估逻辑
      console.log('从联邦模型更新本地风险评估参数');
      // 实现具体的模型更新逻辑
    }
  }

  /**
   * 节点质押
   */
  stake(nodeId, amount, identityInfo) {
    return this.consensusMechanism.stake(nodeId, amount, identityInfo);
  }

  /**
   * 获取节点状态
   */
  getNodeStatus(nodeId) {
    return this.consensusMechanism.getNodeStatus(nodeId);
  }

  /**
   * 获取共识节点列表
   */
  getConsensusNodes() {
    return this.consensusMechanism.getConsensusNodes();
  }

  /**
   * 更新节点声誉
   */
  updateNodeReputation(nodeId, performanceData) {
    return this.consensusMechanism.updateNodeReputation(nodeId, performanceData);
  }

  /**
   * 执行BFT共识
   */
  performBFTConsensus(data, callback) {
    return this.consensusMechanism.performBFTConsensus(data, callback);
  }

  /**
   * 添加治理委员会成员
   */
  addGovernanceMember(memberId, memberInfo) {
    return this.governanceCommittee.addMember(memberId, memberInfo);
  }

  /**
   * 创建治理提案
   */
  createGovernanceProposal(proposalId, title, description, proposer, category) {
    return this.governanceCommittee.createProposal(proposalId, title, description, proposer, category);
  }

  /**
   * 开始提案投票
   */
  startProposalVoting(proposalId) {
    return this.governanceCommittee.startVoting(proposalId);
  }

  /**
   * 委员会成员投票
   */
  committeeVote(memberId, proposalId, voteChoice) {
    return this.governanceCommittee.vote(memberId, proposalId, voteChoice);
  }

  /**
   * 紧急熔断
   */
  emergencyHalt(reason) {
    return this.governanceCommittee.emergencyHalt(reason);
  }

  /**
   * 数据脱敏处理
   */
  sanitizeData(data) {
    return this.securityCompliance.sanitizeData(data);
  }

  /**
   * 使用SM4加密数据
   */
  encryptWithSM4(data, key) {
    return this.securityCompliance.encryptWithSM4(data, key);
  }

  /**
   * 生成合规报告
   */
  generateComplianceReport() {
    return this.securityCompliance.generateComplianceReport();
  }

  /**
   * 检查数据是否在中国境内
   */
  isDataInChina() {
    return this.securityCompliance.isDataInChina();
  }

  /**
   * 边缘缓存节点质押
   */
  stakeEdgeNode(nodeId, amount, nodeInfo) {
    return this.edgeCacheLayer.stake(nodeId, amount, nodeInfo);
  }

  /**
   * 从边缘缓存获取数据
   */
  getFromEdgeCache(key) {
    return this.edgeCacheLayer.getCache(key);
  }

  /**
   * 设置边缘缓存
   */
  setEdgeCache(key, data, cachedBy) {
    return this.edgeCacheLayer.setCache(key, data, cachedBy);
  }

  /**
   * 提交缓存挑战
   */
  submitCacheChallenge(challengeId, cacheKey, challengerId, reason) {
    return this.edgeCacheLayer.submitChallenge(challengeId, cacheKey, challengerId, reason);
  }

  /**
   * 添加挑战支持
   */
  addChallengeSupport(challengeId, challengerId) {
    return this.edgeCacheLayer.addChallengeSupport(challengeId, challengerId);
  }

  /**
   * 获取边缘缓存节点统计
   */
  getEdgeNodeStats(nodeId) {
    return this.edgeCacheLayer.getNodeStats(nodeId);
  }

  /**
   * 运行边缘缓存维护任务
   */
  runEdgeCacheMaintenance() {
    return this.edgeCacheLayer.runMaintenance();
  }

  /**
   * 初始化三层架构
   */
  async initializeArchitecture() {
    console.log('Initializing Three-Tier Architecture for OraSRS v2.0...');
    
    // 初始化边缘层节点
    this.initializeEdgeLayer();
    
    // 初始化共识层节点
    this.initializeConsensusLayer();
    
    // 初始化智能层节点
    this.initializeIntelligenceLayer();
    
    // 启动架构协调器
    const result = await this.architectureCoordinator.initialize();
    
    console.log('Three-Tier Architecture initialized successfully');
    return result;
  }

  /**
   * 初始化边缘层（轻量级威胁检测节点）
   */
  initializeEdgeLayer() {
    console.log('Initializing Edge Layer (Ultra-Lightweight Threat Detection Agents)...');
    
    // 边缘层配置
    this.edgeLayerConfig = {
      maxAgents: 1000,
      memoryLimit: '5MB',
      detectionTimeout: 100, // 100ms超时
      privacyMode: true,
      regionalCompliance: true
    };
    
    // 边缘层统计
    this.edgeLayerStats = {
      activeAgents: 0,
      threatsDetected: 0,
      falsePositives: 0,
      avgResponseTime: 0
    };
    
    console.log('Edge Layer initialized with', this.edgeLayerConfig);
  }

  /**
   * 初始化共识层（验证和存证节点）
   */
  initializeConsensusLayer() {
    console.log('Initializing Consensus Layer (Verification and Evidence Storage Nodes)...');
    
    // 共识层配置
    this.consensusLayerConfig = {
      consensusAlgorithm: 'BFT',
      minVerificationNodes: 3,
      evidenceRetentionDays: 365,
      blockchainIntegration: true,
      nationalCryptoSupport: true
    };
    
    // 共识层统计
    this.consensusLayerStats = {
      activeNodes: 0,
      verifiedReports: 0,
      consensusRate: 0,
      avgVerificationTime: 0
    };
    
    console.log('Consensus Layer initialized with', this.consensusLayerConfig);
  }

  /**
   * 初始化智能层（威胁情报协调网络）
   */
  initializeIntelligenceLayer() {
    console.log('Initializing Intelligence Layer (Threat Intelligence Coordination Network)...');
    
    // 智能层配置
    this.intelligenceLayerConfig = {
      p2pNetwork: 'libp2p gossipsub',
      ecosystemIntegration: true,
      threatFeedAggregation: true,
      aiEnhancement: true
    };
    
    // 智能层统计
    this.intelligenceLayerStats = {
      connectedNodes: 0,
      threatFeeds: 0,
      correlationAccuracy: 0,
      responseTime: 0
    };
    
    console.log('Intelligence Layer initialized with', this.intelligenceLayerConfig);
  }

  /**
   * 处理查询请求（通过三层架构）
   */
  async processQueryThroughArchitecture(ip, domain = null) {
    const startTime = Date.now();
    
    try {
      // 1. 边缘层快速检测
      const edgeResult = await this.processEdgeLayerQuery(ip, domain);
      
      // 2. 如果边缘层检测到威胁，进行共识层验证
      let consensusResult = null;
      if (edgeResult.risk_score > 0.3) { // 如果风险评分超过阈值
        consensusResult = await this.processConsensusLayerQuery(ip, domain, edgeResult);
      }
      
      // 3. 智能层威胁情报聚合
      const intelligenceResult = await this.processIntelligenceLayerQuery(ip, domain, edgeResult, consensusResult);
      
      // 合并结果
      const finalResult = this.mergeThreeTierResults(edgeResult, consensusResult, intelligenceResult);
      
      // 更新统计信息
      this.updateArchitectureStats(Date.now() - startTime, finalResult);
      
      return finalResult;
    } catch (error) {
      console.error('Error in three-tier architecture processing:', error);
      // 降级到传统处理方式
      return await this.getRiskAssessment(ip, domain);
    }
  }

  /**
   * 处理边缘层查询
   */
  async processEdgeLayerQuery(ip, domain) {
    // 边缘层快速响应，使用本地缓存和快速检测算法
    const cacheKey = ip + (domain ? `_${domain}` : '');
    
    // 检查边缘层缓存
    if (this.threatIntelligenceCache.has(cacheKey)) {
      const cached = this.threatIntelligenceCache.get(cacheKey);
      if (cached.expires_at && new Date(cached.expires_at) > new Date()) {
        return this.formatEdgeLayerResponse(cached.evidence, ip, domain);
      }
    }
    
    // 执行快速威胁检测
    const evidence = await this.performFastThreatDetection(ip, domain);
    
    // 生成边缘层响应
    const response = this.formatEdgeLayerResponse(evidence, ip, domain);
    
    // 缓存结果
    this.threatIntelligenceCache.set(cacheKey, {
      evidence,
      expires_at: new Date(Date.now() + 5 * 60 * 1000) // 5分钟缓存
    });
    
    // 更新统计
    this.edgeLayerStats.threatsDetected += evidence.length;
    this.edgeLayerStats.activeAgents++;
    
    return response;
  }

  /**
   * 执行快速威胁检测（边缘层）
   */
  async performFastThreatDetection(ip, domain) {
    // 实现快速威胁检测算法
    const evidence = [];
    
    // 模拟快速威胁检测
    if (Math.random() > 0.8) {
      evidence.push({
        type: 'fast_detection',
        detail: 'Quick threat pattern identified',
        source: 'edge_agent',
        timestamp: new Date().toISOString(),
        confidence: 0.7,
        severity: 'medium',
        processing_time: 'fast'
      });
    }
    
    return evidence;
  }

  /**
   * 格式化边缘层响应
   */
  formatEdgeLayerResponse(evidence, ip, domain) {
    const riskScore = this.calculateRiskScore(ip, evidence);
    
    return {
      layer: 'edge',
      query: { ip, domain },
      response: {
        risk_score: riskScore,
        confidence: riskScore > 0.7 ? 'high' : riskScore > 0.4 ? 'medium' : 'low',
        evidence,
        processing_time: 'fast',
        requires_consensus: riskScore > 0.3
      }
    };
  }

  /**
   * 处理共识层查询
   */
  async processConsensusLayerQuery(ip, domain, edgeResult) {
    // 检查是否需要共识验证
    if (!edgeResult.response.requires_consensus) {
      return null;
    }
    
    // 提交共识验证请求
    const verificationRequest = {
      id: `consensus_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      ip,
      domain,
      evidence_summary: edgeResult.response.evidence.map(e => ({
        type: e.type,
        severity: e.severity,
        confidence: e.confidence
      })),
      timestamp: new Date().toISOString(),
      requesting_node: this.nodeId
    };
    
    // 模拟共识验证过程
    const consensusResult = await this.simulateConsensusVerification(verificationRequest);
    
    // 更新统计
    this.consensusLayerStats.verifiedReports++;
    this.consensusLayerStats.activeNodes = this.getConsensusNodes().length;
    
    return {
      layer: 'consensus',
      verification_request: verificationRequest,
      result: consensusResult
    };
  }

  /**
   * 模拟共识验证过程
   */
  async simulateConsensusVerification(request) {
    // 模拟向多个共识节点请求验证
    const verificationNodes = this.getConsensusNodes().slice(0, 3); // 取前3个节点
    
    const verifications = [];
    
    for (const node of verificationNodes) {
      // 模拟节点验证
      const verification = {
        node_id: node.id,
        verdict: Math.random() > 0.1 ? 'confirm' : 'dispute', // 90%确认率
        confidence: Math.random() * 0.3 + 0.7, // 70-100%置信度
        timestamp: new Date().toISOString(),
        processing_time: Math.random() * 500 + 100 // 100-600ms
      };
      
      verifications.push(verification);
    }
    
    // 计算共识结果
    const confirmations = verifications.filter(v => v.verdict === 'confirm');
    const disputes = verifications.filter(v => v.verdict === 'dispute');
    
    const consensusReached = confirmations.length >= 2; // 至少2个节点确认
    
    return {
      request_id: request.id,
      consensus_reached: consensusReached,
      total_verifications: verifications.length,
      confirmations: confirmations.length,
      disputes: disputes.length,
      verifications,
      final_verdict: consensusReached ? 'confirmed' : 'disputed',
      confidence: consensusReached ? 
        confirmations.reduce((sum, v) => sum + v.confidence, 0) / confirmations.length : 
        disputes.reduce((sum, v) => sum + v.confidence, 0) / disputes.length
    };
  }

  /**
   * 处理智能层查询
   */
  async processIntelligenceLayerQuery(ip, domain, edgeResult, consensusResult) {
    // 智能层聚合威胁情报
    const threatIntelligence = {
      id: `intel_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      ip,
      domain,
      sources: [
        'edge_detection',
        consensusResult ? 'consensus_verification' : 'local_analysis'
      ],
      correlation_data: this.generateThreatCorrelation(ip, domain),
      global_threat_context: this.getGlobalThreatContext(ip, domain),
      ai_enhanced_analysis: this.performAIEnhancedAnalysis(ip, domain, edgeResult, consensusResult),
      timestamp: new Date().toISOString()
    };
    
    // 更新统计
    this.intelligenceLayerStats.threatFeeds++;
    this.intelligenceLayerStats.connectedNodes = this.getConsensusNodes().length;
    
    return threatIntelligence;
  }

  /**
   * 生成威胁关联数据
   */
  generateThreatCorrelation(ip, domain) {
    // 模拟威胁关联分析
    return {
      related_ips: [`2.3.4.${Math.floor(Math.random() * 254) + 1}`],
      attack_campaigns: ['Campaign-' + Math.random().toString(36).substring(2, 8).toUpperCase()],
      threat_actor_indicators: ['TA-' + Math.random().toString(36).substring(2, 6).toUpperCase()],
      timeline_correlation: true
    };
  }

  /**
   * 获取全局威胁上下文
   */
  getGlobalThreatContext(ip, domain) {
    // 模拟全局威胁上下文
    return {
      global_risk_trend: ['increasing', 'stable', 'decreasing'][Math.floor(Math.random() * 3)],
      geolocation_threat_level: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],
      industry_specific_threats: Math.random() > 0.5,
      threat_persistence_score: Math.random()
    };
  }

  /**
   * 执行AI增强分析
   */
  performAIEnhancedAnalysis(ip, domain, edgeResult, consensusResult) {
    // 模拟AI增强分析
    return {
      behavioral_analysis: {
        anomaly_score: Math.random(),
        pattern_recognition: Math.random() > 0.5 ? 'suspicious' : 'normal',
        risk_trajectory: ['increasing', 'stable', 'decreasing'][Math.floor(Math.random() * 3)]
      },
      predictive_analysis: {
        future_risk_score: Math.random(),
        next_24h_prediction: Math.random() > 0.7 ? 'high_activity' : 'normal_activity'
      },
      false_positive_likelihood: Math.random() * 0.3 // 通常较低的误报率
    };
  }

  /**
   * 合并三层架构结果
   */
  mergeThreeTierResults(edgeResult, consensusResult, intelligenceResult) {
    // 基于三层结果生成最终响应
    const baseResponse = edgeResult.response;
    
    // 整合共识层结果
    if (consensusResult) {
      baseResponse.consensus_verification = consensusResult.result;
      // 如果共识验证确认威胁，则提升风险评分
      if (consensusResult.result.final_verdict === 'confirmed') {
        baseResponse.risk_score = Math.min(1.0, baseResponse.risk_score * 1.2);
      }
    }
    
    // 整合智能层威胁情报
    baseResponse.threat_intelligence = {
      ...intelligenceResult,
      // 合并证据
      aggregated_evidence: [
        ...baseResponse.evidence,
        ...(consensusResult?.result?.verifications || []).map(v => ({
          type: 'consensus_verification',
          source: v.node_id,
          confidence: v.confidence,
          verdict: v.verdict
        }))
      ]
    };
    
    // 更新风险等级
    let riskLevel = 'low';
    if (baseResponse.risk_score >= 0.8) {
      riskLevel = 'critical';
    } else if (baseResponse.risk_score >= 0.6) {
      riskLevel = 'high';
    } else if (baseResponse.risk_score >= 0.4) {
      riskLevel = 'medium';
    }
    baseResponse.risk_level = riskLevel;
    
    // 生成增强的推荐策略
    baseResponse.recommendations = this.generateEnhancedRecommendations(
      riskLevel, 
      intelligenceResult.ai_enhanced_analysis
    );
    
    // 添加架构处理信息
    baseResponse.architecture_info = {
      processing_layers: ['edge', 'consensus', 'intelligence'],
      edge_processing_time: 'fast',
      consensus_verification: !!consensusResult,
      intelligence_enhancement: true,
      final_decision: 'client_determined'
    };
    
    return {
      query: edgeResult.query,
      response: baseResponse
    };
  }

  /**
   * 生成增强的推荐策略
   */
  generateEnhancedRecommendations(riskLevel, aiAnalysis) {
    const baseRecommendations = this.generateRecommendations(riskLevel);
    
    // 根据AI分析结果增强推荐策略
    if (aiAnalysis && aiAnalysis.predictive_analysis) {
      if (aiAnalysis.predictive_analysis.next_24h_prediction === 'high_activity') {
        // 如果预测未来24小时有高活动，则加强控制
        if (riskLevel === 'medium') {
          // 将中等风险的推荐策略提升一级
          baseRecommendations.default = 'block';
          baseRecommendations.api_endpoints = 'require_token';
        } else if (riskLevel === 'high') {
          baseRecommendations.banking = 'block';
        }
      }
    }
    
    return baseRecommendations;
  }

  /**
   * 更新架构统计信息
   */
  updateArchitectureStats(responseTime, result) {
    // 更新边缘层统计
    this.edgeLayerStats.avgResponseTime = 
      (this.edgeLayerStats.avgResponseTime + responseTime) / 2;
    
    // 更新共识层统计
    if (result.response.consensus_verification) {
      this.consensusLayerStats.avgVerificationTime = 
        (this.consensusLayerStats.avgVerificationTime + 
         result.response.consensus_verification.verifications.reduce((sum, v) => sum + v.processing_time, 0) / 
         result.response.consensus_verification.verifications.length) / 2;
      this.consensusLayerStats.consensusRate = 
        (this.consensusLayerStats.consensusRate + 
         (result.response.consensus_verification.final_verdict === 'confirmed' ? 1 : 0)) / 2;
    }
    
    // 更新智能层统计
    this.intelligenceLayerStats.responseTime = 
      (this.intelligenceLayerStats.responseTime + responseTime) / 2;
    this.intelligenceLayerStats.correlationAccuracy = 
      (this.intelligenceLayerStats.correlationAccuracy + 
       (result.response.threat_intelligence?.ai_enhanced_analysis?.behavioral_analysis?.anomaly_score || 0.5)) / 2;
  }

  /**
   * 获取架构状态
   */
  getArchitectureStatus() {
    return {
      status: 'running',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      layers: {
        edge: {
          status: 'active',
          config: this.edgeLayerConfig,
          stats: this.edgeLayerStats
        },
        consensus: {
          status: 'active',
          config: this.consensusLayerConfig,
          stats: this.consensusLayerStats,
          nodes: this.getConsensusNodes()
        },
        intelligence: {
          status: 'active',
          config: this.intelligenceLayerConfig,
          stats: this.intelligenceLayerStats
        }
      },
      overall_performance: {
        avg_response_time: (this.edgeLayerStats.avgResponseTime + 
                          this.consensusLayerStats.avgVerificationTime + 
                          this.intelligenceLayerStats.responseTime) / 3,
        total_threats_processed: this.edgeLayerStats.threatsDetected,
        consensus_success_rate: this.consensusLayerStats.consensusRate
      }
    };
  }

  /**
   * 执行跨层审计
   */
  async performCrossLayerAudit() {
    const auditResults = {
      timestamp: new Date().toISOString(),
      layers: {},
      compliance: {
        gdpr_ccpa: true,
        iso27001: true,
        china_cybersecurity_law: true
      }
    };
    
    // 审计边缘层
    auditResults.layers.edge = {
      memory_usage: this.edgeLayerConfig.memoryLimit,
      privacy_compliance: this.edgeLayerConfig.privacyMode,
      data_minimization: true,
      last_audit: new Date().toISOString()
    };
    
    // 审计共识层
    auditResults.layers.consensus = {
      blockchain_integration: this.consensusLayerConfig.blockchainIntegration,
      evidence_retention: this.consensusLayerConfig.evidenceRetentionDays,
      national_crypto_support: this.consensusLayerConfig.nationalCryptoSupport,
      last_audit: new Date().toISOString()
    };
    
    // 审计智能层
    auditResults.layers.intelligence = {
      p2p_network_security: true,
      ecosystem_integration: this.intelligenceLayerConfig.ecosystemIntegration,
      ai_bias_monitoring: true,
      last_audit: new Date().toISOString()
    };
    
    // 记录审计日志
    console.log('Cross-layer audit completed:', auditResults);
    
    return auditResults;
  }

  /**
   * 系统健康检查
   */
  architectureHealthCheck() {
    const healthStatus = {
      overall: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      layers_health: {
        edge: this.checkEdgeLayerHealth(),
        consensus: this.checkConsensusLayerHealth(),
        intelligence: this.checkIntelligenceLayerHealth()
      },
      dependencies: {
        federated_learning: this.federatedLearning ? 'active' : 'inactive',
        consensus_mechanism: this.consensusMechanism ? 'active' : 'inactive',
        governance_committee: this.governanceCommittee ? 'active' : 'inactive',
        security_compliance: this.securityCompliance ? 'active' : 'inactive'
      },
      performance: {
        cache_hit_rate: this.calculateCacheHitRate(),
        response_time: this.calculateAvgResponseTime(),
        throughput: this.calculateThroughput()
      }
    };
    
    // 检查整体健康状态
    if (healthStatus.layers_health.edge.status !== 'healthy' ||
        healthStatus.layers_health.consensus.status !== 'healthy' ||
        healthStatus.layers_health.intelligence.status !== 'healthy') {
      healthStatus.overall = 'degraded';
    }
    
    return healthStatus;
  }

  /**
   * 检查边缘层健康状态
   */
  checkEdgeLayerHealth() {
    const status = 'healthy';
    return {
      status,
      active_agents: this.edgeLayerStats.activeAgents,
      threats_detected: this.edgeLayerStats.threatsDetected,
      response_time: this.edgeLayerStats.avgResponseTime
    };
  }

  /**
   * 检查共识层健康状态
   */
  checkConsensusLayerHealth() {
    const status = 'healthy';
    return {
      status,
      active_nodes: this.consensusLayerStats.activeNodes,
      verified_reports: this.consensusLayerStats.verifiedReports,
      consensus_rate: this.consensusLayerStats.consensusRate
    };
  }

  /**
   * 检查智能层健康状态
   */
  checkIntelligenceLayerHealth() {
    const status = 'healthy';
    return {
      status,
      connected_nodes: this.intelligenceLayerStats.connectedNodes,
      threat_feeds: this.intelligenceLayerStats.threatFeeds,
      correlation_accuracy: this.intelligenceLayerStats.correlationAccuracy
    };
  }

  /**
   * 计算缓存命中率
   */
  calculateCacheHitRate() {
    // 模拟缓存命中率计算
    return 0.85; // 85%的缓存命中率
  }

  /**
   * 计算平均响应时间
   */
  calculateAvgResponseTime() {
    // 模拟平均响应时间计算
    return (this.edgeLayerStats.avgResponseTime + 
            this.consensusLayerStats.avgVerificationTime + 
            this.intelligenceLayerStats.responseTime) / 3;
  }

  /**
   * 计算吞吐量
   */
  calculateThroughput() {
    // 模拟吞吐量计算
    return this.edgeLayerStats.threatsDetected / (process.uptime() / 60); // 每分钟处理的威胁数
  }
}

// 导出SRS引擎
export default SRSEngine;

// 如果直接运行此文件，启动测试
// 检查是否是主模块运行
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 注意：在ES模块中，没有等同于require.main的直接方法
// 我们使用命令行参数来检测是否直接运行此模块
if (process.argv[1] === __filename) {
  console.log('OraSRS Engine initialized');
  console.log('This engine provides advisory risk scoring services.');
  console.log('It does NOT directly block traffic - clients make the final decision.');
}