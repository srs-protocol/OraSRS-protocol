#!/usr/bin/env node
/**
 * OraSRS Cluster Mode Wrapper
 * Utilizes all CPU cores for maximum throughput
 */

const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster || cluster.isPrimary) {
    const numCPUs = Math.min(os.cpus().length, 4); // Limit to 4 workers max
    console.log(`🚀 OraSRS Master 进程启动 (PID: ${process.pid})`);
    console.log(`📊 CPU 核心数: ${os.cpus().length}, 启动 Worker 数: ${numCPUs}`);

    // Fork workers
    for (let i = 0; i < numCPUs; i++) {
        const worker = cluster.fork();
        console.log(`✅ Worker ${i + 1} 启动 (PID: ${worker.process.pid})`);
    }

    // Handle worker exit
    cluster.on('exit', (worker, code, signal) => {
        console.log(`⚠️  Worker ${worker.process.pid} 退出 (code: ${code}, signal: ${signal})`);
        console.log(`🔄 重启 Worker...`);
        const newWorker = cluster.fork();
        console.log(`✅ 新 Worker 启动 (PID: ${newWorker.process.pid})`);
    });

    // Handle worker online
    cluster.on('online', (worker) => {
        console.log(`📡 Worker ${worker.process.pid} 已上线`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('📴 收到 SIGTERM 信号，优雅关闭...');
        for (const id in cluster.workers) {
            cluster.workers[id].kill();
        }
        process.exit(0);
    });

    process.on('SIGINT', () => {
        console.log('📴 收到 SIGINT 信号，优雅关闭...');
        for (const id in cluster.workers) {
            cluster.workers[id].kill();
        }
        process.exit(0);
    });

} else {
    // Worker process - load the actual application using dynamic import
    console.log(`👷 Worker ${process.pid} 正在加载应用...`);
    import('./orasrs-simple-client.js').catch(err => {
        console.error(`❌ Worker ${process.pid} 加载失败:`, err);
        process.exit(1);
    });
}
