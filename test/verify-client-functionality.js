#!/usr/bin/env node
/**
 * OraSRS Client Functionality Verification Script
 * Tests the cache rebuild and query functionality
 */

import axios from 'axios';
import chalk from 'chalk';

const ENDPOINT = process.env.ORASRS_ENDPOINT || 'http://127.0.0.1:3006';

const log = {
    info: (msg) => console.log(chalk.blue('ℹ'), msg),
    success: (msg) => console.log(chalk.green('✓'), msg),
    error: (msg) => console.log(chalk.red('✗'), msg),
    warning: (msg) => console.log(chalk.yellow('⚠'), msg),
};

async function testAPI(endpoint, method = 'GET', data = null) {
    try {
        const config = { method, url: `${ENDPOINT}${endpoint}` };
        if (data) {
            config.data = data;
            config.headers = { 'Content-Type': 'application/json' };
        }
        const response = await axios(config);
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function runVerification() {
    console.log(chalk.bold('\n🧪 OraSRS 客户端功能验证\n'));
    console.log('='.repeat(60));

    // Test 1: Health Check
    console.log(chalk.bold('\n1. 健康检查'));
    const health = await testAPI('/health');
    if (health.success) {
        log.success('服务运行正常');
        console.log(`   版本: ${health.data.version || 'N/A'}`);
    } else {
        log.error(`健康检查失败: ${health.error}`);
        return;
    }

    // Test 2: Cache Status (Before)
    console.log(chalk.bold('\n2. 缓存状态 (重建前)'));
    const cacheBefore = await testAPI('/orasrs/v1/cache/status');
    if (cacheBefore.success) {
        log.info(`威胁记录: ${cacheBefore.data.threats || 0} 条`);
        log.info(`安全IP: ${cacheBefore.data.safeIPs || 0} 个`);
        log.info(`白名单: ${cacheBefore.data.whitelist || 0} 个`);
    } else {
        log.error(`获取缓存状态失败: ${cacheBefore.error}`);
    }

    // Test 3: Clear Cache
    console.log(chalk.bold('\n3. 清空缓存'));
    const clear = await testAPI('/orasrs/v1/cache/clear', 'POST');
    if (clear.success) {
        log.success('缓存已清空');
    } else {
        log.error(`清空缓存失败: ${clear.error}`);
    }

    // Test 4: Sync/Rebuild Cache
    console.log(chalk.bold('\n4. 重建缓存 (从威胁数据源同步)'));
    log.info('正在同步...');
    const sync = await testAPI('/orasrs/v1/sync?force=true', 'POST');
    if (sync.success) {
        log.success('同步完成');
        if (sync.data.stats) {
            console.log(`   威胁数据: ${sync.data.stats.threats || 0} 条`);
            console.log(`   安全IP: ${sync.data.stats.safeIPs || 0} 个`);
            console.log(`   白名单: ${sync.data.stats.whitelist || 0} 个`);
        }
    } else {
        log.error(`同步失败: ${sync.error}`);
    }

    // Test 5: Cache Status (After)
    console.log(chalk.bold('\n5. 缓存状态 (重建后)'));
    const cacheAfter = await testAPI('/orasrs/v1/cache/status');
    if (cacheAfter.success) {
        const threats = cacheAfter.data.threats || 0;
        const safeIPs = cacheAfter.data.safeIPs || 0;
        const whitelist = cacheAfter.data.whitelist || 0;

        console.log(`   威胁记录: ${chalk.yellow(threats)} 条`);
        console.log(`   安全IP: ${chalk.green(safeIPs)} 个`);
        console.log(`   白名单: ${chalk.blue(whitelist)} 个`);

        if (threats > 0) {
            log.success('缓存重建成功！威胁数据已加载');
        } else {
            log.warning('缓存中没有威胁数据，可能威胁数据源为空');
        }
    } else {
        log.error(`获取缓存状态失败: ${cacheAfter.error}`);
    }

    // Test 6: Query IP
    console.log(chalk.bold('\n6. 查询 IP (测试查询功能)'));
    const testIP = '27.124.0.0';
    log.info(`查询 IP: ${testIP}`);
    const query = await testAPI(`/orasrs/v1/query?ip=${testIP}`);
    if (query.success) {
        const resp = query.data.response;
        console.log(`   风险评分: ${resp.risk_score || 0}/100`);
        console.log(`   风险等级: ${resp.risk_level || 'Unknown'}`);
        console.log(`   数据来源: ${resp.source || 'Unknown'}`);
        console.log(`   缓存: ${resp.cached ? '是' : '否'}`);
        log.success('查询功能正常');
    } else {
        log.error(`查询失败: ${query.error}`);
    }

    // Summary
    console.log(chalk.bold('\n' + '='.repeat(60)));
    console.log(chalk.bold.green('\n✅ 验证完成\n'));

    console.log('测试结果总结:');
    console.log(`  健康检查: ${health.success ? '✓' : '✗'}`);
    console.log(`  缓存清空: ${clear.success ? '✓' : '✗'}`);
    console.log(`  数据同步: ${sync.success ? '✓' : '✗'}`);
    console.log(`  缓存状态: ${cacheAfter.success ? '✓' : '✗'}`);
    console.log(`  IP查询: ${query.success ? '✓' : '✗'}`);

    if (cacheAfter.success && (cacheAfter.data.threats || 0) > 0) {
        console.log(chalk.green('\n🎉 所有功能验证通过！缓存重建功能正常工作。'));
    } else {
        console.log(chalk.yellow('\n⚠️  缓存重建后数据为空，请检查威胁数据源配置。'));
    }
}

runVerification().catch(error => {
    log.error(`验证脚本执行失败: ${error.message}`);
    process.exit(1);
});
