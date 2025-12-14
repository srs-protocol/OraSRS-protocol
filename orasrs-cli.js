#!/usr/bin/env node
/**
 * OraSRS CLI - Command Line Interface for OraSRS Client Management
 * 
 * Usage:
 *   orasrs-cli status              - Show client status
 *   orasrs-cli query <ip>          - Query IP risk score
 *   orasrs-cli init                - Initialize client (onboarding)
 *   orasrs-cli stats               - Show statistics
 *   orasrs-cli whitelist add <ip>  - Add IP to whitelist
 *   orasrs-cli whitelist remove <ip> - Remove IP from whitelist
 *   orasrs-cli config              - Show configuration
 *   orasrs-cli logs                - Show recent logs
 *   orasrs-cli test                - Run system tests
 */

import { program } from 'commander';
import axios from 'axios';
import fs from 'fs';
import { execSync } from 'child_process';
import chalk from 'chalk';

const ORASRS_ENDPOINT = process.env.ORASRS_ENDPOINT || 'http://127.0.0.1:3006';
const CONFIG_PATH = '/etc/orasrs/node-config.json';
const CLI_CONFIG_PATH = '/etc/orasrs/cli-config.json';

// Language Dictionary
const i18n = {
    en: {
        status_title: '📊 OraSRS Client Status',
        service_running: 'Service: running',
        stats_title: 'Statistics:',
        total_queries: 'Total Queries',
        cache_hits: 'Cache Hits',
        high_risk_ips: 'High Risk IPs',
        node_info: 'Node Information:',
        address: 'Address',
        registered: 'Registered',
        balance: 'Balance',
        system_service: 'System Service',
        query_title: '🔍 Querying IP',
        risk_assessment: 'Risk Assessment:',
        risk_score: 'Risk Score',
        risk_level: 'Risk Level',
        recommendation: 'Recommendation',
        threat_types: 'Threat Types:',
        data_source: 'Data Source:',
        source: 'Source',
        cached: 'Cached',
        init_title: '🚀 Initializing OraSRS Client',
        init_desc: 'This will run the complete onboarding process...',
        init_check: 'Please ensure Hardhat node is running on localhost:8545',
        init_success: 'Client initialized successfully!',
        init_fail: 'Initialization failed',
        stats_header: '📈 OraSRS Statistics',
        query_stats: 'Query Statistics:',
        cache_miss: 'Cache Miss',
        hit_rate: 'Hit Rate',
        risk_dist: 'Risk Distribution:',
        performance: 'Performance:',
        avg_response: 'Avg Response Time',
        uptime: 'Uptime',
        whitelist_add: '➕ Adding IP to whitelist',
        whitelist_remove: '➖ Removing IP from whitelist',
        config_title: '⚙️  OraSRS Configuration',
        config_missing: 'Configuration file not found. Run "orasrs-cli init" first.',
        logs_title: '📜 Recent Logs',
        logs_fail: 'Failed to read logs. Try: sudo journalctl -u orasrs-client -f',
        tests_title: '🧪 Running System Tests',
        results: 'Results:',
        passed: 'passed',
        failed: 'failed'
    },
    zh: {
        status_title: '📊 OraSRS 客户端状态',
        service_running: '服务: 运行中',
        stats_title: '统计信息:',
        total_queries: '总查询数',
        cache_hits: '缓存命中',
        high_risk_ips: '高危 IP 数',
        node_info: '节点信息:',
        address: '地址',
        registered: '已注册',
        balance: '余额',
        system_service: '系统服务',
        query_title: '🔍 查询 IP',
        risk_assessment: '风险评估:',
        risk_score: '风险评分',
        risk_level: '风险等级',
        recommendation: '建议操作',
        threat_types: '威胁类型:',
        data_source: '数据来源:',
        source: '来源',
        cached: '缓存',
        init_title: '🚀 初始化 OraSRS 客户端',
        init_desc: '这将运行完整的初始化流程...',
        init_check: '请确保 Hardhat 节点正在运行于 localhost:8545',
        init_success: '客户端初始化成功！',
        init_fail: '初始化失败',
        stats_header: '📈 OraSRS 统计数据',
        query_stats: '查询统计:',
        cache_miss: '缓存未命中',
        hit_rate: '命中率',
        risk_dist: '风险分布:',
        performance: '性能指标:',
        avg_response: '平均响应时间',
        uptime: '运行时间',
        whitelist_add: '➕ 添加 IP 到白名单',
        whitelist_remove: '➖ 从白名单移除 IP',
        config_title: '⚙️  OraSRS 配置',
        config_missing: '未找到配置文件。请先运行 "orasrs-cli init"。',
        logs_title: '📜 最近日志',
        logs_fail: '读取日志失败。请尝试: sudo journalctl -u orasrs-client -f',
        tests_title: '🧪 运行系统测试',
        results: '结果:',
        passed: '通过',
        failed: '失败'
    }
};

// Get current language
function getLang() {
    try {
        if (fs.existsSync(CLI_CONFIG_PATH)) {
            const config = JSON.parse(fs.readFileSync(CLI_CONFIG_PATH, 'utf8'));
            return config.language === 'zh' ? i18n.zh : i18n.en;
        }
    } catch (e) { }
    return i18n.en;
}

const t = getLang();

// Helper functions
const log = {
    info: (msg) => console.log(chalk.blue('ℹ'), msg),
    success: (msg) => console.log(chalk.green('✓'), msg),
    error: (msg) => console.log(chalk.red('✗'), msg),
    warning: (msg) => console.log(chalk.yellow('⚠'), msg),
};

async function apiCall(endpoint, method = 'GET', data = null) {
    try {
        const config = { method, url: `${ORASRS_ENDPOINT}${endpoint}` };
        if (data) config.data = data;
        const response = await axios(config);
        return response.data;
    } catch (error) {
        throw new Error(`API call failed: ${error.message}`);
    }
}

// Commands

async function showStatus() {
    console.log(chalk.bold(`\n${t.status_title}\n`));

    try {
        // Health check
        const health = await apiCall('/health');
        log.success(`${t.service_running}`);

        // Get stats
        const stats = await apiCall('/orasrs/v1/threats/stats');
        console.log('\n' + chalk.bold(t.stats_title));
        console.log(`  ${t.total_queries}: ${stats.totalQueries || 0}`);
        console.log(`  ${t.cache_hits}: ${stats.cacheHits || 0}`);
        console.log(`  ${t.high_risk_ips}: ${stats.highRiskCount || 0}`);

        // Node config
        if (fs.existsSync(CONFIG_PATH)) {
            const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
            console.log('\n' + chalk.bold(t.node_info));
            console.log(`  ${t.address}: ${config.node?.address || 'Not initialized'}`);
            console.log(`  ${t.registered}: ${config.node?.registered ? 'Yes' : 'No'}`);
            console.log(`  ${t.balance}: ${config.balance?.native || '0'} ORA`);
        }

        // System service status
        try {
            const serviceStatus = execSync('systemctl is-active orasrs-client', { encoding: 'utf8' }).trim();
            log.success(`${t.system_service}: ${serviceStatus}`);
        } catch (e) {
            log.warning(`${t.system_service}: inactive`);
        }

    } catch (error) {
        log.error(`Failed to get status: ${error.message}`);
        process.exit(1);
    }
}

async function queryIP(ip) {
    console.log(chalk.bold(`\n${t.query_title}: ${ip}\n`));

    try {
        const result = await apiCall(`/orasrs/v1/query?ip=${ip}`);

        console.log(chalk.bold(t.risk_assessment));
        console.log(`  ${t.risk_score}: ${result.response?.risk_score || 0}/100`);
        console.log(`  ${t.risk_level}: ${result.response?.risk_level || 'Unknown'}`);
        console.log(`  ${t.recommendation}: ${result.response?.action || 'No action'}`);

        if (result.response?.threat_types?.length > 0) {
            console.log(`\n${chalk.bold(t.threat_types)}`);
            result.response.threat_types.forEach(type => console.log(`  - ${type}`));
        }

        console.log(`\n${chalk.bold(t.data_source)}`);
        console.log(`  ${t.source}: ${result.response?.source || 'Unknown'}`);
        console.log(`  ${t.cached}: ${result.response?.cached ? 'Yes' : 'No'}`);

    } catch (error) {
        log.error(`Query failed: ${error.message}`);
        process.exit(1);
    }
}

async function initializeClient() {
    console.log(chalk.bold(`\n${t.init_title}\n`));

    log.info(t.init_desc);
    log.info(`${t.init_check}\n`);

    try {
        // Run onboarding script
        execSync('cd /opt/orasrs && node test-onboarding.js', { stdio: 'inherit' });
        log.success(`\n${t.init_success}`);
    } catch (error) {
        log.error(t.init_fail);
        process.exit(1);
    }
}

async function showStats() {
    console.log(chalk.bold(`\n${t.stats_header}\n`));

    try {
        const stats = await apiCall('/orasrs/v1/threats/stats');

        console.log(chalk.bold(t.query_stats));
        console.log(`  ${t.total_queries}: ${stats.totalQueries || 0}`);
        console.log(`  ${t.cache_hits}: ${stats.cacheHits || 0}`);
        console.log(`  ${t.cache_miss}: ${stats.cacheMiss || 0}`);
        console.log(`  ${t.hit_rate}: ${stats.hitRate || '0%'}`);

        console.log(`\n${chalk.bold(t.risk_dist)}`);
        console.log(`  Low Risk: ${stats.lowRiskCount || 0}`);
        console.log(`  Medium Risk: ${stats.mediumRiskCount || 0}`);
        console.log(`  High Risk: ${stats.highRiskCount || 0}`);
        console.log(`  Critical Risk: ${stats.criticalRiskCount || 0}`);

        console.log(`\n${chalk.bold(t.performance)}`);
        console.log(`  ${t.avg_response}: ${stats.avgResponseTime || '0'}ms`);
        console.log(`  ${t.uptime}: ${stats.uptime || '0'}s`);

    } catch (error) {
        log.error(`Failed to get statistics: ${error.message}`);
        process.exit(1);
    }
}

async function addToWhitelist(ip) {
    console.log(chalk.bold(`\n${t.whitelist_add}\n`));

    try {
        await apiCall('/orasrs/v1/whitelist/add', 'POST', { ip });
        log.success(`${ip} added to whitelist`);
    } catch (error) {
        log.error(`Failed to add to whitelist: ${error.message}`);
        process.exit(1);
    }
}

async function removeFromWhitelist(ip) {
    console.log(chalk.bold(`\n${t.whitelist_remove}\n`));

    try {
        await apiCall('/orasrs/v1/whitelist/remove', 'POST', { ip });
        log.success(`${ip} removed from whitelist`);
    } catch (error) {
        log.error(`Failed to remove from whitelist: ${error.message}`);
        process.exit(1);
    }
}

async function showConfig() {
    console.log(chalk.bold(`\n${t.config_title}\n`));

    if (!fs.existsSync(CONFIG_PATH)) {
        log.warning(t.config_missing);
        return;
    }

    try {
        const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        console.log(JSON.stringify(config, null, 2));
    } catch (error) {
        log.error(`Failed to read configuration: ${error.message}`);
        process.exit(1);
    }
}

async function showLogs() {
    console.log(chalk.bold(`\n${t.logs_title}\n`));

    try {
        const logs = execSync('journalctl -u orasrs-client -n 50 --no-pager', { encoding: 'utf8' });
        console.log(logs);
    } catch (error) {
        log.error(t.logs_fail);
    }
}

async function runTests() {
    console.log(chalk.bold(`\n${t.tests_title}\n`));

    const tests = [
        { name: 'Health Check', test: async () => await apiCall('/health') },
        { name: 'Query Test IP', test: async () => await apiCall('/orasrs/v1/query?ip=192.0.2.1') },
        { name: 'Statistics', test: async () => await apiCall('/orasrs/v1/threats/stats') },
    ];

    let passed = 0;
    let failed = 0;

    for (const { name, test } of tests) {
        try {
            await test();
            log.success(name);
            passed++;
        } catch (error) {
            log.error(`${name}: ${error.message}`);
            failed++;
        }
    }

    console.log(`\n${chalk.bold(t.results)} ${passed} ${t.passed}, ${failed} ${t.failed}`);

    if (failed > 0) {
        process.exit(1);
    }
}

// CLI Setup
program
    .name('orasrs-cli')
    .description('OraSRS Client Management CLI')
    .version('2.1.0');

program
    .command('status')
    .description('Show client status')
    .action(showStatus);

program
    .command('query <ip>')
    .description('Query IP risk score')
    .action(queryIP);

program
    .command('init')
    .description('Initialize client (run onboarding)')
    .action(initializeClient);

program
    .command('stats')
    .description('Show statistics')
    .action(showStats);

program
    .command('whitelist')
    .description('Manage whitelist')
    .addCommand(
        program.createCommand('add')
            .argument('<ip>', 'IP address to add')
            .action(addToWhitelist)
    )
    .addCommand(
        program.createCommand('remove')
            .argument('<ip>', 'IP address to remove')
            .action(removeFromWhitelist)
    );

program
    .command('config')
    .description('Show configuration')
    .action(showConfig);

program
    .command('logs')
    .description('Show recent logs')
    .action(showLogs);

program
    .command('test')
    .description('Run system tests')
    .action(runTests);

program.parse();
