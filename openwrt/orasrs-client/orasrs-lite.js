#!/usr/bin/env node
/**
 * OraSRS Lite Client - Optimized for OpenWrt/Embedded Devices
 * 
 * Features:
 * - Minimal dependencies
 * - SQLite-based caching (saves RAM)
 * - UCI config file support
 * - Memory footprint < 10MB
 * - Built for MIPS/ARM/x86 architectures
 */

import http from 'http';
import https from 'https';
import fs from 'fs';
import { execSync } from 'child_process';
import Database from 'better-sqlite3';

const CONFIG_FILE = '/etc/config/orasrs';
const DB_PATH = '/var/lib/orasrs/cache.db';
const LOG_FILE = '/var/log/orasrs.log';

class OraSRSLiteClient {
    constructor() {
        this.config = this.loadConfig();
        this.db = this.initDatabase();
        this.stats = {
            totalQueries: 0,
            cacheHits: 0,
            blockCount: 0
        };

        // 启动定时同步
        this.startAutoSync();
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
                    const [key, value] = line.split('=');
                    const keyParts = key.split('.');

                    if (keyParts[2] === 'enabled') {
                        config.enabled = value === '1';
                    } else if (keyParts[2] === 'api_endpoint') {
                        config.apiEndpoint = value.replace(/'/g, '');
                    } else if (keyParts[2] === 'sync_interval') {
                        config.syncInterval = parseInt(value);
                    } else if (keyParts[2] === 'cache_size') {
                        config.cacheSize = parseInt(value);
                    } else if (keyParts[1] === 'iot_shield') {
                        if (keyParts[2] === 'enabled') {
                            config.iotShield.enabled = value === '1';
                        } else if (keyParts[2] === 'shield_mode') {
                            config.iotShield.mode = value.replace(/'/g, '');
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
            syncInterval: 3600,
            cacheSize: 1000,
            logLevel: 'info',
            port: 3006,
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

            const db = new Database(DB_PATH);

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
     * 查询远程 API
     */
    queryRemote(ip) {
        return new Promise((resolve, reject) => {
            const url = `${this.config.apiEndpoint}/orasrs/v1/query?ip=${ip}`;
            const protocol = url.startsWith('https') ? https : http;

            const req = protocol.get(url, { timeout: 5000 }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        resolve(parsed.response || parsed);
                    } catch (e) {
                        reject(new Error('Invalid JSON response'));
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
        });
    }

    getRiskLevel(score) {
        if (score >= 90) return 'Critical';
        if (score >= 70) return 'High';
        if (score >= 40) return 'Medium';
        if (score > 0) return 'Low';
        return 'Safe';
    }

    /**
     * 同步威胁情报
     */
    async syncThreats() {
        try {
            this.log('Starting threat sync...', 'info');

            const url = `${this.config.apiEndpoint}/orasrs/v1/threats/list`;
            const protocol = url.startsWith('https') ? https : http;

            const data = await new Promise((resolve, reject) => {
                protocol.get(url, { timeout: 30000 }, (res) => {
                    let body = '';
                    res.on('data', chunk => body += chunk);
                    res.on('end', () => {
                        try {
                            resolve(JSON.parse(body));
                        } catch (e) {
                            reject(e);
                        }
                    });
                }).on('error', reject);
            });

            // 更新数据库
            const now = Math.floor(Date.now() / 1000);
            const expiresAt = now + (24 * 3600);

            if (data.threats && Array.isArray(data.threats)) {
                const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO threats 
          (ip, risk_score, threat_type, source, first_seen, last_seen, expires_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

                const insertMany = this.db.transaction((threats) => {
                    for (const threat of threats) {
                        stmt.run(
                            threat.ip,
                            threat.risk_score || 75,
                            threat.threat_type || 'Unknown',
                            threat.source || 'Remote',
                            threat.first_seen || new Date().toISOString(),
                            new Date().toISOString(),
                            expiresAt
                        );
                    }
                });

                insertMany(data.threats);
                this.log(`Synced ${data.threats.length} threats`, 'info');
            }

            // 清理过期记录
            this.db.prepare('DELETE FROM threats WHERE expires_at < ?').run(now);

        } catch (error) {
            this.log(`Sync error: ${error.message}`, 'error');
        }
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
                        version: '2.1.0',
                        uptime: process.uptime(),
                        stats: this.stats
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
const client = new OraSRSLiteClient();

if (client.config.enabled) {
    client.startServer();
} else {
    client.log('OraSRS is disabled in config', 'warn');
    process.exit(0);
}

// 信号处理
process.on('SIGTERM', () => client.shutdown());
process.on('SIGINT', () => client.shutdown());

export default OraSRSLiteClient;
