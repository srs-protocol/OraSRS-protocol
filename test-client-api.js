const express = require('express');
const fs = require('fs');
const crypto = require('crypto');
const app = express();

// 中间件
app.use(express.json());
app.use(express.static('.'));

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

// 生成本地威胁情报数据
function generateLocalThreatData(ipCount = 500) {
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
            confidence: Math.random() > 0.5 ? 'high' : 'medium'
        };
    }
    return threatData;
}

// 模拟客户端查询接口
app.get('/SRA/v1/query', (req, res) => {
    const { ip, domain } = req.query;
    
    if (!ip) {
        return res.status(400).json({ error: 'IP parameter is required' });
    }
    
    // 模拟查询本地威胁情报
    const start = Date.now();
    
    // 模拟本地查询逻辑
    const localResult = localThreatData[ip] || {
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
    
    const response = {
        query: { ip, domain },
        response: {
            ...localResult,
            query_time_ms: queryTime
        }
    };
    
    // 随机添加一些延迟以模拟真实网络环境
    setTimeout(() => {
        res.json(response);
    }, Math.random() * 5); // 0-5ms 额外延迟
});

// 批量查询接口
app.post('/SRA/v1/bulk-query', (req, res) => {
    const { ips } = req.body;
    
    if (!ips || !Array.isArray(ips)) {
        return res.status(400).json({ error: 'IPS array is required in request body' });
    }
    
    const start = Date.now();
    
    // 批量查询所有IP
    const results = ips.map(ip => {
        const localResult = localThreatData[ip] || {
            risk_score: 0.1,
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
        
        return {
            ip,
            result: {
                ...localResult
            }
        };
    });
    
    const end = Date.now();
    const queryTime = end - start;
    
    const response = {
        query: { ips },
        response: {
            results,
            query_time_ms: queryTime,
            total_ips: ips.length
        }
    };
    
    // 随机添加一些延迟以模拟真实网络环境
    setTimeout(() => {
        res.json(response);
    }, Math.random() * 10); // 0-10ms 额外延迟
});

// 获取全局威胁列表接口
app.get('/SRA/v2/threat-list', (req, res) => {
    const start = Date.now();
    
    // 从链上威胁数据中获取高风险IP
    const highRiskIPs = Object.entries(chainThreatData)
        .filter(([ip, data]) => data.risk_score > 0.7)
        .map(([ip, data]) => ({
            ip,
            threat_level: data.threat_level,
            first_seen: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
            last_seen: new Date().toISOString(),
            report_count: Math.floor(Math.random() * 20) + 1,
            evidence: data.evidence,
            risk_score: data.risk_score
        }));
    
    const end = Date.now();
    const queryTime = end - start;
    
    const response = {
        threat_list: highRiskIPs,
        last_update: new Date().toISOString(),
        total_threats: highRiskIPs.length,
        query_time_ms: queryTime
    };
    
    res.json(response);
});

// 测试配置
let localThreatData = {};
let chainThreatData = {};

// 初始化测试数据
function initializeTestData() {
    console.log('初始化测试数据...');
    
    // 生成10000个本地IP列表并创建本地威胁数据
    console.log('生成本地威胁情报数据...');
    localThreatData = generateLocalThreatData(10000);
    
    // 生成1000个链上威胁情报数据
    console.log('生成链上威胁情报数据...');
    chainThreatData = generateChainThreatData(1000);
    
    console.log('测试数据初始化完成');
}

// 性能测试端点
app.get('/test/performance', (req, res) => {
    const { ipCount = 1000 } = req.query;
    const count = parseInt(ipCount);
    
    console.log(`开始性能测试，生成 ${count} 个IP的查询...`);
    const start = Date.now();
    
    // 生成随机IP进行查询
    const testIPs = [];
    for (let i = 0; i < count; i++) {
        testIPs.push(generateRandomIP());
    }
    
    // 模拟查询这些IP
    const results = testIPs.map(ip => {
        return localThreatData[ip] || {
            risk_score: 0.1,
            risk_level: 'low',
            threat_level: 'info'
        };
    });
    
    const end = Date.now();
    const totalTime = end - start;
    
    const response = {
        test_type: 'Performance Test',
        ip_count: count,
        total_time_ms: totalTime,
        average_time_per_ip: (totalTime / count).toFixed(4),
        qps: (count / (totalTime / 1000)).toFixed(2),
        test_date: new Date().toISOString()
    };
    
    res.json(response);
});

// 启动服务器
const PORT = process.env.PORT || 3000;
initializeTestData();

app.listen(PORT, '0.0.0.0', () => {
    console.log(`OraSRS测试客户端服务器运行在端口 ${PORT}`);
    console.log(`API端点:`);
    console.log(`  GET  /SRA/v1/query?ip=1.2.3.4  - 查询单个IP威胁情报`);
    console.log(`  POST /SRA/v1/bulk-query         - 批量查询IP威胁情报`);
    console.log(`  GET  /SRA/v2/threat-list        - 获取全局威胁列表`);
    console.log(`  GET  /test/performance?ipCount=1000 - 性能测试`);
    
    // 打印一些示例数据统计
    console.log(`\n数据统计:`);
    console.log(`  本地威胁数据: ${Object.keys(localThreatData).length} IPs`);
    console.log(`  链上威胁数据: ${Object.keys(chainThreatData).length} IPs`);
    
    // 高风险IP统计
    const highRiskCount = Object.values(localThreatData).filter(data => data.risk_score > 0.7).length;
    console.log(`  本地高风险IP: ${highRiskCount} IPs`);
});