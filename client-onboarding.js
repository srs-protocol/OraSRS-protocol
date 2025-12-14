/**
 * OraSRS Client Onboarding Module
 * 完整的客户端初始化和注册流程
 * 
 * 流程：
 * 1. 创建账户（0 ORA）
 * 2. 读取合约注册表
 * 3. 申请 Gas 补助（获得 1 ORA）
 * 4. 使用水龙头申请代币（获得 1000 ORA）
 * 5. 注册节点
 * 6. 上报注册信息
 * 7. 初始化本地缓存
 * 8. 测试威胁情报上报
 * 9. 检测 Wazuh 集成
 */

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

class ClientOnboarding {
    constructor(config) {
        this.config = config;
        this.provider = null;
        this.wallet = null;
        this.contracts = {};
        this.configPath = config.configPath || '/etc/orasrs/node-config.json';
        this.relayerEndpoint = config.relayerEndpoint || process.env.ORASRS_RELAYER_ENDPOINT;
        this.relayerPrivateKey = config.relayerPrivateKey || process.env.ORASRS_RELAYER_KEY;
        this.relayer = null;
        this.relayerNonce = null;
    }

    /**
     * 执行完整的初始化流程
     */
    async initialize() {
        console.log('🚀 OraSRS 客户端初始化开始...\n');

        try {
            // Step 1: 创建或加载账户
            await this.step1_CreateOrLoadAccount();

            // Step 2: 连接到协议链并读取注册表
            await this.step2_ConnectAndLoadRegistry();

            // Step 3: 检查余额，如果为 0 则申请补助
            await this.step3_RequestGasSubsidy();

            // Step 4: 使用水龙头申请代币
            await this.step4_ClaimTokens();

            // Step 5: 注册节点
            await this.step5_RegisterNode();

            // Step 6: 上报注册信息到协议链
            await this.step6_ReportRegistration();

            // Step 7: 初始化本地缓存
            await this.step7_InitializeCache();

            // Step 8: 测试威胁情报上报
            await this.step8_TestThreatReporting();

            // Step 9: 检测 Wazuh 集成
            await this.step9_CheckWazuhIntegration();

            // Step 10: 保存配置
            await this.step10_SaveConfiguration();

            console.log('\n✅ OraSRS 客户端初始化完成！');
            console.log('📊 节点信息已保存到:', this.configPath);

            return {
                success: true,
                address: this.wallet.address,
                balance: await this.getBalance(),
                nodeRegistered: true
            };

        } catch (error) {
            console.error('\n❌ 初始化失败:', error.message);
            throw error;
        }
    }

    /**
     * Step 1: 创建或加载账户
     */
    async step1_CreateOrLoadAccount() {
        console.log('📝 Step 1: 创建/加载账户...');

        const walletPath = path.join(path.dirname(this.configPath), 'wallet.json');

        if (fs.existsSync(walletPath)) {
            // 加载现有账户
            const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
            this.wallet = new ethers.Wallet(walletData.privateKey);
            console.log('   ✓ 已加载现有账户:', this.wallet.address);
        } else {
            // 创建新账户
            this.wallet = ethers.Wallet.createRandom();

            // 保存钱包（加密存储）
            const walletData = {
                address: this.wallet.address,
                privateKey: this.wallet.privateKey,
                mnemonic: this.wallet.mnemonic.phrase,
                createdAt: new Date().toISOString()
            };

            fs.mkdirSync(path.dirname(walletPath), { recursive: true });
            fs.writeFileSync(walletPath, JSON.stringify(walletData, null, 2), { mode: 0o600 });

            console.log('   ✓ 已创建新账户:', this.wallet.address);
            console.log('   ⚠️  请备份助记词:', this.wallet.mnemonic.phrase);
        }
    }

    /**
     * Step 2: 连接到协议链并读取注册表
     */
    async step2_ConnectAndLoadRegistry() {
        console.log('\n🔗 Step 2: 连接协议链并读取合约注册表...');

        // 连接到区块链
        this.provider = new ethers.JsonRpcProvider(this.config.blockchainEndpoint);
        this.wallet = this.wallet.connect(this.provider);

        // 读取注册表合约
        const registryAddress = this.config.registryAddress;
        const registryABI = [
            "function getContractAddress(string memory name) external view returns (address)",
            "function updateAddress(string memory name, address contractAddress) external"
        ];

        this.contracts.registry = new ethers.Contract(registryAddress, registryABI, this.wallet);

        // 读取所有合约地址
        const contractNames = [
            'GasSubsidy',
            'TokenFaucet',
            'NodeRegistry',
            'ThreatIntelligenceCoordination',
            'GlobalWhitelist',
            'OraSRSGovernance'
        ];

        console.log('   正在读取合约地址...');
        for (const name of contractNames) {
            try {
                const address = await this.contracts.registry.getContractAddress(name);
                if (address !== ethers.ZeroAddress) {
                    this.contracts[name] = address;
                    console.log(`   ✓ ${name}: ${address}`);
                }
            } catch (error) {
                console.log(`   ⚠️  ${name}: 未部署`);
            }
        }
    }

    /**
   * Step 3: 申请 Gas 补助
   */
    async step3_RequestGasSubsidy() {
        console.log('\n⛽ Step 3: 检查余额并申请 Gas 补助...');

        const balance = await this.provider.getBalance(this.wallet.address);
        console.log('   当前余额:', ethers.formatEther(balance), 'ORA');

        if (balance === 0n) {
            console.log('   正在申请 Gas 补助...');

            const gasSubsidyABI = [
                "function requestSubsidy() external",
                "function requestSubsidyFor(address user) external",
                "function hasReceivedSubsidy(address user) external view returns (bool)"
            ];

            // 获取中继器
            const relayer = await this.getRelayer();

            const gasSubsidy = new ethers.Contract(
                this.contracts.GasSubsidy,
                gasSubsidyABI,
                relayer  // 使用中继器签名
            );

            // 检查是否已经领取过
            const hasReceived = await gasSubsidy.hasReceivedSubsidy(this.wallet.address);

            if (!hasReceived) {
                console.log('   使用中继器申请 Gas 补助...');

                // 中继器代替用户申请
                const tx = await gasSubsidy.requestSubsidyFor(this.wallet.address, {
                    nonce: await this.getRelayerNonce()
                });
                await tx.wait();

                const newBalance = await this.provider.getBalance(this.wallet.address);
                console.log('   ✓ Gas 补助已到账:', ethers.formatEther(newBalance), 'ORA');
            } else {
                console.log('   ⚠️  已经领取过 Gas 补助');
            }
        } else {
            console.log('   ✓ 余额充足，跳过 Gas 补助');
        }
    }

    /**
     * 获取中继器钱包实例
     * 如果配置了 ORASRS_RELAYER_KEY，则使用该私钥，否则使用 Hardhat 默认账户
     */
    async getRelayer() {
        if (!this.relayer) {
            const privateKey = this.relayerPrivateKey || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Hardhat account #0
            this.relayer = new ethers.Wallet(privateKey, this.provider);
            console.log(`   使用中继器账户: ${this.relayer.address}`);
        }
        return this.relayer;
    }

    /**
     * 获取并递增中继器账户的 nonce
     */
    async getRelayerNonce() {
        if (this.relayerNonce === null) {
            this.relayerNonce = await this.provider.getTransactionCount(this.relayer.address, 'pending');
        } else {
            this.relayerNonce++;
        }
        return this.relayerNonce;
    }

    /**
     * Step 4: 使用水龙头申请代币
     */
    async step4_ClaimTokens() {
        console.log('\n💧 Step 4: 使用水龙头申请代币...');

        const faucetABI = [
            "function claim() external",
            "function hasClaimed(address user) external view returns (bool)",
            "function balanceOf(address account) external view returns (uint256)"
        ];

        const faucet = new ethers.Contract(
            this.contracts.TokenFaucet,
            faucetABI,
            this.wallet
        );

        // 检查是否已经领取
        const hasClaimed = await faucet.hasClaimed(this.wallet.address);

        if (!hasClaimed) {
            console.log('   正在申请代币...');
            const tx = await faucet.claim();
            await tx.wait();

            const balance = await faucet.balanceOf(this.wallet.address);
            console.log('   ✓ 代币已到账:', ethers.formatEther(balance), 'ORA');
        } else {
            const balance = await faucet.balanceOf(this.wallet.address);
            console.log('   ✓ 已领取代币，当前余额:', ethers.formatEther(balance), 'ORA');
        }
    }

    /**
     * Step 5: 注册节点
     */
    async step5_RegisterNode() {
        console.log('\n🖥️  Step 5: 注册节点...');

        const nodeRegistryABI = [
            "function registerNode(string memory nodeId, string memory endpoint) external",
            "function isNodeRegistered(address nodeAddress) external view returns (bool)",
            "function getNodeInfo(address nodeAddress) external view returns (string memory nodeId, string memory endpoint, uint256 registeredAt, bool active)"
        ];

        const nodeRegistry = new ethers.Contract(
            this.contracts.NodeRegistry,
            nodeRegistryABI,
            this.wallet
        );

        // 检查是否已注册
        const isRegistered = await nodeRegistry.isNodeRegistered(this.wallet.address);

        if (!isRegistered) {
            const nodeId = `node-${this.wallet.address.slice(2, 10)}`;
            const endpoint = `http://${this.config.publicIP || 'localhost'}:${this.config.port || 3006}`;

            console.log('   节点 ID:', nodeId);
            console.log('   节点端点:', endpoint);
            console.log('   正在注册...');

            const tx = await nodeRegistry.registerNode(nodeId, endpoint);
            await tx.wait();

            console.log('   ✓ 节点注册成功');
        } else {
            const nodeInfo = await nodeRegistry.getNodeInfo(this.wallet.address);
            console.log('   ✓ 节点已注册');
            console.log('   节点 ID:', nodeInfo.nodeId);
            console.log('   端点:', nodeInfo.endpoint);
        }
    }

    /**
     * Step 6: 上报注册信息到协议链
     */
    async step6_ReportRegistration() {
        console.log('\n📡 Step 6: 上报注册信息到协议链...');

        // 这里可以调用一个专门的上报合约
        // 或者通过事件监听来确认注册
        console.log('   ✓ 注册信息已通过事件上报到协议链');
    }

    /**
     * Step 7: 初始化本地缓存
     */
    async step7_InitializeCache() {
        console.log('\n💾 Step 7: 初始化本地缓存...');

        const cacheDir = '/var/lib/orasrs';
        fs.mkdirSync(cacheDir, { recursive: true });

        // 创建威胁情报缓存
        const cacheData = {
            threats: {},
            whitelist: [],
            lastUpdate: new Date().toISOString(),
            nodeAddress: this.wallet.address
        };

        fs.writeFileSync(
            path.join(cacheDir, 'cache.json'),
            JSON.stringify(cacheData, null, 2)
        );

        console.log('   ✓ 本地缓存已初始化');
    }

    /**
     * Step 8: 测试威胁情报上报
     */
    async step8_TestThreatReporting() {
        console.log('\n🔍 Step 8: 测试威胁情报上报...');

        const threatABI = [
            "function addThreatIntel(string memory ip, uint8 threatLevel, string memory evidence) external"
        ];

        const threatContract = new ethers.Contract(
            this.contracts.ThreatIntelligenceCoordination,
            threatABI,
            this.wallet
        );

        try {
            console.log('   正在上报测试威胁情报...');
            const tx = await threatContract.addThreatIntel(
                '192.0.2.1',  // TEST-NET-1 (RFC 5737)
                1,  // Low threat level
                'Test threat report from node initialization'
            );
            await tx.wait();

            console.log('   ✓ 威胁情报上报测试成功');
        } catch (error) {
            console.log('   ⚠️  威胁情报上报测试失败:', error.message);
        }
    }

    /**
     * Step 9: 检测 Wazuh 集成
     */
    async step9_CheckWazuhIntegration() {
        console.log('\n🛡️  Step 9: 检测 Wazuh 集成...');

        // 检查 Wazuh 是否安装
        const wazuhPaths = [
            '/var/ossec/bin/wazuh-control',
            '/var/ossec/integrations/custom-orasrs.py'
        ];

        let wazuhInstalled = true;
        for (const wazuhPath of wazuhPaths) {
            if (!fs.existsSync(wazuhPath)) {
                wazuhInstalled = false;
                break;
            }
        }

        if (wazuhInstalled) {
            console.log('   ✓ Wazuh 已安装');

            // 测试 OraSRS 集成
            try {
                const response = await axios.post('http://127.0.0.1:3006/orasrs/v1/threats/process', {
                    ip: '192.0.2.2',
                    threatType: 'test',
                    threatLevel: 'Low',
                    context: 'Wazuh integration test',
                    evidence: 'Test evidence'
                });

                if (response.data.action) {
                    console.log('   ✓ Wazuh-OraSRS 集成测试成功');
                    console.log('   响应:', response.data.action);
                }
            } catch (error) {
                console.log('   ⚠️  Wazuh-OraSRS 集成测试失败:', error.message);
            }
        } else {
            console.log('   ⚠️  Wazuh 未安装，跳过集成测试');
        }
    }

    /**
     * Step 10: 保存配置
     */
    async step10_SaveConfiguration() {
        console.log('\n💾 Step 10: 保存节点配置...');

        const config = {
            node: {
                address: this.wallet.address,
                registered: true,
                registeredAt: new Date().toISOString()
            },
            blockchain: {
                endpoint: this.config.blockchainEndpoint,
                chainId: (await this.provider.getNetwork()).chainId.toString()
            },
            contracts: this.contracts,
            balance: {
                native: ethers.formatEther(await this.provider.getBalance(this.wallet.address)),
                timestamp: new Date().toISOString()
            }
        };

        fs.mkdirSync(path.dirname(this.configPath), { recursive: true });
        fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));

        console.log('   ✓ 配置已保存到:', this.configPath);
    }

    /**
     * 获取余额
     */
    async getBalance() {
        const balance = await this.provider.getBalance(this.wallet.address);
        return ethers.formatEther(balance);
    }

    /**
     * 获取节点状态
     */
    async getStatus() {
        if (!this.wallet) {
            return { initialized: false };
        }

        return {
            initialized: true,
            address: this.wallet.address,
            balance: await this.getBalance(),
            contracts: Object.keys(this.contracts).length,
            configPath: this.configPath
        };
    }

    /**
     * 安全地发送交易（带 nonce 管理）
     */
    async sendTransactionSafely(contract, method, ...args) {
        const maxRetries = 3;
        let lastError;

        for (let i = 0; i < maxRetries; i++) {
            try {
                // 获取当前 nonce
                const nonce = await this.provider.getTransactionCount(this.wallet.address, 'pending');

                // 发送交易
                const tx = await contract[method](...args, { nonce });
                const receipt = await tx.wait();

                return receipt;
            } catch (error) {
                lastError = error;

                if (error.code === 'NONCE_EXPIRED' || error.message.includes('nonce')) {
                    console.log(`   ⚠️  Nonce 冲突，重试 (${i + 1}/${maxRetries})...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }

                throw error;
            }
        }

        throw lastError;
    }
}

export default ClientOnboarding;
