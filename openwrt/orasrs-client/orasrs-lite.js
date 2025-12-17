#!/usr/bin/env node
/**
 * OraSRS Lite Client - Optimized for OpenWrt/Embedded Devices
 * 
 * Features:
 * - Minimal dependencies (No native build required)
 * - SQLite-based caching (saves RAM)
 * - UCI config file support
 * - Memory footprint < 10MB
 * - Built for MIPS/ARM/x86 architectures
 */

import http from 'http';
import https from 'https';
import fs from 'fs';
import { execSync, spawnSync } from 'child_process';

const CONFIG_FILE = '/etc/config/orasrs';
const DB_PATH = '/var/lib/orasrs/cache.db';
const LOG_FILE = '/var/log/orasrs.log';

/**
 * SQLite Adapter to handle both better-sqlite3 (if available) and sqlite3 CLI (fallback)
 */
class SQLiteAdapter {
    constructor(dbPath, logger, requireFn) {
        this.dbPath = dbPath;
        this.logger = logger;
        this.require = requireFn;
        this.type = 'none';
        this.db = null;

        this.init();
    }

    init() {
        // 1. Try better-sqlite3 (Native, Fast)
        try {
            if (this.require) {
                const Database = this.require('better-sqlite3');
                this.db = new Database(this.dbPath);
                this.type = 'better-sqlite3';
                this.logger('Using native better-sqlite3 adapter', 'info');
            } else {
                throw new Error('Require not available');
            }
        } catch (e) {
            // 2. Fallback to sqlite3 CLI (Slower, but no deps)
            try {
                execSync('sqlite3 -version');
                this.type = 'cli';
                this.logger('Using sqlite3 CLI adapter (fallback)', 'info');
            } catch (cliError) {
                this.logger('FATAL: No sqlite3 provider found. Install better-sqlite3 or sqlite3-cli.', 'error');
                process.exit(1);
            }
        }
    }

    exec(sql) {
        if (this.type === 'better-sqlite3') {
            return this.db.exec(sql);
        } else {
            // CLI exec
            try {
                spawnSync('sqlite3', [this.dbPath, sql]);
            } catch (e) {
                this.logger(`CLI exec error: ${e.message}`, 'error');
            }
        }
    }

    prepare(sql) {
        if (this.type === 'better-sqlite3') {
            return this.db.prepare(sql);
        } else {
            return new CLIStatement(this.dbPath, sql, this.logger);
        }
    }

    transaction(fn) {
        if (this.type === 'better-sqlite3') {
            return this.db.transaction(fn);
        } else {
            // CLI transaction simulation (naive)
            return (...args) => {
                this.exec('BEGIN TRANSACTION;');
                try {
                    const result = fn(...args);
                    this.exec('COMMIT;');
                    return result;
                } catch (e) {
                    this.exec('ROLLBACK;');
                    throw e;
                }
            };
        }
    }

    close() {
        if (this.type === 'better-sqlite3') {
            this.db.close();
        }
    }
}

class CLIStatement {
    constructor(dbPath, sql, logger) {
        this.dbPath = dbPath;
        this.sql = sql;
        this.logger = logger;
    }

    run(...params) {
        const boundSql = this.bindParams(this.sql, params);
        try {
            spawnSync('sqlite3', [this.dbPath, boundSql]);
            return { changes: 1 }; // Mock return
        } catch (e) {
            this.logger(`CLI run error: ${e.message}`, 'error');
            return { changes: 0 };
        }
    }

    get(...params) {
        const boundSql = this.bindParams(this.sql, params);
        try {
            // Use -json for easier parsing if available, else -line
            // OpenWrt sqlite3-cli usually supports -line or -list
            // Let's use -header -line for robustness or just -json if version allows.
            // Safest for OpenWrt is often standard output with separator.

            // Let's try JSON output first
            const res = spawnSync('sqlite3', [this.dbPath, '-json', boundSql]);
            if (res.status === 0 && res.stdout.length > 0) {
                const data = JSON.parse(res.stdout.toString());
                return data[0];
            }
            return undefined;
        } catch (e) {
            // Fallback if -json not supported (older sqlite3)
            // This is a simplified fallback, might need robust parsing
            return undefined;
        }
    }

    // Simple parameter binding (WARNING: Not SQL injection safe for untrusted input, but OK for internal logic)
    bindParams(sql, params) {
        let bound = sql;
        for (const param of params) {
            let val = param;
            if (typeof val === 'string') {
                val = `'${val.replace(/'/g, "''")}'`;
            } else if (val === null || val === undefined) {
                val = 'NULL';
            }
            bound = bound.replace('?', val);
        }
        return bound;
    }
}

class OraSRSLiteClient {
    constructor() {
        // Create require for dynamic loading
        import('module').then(m => {
            this.require = m.createRequire(import.meta.url);
            this.start();
        });
    }

    start() {
        this.log = this.log.bind(this); // Bind log for adapter
        this.config = this.loadConfig();
        this.db = this.initDatabase();
        this.stats = {
            totalQueries: 0,
            cacheHits: 0,
            blockCount: 0
        };

        // 启动定时同步
        this.startAutoSync();

        if (this.config.enabled) {
            this.startServer();
        } else {
            this.log('OraSRS is disabled in config', 'warn');
            process.exit(0);
        }
    }

    /**
     * 加载配置文件（支持 UCI 和 JSON）
     */
    loadConfig() {
        try {
            // 尝试读取 UCI 配置
            if (fs.existsSync(CONFIG_FILE)) {
                return this.parseUCIConfig();
            }

            // 降级到 JSON 配置
            const jsonConfig = '/etc/orasrs/config.json';
            if (fs.existsSync(jsonConfig)) {
                return JSON.parse(fs.readFileSync(jsonConfig, 'utf8'));
            }

            // 使用默认配置
            return this.getDefaultConfig();
        } catch (error) {
            this.log(`Config load error: ${error.message}`, 'warn');
            return this.getDefaultConfig();
        }
    }

    /**
     * 解析 UCI 配置格式
     */
    parseUCIConfig() {
        try {
            const uciData = execSync('uci show orasrs', { encoding: 'utf8' });
            const config = {
                enabled: true,
                apiEndpoint: 'https://api.orasrs.net',
                syncInterval: 3600,
                cacheSize: 1000,
                logLevel: 'info',
                iotShield: {
                    enabled: false,
                    mode: 'monitor',
                    blockThreshold: 80
                }
            };

            uciData.split('\n').forEach(line => {
                if (line.includes('=')) {
                    const [key, rawValue] = line.split('=');
                    const value = rawValue.replace(/'/g, '').trim();
                    const keyParts = key.split('.');

                    if (keyParts[2] === 'enabled') {
                        config.enabled = value === '1';
                    } else if (keyParts[2] === 'api_endpoint') {
                        config.apiEndpoint = value;
                    } else if (keyParts[2] === 'sync_interval') {
                        config.syncInterval = parseInt(value);
                    } else if (keyParts[2] === 'cache_size') {
                        config.cacheSize = parseInt(value);
                    } else if (keyParts[1] === 'iot_shield') {
                        if (keyParts[2] === 'enabled') {
                            config.iotShield.enabled = value === '1';
                        } else if (keyParts[2] === 'shield_mode') {
                            config.iotShield.mode = value;
                        } else if (keyParts[2] === 'block_threshold') {
                            config.iotShield.blockThreshold = parseInt(value);
                        }
                    }
                }
            });

            return config;
        } catch (error) {
            this.log(`UCI parse error: ${error.message}`, 'warn');
            return this.getDefaultConfig();
        }
    }

    getDefaultConfig() {
        return {
            enabled: true,
            apiEndpoint: 'https://api.orasrs.net',
            blockchainEndpoints: [
                'https://api.orasrs.net',
                'http://127.0.0.1:8545'  // 本地 Hardhat 节点
            ],
            syncInterval: 3600,
            cacheSize: 1000,
            logLevel: 'info',
            port: 3006,
            offlineMode: 'auto',  // auto, enabled, disabled
            iotShield: {
                enabled: false,
                mode: 'monitor',
                blockThreshold: 80
            }
        };
    }

    /**
     * 初始化 SQLite 数据库
     */
    initDatabase() {
        try {
            const dbDir = '/var/lib/orasrs';
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            // Use Adapter
            const db = new SQLiteAdapter(DB_PATH, this.log, this.require);

            // 创建表
            db.exec(`
        CREATE TABLE IF NOT EXISTS threats (
          ip TEXT PRIMARY KEY,
          risk_score INTEGER,
          threat_type TEXT,
          source TEXT,
          first_seen TEXT,
          last_seen TEXT,
          expires_at INTEGER
        );

        CREATE TABLE IF NOT EXISTS whitelist (
          ip TEXT PRIMARY KEY,
          added_at TEXT,
          reason TEXT
        );

        CREATE TABLE IF NOT EXISTS stats (
          key TEXT PRIMARY KEY,
          value TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_expires ON threats(expires_at);
      `);

            return db;
        } catch (error) {
            this.log(`Database init error: ${error.message}`, 'error');
            process.exit(1);
        }
    }

    /**
     * 查询 IP 风险评分
     */
    async queryIP(ip) {
        this.stats.totalQueries++;

        // 1. 检查白名单
        const whitelisted = this.db.prepare(
            'SELECT ip FROM whitelist WHERE ip = ?'
        ).get(ip);

        if (whitelisted) {
            return {
                ip,
                risk_score: 0,
                risk_level: 'Safe',
                source: 'Local Whitelist',
                cached: true
            };
        }

        // 2. 检查本地缓存
        const now = Math.floor(Date.now() / 1000);
        const cached = this.db.prepare(
            'SELECT * FROM threats WHERE ip = ? AND expires_at > ?'
        ).get(ip, now);

        if (cached) {
            this.stats.cacheHits++;
            return {
                ip,
                risk_score: cached.risk_score,
                risk_level: this.getRiskLevel(cached.risk_score),
                threat_type: cached.threat_type,
                source: cached.source,
                first_seen: cached.first_seen,
                last_seen: cached.last_seen,
                cached: true
            };
        }

        // 3. 查询远程 API
        try {
            const result = await this.queryRemote(ip);

            // 缓存结果
            if (result.risk_score > 0) {
                const expiresAt = now + (24 * 3600); // 24小时
                this.db.prepare(`
          INSERT OR REPLACE INTO threats 
          (ip, risk_score, threat_type, source, first_seen, last_seen, expires_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
                    ip,
                    result.risk_score,
                    result.threat_type || 'Unknown',
                    result.source || 'Remote',
                    result.first_seen || new Date().toISOString(),
                    new Date().toISOString(),
                    expiresAt
                );
            }

            return result;
        } catch (error) {
            this.log(`Query error for ${ip}: ${error.message}`, 'error');
            return {
                ip,
                risk_score: null,
                risk_level: 'Unknown',
                error: error.message
            };
        }
    }

    /**
     * 查询远程 API (优化版: 使用 getThreat 直接查询区块链)
     * 参考 Linux 客户端 BlockchainConnector 实现
     */
    async queryRemote(ip) {
        // 转换 IP 为 bytes4 (hex)
        const ipHex = this.ipToHex(ip);
        if (!ipHex) return { ip, error: 'Invalid IP' };

        // 构造 eth_call 请求
        // getThreat(bytes4) selector: 0x5a92e589
        // 参数: ipHex (padded to 32 bytes)
        const data = '0x5a92e589' + ipHex.padEnd(64, '0');

        const endpoints = this.config.blockchainEndpoints || ['https://api.orasrs.net'];

        for (const endpoint of endpoints) {
            try {
                const result = await this.rpcCall(endpoint, 'eth_call', [{
                    to: '0xE6E340D132b5f46d1e472DebcD681B2aBc16e57E',
                    data: data
                }, 'latest']);

                if (result && result !== '0x') {
                    // 解析返回结果: ThreatInfo struct (uint64 expiry, uint8 riskLevel, uint8 mask, uint16 sourceMask)
                    // ABI 编码: 每个字段填充为 32 字节 (64 hex chars)
                    // 总长度: 4 * 32 = 128 bytes (256 hex chars)

                    const cleanResult = result.replace('0x', '');
                    if (cleanResult.length < 256) {
                        // 可能是旧合约或空数据
                        return { ip, risk_score: 0, risk_level: 'Safe', source: 'OraSRS Chain', cached: false };
                    }

                    // 0-64 chars: expiry (uint64)
                    const expiryHex = cleanResult.substr(0, 64);
                    const expiry = parseInt(expiryHex, 16);

                    // 64-128 chars: riskLevel (uint8)
                    const riskLevelHex = cleanResult.substr(64, 64);
                    const riskLevel = parseInt(riskLevelHex, 16);

                    // 128-192 chars: mask (uint8)
                    const maskHex = cleanResult.substr(128, 64);
                    const mask = parseInt(maskHex, 16);

                    // 192-256 chars: sourceMask (uint16)
                    const sourceMaskHex = cleanResult.substr(192, 64);
                    const sourceMask = parseInt(sourceMaskHex, 16);

                    // 检查是否过期或无风险
                    const now = Math.floor(Date.now() / 1000);
                    if (expiry <= now || riskLevel === 0) {
                        return {
                            ip,
                            risk_score: 0,
                            risk_level: 'Safe',
                            source: 'OraSRS Chain',
                            cached: false
                        };
                    }

                    return {
                        ip,
                        risk_score: this.riskLevelToScore(riskLevel),
                        risk_level: this.getRiskLevelStr(riskLevel),
                        threat_type: 'Blockchain Verified',
                        source: 'OraSRS Chain',
                        expires_at: expiry,
                        mask: mask,
                        cached: false
                    };
                }
            } catch (e) {
                this.log(`RPC query failed on ${endpoint}: ${e.message}`, 'warn');
                // 如果是最后一个端点，返回具体错误
                if (endpoint === endpoints[endpoints.length - 1]) {
                    return { ip, risk_score: null, error: `RPC failed: ${e.message}` };
                }
            }
        }

        return { ip, risk_score: null, error: 'All RPC endpoints failed' };
    }

    /**
     * JSON-RPC 调用辅助函数 (增强版)
     */
    rpcCall(endpoint, method, params) {
        return new Promise((resolve, reject) => {
            try {
                const url = new URL(endpoint);
                const options = {
                    hostname: url.hostname,
                    port: url.port || (url.protocol === 'https:' ? 443 : 80),
                    path: url.pathname === '/' ? '' : url.pathname,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'OraSRS-OpenWrt-Client/3.3.5',
                        'Connection': 'keep-alive'
                    },
                    timeout: 10000 // 增加超时时间
                };

                const postData = JSON.stringify({
                    jsonrpc: '2.0',
                    method: method,
                    params: params,
                    id: Date.now()
                });

                options.headers['Content-Length'] = Buffer.byteLength(postData);

                const protocol = url.protocol === 'https:' ? https : http;
                const req = protocol.request(options, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        try {
                            if (res.statusCode !== 200) {
                                reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 100)}`));
                                return;
                            }
                            // 检查空响应
                            if (!data) {
                                reject(new Error('Empty response from server'));
                                return;
                            }

                            const parsed = JSON.parse(data);
                            if (parsed.error) {
                                reject(new Error(`RPC Error ${parsed.error.code}: ${parsed.error.message}`));
                            } else {
                                resolve(parsed.result);
                            }
                        } catch (e) {
                            reject(new Error(`Invalid JSON response: ${e.message}`));
                        }
                    });
                });

                req.on('error', (e) => reject(new Error(`Network error: ${e.message}`)));
                req.on('timeout', () => {
                    req.destroy();
                    reject(new Error('Request timeout'));
                });

                req.write(postData);
                req.end();
            } catch (e) {
                reject(new Error(`URL Parse error: ${e.message}`));
            }
        });
    }

    ipToHex(ip) {
        const parts = ip.split('.');
        if (parts.length !== 4) return null;
        return parts.map(p => parseInt(p).toString(16).padStart(2, '0')).join('');
    }

    riskLevelToScore(level) {
        // 0=Safe, 1=Low(20), 2=Medium(50), 3=High(80), 4=Critical(100)
        const scores = [0, 20, 50, 80, 100];
        return scores[level] || 0;
    }

    getRiskLevelStr(level) {
        const levels = ['Safe', 'Low', 'Medium', 'High', 'Critical'];
        return levels[level] || 'Unknown';
    }

    getRiskLevel(score) { // Keep for compatibility
        if (score >= 90) return 'Critical';
        if (score >= 70) return 'High';
        if (score >= 40) return 'Medium';
        if (score > 0) return 'Low';
        return 'Safe';
    }

    /**
     * 同步威胁情报 - 增强版
     * 支持多端点、公共源回退、指数退避重试
     */
    async syncThreats() {
        const maxRetries = 3;
        const initialDelay = 1000; // 1秒

        // 尝试从区块链同步
        for (let retry = 0; retry < maxRetries; retry++) {
            try {
                if (retry > 0) {
                    const delay = initialDelay * Math.pow(2, retry - 1);
                    this.log(`Retry ${retry}/${maxRetries} after ${delay}ms...`, 'info');
                    await this.delay(delay);
                }

                this.log('Starting threat sync from blockchain (RPC)...', 'info');
                const success = await this.syncFromBlockchain();

                if (success) {
                    this.log('✓ Blockchain sync successful', 'info');
                    return;
                }
            } catch (error) {
                this.log(`Blockchain sync attempt ${retry + 1} failed: ${error.message}`, 'warn');
            }
        }

        // 回退到公共威胁源
        this.log('Blockchain unavailable, falling back to public feeds...', 'warn');
        try {
            const success = await this.syncFromPublicFeeds();
            if (success) {
                this.log('✓ Public feed sync successful', 'info');
                return;
            }
        } catch (error) {
            this.log(`Public feed sync failed: ${error.message}`, 'error');
        }

        // 离线模式 - 使用缓存数据
        this.log('⚠ Offline mode: Using cached threat data', 'warn');
        const cacheCount = this.db.prepare('SELECT COUNT(*) as count FROM threats WHERE expires_at > ?')
            .get(Math.floor(Date.now() / 1000));
        if (cacheCount) {
            this.log(`Cached threats: ${cacheCount.count}`, 'info');
        }
    }

    /**
     * 从区块链同步威胁情报 (eth_getLogs)
     */
    async syncFromBlockchain() {
        const endpoints = this.config.blockchainEndpoints || ['https://api.orasrs.net'];
        const contractAddress = '0xE6E340D132b5f46d1e472DebcD681B2aBc16e57E';
        // ThreatUpdated(bytes4,uint8,uint64,uint8)
        const topic = '0xbf9c82a2e49583ea8990e5994f020f8ff61f2a9a5ae067d4df0d0fe8d76b7863';

        for (const endpoint of endpoints) {
            try {
                // Get latest block
                const blockNumHex = await this.rpcCall(endpoint, 'eth_blockNumber', []);
                const currentBlock = parseInt(blockNumHex, 16);
                const fromBlock = Math.max(0, currentBlock - 5000); // Last 5000 blocks (~1 day on some chains)

                const logs = await this.rpcCall(endpoint, 'eth_getLogs', [{
                    fromBlock: '0x' + fromBlock.toString(16),
                    toBlock: 'latest',
                    address: contractAddress,
                    topics: [topic]
                }]);

                if (logs && Array.isArray(logs)) {
                    const threats = logs.map(log => {
                        // Parse log
                        // topic[1] is IP (padded)
                        const ipHex = log.topics[1].replace('0x', '').substr(0, 8);
                        const ip = `${parseInt(ipHex.substr(0, 2), 16)}.${parseInt(ipHex.substr(2, 2), 16)}.${parseInt(ipHex.substr(4, 2), 16)}.${parseInt(ipHex.substr(6, 2), 16)}`;

                        // data: riskLevel(32), expiry(32), mask(32)
                        const data = log.data.replace('0x', '');
                        const riskLevel = parseInt(data.substr(0, 64), 16);
                        // const expiry = parseInt(data.substr(64, 64), 16); // We can use this or default

                        return {
                            ip,
                            risk_score: this.riskLevelToScore(riskLevel),
                            threat_type: 'Blockchain Event',
                            source: 'OraSRS Chain'
                        };
                    });

                    if (threats.length > 0) {
                        await this.updateThreatDatabase(threats, 'Blockchain');
                        return true;
                    } else {
                        this.log('No new threats in recent blocks', 'info');
                        return true; // Success even if empty
                    }
                }
            } catch (error) {
                this.log(`Endpoint ${endpoint} failed: ${error.message}`, 'warn');
                continue;
            }
        }

        return false;
    }

    /**
     * 从公共威胁源同步
     */
    async syncFromPublicFeeds() {
        const feeds = [
            'https://feodotracker.abuse.ch/downloads/ipblocklist.txt',
            'https://rules.emergingthreats.net/blockrules/compromised-ips.txt'
        ];

        for (const feedUrl of feeds) {
            try {
                this.log(`Trying public feed: ${feedUrl}`, 'info');
                const protocol = feedUrl.startsWith('https') ? https : http;

                const data = await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Request timeout'));
                    }, 15000);

                    protocol.get(feedUrl, (res) => {
                        clearTimeout(timeout);
                        let body = '';
                        res.on('data', chunk => body += chunk);
                        res.on('end', () => resolve(body));
                    }).on('error', (err) => {
                        clearTimeout(timeout);
                        reject(err);
                    });
                });

                // 解析 IP 列表
                const ips = data.split('\n')
                    .map(line => line.trim())
                    .filter(line => line && !line.startsWith('#'))
                    .filter(line => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(line));

                if (ips.length > 0) {
                    const threats = ips.map(ip => ({
                        ip: ip.split('/')[0], // 移除 CIDR 后缀
                        risk_score: 80,
                        threat_type: 'Public Feed',
                        source: feedUrl.includes('feodo') ? 'Feodo Tracker' : 'EmergingThreats'
                    }));

                    await this.updateThreatDatabase(threats, 'Public Feed');
                    return true;
                }
            } catch (error) {
                this.log(`Public feed ${feedUrl} failed: ${error.message}`, 'warn');
                continue;
            }
        }

        return false;
    }

    /**
     * 更新威胁数据库
     */
    async updateThreatDatabase(threats, source) {
        const now = Math.floor(Date.now() / 1000);
        const expiresAt = now + (24 * 3600);

        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO threats 
            (ip, risk_score, threat_type, source, first_seen, last_seen, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const insertMany = this.db.transaction((threatList) => {
            for (const threat of threatList) {
                stmt.run(
                    threat.ip,
                    threat.risk_score || 75,
                    threat.threat_type || 'Unknown',
                    threat.source || source,
                    threat.first_seen || new Date().toISOString(),
                    new Date().toISOString(),
                    expiresAt
                );
            }
        });

        insertMany(threats);
        this.log(`✓ Updated ${threats.length} threats from ${source}`, 'info');

        // 清理过期记录
        const deleted = this.db.prepare('DELETE FROM threats WHERE expires_at < ?').run(now);
        if (deleted.changes > 0) {
            this.log(`Cleaned ${deleted.changes} expired threats`, 'info');
        }
    }

    /**
     * 延迟函数
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 启动自动同步
     */
    startAutoSync() {
        // 立即执行一次
        this.syncThreats();

        // 定时同步
        setInterval(() => {
            this.syncThreats();
        }, this.config.syncInterval * 1000);
    }

    /**
     * 启动 HTTP 服务器
     */
    startServer() {
        const server = http.createServer(async (req, res) => {
            const url = new URL(req.url, `http://${req.headers.host}`);

            // CORS
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Type', 'application/json');

            try {
                if (url.pathname === '/health') {
                    res.writeHead(200);
                    res.end(JSON.stringify({
                        status: 'healthy',
                        service: 'OraSRS Lite',
                        version: '3.3.5',
                        uptime: process.uptime(),
                        stats: this.stats,
                        dbType: this.db.type
                    }));
                } else if (url.pathname === '/query') {
                    const ip = url.searchParams.get('ip');
                    if (!ip) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: 'IP required' }));
                        return;
                    }

                    const result = await this.queryIP(ip);
                    res.writeHead(200);
                    res.end(JSON.stringify({ query: { ip }, response: result }));

                } else if (url.pathname === '/stats') {
                    res.writeHead(200);
                    res.end(JSON.stringify(this.stats));

                } else if (url.pathname === '/whitelist' && req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => body += chunk);
                    req.on('end', () => {
                        try {
                            const { ip, reason } = JSON.parse(body);
                            this.db.prepare(
                                'INSERT OR REPLACE INTO whitelist (ip, added_at, reason) VALUES (?, ?, ?)'
                            ).run(ip, new Date().toISOString(), reason || '');

                            res.writeHead(200);
                            res.end(JSON.stringify({ success: true }));
                        } catch (e) {
                            res.writeHead(400);
                            res.end(JSON.stringify({ error: e.message }));
                        }
                    });

                } else {
                    res.writeHead(404);
                    res.end(JSON.stringify({ error: 'Not found' }));
                }
            } catch (error) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: error.message }));
            }
        });

        const port = this.config.port || 3006;
        server.listen(port, '0.0.0.0', () => {
            this.log(`OraSRS Lite listening on port ${port}`, 'info');
        });
    }

    /**
     * 日志记录
     */
    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;

        // 控制台输出
        if (level === 'error') {
            console.error(logMessage.trim());
        } else {
            console.log(logMessage.trim());
        }

        // 写入日志文件（异步，避免阻塞）
        try {
            fs.appendFileSync(LOG_FILE, logMessage);
        } catch (e) {
            // 忽略日志写入错误
        }
    }

    /**
     * 优雅关闭
     */
    shutdown() {
        this.log('Shutting down...', 'info');
        if (this.db) {
            this.db.close();
        }
        process.exit(0);
    }
}

// 启动服务
new OraSRSLiteClient();

// 信号处理
// process.on('SIGTERM', () => client.shutdown()); // Handled inside class if instance available, or make static
