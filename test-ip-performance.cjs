const fs = require('fs');
const crypto = require('crypto');

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
function generateRandomThreatLevel() {
    const levels = ['info', 'warning', 'critical', 'emergency'];
    return levels[Math.floor(Math.random() * levels.length)];
}

// 生成随机风险级别
function generateRandomRiskLevel() {
    const levels = ['low', 'medium', 'high', 'very_high'];
    return levels[Math.floor(Math.random() * levels.length)];
}

// 生成随机推荐操作
function generateRandomRecommendations() {
    const actions = ['allow', 'allow_with_captcha', 'require_mfa', 'block'];
    return {
        default: actions[Math.floor(Math.random() * actions.length)],
        public_services: actions[Math.floor(Math.random() * actions.length)],
        banking: actions[Math.floor(Math.random() * actions.length)],
        admin_panel: actions[Math.floor(Math.random() * actions.length)]
    };
}

// 生成模拟的链上威胁情报数据
function generateChainThreatData(ipCount = 1000) {
    const threatData = {};
    for (let i = 0; i < ipCount; i++) {
        const ip = generateRandomIP();
        threatData[ip] = {
            risk_score: generateRandomRiskScore(),
            risk_level: generateRandomRiskLevel(),
            threat_level: generateRandomThreatLevel(),
            recommendations: generateRandomRecommendations(),
            evidence: [
                {
                    type: 'behavior',
                    detail: 'Random threat detection',
                    source: `node-${Math.random().toString(36).substring(7)}`,
                    timestamp: new Date().toISOString()
                }
            ],
            confidence: Math.random() > 0.5 ? 'high' : 'medium',
            appeal_url: 'https://srs.net/appeal',
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24小时后过期
            disclaimers: 'This is advisory only. Final decision rests with the client.'
        };
    }
    return threatData;
}

// 模拟查询本地威胁情报
function queryLocalThreatIntel(ip, localThreatData) {
    // 模拟本地查询延迟
    const start = Date.now();
    
    // 检查IP是否在本地威胁数据中
    const threatInfo = localThreatData[ip] || {
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
    
    const end = Date.now();
    const queryTime = end - start;
    
    return {
        query: { ip },
        response: {
            ...threatInfo,
            query_time_ms: queryTime
        }
    };
}

// 模拟查询链上威胁情报
function queryChainThreatIntel(ip, chainThreatData) {
    // 模拟链上查询延迟
    const start = Date.now();
    const delay = Math.random() * 50 + 10; // 10-60ms 模拟网络延迟
    // 模拟网络请求延迟
    const end = Date.now() + delay;
    
    // 检查IP是否在链上威胁数据中
    const threatInfo = chainThreatData[ip] || {
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
    
    const queryTime = delay;
    
    return {
        query: { ip },
        response: {
            ...threatInfo,
            query_time_ms: queryTime
        }
    };
}

// 性能测试函数
async function performanceTest() {
    console.log('开始IP查询性能测试...');
    
    // 生成10000个本地IP列表
    console.log('生成10000个本地IP...');
    const localIPList = [];
    for (let i = 0; i < 10000; i++) {
        localIPList.push(generateRandomIP());
    }
    
    // 生成1000个链上威胁情报数据
    console.log('生成1000个链上威胁情报数据...');
    const chainThreatData = generateChainThreatData(1000);
    
    // 生成本地威胁情报数据（用于模拟本地缓存）
    const localThreatData = {};
    for (let i = 0; i < 500; i++) {
        const ip = generateRandomIP();
        localThreatData[ip] = {
            risk_score: generateRandomRiskScore(),
            risk_level: generateRandomRiskLevel(),
            threat_level: generateRandomThreatLevel(),
            recommendations: generateRandomRecommendations(),
            evidence: [
                {
                    type: 'behavior',
                    detail: 'Random threat detection',
                    source: `node-${Math.random().toString(36).substring(7)}`,
                    timestamp: new Date().toISOString()
                }
            ],
            confidence: Math.random() > 0.5 ? 'high' : 'medium'
        };
    }
    
    // 测试本地查询性能
    console.log('开始本地查询性能测试...');
    const localStart = Date.now();
    let localTotalQueryTime = 0;
    let localHits = 0;
    
    for (let i = 0; i < localIPList.length; i++) {
        const result = queryLocalThreatIntel(localIPList[i], localThreatData);
        localTotalQueryTime += result.response.query_time_ms;
        
        // 统计有威胁数据的IP数量
        if (result.response.risk_score > 0.5) {
            localHits++;
        }
        
        // 每1000次查询输出一次进度
        if ((i + 1) % 1000 === 0) {
            console.log(`本地查询进度: ${i + 1}/${localIPList.length}`);
        }
    }
    
    const localEnd = Date.now();
    const localTotalTime = localEnd - localStart;
    
    // 测试链上查询性能（随机选择IP进行查询）
    console.log('开始链上查询性能测试...');
    const chainStart = Date.now();
    let chainTotalQueryTime = 0;
    let chainHits = 0;
    
    // 从链上威胁数据中随机选择IP进行查询
    const chainIPs = Object.keys(chainThreatData);
    const sampleSize = Math.min(1000, chainIPs.length);
    
    for (let i = 0; i < sampleSize; i++) {
        const ip = chainIPs[i];
        const result = queryChainThreatIntel(ip, chainThreatData);
        chainTotalQueryTime += result.response.query_time_ms;
        
        // 统计有威胁数据的IP数量
        if (result.response.risk_score > 0.5) {
            chainHits++;
        }
        
        // 每100次查询输出一次进度
        if ((i + 1) % 100 === 0) {
            console.log(`链上查询进度: ${i + 1}/${sampleSize}`);
        }
    }
    
    const chainEnd = Date.now();
    const chainTotalTime = chainEnd - chainStart;
    
    // 输出测试结果
    console.log('\n=== 性能测试结果 ===');
    console.log(`本地IP总数: ${localIPList.length}`);
    console.log(`链上IP总数: ${chainIPs.length}`);
    console.log(`\n本地查询统计:`);
    console.log(`  总查询时间: ${localTotalTime}ms`);
    console.log(`  平均查询时间: ${(localTotalQueryTime / localIPList.length).toFixed(4)}ms`);
    console.log(`  平均响应时间: ${(localTotalTime / localIPList.length).toFixed(4)}ms`);
    console.log(`  高风险IP数量: ${localHits}`);
    console.log(`  QPS (查询/秒): ${(localIPList.length / (localTotalTime / 1000)).toFixed(2)}`);
    
    console.log(`\n链上查询统计:`);
    console.log(`  总查询时间: ${chainTotalTime}ms`);
    console.log(`  平均查询时间: ${(chainTotalQueryTime / sampleSize).toFixed(4)}ms`);
    console.log(`  平均响应时间: ${(chainTotalTime / sampleSize).toFixed(4)}ms`);
    console.log(`  高风险IP数量: ${chainHits}`);
    console.log(`  QPS (查询/秒): ${(sampleSize / (chainTotalTime / 1000)).toFixed(2)}`);
    
    // 生成测试报告
    const report = {
        test_date: new Date().toISOString(),
        test_type: 'IP Query Performance Test',
        parameters: {
            local_ip_count: localIPList.length,
            chain_ip_count: chainIPs.length,
            sample_size: sampleSize
        },
        local_results: {
            total_time_ms: localTotalTime,
            average_query_time_ms: (localTotalQueryTime / localIPList.length).toFixed(4),
            average_response_time_ms: (localTotalTime / localIPList.length).toFixed(4),
            high_risk_count: localHits,
            qps: (localIPList.length / (localTotalTime / 1000)).toFixed(2)
        },
        chain_results: {
            total_time_ms: chainTotalTime,
            average_query_time_ms: (chainTotalQueryTime / sampleSize).toFixed(4),
            average_response_time_ms: (chainTotalTime / sampleSize).toFixed(4),
            high_risk_count: chainHits,
            qps: (sampleSize / (chainTotalTime / 1000)).toFixed(2)
        }
    };
    
    // 保存测试报告到文件
    fs.writeFileSync('ip-performance-test-report.json', JSON.stringify(report, null, 2));
    console.log('\n测试报告已保存到: ip-performance-test-report.json');
    
    // 保存生成的IP列表到文件
    fs.writeFileSync('local-ip-list.json', JSON.stringify(localIPList, null, 2));
    fs.writeFileSync('chain-threat-data.json', JSON.stringify(chainThreatData, null, 2));
    console.log('IP列表和威胁数据已保存到文件');
}

// 运行性能测试
performanceTest().catch(err => {
    console.error('测试过程中发生错误:', err);
});