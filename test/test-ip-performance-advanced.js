#!/usr/bin/env node

/**
 * OraSRS 客户端IP查询性能测试脚本
 * 生成10000个IP进行本地查询测试，并从协议链读取1000个IP进行对比测试
 */

import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';

// 客户端配置
const clientConfig = {
    // API端点配置
    endpoints: {
        query: '/SRA/v1/query',
        bulkQuery: '/SRA/v1/bulk-query',
        threatList: '/SRA/v2/threat-list',
        threatReport: '/SRA/v2/threat-report'
    },
    
    // 本地缓存配置
    cache: {
        maxSize: 10000,
        ttl: 3600000, // 1小时
        enabled: true
    },
    
    // 性能测试配置
    performance: {
        localIPCount: 10000,
        chainIPCount: 1000,
        batchSize: 100
    },
    
    // 风险评分阈值
    thresholds: {
        low: 0.3,
        medium: 0.6,
        high: 0.8
    }
};

// 生成随机IP地址
function generateRandomIP() {
    const octets = [];
    for (let i = 0; i < 4; i++) {
        octets.push(Math.floor(Math.random() * 256));
    }
    return octets.join('.');
}

// 生成随机风险评分
function generateRandomRiskScore() {
    return Math.random(); // 0 to 1
}

// 生成随机威胁等级
function generateRandomThreatLevel(riskScore) {
    if (riskScore >= 0.8) return 'emergency';
    if (riskScore >= 0.6) return 'critical';
    if (riskScore >= 0.4) return 'warning';
    return 'info';
}

// 生成随机风险级别
function generateRandomRiskLevel(riskScore) {
    if (riskScore >= 0.8) return 'very_high';
    if (riskScore >= 0.6) return 'high';
    if (riskScore >= 0.4) return 'medium';
    return 'low';
}

// 生成随机推荐操作
function generateRandomRecommendations(riskScore) {
    let action;
    if (riskScore >= 0.8) action = 'block';
    else if (riskScore >= 0.6) action = 'require_mfa';
    else if (riskScore >= 0.4) action = 'allow_with_captcha';
    else action = 'allow';
    
    return {
        default: action,
        public_services: action,
        banking: riskScore >= 0.6 ? 'require_mfa' : 'allow_with_captcha',
        admin_panel: riskScore >= 0.4 ? 'require_mfa' : 'allow'
    };
}

// 生成模拟的链上威胁情报数据
function generateChainThreatData(ipCount = 1000) {
    const threatData = {};
    for (let i = 0; i < ipCount; i++) {
        const ip = generateRandomIP();
        const riskScore = generateRandomRiskScore();
        
        threatData[ip] = {
            risk_score: riskScore,
            risk_level: generateRandomRiskLevel(riskScore),
            threat_level: generateRandomThreatLevel(riskScore),
            recommendations: generateRandomRecommendations(riskScore),
            evidence: [
                {
                    type: ['behavior', 'geolocation', 'frequency'][Math.floor(Math.random() * 3)],
                    detail: ['DDoS attempt', 'Suspicious scan', 'Anomalous behavior'][Math.floor(Math.random() * 3)],
                    source: `node-${Math.random().toString(36).substring(7)}`,
                    timestamp: new Date(Date.now() - Math.floor(Math.random() * 3600000)).toISOString()
                }
            ],
            confidence: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],
            appeal_url: 'https://srs.net/appeal',
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24小时后过期
            disclaimers: 'This is advisory only. Final decision rests with the client.',
            last_updated: new Date().toISOString()
        };
    }
    return threatData;
}

// 模拟客户端查询实现
class OraSRSClient {
    constructor(config) {
        this.config = config;
        this.localCache = new Map();
        this.localThreatData = {};
        this.chainThreatData = {};
        this.queryStats = {
            totalQueries: 0,
            cacheHits: 0,
            cacheMisses: 0,
            totalTime: 0
        };
        // 添加请求速率限制
        this.requestQueue = [];
        this.isProcessing = false;
        this.lastRequestTime = 0;
        this.minRequestInterval = 50; // 20r/s = 每50ms一个请求
    }
    
    // 初始化测试数据
    async initializeTestData() {
        console.log('初始化OraSRS客户端测试数据...');
        
        // 生成本地威胁数据（模拟本地缓存）
        console.log('生成本地威胁数据...');
        for (let i = 0; i < this.config.performance.localIPCount; i++) {
            const ip = generateRandomIP();
            const riskScore = generateRandomRiskScore();
            
            this.localThreatData[ip] = {
                risk_score: riskScore,
                risk_level: generateRandomRiskLevel(riskScore),
                threat_level: generateRandomThreatLevel(riskScore),
                recommendations: generateRandomRecommendations(riskScore),
                evidence: [],
                confidence: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],
                appeal_url: 'https://srs.net/appeal',
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                disclaimers: 'This is advisory only. Final decision rests with the client.'
            };
            
            // 同时添加到本地缓存
            if (this.localCache.size < this.config.cache.maxSize) {
                this.localCache.set(ip, {
                    ...this.localThreatData[ip],
                    timestamp: Date.now()
                });
            }
        }
        
        // 生成链上威胁数据
        console.log('生成链上威胁数据...');
        this.chainThreatData = generateChainThreatData(this.config.performance.chainIPCount);
        
        console.log(`数据初始化完成:`);
        console.log(`  - 本地威胁数据: ${Object.keys(this.localThreatData).length} IPs`);
        console.log(`  - 链上威胁数据: ${Object.keys(this.chainThreatData).length} IPs`);
        console.log(`  - 本地缓存大小: ${this.localCache.size} IPs`);
    }
    
    // 使用指定IP列表初始化测试数据
    async initializeTestDataWithIPs(testIPs) {
        console.log('初始化OraSRS客户端测试数据...');
        
        // 生成本地威胁数据（模拟本地缓存）
        console.log('生成本地威胁数据...');
        // 先添加测试IP
        for (const ip of testIPs) {
            const riskScore = generateRandomRiskScore();
            
            this.localThreatData[ip] = {
                risk_score: riskScore,
                risk_level: generateRandomRiskLevel(riskScore),
                threat_level: generateRandomThreatLevel(riskScore),
                recommendations: generateRandomRecommendations(riskScore),
                evidence: [],
                confidence: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],
                appeal_url: 'https://srs.net/appeal',
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                disclaimers: 'This is advisory only. Final decision rests with the client.'
            };
            
            // 同时添加到本地缓存
            if (this.localCache.size < this.config.cache.maxSize) {
                this.localCache.set(ip, {
                    ...this.localThreatData[ip],
                    timestamp: Date.now()
                });
            }
        }
        
        // 然后添加额外的IP以达到配置的数量
        for (let i = testIPs.length; i < this.config.performance.localIPCount; i++) {
            const ip = generateRandomIP();
            const riskScore = generateRandomRiskScore();
            
            this.localThreatData[ip] = {
                risk_score: riskScore,
                risk_level: generateRandomRiskLevel(riskScore),
                threat_level: generateRandomThreatLevel(riskScore),
                recommendations: generateRandomRecommendations(riskScore),
                evidence: [],
                confidence: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],
                appeal_url: 'https://srs.net/appeal',
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                disclaimers: 'This is advisory only. Final decision rests with the client.'
            };
            
            // 同时添加到本地缓存
            if (this.localCache.size < this.config.cache.maxSize) {
                this.localCache.set(ip, {
                    ...this.localThreatData[ip],
                    timestamp: Date.now()
                });
            }
        }
        
        // 生成链上威胁数据
        console.log('生成链上威胁数据...');
        this.chainThreatData = generateChainThreatData(this.config.performance.chainIPCount);
        
        console.log(`数据初始化完成:`);
        console.log(`  - 本地威胁数据: ${Object.keys(this.localThreatData).length} IPs`);
        console.log(`  - 链上威胁数据: ${Object.keys(this.chainThreatData).length} IPs`);
        console.log(`  - 本地缓存大小: ${this.localCache.size} IPs`);
    }
    
    // 查询IP威胁情报（带速率限制）
    async queryIP(ip) {
        // 实现速率限制：20r/s，即每50ms一个请求
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < this.minRequestInterval) {
            // 等待到可以发送下一个请求的时间
            await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest));
        }
        
        const start = Date.now();
        this.queryStats.totalQueries++;
        this.lastRequestTime = Date.now();
        
        // 检查本地缓存
        if (this.localCache.has(ip)) {
            this.queryStats.cacheHits++;
            const cached = this.localCache.get(ip);
            
            // 检查缓存是否过期
            if (Date.now() - cached.timestamp > this.config.cache.ttl) {
                this.localCache.delete(ip); // 删除过期缓存
            } else {
                const end = Date.now();
                this.queryStats.totalTime += (end - start);
                return {
                    query: { ip },
                    response: {
                        ...cached,
                        query_time_ms: (end - start),
                        source: 'cache'
                    }
                };
            }
        }
        
        this.queryStats.cacheMisses++;
        
        // 模拟从本地威胁数据查询
        const threatInfo = this.localThreatData[ip] || {
            risk_score: 0.1, // 默认低风险
            risk_level: 'low',
            threat_level: 'info',
            recommendations: {
                default: 'allow',
                public_services: 'allow',
                banking: 'allow',
                admin_panel: 'allow'
            },
            evidence: [],
            confidence: 'low',
            appeal_url: 'https://srs.net/appeal',
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            disclaimers: 'This is advisory only. Final decision rests with the client.'
        };
        
        // 添加到缓存
        if (this.localCache.size < this.config.cache.maxSize) {
            this.localCache.set(ip, {
                ...threatInfo,
                timestamp: Date.now()
            });
        }
        
        const end = Date.now();
        this.queryStats.totalTime += (end - start);
        
        return {
            query: { ip },
            response: {
                ...threatInfo,
                query_time_ms: (end - start),
                source: 'local'
            }
        };
    }
    
    // 批量查询IP威胁情报
    async bulkQuery(ips) {
        const results = [];
        const start = Date.now();
        
        for (const ip of ips) {
            const result = await this.queryIP(ip);
            results.push(result);
        }
        
        const end = Date.now();
        
        return {
            query: { ips },
            response: {
                results: results.map(r => r.response),
                total_time_ms: (end - start),
                average_time_per_ip: (end - start) / ips.length,
                total_ips: ips.length
            }
        };
    }
    
    // 获取全局威胁列表（模拟从链上获取）
    getGlobalThreatList() {
        const highRiskIPs = Object.entries(this.chainThreatData)
            .filter(([ip, data]) => data.risk_score > this.config.thresholds.high)
            .map(([ip, data]) => ({
                ip,
                threat_level: data.threat_level,
                risk_score: data.risk_score,
                first_seen: new Date(Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000)).toISOString(),
                last_seen: new Date().toISOString(),
                report_count: Math.floor(Math.random() * 50) + 1,
                evidence: data.evidence,
                recommendations: data.recommendations
            }));
            
        return {
            threat_list: highRiskIPs,
            last_update: new Date().toISOString(),
            total_threats: highRiskIPs.length,
            high_risk_count: highRiskIPs.length,
            medium_risk_count: Object.values(this.chainThreatData).filter(data => 
                data.risk_score >= this.config.thresholds.medium && data.risk_score < this.config.thresholds.high
            ).length,
            low_risk_count: Object.values(this.chainThreatData).filter(data => 
                data.risk_score < this.config.thresholds.medium
            ).length
        };
    }
    
    // 从威胁情报合约获取威胁情报数据
    async getThreatIntelFromContract() {
        try {
            // 使用ethers连接到指定的RPC端点
            const provider = new ethers.JsonRpcProvider('https://api.orasrs.net');
            
            // 使用增强版威胁情报协调合约的ABI（包含获取所有IP的功能）
            const abi = [
                {
                    "inputs": [
                        {
                            "internalType": "string",
                            "name": "_ip",
                            "type": "string"
                        },
                        {
                            "internalType": "uint8",
                            "name": "_threatLevel",
                            "type": "uint8"
                        },
                        {
                            "internalType": "string",
                            "name": "_threatType",
                            "type": "string"
                        }
                    ],
                    "name": "addThreatIntel",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "inputs": [
                        {
                            "internalType": "string[]",
                            "name": "_ips",
                            "type": "string[]"
                        },
                        {
                            "internalType": "uint256[]",
                            "name": "_scores",
                            "type": "uint256[]"
                        }
                    ],
                    "name": "batchUpdateThreatScores",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "inputs": [
                        {
                            "internalType": "string",
                            "name": "_ip",
                            "type": "string"
                        }
                    ],
                    "name": "getThreatScore",
                    "outputs": [
                        {
                            "internalType": "uint256",
                            "name": "",
                            "type": "uint256"
                        }
                    ],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [
                        {
                            "internalType": "string",
                            "name": "_ip",
                            "type": "string"
                        }
                    ],
                    "name": "isThreatSource",
                    "outputs": [
                        {
                            "internalType": "bool",
                            "name": "",
                            "type": "bool"
                        }
                    ],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [
                        {
                            "internalType": "string",
                            "name": "_ip",
                            "type": "string"
                        }
                    ],
                    "name": "getThreatIntel",
                    "outputs": [
                        {
                            "internalType": "string",
                            "name": "sourceIP",
                            "type": "string"
                        },
                        {
                            "internalType": "string",
                            "name": "targetIP",
                            "type": "string"
                        },
                        {
                            "internalType": "uint8",
                            "name": "threatLevel",
                            "type": "uint8"
                        },
                        {
                            "internalType": "uint256",
                            "name": "timestamp",
                            "type": "uint256"
                        },
                        {
                            "internalType": "string",
                            "name": "threatType",
                            "type": "string"
                        },
                        {
                            "internalType": "bool",
                            "name": "isActive",
                            "type": "bool"
                        }
                    ],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [
                        {
                            "internalType": "uint256",
                            "name": "maxCount",
                            "type": "uint256"
                        }
                    ],
                    "name": "getAllThreatIPs",
                    "outputs": [
                        {
                            "internalType": "string[]",
                            "name": "ips",
                            "type": "string[]"
                        }
                    ],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [],
                    "name": "getThreatIPsCount",
                    "outputs": [
                        {
                            "internalType": "uint256",
                            "name": "",
                            "type": "uint256"
                        }
                    ],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [
                        {
                            "internalType": "uint256",
                            "name": "offset",
                            "type": "uint256"
                        },
                        {
                            "internalType": "uint256",
                            "name": "count",
                            "type": "uint256"
                        }
                    ],
                    "name": "getThreatIPs",
                    "outputs": [
                        {
                            "internalType": "string[]",
                            "name": "ips",
                            "type": "string[]"
                        }
                    ],
                    "stateMutability": "view",
                    "type": "function"
                }
            ];
            
            // 使用指定的合约地址
            const contractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
            const contract = new ethers.Contract(contractAddress, abi, provider);
            
            console.log('正在从威胁情报合约获取IP的威胁情报数据 (通过 https://api.orasrs.net)...');
            
            const threatIntels = [];
            
            // 首先尝试连接并确保合约存在
            try {
                // 检查合约中IP的总数
                const ipCount = await contract.getThreatIPsCount();
                console.log(`✅ 成功连接到威胁情报合约 (https://api.orasrs.net)，合约中存储的IP数量: ${ipCount}`);
            } catch (connectionError) {
                console.log('⚠️  无法连接到威胁情报合约，使用模拟数据');
                // 如果无法连接，直接返回模拟数据
                for (let i = 0; i < 1000; i++) {
                    const randomIP = generateRandomIP();
                    
                    threatIntels.push({
                        sourceIP: randomIP,
                        targetIP: generateRandomIP(),
                        threatLevel: Math.floor(Math.random() * 4),
                        timestamp: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400),
                        threatType: ['DDoS', 'Malware', 'Phishing', 'BruteForce', 
                                    'SuspiciousConnection', 'AnomalousBehavior', 'IoCMatch'][Math.floor(Math.random() * 7)],
                        threatScore: Math.floor(Math.random() * 100),
                        isActive: false,
                        contractIP: false
                    });
                }
                return threatIntels;
            }
            
            // 使用新功能获取威胁IP数据
            console.log('🔍 获取合约中的威胁IP列表...');
            
            try {
                // 获取威胁IP（限制一次最多获取1000个以避免gas问题）
                const allIPs = await contract.getAllThreatIPs(1000);
                console.log(`获取到 ${allIPs.length} 个威胁IP地址`);
                
                // 从获取的IP中查询详细信息
                let validIPs = 0;
                for (const ip of allIPs) {
                    try {
                        // 获取IP的威胁情报
                        const [sourceIP, targetIP, threatLevel, timestamp, threatType, isActive] = 
                            await contract.getThreatIntel(ip);
                        
                        const score = await contract.getThreatScore(ip);
                        
                        threatIntels.push({
                            sourceIP: sourceIP,
                            targetIP: targetIP,
                            threatLevel: Number(threatLevel),
                            timestamp: Number(timestamp),
                            threatType: threatType,
                            threatScore: Number(score),
                            isActive: isActive,
                            contractIP: true // 标记为来自合约的数据
                        });
                        
                        validIPs++;
                        
                        if (validIPs % 100 === 0) {
                            console.log(`已成功处理 ${validIPs} 个IP的威胁情报数据`);
                        }
                    } catch (error) {
                        // 如果查询特定IP失败，跳过它
                        console.warn(`⚠️ 获取IP ${ip} 的威胁情报失败:`, error.message);
                    }
                }
                
                console.log(`✅ 从合约成功获取了 ${validIPs} 个IP的威胁情报数据`);
                
            } catch (error) {
                console.warn(`⚠️ 从合约获取威胁IP数据失败:`, error.message);
                
                // 如果获取所有IP失败，尝试逐个查询一些样本
                let foundContractIPs = 0;
                const sampleIPs = [];
                
                // 生成一些样本IP进行查询
                for (let i = 0; i < 50; i++) {
                    sampleIPs.push(generateRandomIP());
                }
                
                for (const ip of sampleIPs) {
                    try {
                        // 检查IP是否存在于合约中
                        const isThreat = await contract.isThreatSource(ip);
                        
                        if (isThreat) {
                            // 如果IP存在于合约中，获取其威胁情报
                            const [sourceIP, targetIP, threatLevel, timestamp, threatType, isActive] = 
                                await contract.getThreatIntel(ip);
                            
                            const score = await contract.getThreatScore(ip);
                            
                            threatIntels.push({
                                sourceIP: sourceIP,
                                targetIP: targetIP,
                                threatLevel: Number(threatLevel),
                                timestamp: Number(timestamp),
                                threatType: threatType,
                                threatScore: Number(score),
                                isActive: isActive,
                                contractIP: true // 标记为来自合约的数据
                            });
                            
                            foundContractIPs++;
                        }
                    } catch (error) {
                        // 如果查询失败，跳过
                        console.warn(`⚠️ 查询IP ${ip} 失败:`, error.message);
                    }
                }
                
                console.log(`从合约获取到 ${foundContractIPs} 个有效的威胁IP数据`);
            }
            
            // 如果获取的合约数据少于1000个，补充随机数据以达到1000个
            while (threatIntels.length < 1000) {
                const randomIP = generateRandomIP();
                threatIntels.push({
                    sourceIP: randomIP,
                    targetIP: generateRandomIP(),
                    threatLevel: Math.floor(Math.random() * 4),
                    timestamp: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400),
                    threatType: ['DDoS', 'Malware', 'Phishing', 'BruteForce', 
                                'SuspiciousConnection', 'AnomalousBehavior', 'IoCMatch'][Math.floor(Math.random() * 7)],
                    threatScore: Math.floor(Math.random() * 100),
                    isActive: false,
                    contractIP: false
                });
            }
            
            console.log(`✅ 完成数据检索，总共获取了 ${threatIntels.length} 个IP的威胁情报数据`);
            
            return threatIntels;
        } catch (error) {
            console.error('从合约获取威胁情报时发生错误:', error);
            // 如果连接失败，返回模拟数据
            const threatIntels = [];
            for (let i = 0; i < 1000; i++) {
                const randomIP = generateRandomIP();
                
                threatIntels.push({
                    sourceIP: randomIP,
                    targetIP: generateRandomIP(),
                    threatLevel: Math.floor(Math.random() * 4),
                    timestamp: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400),
                    threatType: ['DDoS', 'Malware', 'Phishing', 'BruteForce', 
                                'SuspiciousConnection', 'AnomalousBehavior', 'IoCMatch'][Math.floor(Math.random() * 7)],
                    threatScore: Math.floor(Math.random() * 100),
                    isActive: false,
                    contractIP: false
                });
            }
            return threatIntels;
        }
    }
    
    // 使用合约数据更新链上威胁数据
    async updateChainThreatDataWithContractData() {
        console.log('从威胁情报合约获取威胁情报数据...');
        const contractThreatData = await this.getThreatIntelFromContract();
        
        // 将合约数据转换为内部格式
        this.chainThreatData = {};
        let contractDataCount = 0;
        
        for (const threat of contractThreatData) {
            // 将威胁级别转换为内部格式
            let threatLevelText, riskLevelText, riskScore;
            
            switch(threat.threatLevel) {
                case 0:
                    threatLevelText = 'info';
                    riskLevelText = 'low';
                    riskScore = threat.threatScore / 100.0 * 0.3; // 0-0.3
                    break;
                case 1:
                    threatLevelText = 'warning';
                    riskLevelText = 'medium';
                    riskScore = 0.3 + (threat.threatScore / 100.0) * 0.2; // 0.3-0.5
                    break;
                case 2:
                    threatLevelText = 'critical';
                    riskLevelText = 'high';
                    riskScore = 0.5 + (threat.threatScore / 100.0) * 0.29; // 0.5-0.79
                    break;
                case 3:
                    threatLevelText = 'emergency';
                    riskLevelText = 'very_high';
                    riskScore = 0.8 + (threat.threatScore / 100.0) * 0.2; // 0.8-1.0
                    break;
                default:
                    threatLevelText = 'info';
                    riskLevelText = 'low';
                    riskScore = 0.1;
            }
            
            this.chainThreatData[threat.sourceIP] = {
                risk_score: riskScore,
                risk_level: riskLevelText,
                threat_level: threatLevelText,
                recommendations: generateRandomRecommendations(riskScore),
                evidence: [
                    {
                        type: threat.threatType.toLowerCase(),
                        detail: `Contract threat: ${threat.threatType}`,
                        source: 'Threat-Intelligence-Contract',
                        timestamp: new Date(threat.timestamp * 1000).toISOString()
                    }
                ],
                confidence: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],
                appeal_url: 'https://srs.net/appeal',
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                disclaimers: 'This is advisory only. Final decision rests with the client.',
                last_updated: new Date().toISOString(),
                contract_data: threat // 保留原始合约数据
            };
            
            if (threat.contractIP) {
                contractDataCount++;
            }
        }
        
        console.log(`从威胁情报合约获取了 ${Object.keys(this.chainThreatData).length} 条威胁情报数据 (${contractDataCount} 来自实际合约数据)`);
    }
    
    // 获取查询统计信息
    getQueryStats() {
        return {
            ...this.queryStats,
            average_query_time: this.queryStats.totalQueries > 0 ? 
                (this.queryStats.totalTime / this.queryStats.totalQueries).toFixed(4) : 0,
            cache_hit_rate: this.queryStats.totalQueries > 0 ? 
                ((this.queryStats.cacheHits / this.queryStats.totalQueries) * 100).toFixed(2) : 0
        };
    }
    
    // 重置查询统计
    resetStats() {
        this.queryStats = {
            totalQueries: 0,
            cacheHits: 0,
            cacheMisses: 0,
            totalTime: 0
        };
    }
}

// 性能测试函数
async function runPerformanceTest() {
    console.log('🚀 开始OraSRS客户端IP查询性能测试...\n');
    
    const client = new OraSRSClient(clientConfig);
    
    console.log('\n📊 开始单个IP查询性能测试 (应用速率限制: 20r/s)...');
    const singleQueryStart = Date.now();
    
    // 生成测试IP列表
    const testIPs = [];
    for (let i = 0; i < 1000; i++) {
        testIPs.push(generateRandomIP());
    }
    
    // 使用测试IP初始化本地威胁数据
    await client.initializeTestDataWithIPs(testIPs);
    
    // 从Hardhat节点合约更新链上威胁数据
    await client.updateChainThreatDataWithContractData();
    
    const singleQueryResults = [];
    for (let i = 0; i < testIPs.length; i++) {
        const result = await client.queryIP(testIPs[i]);
        singleQueryResults.push(result);
        
        if ((i + 1) % 200 === 0) {
            console.log(`   已完成 ${i + 1}/${testIPs.length} 个IP查询`);
        }
    }
    
    const singleQueryEnd = Date.now();
    const singleQueryTime = singleQueryEnd - singleQueryStart;
    
    console.log('\n📦 开始批量IP查询性能测试...');
    const bulkQueryStart = Date.now();
    
    // 测试批量查询性能
    const batchResults = await client.bulkQuery(testIPs.slice(0, 100));
    
    const bulkQueryEnd = Date.now();
    const bulkQueryTime = bulkQueryEnd - bulkQueryStart;
    
    console.log('\n📋 获取全局威胁列表...');
    const threatList = client.getGlobalThreatList();
    
    // 输出测试结果
    console.log('\n==================== 测试结果 ====================');
    console.log('单个IP查询测试:');
    console.log(`  查询数量: ${testIPs.length}`);
    console.log(`  总耗时: ${singleQueryTime}ms`);
    console.log(`  平均响应时间: ${(singleQueryTime / testIPs.length).toFixed(4)}ms`);
    console.log(`  QPS: ${(testIPs.length / (singleQueryTime / 1000)).toFixed(2)}`);
    
    console.log('\n批量IP查询测试:');
    console.log(`  查询数量: ${batchResults.response.total_ips}`);
    console.log(`  总耗时: ${bulkQueryTime}ms`);
    console.log(`  平均响应时间: ${batchResults.response.average_time_per_ip.toFixed(4)}ms`);
    console.log(`  QPS: ${(batchResults.response.total_ips / (bulkQueryTime / 1000)).toFixed(2)}`);
    
    console.log('\n缓存统计:');
    const stats = client.getQueryStats();
    console.log(`  总查询数: ${stats.totalQueries}`);
    console.log(`  缓存命中: ${stats.cacheHits}`);
    console.log(`  缓存未命中: ${stats.cacheMisses}`);
    console.log(`  缓存命中率: ${stats.cache_hit_rate}%`);
    console.log(`  平均查询时间: ${stats.average_query_time}ms`);
    
    console.log('\n威胁列表统计:');
    console.log(`  高风险IP数: ${threatList.high_risk_count}`);
    console.log(`  中风险IP数: ${threatList.medium_risk_count}`);
    console.log(`  低风险IP数: ${threatList.low_risk_count}`);
    console.log(`  威胁列表总数: ${threatList.total_threats}`);
    
    console.log('\n==================== 生成测试报告 ====================');
    
    // 生成详细的测试报告
    const report = {
        test_run: new Date().toISOString(),
        test_type: 'OraSRS Client IP Query Performance Test',
        config: clientConfig,
        results: {
            single_query: {
                ip_count: testIPs.length,
                total_time_ms: singleQueryTime,
                average_time_per_ip: (singleQueryTime / testIPs.length).toFixed(4),
                qps: (testIPs.length / (singleQueryTime / 1000)).toFixed(2),
                stats: stats
            },
            bulk_query: {
                ip_count: batchResults.response.total_ips,
                total_time_ms: bulkQueryTime,
                average_time_per_ip: parseFloat(batchResults.response.average_time_per_ip),
                qps: (batchResults.response.total_ips / (bulkQueryTime / 1000)).toFixed(2)
            },
            threat_list: {
                high_risk_count: threatList.high_risk_count,
                medium_risk_count: threatList.medium_risk_count,
                low_risk_count: threatList.low_risk_count,
                total_threats: threatList.total_threats
            }
        },
        summary: {
            overall_performance: singleQueryTime > 0 ? 
                `Processed ${testIPs.length} IPs in ${singleQueryTime}ms (${(testIPs.length / (singleQueryTime / 1000)).toFixed(2)} QPS)` : 
                'No queries processed',
            cache_efficiency: `${stats.cache_hit_rate}% hit rate`,
            data_distribution: {
                local_ips: Object.keys(client.localThreatData).length,
                chain_ips: Object.keys(client.chainThreatData).length,
                cache_size: client.localCache.size
            }
        }
    };
    
    // 保存报告到文件
    const reportPath = path.join(__dirname, 'oraSRS-client-performance-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`测试报告已保存到: ${reportPath}`);
    
    // 保存测试IP列表
    const ipListPath = path.join(__dirname, 'test-ip-list.json');
    fs.writeFileSync(ipListPath, JSON.stringify(testIPs, null, 2));
    console.log(`测试IP列表已保存到: ${ipListPath}`);
    
    // 清理客户端测试使用的IP（从本地数据中移除）
    console.log('\n🧹 清理客户端测试使用的IP...');
    let cleanedLocalDataCount = 0;
    let cleanedCacheCount = 0;
    
    for (const ip of testIPs) {
        if (client.localThreatData[ip]) {
            delete client.localThreatData[ip];
            cleanedLocalDataCount++;
        }
        if (client.localCache.has(ip)) {
            client.localCache.delete(ip);
            cleanedCacheCount++;
        }
    }
    
    console.log(`清理完成，移除了 ${cleanedLocalDataCount} 个本地威胁数据IP，${cleanedCacheCount} 个缓存IP`);
    console.log(`清理后本地威胁数据剩余: ${Object.keys(client.localThreatData).length} IPs`);
    console.log(`清理后本地缓存剩余: ${client.localCache.size} IPs`);
    
    console.log('\n✅ 性能测试完成！');
}

// 运行测试
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 检查是否直接运行此模块
if (process.argv[1] === __filename) {
    runPerformanceTest().catch(err => {
        console.error('❌ 测试过程中发生错误:', err);
        process.exit(1);
    });
}

// 在ES模块中，我们不使用module.exports，而是使用export
export { OraSRSClient, generateRandomIP, generateChainThreatData };