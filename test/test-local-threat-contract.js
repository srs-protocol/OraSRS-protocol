// test-local-threat-contract.js - 本地合约测试版本
import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
    constructor() {
        this.localCache = new Map();
        this.localThreatData = {};
        this.chainThreatData = {};
        this.queryStats = {
            totalQueries: 0,
            cacheHits: 0,
            cacheMisses: 0,
            totalTime: 0
        };
    }
    
    // 初始化测试数据
    async initializeTestData() {
        console.log('🚀 初始化OraSRS客户端测试数据...');
        
        // 生成本地威胁数据（模拟本地缓存）
        console.log('生成本地威胁数据...');
        for (let i = 0; i < 10000; i++) {
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
            if (this.localCache.size < 10000) {
                this.localCache.set(ip, {
                    ...this.localThreatData[ip],
                    timestamp: Date.now()
                });
            }
        }
        
        // 生成链上威胁数据
        console.log('生成链上威胁数据...');
        this.chainThreatData = generateChainThreatData(1000);
        
        console.log(`数据初始化完成:`);
        console.log(`  - 本地威胁数据: ${Object.keys(this.localThreatData).length} IPs`);
        console.log(`  - 链上威胁数据: ${Object.keys(this.chainThreatData).length} IPs`);
        console.log(`  - 本地缓存大小: ${this.localCache.size} IPs`);
    }
    
    // 使用本地Hardhat节点合约数据初始化（模拟）
    async initializeWithLocalContractData() {
        console.log('🔍 从本地Hardhat节点合约获取威胁情报数据...');
        
        // 连接
        const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
        
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
        
        // 使用新部署的合约地址
        const contractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
        const contract = new ethers.Contract(contractAddress, abi, provider);
        
        try {
            // 检查合约中IP的总数
            const ipCount = await contract.getThreatIPsCount();
            console.log(`✅ 成功连接到本地威胁情报合约，合约中存储的IP数量: ${ipCount}`);
            
            // 获取所有威胁IP（限制一次最多获取1000个以避免gas问题）
            const allIPs = await contract.getAllThreatIPs(1000);
            console.log(`获取到 ${allIPs.length} 个威胁IP地址`);
            
            // 从获取的IP中获取详细信息
            const threatIntels = [];
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
                } catch (error) {
                    console.warn(`⚠️ 获取IP ${ip} 的威胁情报失败:`, error.message);
                }
            }
            
            console.log(`✅ 从本地合约成功获取了 ${threatIntels.length} 个IP的威胁情报数据`);
            
            // 更新链上威胁数据
            for (const threat of threatIntels) {
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
                            source: 'Local-Threat-Contract',
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
            }
            
            console.log(`✅ 更新了 ${Object.keys(this.chainThreatData).length} 条链上威胁数据`);
            
        } catch (error) {
            console.error('❌ 连接本地合约失败，使用模拟数据:', error.message);
            // 如果连接失败，使用模拟数据
            this.chainThreatData = generateChainThreatData(1000);
        }
    }
    
    // 查询IP威胁情报
    async queryIP(ip) {
        const start = Date.now();
        this.queryStats.totalQueries++;
        
        // 检查本地缓存
        if (this.localCache.has(ip)) {
            this.queryStats.cacheHits++;
            const cached = this.localCache.get(ip);
            
            // 检查缓存是否过期
            if (Date.now() - cached.timestamp > 3600000) { // 1小时后过期
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
        if (this.localCache.size < 10000) {
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
    
    const client = new OraSRSClient();
    await client.initializeTestData();
    
    // 使用本地合约数据初始化
    await client.initializeWithLocalContractData();
    
    console.log('\n📊 开始单个IP查询性能测试...');
    const singleQueryStart = Date.now();
    
    // 测试单个IP查询性能
    const testIPs = [];
    for (let i = 0; i < 1000; i++) {
        testIPs.push(generateRandomIP());
    }
    
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
    
    console.log('\n==================== 测试结果 ====================');
    console.log('单个IP查询测试:');
    console.log(`  查询数量: ${testIPs.length}`);
    console.log(`  总耗时: ${singleQueryTime}ms`);
    console.log(`  平均响应时间: ${(singleQueryTime / testIPs.length).toFixed(4)}ms`);
    console.log(`  QPS: ${(testIPs.length / (singleQueryTime / 1000)).toFixed(2)}`);
    
    console.log('\n缓存统计:');
    const stats = client.getQueryStats();
    console.log(`  总查询数: ${stats.totalQueries}`);
    console.log(`  缓存命中: ${stats.cacheHits}`);
    console.log(`  缓存未命中: ${stats.cacheMisses}`);
    console.log(`  缓存命中率: ${stats.cache_hit_rate}%`);
    console.log(`  平均查询时间: ${stats.average_query_time}ms`);
    
    console.log('\n威胁列表统计:');
    console.log(`  链上威胁数据总数: ${Object.keys(client.chainThreatData).length}`);
    
    console.log('\n==================== 生成测试报告 ====================');
    
    // 生成详细的测试报告
    const report = {
        test_run: new Date().toISOString(),
        test_type: 'OraSRS Client IP Query Performance Test with Local Contract Data',
        results: {
            single_query: {
                ip_count: testIPs.length,
                total_time_ms: singleQueryTime,
                average_time_per_ip: (singleQueryTime / testIPs.length).toFixed(4),
                qps: (testIPs.length / (singleQueryTime / 1000)).toFixed(2),
                stats: stats
            },
            contract_data: {
                contract_ip_count: Object.keys(client.chainThreatData).length
            }
        },
        summary: {
            overall_performance: singleQueryTime > 0 ? 
                `Processed ${testIPs.length} IPs in ${singleQueryTime}ms (${(testIPs.length / (singleQueryTime / 1000)).toFixed(2)} QPS)` : 
                'No queries processed',
            cache_efficiency: `${stats.cache_hit_rate}% hit rate`,
        }
    };
    
    // 保存报告到文件
    const reportPath = path.join(__dirname, 'oraSRS-local-contract-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`本地合约测试报告已保存到: ${reportPath}`);
    
    // 保存测试IP列表
    const ipListPath = path.join(__dirname, 'local-test-ip-list.json');
    fs.writeFileSync(ipListPath, JSON.stringify(testIPs, null, 2));
    console.log(`测试IP列表已保存到: ${ipListPath}`);
    
    console.log('\n✅ 本地合约测试完成！');
}

// 运行测试
runPerformanceTest().catch(err => {
    console.error('❌ 测试过程中发生错误:', err);
    process.exit(1);
});
