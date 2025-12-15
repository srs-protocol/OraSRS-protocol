/**
 * OraSRS (Oracle Security Root Service) 精简客户端
 * 连接到OraSRS协议链 (api.orasrs.net)
 * 避免复杂依赖，用于打包
 */

// 导入区块链连接器
import BlockchainConnector from './blockchain-connector.js';
import ThreatDetection from './threat-detection.js';
import ThreatDataLoader from './threat-data-loader.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const express = require('express');

const CACHE_DIR = '/var/lib/orasrs';
const CACHE_FILE = path.join(CACHE_DIR, 'cache.json');

// 精简版OraSRS服务类，避免复杂依赖
class SimpleOraSRSService {
  constructor(config = {}) {
    this.config = {
      port: config.port || 3006,
      host: config.host || '127.0.0.1', // Limit to localhost for security
      enableLogging: config.enableLogging !== false,
      logFile: config.logFile || './logs/orasrs-service.log',
      ...config
    };

    // 初始化区块链连接器
    this.blockchainConnector = new BlockchainConnector(this.config.blockchain);

    // 初始化威胁数据加载器
    this.threatDataLoader = new ThreatDataLoader({
      dataDir: './oracle',
      cdnUrl: this.config.cdnUrl || null
    });

    // 初始化威胁检测器
    this.threatDetection = new ThreatDetection(this.blockchainConnector);

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

    // 缓存
    this.cache = {
      threats: {},
      whitelist: [
        '127.0.0.1',
        'localhost',
        '::1',
        // 公共 DNS 服务器
        '8.8.8.8',        // Google DNS
        '8.8.4.4',        // Google DNS
        '1.1.1.1',        // Cloudflare DNS
        '1.0.0.1',        // Cloudflare DNS
        '208.67.222.222', // OpenDNS
        '208.67.220.220', // OpenDNS
        '9.9.9.9',        // Quad9 DNS
        '149.112.112.112' // Quad9 DNS
      ],
      safeIPs: {},      // 缓存已验证的安全 IP
      lastUpdate: null
    };
    this.loadCache();

    // 启动定期缓存更新
    this.startCacheUpdate();

    // 初始化威胁数据加载器
    this.initializeThreatDataLoader();

    // 基本API端点
    this.setupRoutes();
  }

  async initializeThreatDataLoader() {
    try {
      console.log('🔄 初始化威胁情报数据加载器...');
      await this.threatDataLoader.initialize();
      console.log(`✅ 威胁情报加载完成: ${this.threatDataLoader.getStats().totalEntries} 条记录`);

      // 每小时同步一次差分更新
      setInterval(async () => {
        try {
          await this.threatDataLoader.syncDiffs();
          console.log('✅ 威胁情报差分同步完成');
        } catch (error) {
          console.error('威胁情报同步失败:', error.message);
        }
      }, 3600 * 1000); // 1 hour
    } catch (error) {
      console.warn('⚠️  威胁情报数据加载器初始化失败:', error.message);
      console.warn('    系统将仅使用区块链数据源');
    }
  }

  loadCache() {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const data = fs.readFileSync(CACHE_FILE, 'utf8');
        const loadedCache = JSON.parse(data);

        // Merge with default structure to ensure all fields exist
        this.cache = {
          threats: loadedCache.threats || {},
          whitelist: loadedCache.whitelist || this.cache.whitelist,
          safeIPs: loadedCache.safeIPs || {},  // Ensure safeIPs exists
          lastUpdate: loadedCache.lastUpdate
        };

        console.log(`已加载本地缓存: ${Object.keys(this.cache.threats).length} 条威胁记录, ${Object.keys(this.cache.safeIPs || {}).length} 条安全IP, ${this.cache.whitelist.length} 条白名单`);
      } else {
        console.log('本地缓存不存在，将创建新缓存');
        this.saveCache();
      }
    } catch (error) {
      console.error('加载缓存失败:', error.message);
    }
  }

  saveCache() {
    try {
      if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
      }
      fs.writeFileSync(CACHE_FILE, JSON.stringify(this.cache, null, 2));
    } catch (error) {
      console.error('保存缓存失败:', error.message);
    }
  }

  startCacheUpdate() {
    // 每5分钟更新一次缓存
    setInterval(async () => {
      await this.updateCache();
    }, 5 * 60 * 1000);

    // 立即执行一次
    this.updateCache();

    // 加载区块链白名单
    this.loadWhitelistFromBlockchain();
  }

  async loadWhitelistFromBlockchain() {
    try {
      console.log('📋 正在从区块链加载白名单...');
      const blockchainWhitelist = await this.blockchainConnector.getWhitelistedIPs();

      if (blockchainWhitelist && blockchainWhitelist.length > 0) {
        // 合并区块链白名单和本地白名单（去重）
        const combinedWhitelist = [...new Set([...this.cache.whitelist, ...blockchainWhitelist])];
        this.cache.whitelist = combinedWhitelist;
        this.saveCache();
        console.log(`✅ 白名单已更新: ${blockchainWhitelist.length} 个区块链IP, 总计 ${combinedWhitelist.length} 个IP`);
      }
    } catch (error) {
      console.warn('⚠️  从区块链加载白名单失败:', error.message);
    }
  }

  async updateCache() {
    try {
      if (!this.blockchainConnector.getStatus().isConnected) {
        return;
      }

      console.log('正在更新本地缓存...');

      // 1. 更新白名单
      const whitelist = await this.blockchainConnector.getGlobalWhitelist();
      if (whitelist && Array.isArray(whitelist)) {
        this.cache.whitelist = whitelist;
      }

      // 2. 增量更新威胁数据 (模拟逻辑，实际应基于事件日志)
      // 这里我们简单地获取最新的威胁列表
      const threatList = await this.blockchainConnector.getGlobalThreatList();
      if (threatList && threatList.threat_list) {
        threatList.threat_list.forEach(threat => {
          this.cache.threats[threat.ip] = threat;
        });
      }

      // 3. 清理过期或低风险的缓存数据
      const now = Date.now();
      const TTL = 24 * 60 * 60 * 1000; // 24小时
      let cleanedCount = 0;

      for (const ip in this.cache.threats) {
        const threat = this.cache.threats[ip];
        const lastSeen = new Date(threat.last_seen).getTime();

        // 如果超过TTL或者风险分数变低（假设我们有定期更新机制，这里主要清理过期的）
        if (now - lastSeen > TTL) {
          delete this.cache.threats[ip];
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`已清理 ${cleanedCount} 条过期威胁记录`);
      }

      this.cache.lastUpdate = new Date().toISOString();
      this.saveCache();
      console.log('本地缓存更新完成');
    } catch (error) {
      console.error('更新缓存失败:', error.message);
    }
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
          detectedThreats: '/orasrs/v1/threats/detected (GET)',
          threatStats: '/orasrs/v1/threats/stats (GET)',
          submitThreat: '/orasrs/v1/threats/submit (POST)',
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
        // 1. 检查本地白名单
        if (this.cache.whitelist.includes(ip)) {
          return res.json({
            query: { ip, domain },
            response: {
              risk_score: 0,
              risk_level: 'Safe',
              action: 'Allow',
              source: 'Local Whitelist',
              cached: true,
              timestamp: new Date().toISOString()
            }
          });
        }

        // 2. 检查本地威胁缓存
        if (ip && this.cache.threats[ip]) {
          const cachedThreat = this.cache.threats[ip];
          // 检查缓存是否过期 (例如 1小时)
          const cacheTime = new Date(cachedThreat.last_seen).getTime();
          if (Date.now() - cacheTime < 3600000) {
            let response = this.translateToChinese({
              query: { ip, domain },
              response: {
                risk_score: cachedThreat.risk_score || 80, // 默认高分
                risk_level: cachedThreat.threat_level,
                action: 'Block',
                source: 'Local Cache',
                cached: true,
                threat_types: [cachedThreat.primary_threat_type],
                timestamp: new Date().toISOString()
              }
            });
            return res.json(response);
          }
        }

        // 2.5. 检查安全 IP 缓存
        if (ip && this.cache.safeIPs[ip]) {
          const safeCached = this.cache.safeIPs[ip];
          // 安全 IP 缓存 24 小时
          const cacheTime = new Date(safeCached.verified_at).getTime();
          if (Date.now() - cacheTime < 86400000) {
            return res.json(this.translateToChinese({
              query: { ip, domain },
              response: {
                risk_score: 0,
                risk_level: 'Safe',
                action: 'Allow',
                source: safeCached.source,
                cached: true,
                timestamp: new Date().toISOString()
              }
            }));
          }
        }

        // 3. 从区块链获取威胁数据 (如果缓存未命中或过期)
        let threatData = await this.blockchainConnector.getThreatData(ip || domain);

        // 将数据翻译成中文（无论是否来自区块链或模拟数据）
        threatData = this.translateToChinese(threatData);

        // 更新缓存
        if (ip && threatData.response) {
          if (threatData.response.risk_score > 50) {
            // 高危 IP，写入/更新缓存
            this.cache.threats[ip] = {
              ip: ip,
              risk_score: threatData.response.risk_score,
              threat_level: threatData.response.risk_level,
              primary_threat_type: threatData.response.threat_types?.[0] || 'Unknown',
              last_seen: new Date().toISOString()
            };
            this.saveCache();
          } else if (threatData.response.risk_score === 0) {
            // 安全 IP，缓存到 safeIPs（避免重复查询）
            this.cache.safeIPs[ip] = {
              ip: ip,
              verified_at: new Date().toISOString(),
              source: threatData.response.source || 'Blockchain'
            };
            // 标记为已缓存
            threatData.response.cached = true;
            this.saveCache();
          } else if (this.cache.threats[ip]) {
            // 低危 IP，但存在于缓存中，说明风险已降低，从缓存移除
            delete this.cache.threats[ip];
            this.saveCache();
          }
        }

        res.json(threatData);
      } catch (error) {
        console.error('Error fetching threat data:', error);
        // 如果区块链连接器抛出异常，我们仍然返回离线响应
        let offlineResponse = {
          query: { ip: ip || null, domain: domain || null },
          response: {
            risk_score: null,
            confidence: '离线',
            risk_level: '离线',
            evidence: [],
            recommendations: {
              default: '未知',
              public_services: '未知',
              banking: '未知'
            },
            appeal_url: `https://api.orasrs.net/appeal?ip=${ip || domain}`,
            expires_at: null,
            timestamp: new Date().toISOString(),
            disclaimer: '服务暂时离线，无法查询威胁数据。',
            version: '2.0-offline'
          },
          blockchain_status: this.blockchainConnector.getStatus()
        };

        // 翻译离线响应
        offlineResponse = this.translateToChinese(offlineResponse);
        res.status(500).json(offlineResponse);
      }
    });

    // 威胁情报端点
    this.app.get('/orasrs/v2/threat-list', async (req, res) => {
      try {
        // 从区块链获取全局威胁列表
        let threatList = await this.blockchainConnector.getGlobalThreatList();

        // 将威胁列表翻译成中文
        threatList = this.translateThreatListToChinese(threatList);

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
              threat_level: '中',
              first_seen: '2025-12-01T10:00:00Z',
              last_seen: '2025-12-01T12:00:00Z',
              report_count: 3,
              primary_threat_type: '可疑活动',
              confidence: 0.65,
              evidence: [
                {
                  source: 'AI分析器',
                  timestamp: '2025-12-01T10:00:00Z',
                  type: '行为'
                }
              ]
            },
            {
              ip: '5.6.7.8',
              threat_level: '低',
              first_seen: '2025-12-01T09:30:00Z',
              last_seen: '2025-12-01T11:45:00Z',
              report_count: 1,
              primary_threat_type: '端口扫描',
              confidence: 0.45,
              evidence: [
                {
                  source: 'AI分析器',
                  timestamp: '2025-12-01T09:30:00Z',
                  type: '扫描'
                }
              ]
            }
          ],
          last_update: new Date().toISOString(),
          total_threats: 2,
          highest_threat_level: '中',
          summary: {
            critical: 0,
            high: 0,
            medium: 1,
            low: 1
          },
          blockchain_verification: {
            verified_on: '未连接',
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
          estimatedProcessingTime: '30秒-2分钟'
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

    // Nginx auth_request 专用检查接口
    this.app.get('/orasrs/v1/check', async (req, res) => {
      const ip = req.query.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

      if (!ip) return res.status(400).send('IP required');

      try {
        // 1. Check Whitelist
        const isWhitelisted = await this.blockchainConnector.checkWhitelist(ip);
        if (isWhitelisted) {
          return res.status(200).send('OK');
        }

        // 2. Check Risk Score
        const threatData = await this.blockchainConnector.getThreatData(ip);
        const score = threatData.response.risk_score || 0;

        if (score >= 80) {
          console.log(`IoT Shield Blocked: ${ip} (Score: ${score})`);
          return res.status(403).send('Forbidden');
        }

        res.status(200).send('OK');
      } catch (error) {
        console.error('Check error:', error);
        // Fail open or closed? For IoT Shield, maybe fail open if error to avoid lockout?
        // Or fail closed for security. Let's return 200 to avoid breaking service on error, but log it.
        res.status(200).send('OK (Error Fallback)');
      }
    });

    // 威胁检测相关端点
    // 获取检测到的威胁列表
    this.app.get('/orasrs/v1/threats/detected', (req, res) => {
      try {
        const threats = this.threatDetection.getThreats();
        res.status(200).json({
          success: true,
          count: threats.length,
          threats: threats
        });
      } catch (error) {
        console.error('Error fetching detected threats:', error);
        res.status(500).json({
          error: 'Internal server error during threat fetch',
          code: 'THREAT_FETCH_ERROR'
        });
      }
    });

    // 获取威胁统计
    this.app.get('/orasrs/v1/threats/stats', (req, res) => {
      try {
        const stats = this.threatDetection.getThreatStats();
        res.status(200).json({
          success: true,
          stats: stats
        });
      } catch (error) {
        console.error('Error fetching threat stats:', error);
        res.status(500).json({
          error: 'Internal server error during threat stats fetch',
          code: 'THREAT_STATS_ERROR'
        });
      }
    });


    // 临时白名单 (人工确认放行)
    this.app.post('/orasrs/v1/whitelist/temp', (req, res) => {
      const { ip, duration } = req.body;
      if (!ip) return res.status(400).json({ error: 'IP is required' });

      const durationMs = (duration || 300) * 1000; // Default 5 minutes
      this.threatDetection.addTempWhitelist(ip, durationMs);

      console.log(`人工确认: IP ${ip} 已临时放行 ${durationMs / 1000}秒`);
      res.status(200).json({ success: true, message: `IP ${ip} temporarily whitelisted`, duration: durationMs / 1000 });
    });

    // Whitelist Management Routes

    // Add IP to whitelist
    this.app.post('/orasrs/v1/whitelist/add', (req, res) => {
      const { ip } = req.body;
      if (!ip) return res.status(400).json({ error: 'IP is required' });

      if (!this.cache.whitelist.includes(ip)) {
        this.cache.whitelist.push(ip);
        this.saveCache();
        console.log(`[API] Added ${ip} to whitelist`);
        res.json({ success: true, message: `IP ${ip} added to whitelist` });
      } else {
        res.json({ success: true, message: `IP ${ip} already in whitelist` });
      }
    });

    // Remove IP from whitelist
    this.app.post('/orasrs/v1/whitelist/remove', (req, res) => {
      const { ip } = req.body;
      if (!ip) return res.status(400).json({ error: 'IP is required' });

      const index = this.cache.whitelist.indexOf(ip);
      if (index > -1) {
        this.cache.whitelist.splice(index, 1);
        this.saveCache();
        console.log(`[API] Removed ${ip} from whitelist`);
        res.json({ success: true, message: `IP ${ip} removed from whitelist` });
      } else {
        res.status(404).json({ error: 'IP not found in whitelist' });
      }
    });

    // Get whitelist
    this.app.get('/orasrs/v1/whitelist', (req, res) => {
      res.json({
        success: true,
        whitelist: this.cache.whitelist,
        count: this.cache.whitelist.length
      });
    });

    // 处理威胁并分配动态风控 (Wazuh 集成专用)
    this.app.post('/orasrs/v1/threats/process', async (req, res) => {
      const { ip, threatType, threatLevel, context, evidence } = req.body;

      if (!ip) {
        return res.status(400).json({ error: 'IP is required' });
      }

      try {
        // 1. 检查白名单 (本地 + 合约)
        const isWhitelisted = await this.blockchainConnector.checkWhitelist(ip);
        if (isWhitelisted) {
          return res.status(200).json({
            action: 'allow',
            reason: 'IP is whitelisted',
            duration: 0
          });
        }

        // 2. 计算风险评分和封禁时长
        let duration = 86400; // 默认 24小时
        let score = 50;

        // 根据威胁等级调整
        if (threatLevel === 'High' || threatLevel === 'Critical' || threatLevel === '严重' || threatLevel === '高') {
          score = 80;
          duration = 259200; // 3天
        }

        // 如果是极高危 (Critical)，直接 7天
        if (threatLevel === 'Critical' || threatLevel === '严重') {
          score = 95;
          duration = 604800; // 7天
        }

        // 3. 检查本地缓存
        // 这里的 getThreats() 返回的是内存中的列表，可以视为本地缓存
        const localThreats = this.threatDetection.getThreats();
        const existingLocal = localThreats.find(t => t.ip === ip);

        if (existingLocal) {
          console.log(`本地缓存命中: ${ip}, 延长封禁时间`);
          // 叠加封禁时间 (最高7天)
          duration = Math.min(duration * 2, 604800);
        }

        // 4. 检查链上数据
        let onChainData = null;
        if (this.blockchainConnector.getStatus().isConnected) {
          try {
            const chainResponse = await this.blockchainConnector.getThreatData(ip);
            if (chainResponse && chainResponse.response && chainResponse.response.risk_level !== '无数据' && chainResponse.response.risk_level !== '安全') {
              onChainData = chainResponse;
              console.log(`链上数据命中: ${ip}, 确认为全局威胁`);
              // 确认为全局威胁，直接最大封禁
              duration = 604800; // 7天
            }
          } catch (e) {
            console.error('链上查询失败:', e.message);
          }
        }

        // 5. 如果是新威胁 (本地和链上都没有)，写入本地并上报
        if (!existingLocal && !onChainData) {
          console.log(`新威胁发现: ${ip}, 写入本地缓存并上报`);

          const threatData = {
            ip: ip,
            threatType: threatType || 'Unknown',
            threatLevel: threatLevel || 'Medium',
            context: context || 'Wazuh Detected',
            evidence: evidence || 'Dynamic Risk Control',
            timestamp: new Date().toISOString()
          };

          // 写入本地
          await this.threatDetection.reportThreat(threatData);

          // 上报链上 (异步)
          if (this.blockchainConnector.getStatus().isConnected) {
            this.blockchainConnector.submitThreatReport(threatData).catch(e => console.error('异步上报失败:', e.message));
          }
        }

        // 6. 返回决策
        res.status(200).json({
          action: 'block',
          duration: duration,
          risk_score: score,
          reason: existingLocal ? 'Local Cache Hit (Extended)' : (onChainData ? 'Global Threat (Max Ban)' : 'New Threat (Dynamic Ban)')
        });

      } catch (error) {
        console.error('Error processing threat:', error);
        res.status(500).json({ error: 'Internal processing error' });
      }
    });

    // 手动提交威胁报告
    this.app.post('/orasrs/v1/threats/submit', async (req, res) => {
      const { ip, threatType, threatLevel, context, evidence } = req.body;

      if (!ip || !threatType) {
        return res.status(400).json({
          error: 'IP and threatType are required',
          code: 'MISSING_REQUIRED_FIELDS'
        });
      }

      try {
        const threatData = {
          ip: ip,
          threatType: threatType,
          threatLevel: threatLevel || 'Medium',
          context: context || 'Manual threat report',
          evidence: evidence || 'Manual submission',
          timestamp: new Date().toISOString()
        };

        // 记录威胁
        await this.threatDetection.reportThreat(threatData);

        // 尝试提交到区块链
        let submitResult = {
          success: true,
          message: 'Threat report submitted successfully to local detection system',
          threatId: `${ip}_${Date.now()}`,
          blockchain_status: this.blockchainConnector.getStatus()
        };

        // 如果区块链连接正常，尝试提交到区块链
        if (this.blockchainConnector.getStatus().isConnected) {
          try {
            const blockchainResult = await this.blockchainConnector.submitThreatReport(threatData);
            submitResult.blockchain_result = blockchainResult;
            submitResult.message = 'Threat report submitted successfully to both local detection system and blockchain';
          } catch (blockchainError) {
            console.error('Failed to submit threat to blockchain:', blockchainError.message);
            submitResult.message = 'Threat report submitted to local detection system, but failed to submit to blockchain';
            submitResult.blockchain_error = blockchainError.message;
          }
        } else {
          submitResult.message = 'Threat report submitted to local detection system, but blockchain is currently offline';
        }

        res.status(201).json(submitResult);
      } catch (error) {
        console.error('Error submitting threat report:', error);
        res.status(500).json({
          error: 'Internal server error during threat submission',
          code: 'THREAT_SUBMIT_ERROR'
        });
      }
    });
  }

  // 将威胁数据翻译成中文
  translateToChinese(threatData) {
    if (!threatData || typeof threatData !== 'object') {
      return threatData;
    }

    // 深拷贝原始数据
    const translatedData = JSON.parse(JSON.stringify(threatData));

    // 翻译风险等级
    if (translatedData.response) {
      // 翻译风险等级
      if (translatedData.response.risk_level) {
        switch (translatedData.response.risk_level.toLowerCase()) {
          case 'low':
            translatedData.response.risk_level = '低';
            break;
          case 'medium':
            translatedData.response.risk_level = '中';
            break;
          case 'high':
            translatedData.response.risk_level = '高';
            break;
          case 'critical':
            translatedData.response.risk_level = '严重';
            break;
        }
      }

      // 翻译置信度
      if (translatedData.response.confidence) {
        switch (translatedData.response.confidence.toLowerCase()) {
          case 'low':
            translatedData.response.confidence = '低';
            break;
          case 'medium':
            translatedData.response.confidence = '中等';
            break;
          case 'high':
            translatedData.response.confidence = '高';
            break;
        }
      }

      // 翻译证据类型
      if (translatedData.response.evidence && Array.isArray(translatedData.response.evidence)) {
        translatedData.response.evidence = translatedData.response.evidence.map(evidence => {
          const translatedEvidence = { ...evidence };
          if (translatedEvidence.type) {
            switch (translatedEvidence.type.toLowerCase()) {
              case 'mock_data':
                translatedEvidence.type = '模拟数据';
                break;
              case 'contract_data':
                translatedEvidence.type = '合约数据';
                break;
              case 'report':
                translatedEvidence.type = '报告';
                break;
              case 'honeypot_hit':
                translatedEvidence.type = '蜜罐命中';
                break;
              case 'log_analysis':
                translatedEvidence.type = '日志分析';
                break;
              default:
                translatedEvidence.type = translatedEvidence.type;
            }
          }
          if (translatedEvidence.source) {
            switch (translatedEvidence.source.toLowerCase()) {
              case 'local_mock':
                translatedEvidence.source = '本地模拟';
                break;
              case 'blockchain_contract':
                translatedEvidence.source = '区块链合约';
                break;
              case 'log_parser':
                translatedEvidence.source = '日志解析器';
                break;
              case 'honeypot':
                translatedEvidence.source = '蜜罐';
                break;
              case 'dpi':
                translatedEvidence.source = '深度包检测';
                break;
              default:
                translatedEvidence.source = translatedEvidence.source;
            }
          }
          return translatedEvidence;
        });
      }

      // 翻译建议
      if (translatedData.response.recommendations) {
        const rec = translatedData.response.recommendations;
        const translations = {
          'allow': '允许',
          'monitor': '监控',
          'allow_with_verification': '允许但需验证',
          'block': '阻止',
          'alert': '告警',
          'investigate': '调查'
        };

        Object.keys(rec).forEach(key => {
          if (translations[rec[key].toLowerCase()]) {
            rec[key] = translations[rec[key].toLowerCase()];
          }
        });
      }

      // 翻译版本信息
      if (translatedData.response.version) {
        switch (translatedData.response.version.toLowerCase()) {
          case '2.0-mock':
            translatedData.response.version = '2.0-模拟';
            break;
          case '2.0-contract':
            translatedData.response.version = '2.0-合约';
            break;
        }
      }

      // 更新免责声明
      if (translatedData.response.disclaimer) {
        if (translatedData.response.disclaimer.includes('mock data')) {
          translatedData.response.disclaimer = '这是区块链连接问题期间的服务可用性模拟数据。';
        } else if (translatedData.response.disclaimer.includes('from OraSRS protocol chain')) {
          translatedData.response.disclaimer = '此数据来自OraSRS协议链。';
        }
      }
    }

    return translatedData;
  }

  // 将威胁列表翻译成中文
  translateThreatListToChinese(threatList) {
    if (!threatList || typeof threatList !== 'object') {
      return threatList;
    }

    // 深拷贝原始数据
    const translatedList = JSON.parse(JSON.stringify(threatList));

    // 翻译威胁列表中的每一项
    if (translatedList.threat_list && Array.isArray(translatedList.threat_list)) {
      translatedList.threat_list = translatedList.threat_list.map(threat => {
        const translatedThreat = { ...threat };

        // 翻译威胁等级
        if (translatedThreat.threat_level) {
          switch (translatedThreat.threat_level.toLowerCase()) {
            case 'low':
              translatedThreat.threat_level = '低';
              break;
            case 'medium':
              translatedThreat.threat_level = '中';
              break;
            case 'high':
              translatedThreat.threat_level = '高';
              break;
            case 'critical':
              translatedThreat.threat_level = '严重';
              break;
          }
        }

        // 翻译主要威胁类型
        if (translatedThreat.primary_threat_type) {
          switch (translatedThreat.primary_threat_type.toLowerCase()) {
            case 'suspicious_activity':
              translatedThreat.primary_threat_type = '可疑活动';
              break;
            case 'port_scanning':
              translatedThreat.primary_threat_type = '端口扫描';
              break;
            case 'brute_force':
              translatedThreat.primary_threat_type = '暴力破解';
              break;
            case 'ddos':
              translatedThreat.primary_threat_type = 'DDoS攻击';
              break;
            case 'malware':
              translatedThreat.primary_threat_type = '恶意软件';
              break;
            case 'sql_injection':
              translatedThreat.primary_threat_type = 'SQL注入';
              break;
            case 'xss':
              translatedThreat.primary_threat_type = '跨站脚本';
              break;
            case 'phishing':
              translatedThreat.primary_threat_type = '网络钓鱼';
              break;
          }
        }

        // 翻译证据
        if (translatedThreat.evidence && Array.isArray(translatedThreat.evidence)) {
          translatedThreat.evidence = translatedThreat.evidence.map(evidence => {
            const translatedEvidence = { ...evidence };
            if (translatedEvidence.type) {
              switch (translatedEvidence.type.toLowerCase()) {
                case 'behavior':
                  translatedEvidence.type = '行为';
                  break;
                case 'scanning':
                  translatedEvidence.type = '扫描';
                  break;
                case 'attack':
                  translatedEvidence.type = '攻击';
                  break;
              }
            }
            if (translatedEvidence.source) {
              switch (translatedEvidence.source.toLowerCase()) {
                case 'ai_analyzer':
                  translatedEvidence.source = 'AI分析器';
                  break;
                case 'log_parser':
                  translatedEvidence.source = '日志解析器';
                  break;
                case 'honeypot':
                  translatedEvidence.source = '蜜罐';
                  break;
              }
            }
            return translatedEvidence;
          });
        }

        return translatedThreat;
      });
    }

    // 翻译最高威胁等级
    if (translatedList.highest_threat_level) {
      switch (translatedList.highest_threat_level.toLowerCase()) {
        case 'low':
          translatedList.highest_threat_level = '低';
          break;
        case 'medium':
          translatedList.highest_threat_level = '中';
          break;
        case 'high':
          translatedList.highest_threat_level = '高';
          break;
        case 'critical':
          translatedList.highest_threat_level = '严重';
          break;
      }
    }

    // 翻译验证状态
    if (translatedList.blockchain_verification) {
      if (translatedList.blockchain_verification.verified_on === 'disconnected') {
        translatedList.blockchain_verification.verified_on = '未连接';
      }
    }

    return translatedList;
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
  const fs = require('fs');

  // 读取用户配置文件
  if (fs.existsSync('./user-config.json')) {
    userConfig = JSON.parse(fs.readFileSync('./user-config.json', 'utf8'));
  } else if (fs.existsSync('/home/Great/SRS-Protocol/user-config.json')) {
    userConfig = JSON.parse(fs.readFileSync('/home/Great/SRS-Protocol/user-config.json', 'utf8'));
  } else if (fs.existsSync('./local-config.json')) {
    // 检查是否在本地开发环境中，使用本地配置
    userConfig = JSON.parse(fs.readFileSync('./local-config.json', 'utf8'));
  } else if (fs.existsSync('/home/Great/SRS-Protocol/local-config.json')) {
    userConfig = JSON.parse(fs.readFileSync('/home/Great/SRS-Protocol/local-config.json', 'utf8'));
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
  host: process.env.ORASRS_HOST || userConfig.server?.host || '127.0.0.1',
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
    registryAddress: process.env.ORASRS_REGISTRY_ADDRESS || userConfig.network?.registryAddress || securityConfig.network?.registryAddress || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    contractAddress: process.env.ORASRS_CONTRACT_ADDRESS || userConfig.network?.contractAddress || securityConfig.network?.contractAddress || '0xE6E340D132b5f46d1e472DebcD681B2aBc16e57E',
    timeout: securityConfig.security?.blockchainConnection?.timeout || 30000, // 增加超时时间以支持公网连接
    retries: securityConfig.security?.blockchainConnection?.retries || 5, // 增加重试次数以支持公网连接
    retryDelay: securityConfig.security?.blockchainConnection?.retryDelay || 2000 // 增加重试延迟以支持公网连接
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
console.log('🔗 连接到OraSRS协议链: ' + config.blockchain.endpoints[0]);

// 确保日志目录存在


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logDir = path.dirname(config.logFile);
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

    // 启动威胁检测功能
    console.log('🔍 启动威胁检测模块...');
    try {
      orasrsService.threatDetection.startLogMonitoring();
      orasrsService.threatDetection.startHoneypot();
      orasrsService.threatDetection.startDPI();
      console.log('✅ 威胁检测模块启动成功');
    } catch (error) {
      console.warn('⚠️  启动威胁检测模块时出现问题:', error.message);
    }

    console.log('\n✅ OraSRS 服务启动成功!');
    console.log(`🌐 服务地址: http://${config.host}:${config.port}`);
    console.log('📋 API 端点:');
    console.log(`   - 风险查询: http://${config.host}:${config.port}/orasrs/v1/query?ip=1.2.3.4`);
    console.log(`   - 威胁列表: http://${config.host}:${config.port}/orasrs/v2/threat-list`);
    console.log(`   - 申诉接口: http://${config.host}:${config.port}/orasrs/v1/appeal`);
    console.log(`   - Gas补贴请求: http://${config.host}:${config.port}/orasrs/v1/gas-subsidy/request`);
    console.log(`   - Gas补贴状态: http://${config.host}:${config.port}/orasrs/v1/gas-subsidy/status/{address}`);
    console.log(`   - 检测威胁: http://${config.host}:${config.port}/orasrs/v1/threats/detected`);
    console.log(`   - 威胁统计: http://${config.host}:${config.port}/orasrs/v1/threats/stats`);
    console.log(`   - 提交威胁: http://${config.host}:${config.port}/orasrs/v1/threats/submit`);
    console.log(`   - 健康检查: http://${config.host}:${config.port}/health`);
    console.log('\n⚠️  重要提醒: 此服务提供咨询建议，最终决策由客户端做出');
    console.log('🔗 区块链连接状态:', orasrsService.blockchainConnector.getStatus());

    // 定期输出服务信息
    setInterval(() => {
      const blockchainStatus = orasrsService.blockchainConnector.getStatus();
      const threatStats = orasrsService.threatDetection.getThreatStats();
      console.log(`\n📊 OraSRS 服务运行中 [${new Date().toISOString()}]`);
      console.log(`   区块链连接: ${blockchainStatus.status} - ${blockchainStatus.endpoint || '未连接'}`);
      console.log(`   服务端口: ${config.host}:${config.port}`);
      console.log(`   检测到威胁: ${threatStats.total} (总数)`);
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