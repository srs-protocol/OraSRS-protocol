import { ethers } from "ethers";
import { DefenseEngine } from "./DefenseEngine";

// 配置
const RPC_URL = process.env.RPC_URL || "https://api.orasrs.net"; // 公网节点
const CONTRACT_ADDR = process.env.CONTRACT_ADDR || "0x5f3f1dBD7B74C6B46e8c44f98792A1dAf8d69154"; // 新的ThreatConsensus合约地址
const PRIVATE_KEY = process.env.ORASRS_PRIVATE_KEY; // 可选：用于威胁上报的私钥

class OraSRSConsensusClient {
    private defenseEngine: DefenseEngine;
    private isRunning: boolean = false;

    constructor() {
        this.defenseEngine = new DefenseEngine(
            CONTRACT_ADDR,
            RPC_URL,
            PRIVATE_KEY
        );
    }

    /**
     * 启动安全威胁情报客户端
     */
    async start() {
        console.log("🚀 启动 OraSRS 安全威胁情报客户端...");
        
        // 1. 初始化防火墙
        await this.defenseEngine.init();

        // 2. 开始监听全网共识事件
        this.defenseEngine.startGlobalSync();
        
        this.isRunning = true;
        
        console.log("✅ OraSRS 客户端启动成功");
        console.log("📋 功能模式:");
        if (PRIVATE_KEY) {
            console.log("   - 📥 威胁情报上报 (已启用)");
            console.log("   - 📡 全网共识同步 (已启用)");
        } else {
            console.log("   - 📥 威胁情报上报 (未启用 - 缺少私钥)");
            console.log("   - 📡 全网共识同步 (已启用)");
        }
        
        console.log("💡 乐观验证机制运行中:");
        console.log("   - 本地检测 -> 立即防御 -> 证据上传 -> 全网共识");
    }

    /**
     * 处理检测到的攻击 - 实现乐观验证机制
     */
    async handleAttack(ip: string, attackType: string, rawLog: string) {
        if (!this.isRunning) {
            console.log("⚠️  客户端未运行，无法处理攻击");
            return;
        }
        
        console.log(`🚨 [紧急] 检测到攻击: ${ip} (${attackType})`);
        
        // 使用DefenseEngine的handleAttack方法，实现完整的乐观验证流程
        await this.defenseEngine.handleAttack(ip, attackType, rawLog);
    }

    /**
     * 查询IP威胁状态
     */
    async queryThreatStatus(ip: string) {
        try {
            return await this.defenseEngine.checkThreatStatus(ip);
        } catch (e) {
            console.error(`❌ 查询IP ${ip} 威胁状态失败:`, e);
            return null;
        }
    }

    /**
     * 检查本地防火墙是否已封禁IP
     */
    async isIPBlocked(ip: string): Promise<boolean> {
        try {
            // 这里需要访问DefenseEngine内部的防火墙实例
            // 由于TypeScript限制，我们返回一个简化的实现
            console.log(`🔍 检查IP ${ip} 是否被本地封禁 (需要访问内部防火墙实例)`);
            return false; // 简化实现
        } catch (e) {
            console.error(`❌ 检查IP封禁状态失败:`, e);
            return false;
        }
    }

    /**
     * 停止客户端
     */
    async stop() {
        console.log("🛑 正在停止 OraSRS 客户端...");
        this.isRunning = false;
        
        // 停止监听事件
        this.defenseEngine.stopListening();
        
        console.log("✅ 客户端已停止");
    }

    /**
     * 获取证据数量
     */
    async getEvidenceCount(ip: string): Promise<number> {
        try {
            return await this.defenseEngine.getEvidenceCount(ip);
        } catch (e) {
            console.error(`❌ 获取证据数量失败:`, e);
            return 0;
        }
    }
}

// 环境变量检查
if (!process.env.CONTRACT_ADDR) {
    console.warn("⚠️ 警告: 未设置 CONTRACT_ADDR 环境变量，将使用默认的ThreatConsensus合约地址");
}

// 检查代币合约地址
if (!process.env.TOKEN_ADDR) {
    console.warn("⚠️ 警告: 未设置 TOKEN_ADDR 环境变量，代币验证功能可能不可用");
}

// 启动客户端
const client = new OraSRSConsensusClient();

// 处理退出信号
process.on('SIGINT', async () => {
    console.log('\n⚠️  接收到中断信号');
    await client.stop();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n⚠️  接收到终止信号');
    await client.stop();
    process.exit(0);
});

// 启动客户端
client.start()
    .then(() => console.log("✅ OraSRS 客户端已准备就绪"))
    .catch(err => {
        console.error("❌ OraSRS 客户端启动失败:", err);
        process.exit(1);
    });

// 导出客户端类以供其他模块使用
export { OraSRSConsensusClient };
