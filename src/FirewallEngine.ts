import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class FirewallEngine {
    private setName = "orasrs_blacklist";

    /**
     * 初始化：创建内核哈希表
     * hash:ip 表示这是一个存储 IP 的哈希表
     * timeout 0 表示支持超时设置 (0为默认永久，但我们可以覆盖)
     * maxelem 200000 扩容支持 20万 IP
     */
    async init() {
        try {
            // 1. 创建 ipset 集合 (如果不存在)
            // -exist 标志表示如果已存在则忽略
            await execAsync(`sudo ipset create ${this.setName} hash:ip timeout 0 maxelem 200000 -exist`);
            
            // 2. 创建一条 iptables 规则引用这个集合
            // 只需要这一条规则，就能拦截集合里的 10万个 IP！
            // 性能是 O(1)
            await execAsync(`sudo iptables -C INPUT -m set --match-set ${this.setName} src -j DROP || sudo iptables -I INPUT -m set --match-set ${this.setName} src -j DROP`);
            
            console.log("🔥 内核级防火墙引擎已启动 (IPSet Mode)");
        } catch (e) {
            console.error("初始化防火墙失败 (需要 sudo 权限):", e);
        }
    }

    /**
     * 批量添加/更新 IP
     * @param ips IP 数组
     * @param durations 对应的封禁时长 (秒)
     */
    async updateBatch(ips: string[], durations: number[]) {
        if (ips.length === 0) return;
        if (ips.length !== durations.length) {
            throw new Error("IPs and durations arrays must have the same length");
        }

        // 构建 ipset restore 指令块，一次性灌入内核
        // 比执行 1000 次 exec 快 100 倍
        let restoreBuffer = "";
        
        for (let i = 0; i < ips.length; i++) {
            // 指令格式: add 集合名 IP timeout 秒数 -exist
            // -exist 意味着如果 IP 已存在，这就变成了"更新过期时间"的操作
            restoreBuffer += `add ${this.setName} ${ips[i]} timeout ${durations[i]} -exist
`;
        }

        try {
            // 通过管道一次性输送给 ipset restore
            await execAsync(`echo -e "${restoreBuffer}" | sudo ipset restore`);
            console.log(`✅ 批量同步完成: 更新了 ${ips.length} 个 IP 的状态`);
        } catch (e) {
            console.error("❌ 批量写入内核失败:", e);
        }
    }

    /**
     * 批量删除 IP
     * @param ips 要删除的 IP 数组
     */
    async deleteBatch(ips: string[]) {
        if (ips.length === 0) return;

        let restoreBuffer = "";
        
        for (const ip of ips) {
            restoreBuffer += `del ${this.setName} ${ip}\n`;
        }

        try {
            await execAsync(`echo -e "${restoreBuffer}" | sudo ipset restore`);
            console.log(`✅ 批量删除完成: 删除了 ${ips.length} 个 IP`);
        } catch (e) {
            console.error("❌ 批量删除失败:", e);
        }
    }

    /**
     * 检查 IP 是否在黑名单中
     * @param ip 要检查的 IP
     * @returns true 如果 IP 在黑名单中
     */
    async isIPBlocked(ip: string): Promise<boolean> {
        try {
            const { stdout } = await execAsync(`sudo ipset test ${this.setName} ${ip}`);
            return stdout.includes('is NOT in');
        } catch (e) {
            // 如果 IP 不在集合中，ipset test 会返回错误
            return false;
        }
    }

    /**
     * 获取当前黑名单中的 IP 数量
     */
    async getCount(): Promise<number> {
        try {
            const { stdout } = await execAsync(`sudo ipset list ${this.setName} -o plain | wc -l`);
            // 实际条目数需要减去一些非IP的行
            const totalLines = parseInt(stdout.trim());
            // 估算IP数量（需要减去头部信息行）
            return Math.max(0, totalLines - 6); // 通常头部有几行信息
        } catch (e) {
            console.error("❌ 获取IP数量失败:", e);
            return 0;
        }
    }

    /**
     * 获取当前黑名单中的所有 IP（谨慎使用，可能很大）
     */
    async getAllIPs(): Promise<string[]> {
        try {
            const { stdout } = await execAsync(`sudo ipset list ${this.setName} -o plain`);
            const lines = stdout.split('\n');
            const ips: string[] = [];
            
            for (const line of lines) {
                // IP 格式通常是 "xxx.xxx.xxx.xxx timeout xxx"
                const ipMatch = line.match(/^($\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$)/);
                if (ipMatch) {
                    ips.push(ipMatch[1]);
                }
            }
            
            return ips;
        } catch (e) {
            console.error("❌ 获取所有IP失败:", e);
            return [];
        }
    }

    /**
     * 清空整个黑名单
     */
    async clearAll() {
        try {
            await execAsync(`sudo ipset flush ${this.setName}`);
            console.log("✅ 黑名单已清空");
        } catch (e) {
            console.error("❌ 清空黑名单失败:", e);
        }
    }
}
