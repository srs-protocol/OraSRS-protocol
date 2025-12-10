import { ethers } from "ethers";
import * as os from "os";
import { FirewallEngine } from "./FirewallEngine";

interface AttackEvidence {
    cpuLoad: number;
    logHash: string;
}

export class DefenseEngine {
    private firewall: FirewallEngine;
    private contract: ethers.Contract;
    private provider: ethers.JsonRpcProvider;
    private wallet?: ethers.Wallet;

    constructor(contractAddress: string, rpcUrl: string, privateKey?: string) {
        this.firewall = new FirewallEngine();
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        
        // 如果提供了私钥，则使用签名者，否则只读
        if (privateKey) {
            this.wallet = new ethers.Wallet(privateKey, this.provider);
            this.contract = new ethers.Contract(
                contractAddress, 
                this.getContractABI(), 
                this.wallet
            );
        } else {
            this.contract = new ethers.Contract(
                contractAddress, 
                this.getContractABI(), 
                this.provider
            );
        }
    }

    private getContractABI(): ethers.Interface | string[] {
        return [
            "event LocalDefenseActive(string indexed ip, address indexed reporter)",
            "event GlobalThreatConfirmed(string indexed ip, string reason)",
            "event ThreatReportRevoked(string indexed ip, address indexed reporter)",
            "event ThreatCommitted(bytes32 indexed commitment, address indexed reporter, uint256 commitBlock)",
            "event ThreatRevealed(string indexed ip, address indexed reporter, string indexed salt)",
            "event WhitelistUpdated(string indexed ip, bool isWhitelisted)",
            "function commitThreatEvidence(bytes32 ipHash, string calldata salt) external",
            "function revealThreatEvidence(string calldata ip, string calldata salt, uint8 cpuLoad, string calldata logHash, string calldata attackType, uint256 riskScore) external",
            "function revokeThreatReport(string calldata ip) external",
            "function forceConfirm(string calldata ip) external",
            "function forceRevoke(string calldata ip) external",
            "function addToWhitelist(string calldata ip) external",
            "function removeFromWhitelist(string calldata ip) external",
            "function isWhitelisted(string calldata ip) external view returns (bool)",
            "function getEvidenceCount(string calldata ip) external view returns (uint256)",
            "function getThreatStatus(string calldata ip) external view returns (bool, uint256, uint256, uint256)",
            "function hasAddressReported(address reporter, string calldata ip) external view returns (bool)",
            "function orasrsToken() external view returns (address)",
            "function MIN_TOKEN_BALANCE() external view returns (uint256)",
            "function CONSENSUS_THRESHOLD() external view returns (uint256)",
            "function isCommitmentRevealed(bytes32 commitment) external view returns (bool)",
            "function isValidCommitment(bytes32 commitment) external view returns (bool)"
        ];
    }

    /**
     * 初始化防御引擎
     */
    async init() {
        // 初始化防火墙
        await this.firewall.init();
        console.log("🔥 威胁防御引擎已启动");
    }

    /**
     * 入口：检测到攻击 (由 LogMonitor 触发)
     * 实现乐观验证机制：先防御，后上报
     */
    async handleAttack(ip: string, attackType: string, rawLog: string) {
        console.log(`🚨 [紧急] 检测到攻击: ${ip} (${attackType})`);

        // === 第一步：本地风控 (毫秒级响应) ===
        // 不管链上怎么说，先保住自己的命
        await this.applyLocalBlock(ip);

        // === 第二步：收集性能证据 ===
        const evidence = this.collectEvidence(rawLog);

        // === 第三步：异步上报 (不阻塞防御) ===
        this.uploadEvidenceToChain(ip, attackType, evidence);
    }

    /**
     * 本地封禁 (使用 ipset)
     */
    private async applyLocalBlock(ip: string) {
        try {
            // 使用防火墙引擎的临时封禁功能
            const success = await this.firewall.tempBanIP(ip, 86400); // 24小时临时封禁
            if (success) {
                console.log(`🛡️ [本地防御] 已对 ${ip} 实施临时封控`);
            } else {
                console.error(`❌ 本地封禁失败: ${ip}`);
            }
        } catch (e) {
            console.error(`❌ 本地封禁异常:`, e);
        }
    }

    /**
     * 收集证据 (日志Hash + CPU负载)
     */
    private collectEvidence(rawLog: string): AttackEvidence {
        // 1. 获取当前 CPU 负载
        const loads = os.loadavg();
        const oneMinLoad = loads[0];
        const cpuCount = os.cpus().length;
        
        // 计算相对负载百分比 (基于CPU核心数)
        const estimatedMaxLoad = cpuCount * 2; // 假设最大负载是核心数的2倍
        const cpuLoad = Math.min(Math.floor((oneMinLoad / estimatedMaxLoad) * 100), 100);

        // 2. 对敏感日志进行 Hash 脱敏 (保护隐私)
        const crypto = require('crypto');
        const logHash = crypto.createHash('sha256').update(rawLog).digest('hex');

        return {
            cpuLoad: cpuLoad,
            logHash: logHash
        };
    }

    /**
     * 使用提交-揭示机制上传证据到合约
     */
    private async uploadEvidenceToChain(ip: string, type: string, evidence: AttackEvidence) {
        try {
            console.log(`📡 [上报] 正在上传威胁证据 (提交-揭示机制)...`);
            
            if (!this.wallet) {
                console.log(`⚠️  未配置私钥，无法上传威胁证据`);
                return;
            }

            // 检查代币余额
            const hasTokenBalance = await this.checkTokenBalance();
            if (!hasTokenBalance) {
                console.log(`⚠️  代币余额不足，无法上传威胁证据`);
                return;
            }

            // 检查IP是否在白名单中
            const isWhitelisted = await this.contract.isWhitelisted(ip);
            if (isWhitelisted) {
                console.log(`⚠️  IP ${ip} 在白名单中，无法上报`);
                return;
            }

            // 检查是否已经有足够的共识（避免重复上报）
            try {
                const [isConfirmed] = await this.contract.getThreatStatus(ip);
                if (isConfirmed) {
                    console.log(`ℹ️ [上报] IP ${ip} 已被确认，跳过重复上报`);
                    return;
                }
            } catch (e) {
                console.log(`⚠️ 无法检查威胁状态，继续上报...`);
            }

            // 生成随机盐值
            const crypto = require('crypto');
            const salt = crypto.randomBytes(32).toString('hex');
            
            // 计算IP哈希
            const ipHash = ethers.keccak256(ethers.toUtf8Bytes(ip));
            
            console.log(`🔒 [提交阶段] 生成IP哈希和随机盐值`);
            
            // 提交阶段：提交哈希值
            const commitTx = await this.contract.commitThreatEvidence(ipHash, salt);
            const commitReceipt = await commitTx.wait();
            console.log(`✅ [提交阶段] 证据哈希已提交: ${commitTx.hash}`);
            
            // 记录承诺，以便后续揭示
            const commitment = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
                ['bytes32', 'string', 'address'], 
                [ipHash, salt, this.wallet.address]
            ));
            
            // 在本地存储承诺信息，以便稍后揭示
            // 这里我们简单地使用一个临时存储，实际应用中可能需要持久化到数据库
            if (!globalThis.commitments) {
                globalThis.commitments = new Map();
            }
            globalThis.commitments.set(commitment, {ip, salt, evidence, type});
            
            console.log(`📝 [提交阶段] 承诺已记录，等待 ${this.getRevealDelay()} 个区块后揭示`);
            
            // 等待足够的区块数后进行揭示
            this.scheduleReveal(commitment, ip, salt, evidence, type);
            
        } catch (e: any) {
            console.error(`❌ 提交阶段失败:`, e);
            if (e.message?.includes("Insufficient token balance")) {
                console.log(`⚠️  代币余额不足，无法上报威胁证据`);
            } else if (e.message?.includes("IP is in whitelist")) {
                console.log(`⚠️  IP在白名单中，无法上报`);
            }
        }
    }

    /**
     * 撤销之前的威胁报告
     */
    async revokeThreatReport(ip: string) {
        try {
            const tx = await this.contract.revokeThreatReport(ip);
            const receipt = await tx.wait();
            console.log(`✅ [撤销] 威胁报告已撤销: ${tx.hash}`);
        } catch (e) {
            console.error(`❌ 撤销失败:`, e);
        }
    }

    /**
     * 启动全网同步监听器
     */
    public startGlobalSync() {
        console.log("📡 开始监听全网威胁共识事件...");

        // 监听全网威胁确认事件
        this.contract.on("GlobalThreatConfirmed", async (ip: string, reason: string) => {
            console.log(`🌍 [全网共识] IP ${ip} 已被确认为公敌! 原因: ${reason}`);
            
            try {
                // 使用防火墙引擎的永久封禁功能
                const success = await this.firewall.permanentBanIP(ip);
                if (success) {
                    console.log(`🛡️ [全网同步] 全网封禁规则已同步到本地: ${ip}`);
                } else {
                    console.error(`❌ 同步全网封禁规则失败: ${ip}`);
                }
            } catch (e) {
                console.error(`❌ 同步全网封禁规则异常:`, e);
            }
        });

        // 监听本地防御事件（用于监控）
        this.contract.on("LocalDefenseActive", (ip: string, reporter: string) => {
            console.log(`📡 [本地防御] 节点 ${reporter} 报告本地防御: ${ip}`);
        });

        // 监听撤销事件
        this.contract.on("ThreatReportRevoked", (ip: string, reporter: string) => {
            console.log(`🔄 [撤销] 节点 ${reporter} 撤销对 ${ip} 的举报`);
        });

        // 监听提交事件
        this.contract.on("ThreatCommitted", (commitment: string, reporter: string, commitBlock: number) => {
            console.log(`🔒 [提交] 节点 ${reporter} 提交了威胁证据承诺: ${commitment.slice(0, 8)}...`);
        });

        // 监听揭示事件
        this.contract.on("ThreatRevealed", (ip: string, reporter: string, salt: string) => {
            console.log(`🔓 [揭示] 节点 ${reporter} 揭示了威胁证据: ${ip}`);
        });

        // 监听白名单更新事件
        this.contract.on("WhitelistUpdated", (ip: string, isWhitelisted: boolean) => {
            if (isWhitelisted) {
                console.log(`📋 [白名单] IP ${ip} 已被加入白名单`);
                // 如果IP在白名单中被封禁，考虑解除封禁
                this.firewall.removeIPFromBan(ip);
            } else {
                console.log(`📋 [白名单] IP ${ip} 已从白名单移除`);
            }
        });
    }

    /**
     * 检查IP威胁状态
     */
    async checkThreatStatus(ip: string): Promise<{isConfirmed: boolean, reportCount: number, totalRiskScore: number, confirmedAt: number}> {
        try {
            const [isConfirmed, reportCount, totalRiskScore, confirmedAt] = await this.contract.getThreatStatus(ip);
            return {
                isConfirmed,
                reportCount: Number(reportCount),
                totalRiskScore: Number(totalRiskScore),
                confirmedAt: Number(confirmedAt)
            };
        } catch (e) {
            console.error(`❌ 检查威胁状态失败:`, e);
            return { isConfirmed: false, reportCount: 0, totalRiskScore: 0, confirmedAt: 0 };
        }
    }

    /**
     * 检查是否已举报过某个IP
     */
    async hasAddressReported(reporter: string, ip: string): Promise<boolean> {
        try {
            return await this.contract.hasAddressReported(reporter, ip);
        } catch (e) {
            console.error(`❌ 检查举报状态失败:`, e);
            return false;
        }
    }

    /**
     * 获取证据数量
     */
    async getEvidenceCount(ip: string): Promise<number> {
        try {
            const count = await this.contract.getEvidenceCount(ip);
            return Number(count);
        } catch (e) {
            console.error(`❌ 获取证据数量失败:`, e);
            return 0;
        }
    }

    /**
     * 获取揭示延迟（区块数）
     */
    private async getRevealDelay(): Promise<number> {
        try {
            // 默认延迟10个区块，实际应用中可能从合约获取
            return 10;
        } catch (e) {
            console.error(`❌ 获取揭示延迟失败，使用默认值:`, e);
            return 10;
        }
    }

    /**
     * 安排揭示阶段
     */
    private async scheduleReveal(
        commitment: string, 
        ip: string, 
        salt: string, 
        evidence: AttackEvidence, 
        type: string
    ) {
        // 获取当前区块号
        const currentBlock = await this.provider.getBlockNumber();
        const revealBlock = currentBlock + this.getRevealDelay();

        console.log(`⏳ [揭示安排] 等待到区块 ${revealBlock} 后揭示证据`);
        
        // 监听区块事件，直到达到揭示块
        const checkBlock = async (blockNumber: number) => {
            if (blockNumber >= revealBlock) {
                this.provider.removeListener('block', checkBlock);
                await this.executeReveal(commitment, ip, salt, evidence, type);
            }
        };

        this.provider.on('block', checkBlock);
    }

    /**
     * 执行揭示阶段
     */
    private async executeReveal(
        commitment: string, 
        ip: string, 
        salt: string, 
        evidence: AttackEvidence, 
        type: string
    ) {
        try {
            console.log(`🔓 [揭示阶段] 正在揭示对 ${ip} 的威胁证据...`);
            
            if (!this.wallet) {
                console.log(`⚠️  未配置私钥，无法揭示威胁证据`);
                return;
            }

            // 检查承诺是否有效
            const isValid = await this.contract.isValidCommitment(commitment);
            if (!isValid) {
                console.log(`❌ 承诺无效或尚未达到揭示延迟`);
                return;
            }

            // 揭示证据到链上
            const tx = await this.contract.revealThreatEvidence(
                ip,
                salt,
                evidence.cpuLoad,
                evidence.logHash,
                type,
                50 // 建议的风险分
            );
            
            const receipt = await tx.wait();
            console.log(`✅ [揭示阶段] 证据已揭示: ${tx.hash}`);
            console.log(`📝 [揭示阶段] 交易确认块号: ${receipt?.blockNumber}`);
            
            // 清除本地承诺记录
            if (globalThis.commitments) {
                globalThis.commitments.delete(commitment);
            }
        } catch (e: any) {
            console.error(`❌ 揭示阶段失败:`, e);
            if (e.message?.includes("Reveal delay not reached")) {
                console.log(`⚠️  揭示延迟尚未达到，请稍后再试`);
            } else if (e.message?.includes("Hash mismatch")) {
                console.log(`❌ 哈希不匹配，可能已揭示或数据错误`);
            }
        }
    }

    /**
     * 检查代币余额
     */
    private async checkTokenBalance(): Promise<boolean> {
        if (!this.wallet) {
            return false;
        }

        try {
            const tokenAddress = await this.contract.orasrsToken();
            const minBalance = await this.contract.MIN_TOKEN_BALANCE();
            
            // 为简化，这里假设代币合约有标准的balanceOf方法
            // 在实际应用中需要根据实际代币合约ABI来调用
            const tokenAbi = ["function balanceOf(address account) external view returns (uint256)"];
            const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, this.provider);
            const balance = await tokenContract.balanceOf(this.wallet.address);
            
            console.log(`🪙 [代币检查] 当前余额: ${ethers.formatEther(balance)}, 最小要求: ${ethers.formatEther(minBalance)}`);
            
            return balance >= minBalance;
        } catch (e) {
            console.error(`❌ 检查代币余额失败:`, e);
            // 如果无法检查，则假设余额足够（为了不阻止上报）
            return true;
        }
    }

    /**
     * 手动添加IP到白名单（需要治理权限）
     */
    async addToWhitelist(ip: string): Promise<boolean> {
        try {
            if (!this.wallet) {
                console.log(`⚠️  未配置私钥，无法添加到白名单`);
                return false;
            }
            
            const tx = await this.contract.addToWhitelist(ip);
            const receipt = await tx.wait();
            console.log(`✅ [白名单] IP ${ip} 已添加到白名单: ${tx.hash}`);
            return true;
        } catch (e) {
            console.error(`❌ 添加到白名单失败:`, e);
            return false;
        }
    }

    /**
     * 从白名单移除IP（需要治理权限）
     */
    async removeFromWhitelist(ip: string): Promise<boolean> {
        try {
            if (!this.wallet) {
                console.log(`⚠️  未配置私钥，无法从白名单移除`);
                return false;
            }
            
            const tx = await this.contract.removeFromWhitelist(ip);
            const receipt = await tx.wait();
            console.log(`✅ [白名单] IP ${ip} 已从白名单移除: ${tx.hash}`);
            return true;
        } catch (e) {
            console.error(`❌ 从白名单移除失败:`, e);
            return false;
        }
    }

    /**
     * 检查IP是否在白名单中
     */
    async isWhitelisted(ip: string): Promise<boolean> {
        try {
            return await this.contract.isWhitelisted(ip);
        } catch (e) {
            console.error(`❌ 检查白名单失败:`, e);
            return false;
        }
    }

    /**
     * 停止监听事件
     */
    public stopListening() {
        this.provider.removeAllListeners('block'); // 清除区块监听
        this.contract.removeAllListeners();
        console.log("⏹️  已停止监听合约事件");
    }
    
    /**
     * 获取防火墙实例（用于外部访问）
     */
    public getFirewall(): FirewallEngine {
        return this.firewall;
    }
}