#!/usr/bin/env node

// OraSRS 客户端 - 链上威胁情报同步器
// 这个客户端监听区块链上的威胁情报事件，并自动执行本地安全措施

const ThreatIntelligenceSync = require('./ThreatIntelligenceSync');
const config = require('./config.json');
const { ethers } = require('ethers');

async function main() {
  console.log('🛡️  OraSRS 威胁情报同步客户端');
  console.log('🔄 同步链上威胁情报 -> 本地安全执行');
  console.log('');

  // 从配置文件获取合约地址
  const { 
    providerUrl, 
    contracts: {
      threatIntelligenceCoordination,
      simpleSecurityActionContract,
      nodeRegistry
    } 
  } = config;

  console.log(`🔗 区块链提供者: ${providerUrl}`);
  console.log(`📋 合约地址:`);
  console.log(`   - 威胁情报: ${threatIntelligenceCoordination}`);
  console.log(`   - 安全动作: ${simpleSecurityActionContract}`);
  console.log(`   - 节点注册: ${nodeRegistry}`);
  console.log('');

  // 创建同步器实例
  const syncer = new ThreatIntelligenceSync(
    providerUrl,
    threatIntelligenceCoordination,
    simpleSecurityActionContract,
    nodeRegistry
  );

  try {
    // 初始化同步器
    await syncer.initialize();

    // 显示当前节点列表
    console.log('\n📋 当前注册节点:');
    const nodes = await syncer.getNodeList();
    for (const node of nodes) {
      console.log(`   ${node.ip}:${node.port} (${node.wallet})`);
    }

    console.log('\n✅ OraSRS 客户端已启动并开始监听威胁情报...');
    console.log('监听事件: ThreatIntelAdded');
    console.log('执行动作: 自动封禁威胁IP');
    console.log('按 Ctrl+C 偍止客户端');

    // 添加命令行接口用于手动报告威胁
    setupThreatReporting(syncer);

    // 保持进程运行
    process.on('SIGINT', async () => {
      console.log('\n🛑 正在关闭 OraSRS 客户端...');
      await syncer.stop();
      console.log('✅ 客户端已关闭');
      process.exit(0);
    });

    // 演示：检查特定IP是否为威胁
    // 这里可以添加定期检查或其他功能
    setInterval(async () => {
      // 每30秒检查一次系统状态
      console.log(`\n📊 状态更新: 本地威胁缓存 ${syncer.localBlacklist.size} 个IP`);
    }, 30000);

  } catch (error) {
    console.error('❌ 客户端启动失败:', error);
    process.exit(1);
  }
}

// 设置威胁报告功能
function setupThreatReporting(syncer) {
  // 简单的命令行接口用于报告威胁
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\n📋 威胁报告命令:');
  console.log('  格式: report <IP地址> <威胁级别(1-5)> <威胁类型>');
  console.log('  示例: report 1.2.3.4 5 malware');
  console.log('');

  // 监听用户输入
  rl.on('line', async (input) => {
    const args = input.trim().split(' ');
    if (args[0] === 'report' && args.length >= 4) {
      const ip = args[1];
      const threatLevel = parseInt(args[2]);
      const threatType = args.slice(3).join(' ');

      if (isValidIP(ip) && !isNaN(threatLevel) && threatLevel >= 1 && threatLevel <= 5) {
        // 检查报告者是否启用
        if (config.reporter && config.reporter.enabled && config.reporter.privateKey) {
          console.log(`📡 正在报告威胁: ${ip} (级别: ${threatLevel}, 类型: ${threatType})`);
          
          // 使用配置文件中的私钥和提供者URL来报告威胁
          const reportResult = await syncer.reportThreat(
            config.providerUrl,
            config.reporter.privateKey,
            ip,
            threatLevel,
            threatType
          );
          
          if (reportResult.success) {
            console.log(`✅ 威胁已成功报告，交易哈希: ${reportResult.txHash}`);
          } else {
            console.log(`❌ 报告失败: ${reportResult.error}`);
          }
        } else {
          console.log(`⚠️  威胁报告未启用。请在config.json中配置reporter部分以启用此功能`);
          console.log('   设置 "enabled": true 并提供有效的私钥');
        }
      } else {
        console.log('❌ 参数格式错误。正确格式: report <IP> <级别(1-5)> <类型>');
      }
    } else if (args[0] === 'status') {
      console.log(`📊 本地威胁缓存: ${syncer.localBlacklist.size} 个IP`);
      console.log(`   当前监听状态: 运行中`);
    } else if (args[0] === 'enable-reporting') {
      if (args.length >= 2) {
        const privateKey = args[1];
        if (isValidPrivateKey(privateKey)) {
          console.log(`🔐 报告功能已启用，使用提供的私钥`);
          // 在实际应用中，这会更新配置，但在当前实现中我们只是显示消息
          console.log('ℹ️  为安全起见，建议在config.json中配置私钥而非命令行输入');
        } else {
          console.log('❌ 无效的私钥格式');
        }
      } else {
        console.log('❌ 请提供私钥。格式: enable-reporting <私钥>');
      }
    } else if (args[0] === 'help') {
      console.log('📋 可用命令:');
      console.log('  report <IP> <级别> <类型> - 报告威胁IP');
      console.log('  status - 查看客户端状态');
      console.log('  enable-reporting <私钥> - 启用威胁报告（临时）');
      console.log('  help - 显示帮助信息');
    } else if (input.trim() !== '') {
      console.log(`❓ 未知命令: ${input.trim()}. 输入 'help' 查看可用电令。`);
    }
  });
}

// 验证IP地址格式
function isValidIP(ip) {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(ip)) return false;
  
  const parts = ip.split('.');
  return parts.every(part => parseInt(part) >= 0 && parseInt(part) <= 255);
}

// 验证私钥格式
function isValidPrivateKey(privateKey) {
  // 私钥应该以0x开头，后面跟64个十六进制字符
  const privateKeyRegex = /^0x[a-fA-F0-9]{64}$/;
  return privateKeyRegex.test(privateKey);
}

// 如果直接运行此文件
if (require.main === module) {
  main();
}

module.exports = main;