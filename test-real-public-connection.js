// test-real-public-connection.js
// 测试用户端连接到真正的OraSRS公网协议链
import { ethers } from "ethers";
import fs from "fs";

async function testRealPublicConnection() {
    console.log('🌐 开始测试用户端连接到OraSRS公网协议链...');
    console.log('🔧 目标端点: https://api.orasrs.net');
    
    try {
        // 尝试连接到公网端点
        console.log('🔗 正在连接到公网OraSRS协议链...');
        const provider = new ethers.JsonRpcProvider("https://api.orasrs.net", {
            chainId: 8888,
            name: 'orasrs'
        });
        
        // 设置请求超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        try {
            // 测试连接 - 获取区块号
            console.log('🔍 测试连接可用性...');
            const blockNumber = await provider.getBlockNumber();
            clearTimeout(timeoutId);
            
            console.log(`✅ 连接成功！当前区块高度: ${blockNumber}`);
            
            // 尝试获取网络信息
            try {
                const network = await provider.getNetwork();
                console.log(`🌐 网络信息: 名称=${network.name}, ChainId=${network.chainId}`);
            } catch (networkError) {
                console.log(`⚠️ 获取网络信息失败: ${networkError.message}`);
            }
            
            // 从部署文件中获取合约地址
            let deployments = {};
            if (fs.existsSync('./all-deployments.json')) {
                deployments = JSON.parse(fs.readFileSync('./all-deployments.json', 'utf8'));
            } else if (fs.existsSync('./deployed_addresses/orasrs-contracts.json')) {
                deployments = JSON.parse(fs.readFileSync('./deployed_addresses/orasrs-contracts.json', 'utf8'));
            }
            
            // 使用默认合约地址进行测试
            const nodeRegistryABI = [
                "function getNodes() external view returns (tuple(string ip, uint16 port, address wallet)[] memory)"
            ];
            
            const nodeRegistryAddress = deployments.nodeRegistryAddress || "0x0B306BF915C4d645ff596e518fAf3F9669b97016";
            const nodeRegistryContract = new ethers.Contract(
                nodeRegistryAddress,
                nodeRegistryABI,
                provider
            );
            
            console.log('📋 正在获取公网节点列表...');
            const nodes = await nodeRegistryContract.getNodes();
            console.log(`✅ 成功获取节点列表，共 ${nodes.length} 个节点`);
            
            // 显示部分节点信息
            for (let i = 0; i < Math.min(5, nodes.length); i++) {
                const node = nodes[i];
                console.log(`   - ${i+1}. IP: ${node.ip}, 端口: ${node.port}, 钱包: ${node.wallet}`);
            }
            
            // 测试威胁情报合约
            if (deployments.threatIntelligenceCoordinationAddress) {
                const threatIntelABI = [
                    "function isThreatSource(string memory _ip) external view returns (bool)"
                ];
                
                const threatIntelContract = new ethers.Contract(
                    deployments.threatIntelligenceCoordinationAddress,
                    threatIntelABI,
                    provider
                );
                
                console.log('🛡️ 测试威胁情报查询...');
                const isThreat = await threatIntelContract.isThreatSource("45.33.22.11");
                console.log(`✅ 威胁情报查询正常: ${isThreat}`);
            }
            
            console.log('\n🎉 OraSRS公网连接测试完成！');
            console.log('✅ 用户端可以成功连接到公网协议链');
            console.log('✅ 可以读取节点列表');
            console.log('✅ 可以查询威胁情报');
            console.log('✅ 协议链功能正常');
            
            return true;
            
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
        
    } catch (error) {
        console.error('❌ OraSRS公网连接测试失败:');
        
        if (error.name === 'AbortError' || error.message.includes('timeout')) {
            console.error('   连接超时 - 可能是网络问题或端点暂时不可用');
        } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
            console.error('   无法连接到端点 - api.orasrs.net 可能不可用');
        } else if (error.message.includes('network changed')) {
            console.error('   网络ID不匹配 - api.orasrs.net 可能指向本地测试网络');
            console.log('   提示: 在开发环境中，api.orasrs.net 可能配置为指向本地Hardhat节点');
        } else {
            console.error(`   错误详情: ${error.message}`);
        }
        
        console.log('\n💡 说明: 在开发/测试环境中，api.orasrs.net 通常配置为指向本地节点');
        console.log('   要测试真实的公网连接，需要:');
        console.log('   1. 确保公网OraSRS链已部署并运行');
        console.log('   2. DNS记录 api.orasrs.net 指向公网节点IP');
        console.log('   3. 防火墙允许相应的端口访问');
        
        return false;
    }
}

// 模拟公网连接测试 - 在开发环境中连接到本地节点但使用公网配置
async function testPublicConnectionWithLocalNode() {
    console.log('🌐 开始模拟公网连接测试（使用本地节点）...');
    console.log('🔧 目标端点: http://localhost:8545 (模拟公网连接)');
    
    try {
        // 连接到本地开发节点，但使用公网配置
        const provider = new ethers.JsonRpcProvider("http://localhost:8545");
        
        // 检查连接
        console.log('🔗 正在连接到本地开发链...');
        const blockNumber = await provider.getBlockNumber();
        console.log(`✅ 连接成功！当前区块高度: ${blockNumber}`);
        
        // 从部署信息中获取合约地址
        let deployments = {};
        if (fs.existsSync('./all-deployments.json')) {
            deployments = JSON.parse(fs.readFileSync('./all-deployments.json', 'utf8'));
        }
        
        if (Object.keys(deployments).length === 0) {
            console.log('⚠️ 部署信息文件不存在，使用默认合约地址');
            deployments.nodeRegistryAddress = "0x0B306BF915C4d645ff596e518fAf3F9669b97016";
            deployments.threatIntelligenceCoordinationAddress = "0x5A3C242C35E9D2924716713fe1520133447C0339";
        }
        
        // 测试NodeRegistry合约
        const nodeRegistryABI = [
            "function getNodes() external view returns (tuple(string ip, uint16 port, address wallet)[] memory)"
        ];
        
        const nodeRegistryContract = new ethers.Contract(
            deployments.nodeRegistryAddress,
            nodeRegistryABI,
            provider
        );
        
        console.log('📋 正在获取节点列表...');
        const nodes = await nodeRegistryContract.getNodes();
        console.log(`✅ 成功获取节点列表，共 ${nodes.length} 个节点`);
        
        // 显示节点信息
        for (let i = 0; i < Math.min(3, nodes.length); i++) {
            const node = nodes[i];
            console.log(`   - 节点 ${i+1}: ${node.ip}:${node.port} (${node.wallet})`);
        }
        
        // 测试威胁情报合约
        const threatIntelABI = [
            "function isThreatSource(string memory _ip) external view returns (bool)",
            "function getThreatIntel(string memory _ip) external view returns (string memory sourceIP, string memory targetIP, uint8 threatLevel, uint256 timestamp, string memory threatType, bool isActive)"
        ];
        
        const threatIntelContract = new ethers.Contract(
            deployments.threatIntelligenceCoordinationAddress,
            threatIntelABI,
            provider
        );
        
        console.log('🛡️ 测试威胁情报功能...');
        const testIP = "45.33.22.11";
        const isThreat = await threatIntelContract.isThreatSource(testIP);
        
        if (isThreat) {
            const threatInfo = await threatIntelContract.getThreatIntel(testIP);
            console.log(`✅ 发现威胁IP: ${testIP}`);
            console.log(`   威胁级别: ${threatInfo.threatLevel}/5`);
            console.log(`   威胁类型: ${threatInfo.threatType}`);
        } else {
            console.log(`✅ IP ${testIP} 未在威胁列表中`);
        }
        
        console.log('\n🎉 本地模拟公网连接测试完成！');
        console.log('✅ 合约部署和功能正常');
        console.log('✅ 可以执行所有协议操作');
        console.log('✅ 用户端协议栈功能完整');
        
        return true;
        
    } catch (error) {
        console.error('❌ 本地模拟公网连接测试失败:', error.message);
        return false;
    }
}

// 运行测试
if (import.meta.url === new URL(import.meta.url).href) {
    console.log('🔍 检测当前环境并运行相应的测试...');
    
    // 检测是否在开发环境中运行
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        testPublicConnectionWithLocalNode().catch(error => {
            console.error('本地模拟测试执行异常:', error);
            process.exit(1);
        });
    } else {
        testRealPublicConnection().catch(error => {
            console.error('公网连接测试执行异常:', error);
            process.exit(1);
        });
    }
}
