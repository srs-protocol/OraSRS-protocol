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
    console.log(chalk.bold('\n📊 OraSRS Client Status\n'));

    try {
        // Health check
        const health = await apiCall('/health');
        log.success(`Service: ${health.status || 'running'}`);

        // Get stats
        const stats = await apiCall('/orasrs/v1/threats/stats');
        console.log('\n' + chalk.bold('Statistics:'));
        console.log(`  Total Queries: ${stats.totalQueries || 0}`);
        console.log(`  Cache Hits: ${stats.cacheHits || 0}`);
        console.log(`  High Risk IPs: ${stats.highRiskCount || 0}`);

        // Node config
        if (fs.existsSync(CONFIG_PATH)) {
            const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
            console.log('\n' + chalk.bold('Node Information:'));
            console.log(`  Address: ${config.node?.address || 'Not initialized'}`);
            console.log(`  Registered: ${config.node?.registered ? 'Yes' : 'No'}`);
            console.log(`  Balance: ${config.balance?.native || '0'} ORA`);
        }

        // System service status
        try {
            const serviceStatus = execSync('systemctl is-active orasrs-client', { encoding: 'utf8' }).trim();
            log.success(`System Service: ${serviceStatus}`);
        } catch (e) {
            log.warning('System Service: inactive');
        }

    } catch (error) {
        log.error(`Failed to get status: ${error.message}`);
        process.exit(1);
    }
}

async function queryIP(ip) {
    console.log(chalk.bold(`\n🔍 Querying IP: ${ip}\n`));

    try {
        const result = await apiCall(`/orasrs/v1/query?ip=${ip}`);

        console.log(chalk.bold('Risk Assessment:'));
        console.log(`  Risk Score: ${result.response?.risk_score || 0}/100`);
        console.log(`  Risk Level: ${result.response?.risk_level || 'Unknown'}`);
        console.log(`  Recommendation: ${result.response?.action || 'No action'}`);

        if (result.response?.threat_types?.length > 0) {
            console.log(`\n${chalk.bold('Threat Types:')}`);
            result.response.threat_types.forEach(type => console.log(`  - ${type}`));
        }

        console.log(`\n${chalk.bold('Data Source:')}`);
        console.log(`  Source: ${result.response?.source || 'Unknown'}`);
        console.log(`  Cached: ${result.response?.cached ? 'Yes' : 'No'}`);

    } catch (error) {
        log.error(`Query failed: ${error.message}`);
        process.exit(1);
    }
}

async function initializeClient() {
    console.log(chalk.bold('\n🚀 Initializing OraSRS Client\n'));

    log.info('This will run the complete onboarding process...');
    log.info('Please ensure Hardhat node is running on localhost:8545\n');

    try {
        // Run onboarding script
        execSync('cd /opt/orasrs && node test-onboarding.js', { stdio: 'inherit' });
        log.success('\nClient initialized successfully!');
    } catch (error) {
        log.error('Initialization failed');
        process.exit(1);
    }
}

async function showStats() {
    console.log(chalk.bold('\n📈 OraSRS Statistics\n'));

    try {
        const stats = await apiCall('/orasrs/v1/threats/stats');

        console.log(chalk.bold('Query Statistics:'));
        console.log(`  Total Queries: ${stats.totalQueries || 0}`);
        console.log(`  Cache Hits: ${stats.cacheHits || 0}`);
        console.log(`  Cache Miss: ${stats.cacheMiss || 0}`);
        console.log(`  Hit Rate: ${stats.hitRate || '0%'}`);

        console.log(`\n${chalk.bold('Risk Distribution:')}`);
        console.log(`  Low Risk: ${stats.lowRiskCount || 0}`);
        console.log(`  Medium Risk: ${stats.mediumRiskCount || 0}`);
        console.log(`  High Risk: ${stats.highRiskCount || 0}`);
        console.log(`  Critical Risk: ${stats.criticalRiskCount || 0}`);

        console.log(`\n${chalk.bold('Performance:')}`);
        console.log(`  Avg Response Time: ${stats.avgResponseTime || '0'}ms`);
        console.log(`  Uptime: ${stats.uptime || '0'}s`);

    } catch (error) {
        log.error(`Failed to get statistics: ${error.message}`);
        process.exit(1);
    }
}

async function addToWhitelist(ip) {
    console.log(chalk.bold(`\n➕ Adding ${ip} to whitelist\n`));

    try {
        await apiCall('/orasrs/v1/whitelist/add', 'POST', { ip });
        log.success(`${ip} added to whitelist`);
    } catch (error) {
        log.error(`Failed to add to whitelist: ${error.message}`);
        process.exit(1);
    }
}

async function removeFromWhitelist(ip) {
    console.log(chalk.bold(`\n➖ Removing ${ip} from whitelist\n`));

    try {
        await apiCall('/orasrs/v1/whitelist/remove', 'POST', { ip });
        log.success(`${ip} removed from whitelist`);
    } catch (error) {
        log.error(`Failed to remove from whitelist: ${error.message}`);
        process.exit(1);
    }
}

async function showConfig() {
    console.log(chalk.bold('\n⚙️  OraSRS Configuration\n'));

    if (!fs.existsSync(CONFIG_PATH)) {
        log.warning('Configuration file not found. Run "orasrs-cli init" first.');
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
    console.log(chalk.bold('\n📜 Recent Logs\n'));

    try {
        const logs = execSync('journalctl -u orasrs-client -n 50 --no-pager', { encoding: 'utf8' });
        console.log(logs);
    } catch (error) {
        log.error('Failed to read logs. Try: sudo journalctl -u orasrs-client -f');
    }
}

async function runTests() {
    console.log(chalk.bold('\n🧪 Running System Tests\n'));

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

    console.log(`\n${chalk.bold('Results:')} ${passed} passed, ${failed} failed`);

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
