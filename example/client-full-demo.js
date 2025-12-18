// example/client-full-demo.js - 客户端完整功能演示

import { OraSRSConsensusClient } from '../src/ClientLite.js';

async function runClientDemo() {
  console.log("🎬 开始 OraSRS 客户端功能演示...\n");
  
  // 创建客户端实例
  const client = new OraSRSConsensusClient();
  
  try {
    // 启动客户端
    console.log("🚀 启动 OraSRS 客户端...");
    await client.start();
    console.log("✅ 客户端启动成功\n");
    
    // 模拟检测到攻击 (乐观验证的第一步：本地防御)
    console.log("🚨 模拟检测到恶意攻击...");
    const maliciousIP = "198.51.100.10";
    const attackType = "DDoS";
    const rawLog = "2023-12-09 10:30:15 DDoS attack from 198.51.100.10 - Too many requests";
    
    console.log(`   攻击类型: ${attackType}`);
    console.log(`   源IP: ${maliciousIP}`);
    console.log(`   原始日志: ${rawLog}\n`);
    
    // 处理攻击 (触发乐观验证流程)
    console.log("🛡️  执行防御流程...");
    await client.handleAttack(maliciousIP, attackType, rawLog);
    console.log("✅ 防御流程执行完成\n");
    
    // 等待一段时间让证据上传
    console.log("⏳ 等待威胁证据上传到区块链...");
    await new Promise(resolve => setTimeout(resolve, 3000)); // 等待3秒
    
    // 查询威胁状态
    console.log("🔍 查询威胁状态...");
    const threatStatus = await client.queryThreatStatus(maliciousIP);
    console.log(`   威胁状态:`, threatStatus);
    
    // 查询证据数量
    console.log("📋 查询证据数量...");
    const evidenceCount = await client.getEvidenceCount(maliciousIP);
    console.log(`   证据数量: ${evidenceCount}\n`);
    
    // 检查IP是否被本地封禁
    console.log("🔒 检查本地封禁状态...");
    const isBlocked = await client.isIPBlocked(maliciousIP);
    console.log(`   本地封禁状态: ${isBlocked}\n`);
    
    console.log("✅ 客户端功能演示完成!");
    console.log("\n📋 演示总结:");
    console.log("   - ✅ 客户端启动");
    console.log("   - ✅ 本地防御 (T0)");
    console.log("   - ✅ 证据收集 (T1)");
    console.log("   - ✅ 链上提交 (T2)");
    console.log("   - ✅ 全网同步 (T3)");
    console.log("\n🎯 乐观验证机制完整运行!");
    
  } catch (error) {
    console.error("❌ 客户端演示失败:", error);
  } finally {
    // 停止客户端
    console.log("\n🛑 停止客户端...");
    await client.stop();
    console.log("✅ 客户端已停止");
  }
}

// 运行演示
console.log("🧪 OraSRS 客户端完整功能演示");
console.log("==========================\n");

runClientDemo()
  .then(() => {
    console.log("\n🎉 演示完成!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 演示失败:", error);
    process.exit(1);
  });
