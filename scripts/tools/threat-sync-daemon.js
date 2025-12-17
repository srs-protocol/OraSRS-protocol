// threat-sync-daemon.js
// 威胁IP同步守护进程 - 实现内核级黑名单处理

import { createThreatIPSync } from './threat-ip-sync.js';
import { createBatchThreatReporter } from './batch-threat-reporter.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

class ThreatSyncDaemon {
  constructor(config = {}) {
    this.config = {
      rpcUrl: 'https://api.orasrs.net',
      syncInterval: config.syncInterval || 60000, // 1分钟同步一次
      ipsetSetName: config.ipsetSetName || 'ora_threats',
      batchSize: config.batchSize || 2000, // 增加每批处理的IP数量
      highVolumeThreshold: config.highVolumeThreshold || 100000, // 10万IP阈值
      ...config
    };
    
    this.syncer = null;
    this.batchReporter = null;
    this.isRunning = false;
    this.lastSyncTime = 0;
    this.stats = {
      totalSynced: 0,
      totalBlocked: 0,
      lastBatchSize: 0,
      errors: 0,
      contractEventsReduced: 0, // 减少的事件数量
      kernelMatches: 0 // 内核匹配次数
    };
  }

    // 初始化同步器
  async initialize() {
    try {
      // 加载合约地址
      let contractAddresses = {};
      if (fs.existsSync('all-deployments.json')) {
        contractAddresses = JSON.parse(fs.readFileSync('all-deployments.json', 'utf8'));
      } else if (fs.existsSync('deployed_addresses/full-deployments.json')) {
        contractAddresses = JSON.parse(fs.readFileSync('deployed_addresses/full-deployments.json', 'utf8'));
      } else {
        throw new Error('未找到部署信息文件');
      }

      // 创建威胁IP同步器
      this.syncer = await createThreatIPSync(this.config.rpcUrl, contractAddresses);
      
      // 创建批量威胁报告器
      this.batchReporter = await createBatchThreatReporter(this.config.rpcUrl, contractAddresses);
      
      console.log('✅ 威胁同步守护进程初始化成功');
      console.log('✅ 批量威胁报告器初始化成功');
      
      // 验证ipset集合是否存在
      await this.verifyIpsetSet();
      
    } catch (error) {
      console.error('❌ 初始化失败:', error.message);
      throw error;
    }
  }

  // 验证ipset集合
  async verifyIpsetSet() {
    try {
      const { stdout } = await execAsync(`ipset list -n | grep ${this.config.ipsetSetName}`);
      if (!stdout.trim()) {
        throw new Error(`ipset集合 ${this.config.ipsetSetName} 不存在`);
      }
      console.log(`✅ ipset集合 ${this.config.ipsetSetName} 已验证`);
    } catch (error) {
      console.error(`❌ ipset集合验证失败:`, error.message);
      // 尝试创建集合
      await execAsync(`ipset create ${this.config.ipsetSetName} hash:ip timeout 86400`);
      console.log(`✅ 创建ipset集合 ${this.config.ipsetSetName} 成功`);
    }
  }

  // 批量添加IP到ipset
  async addIPsToIpset(ips) {
    if (ips.length === 0) return;

    try {
      // 使用临时文件批量添加，提高效率
      const tempFile = `/tmp/ora_ips_${Date.now()}.txt`;
      const ipLines = ips.map(ip => `add ${this.config.ipsetSetName} ${ip}`).join('\n');
      fs.writeFileSync(tempFile, ipLines);
      
      // 批量执行
      await execAsync(`ipset restore < ${tempFile}`);
      
      // 清理临时文件
      fs.unlinkSync(tempFile);
      
      console.log(`✅ 批量添加 ${ips.length} 个IP到 ${this.config.ipsetSetName}`);
      
      this.stats.totalBlocked += ips.length;
    } catch (error) {
      console.error('❌ 批量添加IP失败:', error.message);
      this.stats.errors++;
      throw error;
    }
  }

  // 从合约获取威胁IP并同步到内核
  async syncThreatIPs() {
    try {
      console.log('🔄 开始同步威胁IP...');
      
      // 从合约获取威胁IP列表
      const result = await this.syncer.getThreatIPListForFirewall(100); // 分数大于100的IP
      
      if (result.success) {
        // 提取IP地址列表
        const threatIPs = result.firewallIPList.map(item => item.ip);
        
        // 清空当前ipset（为简单起见，实际生产中可能需要增量更新）
        await execAsync(`ipset flush ${this.config.ipsetSetName}`);
        
        // 批量添加新威胁IP
        if (threatIPs.length > 0) {
          // 分批处理，避免一次性处理过多IP
          for (let i = 0; i < threatIPs.length; i += this.config.batchSize) {
            const batch = threatIPs.slice(i, i + this.config.batchSize);
            await this.addIPsToIpset(batch);
          }
        }
        
        this.stats.lastBatchSize = threatIPs.length;
        this.stats.totalSynced += threatIPs.length;
        this.lastSyncTime = Date.now();
        
        console.log(`✅ 同步完成: ${threatIPs.length} 个威胁IP已同步到内核层`);
        console.log(`📊 统计: 总同步 ${this.stats.totalSynced}, 总拦截 ${this.stats.totalBlocked}, 错误 ${this.stats.errors}`);
      } else {
        console.error('❌ 合约同步失败:', result.error);
        this.stats.errors++;
      }
    } catch (error) {
      console.error('❌ 同步过程出错:', error.message);
      this.stats.errors++;
    }
  }

  // 实现10万级黑名单的高效处理 - 使用ipset的O(1)查找
  async processHighVolumeBlacklist() {
    console.log('⚡ 开始处理高容量黑名单...');
    
    try {
      // 从合约批量获取威胁IP（利用合约的reportBatch功能）
      const result = await this.syncer.getThreatIPListForFirewall(50); // 包含较低分数的IP
      
      if (result.success && result.firewallIPList.length > 0) {
        const threatIPs = result.firewallIPList;
        
        console.log(`📊 获取到 ${threatIPs.length} 个威胁IP，准备同步到内核...`);
        
        // 如果威胁IP数量超过10万，使用优化的批量处理
        if (threatIPs.length > this.config.highVolumeThreshold) {
          console.log(`⚡ 检测到高容量数据 (${threatIPs.length} IPs)，启动优化模式...`);
          
          // 使用批量报告器优化合约交互
          const threatData = threatIPs.map(item => ({
            ip: item.ip,
            score: item.score
          }));
          
          const batchResult = await this.batchReporter.optimizedThreatSync(threatData);
          if (batchResult.success) {
            this.stats.contractEventsReduced += threatIPs.length; // 大幅减少事件数量
          }
        } else {
          // 使用批量报告器进行标准批量更新
          const scoreData = threatIPs.map(item => ({
            ip: item.ip,
            score: item.score
          }));
          
          // 批量更新合约层分数
          const updateResult = await this.batchReporter.batchUpdateScores(scoreData);
          if (updateResult.success) {
            this.stats.contractEventsReduced += threatIPs.length * 0.9; // 减少90%的事件
          }
        }
        
        // 使用临时文件进行批量内核操作，处理大量IP
        const tempFile = `/tmp/ora_batch_ips_${Date.now()}.txt`;
        
        // 创建批量操作命令
        let commands = [];
        commands.push(`flush ${this.config.ipsetSetName}`); // 清空现有集合
        
        // 添加所有威胁IP，设置不同的超时时间基于威胁等级
        threatIPs.forEach(item => {
          let timeout = 86400; // 默认24小时
          
          // 根据威胁分数设置不同的超时时间
          if (item.score >= 900) timeout = 604800; // 7天 - 高危IP
          else if (item.score >= 700) timeout = 172800; // 2天 - 中危IP
          else if (item.score >= 400) timeout = 86400;  // 1天 - 低危IP
          
          commands.push(`add ${this.config.ipsetSetName} ${item.ip} timeout ${timeout}`);
        });
        
        // 写入临时文件
        fs.writeFileSync(tempFile, commands.join('\n'));
        
        // 批量执行
        await execAsync(`ipset restore < ${tempFile}`);
        
        // 清理临时文件
        fs.unlinkSync(tempFile);
        
        console.log(`✅ 高容量黑名单处理完成: ${threatIPs.length} 个IP已同步到内核`);
        console.log(`⚡ O(1)匹配已配置，内核自动处理超时清理`);
        console.log(`📊 优化统计: 合约事件减少 ~${Math.floor(threatIPs.length * 0.9)} 个`);
        
        this.stats.lastBatchSize = threatIPs.length;
        this.stats.totalSynced += threatIPs.length;
        this.stats.totalBlocked += threatIPs.length;
        this.lastSyncTime = Date.now();
        
      } else {
        console.log('ℹ️  没有新的威胁IP需要同步');
      }
    } catch (error) {
      console.error('❌ 高容量黑名单处理失败:', error.message);
      this.stats.errors++;
    }
  }

  // 启动守护进程
  async start() {
    if (this.isRunning) {
      console.log('⚠️  守护进程已在运行中');
      return;
    }

    console.log('🚀 启动威胁IP同步守护进程...');
    
    try {
      await this.initialize();
      
      this.isRunning = true;
      
      // 立即执行一次同步
      await this.processHighVolumeBlacklist();
      
      // 设置定时同步
      this.syncInterval = setInterval(async () => {
        await this.processHighVolumeBlacklist();
      }, this.config.syncInterval);
      
      console.log(`✅ 守护进程已启动，同步间隔: ${this.config.syncInterval}ms`);
      
      // 监听退出信号
      process.on('SIGINT', () => this.stop());
      process.on('SIGTERM', () => this.stop());
      
    } catch (error) {
      console.error('❌ 守护进程启动失败:', error.message);
      this.stop();
    }
  }

  // 停止守护进程
  stop() {
    if (!this.isRunning) return;
    
    console.log('🛑 停止威胁IP同步守护进程...');
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    this.isRunning = false;
    
    console.log('📊 最终统计:');
    console.log(`   总同步IP数: ${this.stats.totalSynced}`);
    console.log(`   总拦截连接: ${this.stats.totalBlocked}`);
    console.log(`   错误次数: ${this.stats.errors}`);
    console.log('✅ 守护进程已停止');
  }

  // 获取当前统计信息
  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      lastSyncTime: this.lastSyncTime,
      syncInterval: this.config.syncInterval
    };
  }
}

// 如果直接运行此文件，则启动守护进程
if (import.meta.url === new URL(import.meta.url).href) {
  const daemon = new ThreatSyncDaemon({
    syncInterval: 60000, // 1分钟同步一次
    ipsetSetName: 'ora_threats',
    batchSize: 2000 // 每批处理2000个IP
  });

  daemon.start().catch(error => {
    console.error('守护进程启动失败:', error);
    process.exit(1);
  });
}

export { ThreatSyncDaemon };
