#!/usr/bin/env node
/**
 * OraSRS CLI Output Test
 * 测试增强的CLI输出格式
 */

import ThreatFormatter from './src/formatters/threat-formatter.js';

const formatter = new ThreatFormatter();

console.log('='.repeat(80));
console.log('OraSRS CLI 输出格式测试');
console.log('='.repeat(80));
console.log();

// Test Case 1: High Risk IP
console.log('测试案例 1: 高风险 IP');
console.log('-'.repeat(80));
const highRiskData = {
    query: { ip: '45.135.193.0' },
    response: {
        risk_score: 75,
        risk_level: 'High',
        threat_types: ['Botnet C2 (推测)'],
        source: 'Abuse.ch',
        first_seen: '2025-12-10T00:00:00Z',
        last_seen: '2025-12-15T12:00:00Z',
        cached: false,
        is_whitelisted: false
    }
};
console.log(formatter.formatPretty(highRiskData));

// Test Case 2: Safe IP
console.log('\\n测试案例 2: 安全 IP');
console.log('-'.repeat(80));
const safeData = {
    query: { ip: '8.8.8.8' },
    response: {
        risk_score: 0,
        risk_level: 'Safe',
        source: 'Blockchain',
        cached: true,
        is_whitelisted: false
    }
};
console.log(formatter.formatPretty(safeData));

// Test Case 3: Whitelisted IP
console.log('\\n测试案例 3: 白名单 IP');
console.log('-'.repeat(80));
const whitelistData = {
    query: { ip: '192.168.1.100' },
    response: {
        risk_score: 0,
        risk_level: 'Safe',
        source: 'Local Whitelist',
        cached: true,
        is_whitelisted: true
    }
};
console.log(formatter.formatPretty(whitelistData));

// Test Case 4: Critical Risk IP
console.log('\\n测试案例 4: 严重风险 IP');
console.log('-'.repeat(80));
const criticalData = {
    query: { ip: '1.2.3.4' },
    response: {
        risk_score: 95,
        risk_level: 'Critical',
        threat_types: ['DDoS', 'Botnet'],
        source: 'Local Cache (Spamhaus)',
        first_seen: '2025-12-01T00:00:00Z',
        last_seen: '2025-12-16T10:00:00Z',
        cached: true,
        from_cache: true,
        is_whitelisted: false
    }
};
console.log(formatter.formatPretty(criticalData));

console.log('='.repeat(80));
console.log('测试完成');
console.log('='.repeat(80));
