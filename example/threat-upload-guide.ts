/**
 * OraSRS 威胁情报上传机制使用指南
 * 
 * 实现乐观验证机制：先本地防御，后链上共识
 */

import { DefenseEngine } from "../src/DefenseEngine";

class ThreatIntelligenceUploader {
    private defenseEngine: DefenseEngine;

    constructor(contractAddress: string, rpcUrl: string, privateKey?: string) {
        this.defenseEngine = new DefenseEngine(contractAddress, rpcUrl, privateKey);
    }

    async initialize() {
        // 初始化本地防火墙
        await this.defenseEngine.init();
        
        // 开始监听全网共识事件
        this.defenseEngine.startGlobalSync();
        
        console.log("✅ 威胁情报上传系统初始化完成");
    }

    /**
     * 处理检测到的攻击 - 核心方法
     * 实现 "先斩后奏" 机制
     */
    async processAttack(ip: string, attackType: string, rawLog: string) {
        console.log(`\n🚨 检测到攻击: ${ip} (${attackType})`);
        
        // === 阶段1: 瞬时防御 (T0) ===
        // 毫秒级响应，立即在本地封禁IP
        await this.defenseEngine.applyLocalBlock(ip);
        console.log(`🛡️ 本地防御已启动: ${ip}`);
        
        // === 阶段2: 证据收集 (T1) ===
        // 收集攻击时的系统状态和日志证据
        const evidence = this.defenseEngine.collectEvidence(rawLog);
        console.log(`🔍 证据收集完成: CPU负载=${evidence.cpuLoad}%, 日志哈希=${evidence.logHash.substring(0,10)}...`);
        
        // === 阶段3: 提案上链 (T2) ===
        // 异步上传证据到链上合约
        await this.defenseEngine.uploadEvidenceToChain(ip, attackType, evidence);
        console.log(`📡 证据已上传至链上合约`);
        
        // === 阶段4: 等待共识 (T3) ===
        // 系统会自动监听GlobalThreatConfirmed事件
        // 当达到共识阈值时，自动同步全网封禁规则
        console.log(`⏳ 等待网络共识...`);
    }

    /**
     * 检查威胁状态
     */
    async checkThreatStatus(ip: string) {
        const status = await this.defenseEngine.checkThreatStatus(ip);
        return status;
    }

    /**
     * 撤销误报
     */
    async revokeReport(ip: string) {
        await this.defenseEngine.revokeThreatReport(ip);
    }
}

// 使用示例
async function example() {
    // 配置参数
    const CONTRACT_ADDRESS = "0x5f3f1dBD7B74C6B46e8c44f98792A1dAf8d69154"; // 已部署的合约
    const RPC_URL = "https://api.orasrs.net"; // 公网节点
    const PRIVATE_KEY = process.env.ORASRS_PRIVATE_KEY; // 从环境变量获取私钥
    
    if (!PRIVATE_KEY) {
        console.log("⚠️  警告: 未设置私钥，只能进行只读操作");
        console.log("💡  设置 ORASRS_PRIVATE_KEY 环境变量以启用威胁上报功能");
    }

    // 创建上传器实例
    const uploader = new ThreatIntelligenceUploader(
        CONTRACT_ADDRESS, 
        RPC_URL, 
        PRIVATE_KEY // 可选：如果没有私钥，则只能监听，不能上报
    );

    // 初始化
    await uploader.initialize();

    // 模拟处理攻击
    await uploader.processAttack(
        "1.2.3.4",
        "DDoS Attack",
        "2025-12-09 14:30:00 - DDoS attack detected from 1.2.3.4 - High CPU usage"
    );

    // 检查威胁状态
    const status = await uploader.checkThreatStatus("1.2.3.4");
    console.log(`\n📋 威胁状态:`, status);
}

// 运行示例
example()
    .then(() => console.log("\n✅ 威胁情报上传机制演示完成"))
    .catch(error => console.error("\n❌ 演示失败:", error));

/**
 * 安全设计优势：
 * 
 * 1. 防止拒绝服务攻击 (DoS Resistance)
 *    - 本地防御立即生效，不依赖链上确认
 *    - 攻击期间可继续运行，攻击后上传证据
 * 
 * 2. 防止恶意举报 (Sybil Resistance)
 *    - 需要多个独立节点举报才达成共识
 *    - 单一节点无法强制全网封禁
 * 
 * 3. 性能与隐私平衡
 *    - 只上传证据哈希，不泄露原始日志
 *    - 本地临时封禁，全网共识后永久封禁
 * 
 * 4. 乐观验证机制
 *    - 本地快速响应（毫秒级）
 *    - 链上共识确认（确保准确性）
 *    - 双证可追溯和审计
 */