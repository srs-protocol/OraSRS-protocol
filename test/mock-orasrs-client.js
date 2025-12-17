
// mock-orasrs-client.js
// 模拟OraSRS客户端用于本地测试和验证

class MockOraSRSClient {
    constructor() {
        this.network = { chainId: 8888, name: 'OraSRS-Testnet' };
        this.blockNumber = 123456;
        this.mockDelay = 0.02; // 模拟极低延迟 (0.02ms)
    }

    async initializeContracts() {
        console.log("🔧 [Mock] 初始化OraSRS合约实例...");
        await this._sleep(10);
        console.log("✅ [Mock] 所有合约实例初始化完成");
        return true;
    }

    async testConnection() {
        await this._sleep(50); // 模拟网络RTT
        return { success: true, network: this.network, blockNumber: this.blockNumber };
    }

    async getTokenInfo() {
        await this._sleep(10);
        return { name: 'OraSRS Token', symbol: 'ORA', totalSupply: '1000000000.0' };
    }

    async getIPThreatScore(ip) {
        // 模拟本地快速查找
        // await this._sleep(this.mockDelay); // Node.js sleep is ms, so 0.02ms is negligible

        // 简单的哈希逻辑生成分数
        let score = 0;
        if (ip === '1.2.3.4' || ip === '5.6.7.8') score = 85;
        else if (ip === '8.8.8.8') score = 0;
        else score = parseInt(ip.split('.')[3]) % 100;

        return { ip, score: score.toString() };
    }

    async getMultipleIPThreatScores(ips, threshold) {
        // 模拟批量查找
        const results = [];
        for (const ip of ips) {
            const { score } = await this.getIPThreatScore(ip);
            const riskLevel = score > 80 ? 2 : (score > 50 ? 1 : 0);
            results.push({
                ip,
                score: parseInt(score),
                riskLevel,
                shouldBlock: parseInt(score) > threshold
            });
        }
        return results;
    }

    async syncChainThreatIPs() {
        await this._sleep(100); // 模拟同步延迟
        return [
            { ip: '1.2.3.4', score: 85, riskLevel: 2, threatLevel: 2, threatType: 'DDoS', isActive: true, timestamp: Date.now() },
            { ip: '5.6.7.8', score: 90, riskLevel: 2, threatLevel: 3, threatType: 'Phishing', isActive: true, timestamp: Date.now() }
        ];
    }

    async getThreatStats() {
        return {
            totalThreats: "1500",
            topThreatIp: "1.2.3.4",
            topThreatScore: "95",
            typeDistribution: ["500", "300", "200", "500"]
        };
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export { MockOraSRSClient };
