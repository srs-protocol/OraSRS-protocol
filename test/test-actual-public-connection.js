// test-actual-public-connection.js
// 测试用户端实际公网连接协议链
import { ethers } from "ethers";

async function testActualPublicConnection() {
    console.log('🌐 开始测试用户端公网连接协议链...');
    console.log('🔧 目标端点: https://api.orasrs.net');
    
    try {
        // 创建与公网区块链的连接
        console.log('🔗 正在连接到公网协议链...');
        const provider = new ethers.JsonRpcProvider("https://api.orasrs.net", {
            chainId: 8888,
            name: 'orasrs'
        });
        
        // 设置超时
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('连接超时')), 15000)
        );
        
        // 测试连接 - 获取区块号
        console.log('🔍 测试连接可用性...');
        const blockNumberPromise = provider.getBlockNumber();
        
        // 使用Promise.race来处理超时
        const blockNumber = await Promise.race([
            blockNumberPromise, 
            timeoutPromise
        ]);
        
        console.log(`✅ 连接成功！当前区块高度: ${blockNumber}`);
        
        // 获取网络信息
        try {
            const network = await Promise.race([
                provider.getNetwork(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('获取网络信息超时')), 10000)
                )
            ]);
            console.log(`🌐 网络信息: 名称=${network.name}, ChainId=${network.chainId}`);
        } catch (error) {
            console.log(`⚠️ 获取网络信息失败: ${error.message}`);
        }
        
        // 测试读取合约数据 - 使用部署的合约地址
        const nodeRegistryABI = [
            "function getNodes() external view returns (tuple(string ip, uint16 port, address wallet)[] memory)"
        ];
        
        // 使用配置中的合约地址
        const nodeRegistryAddress = "0x0B306BF915C4d645ff596e518fAf3F9669b97016";
        const nodeRegistryContract = new ethers.Contract(
            nodeRegistryAddress, 
            nodeRegistryABI, 
            provider
        );
        
        console.log('📋 正在获取公网节点列表...');
        const nodesPromise = nodeRegistryContract.getNodes();
        const nodes = await Promise.race([
            nodesPromise, 
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('获取节点列表超时')), 15000)
            )
        ]);
        
        console.log(`✅ 成功获取节点列表，共 ${nodes.length} 个节点`);
        
        // 显示部分节点信息
        for (let i = 0; i < Math.min(5, nodes.length); i++) {
            const node = nodes[i];
            console.log(`   - ${i+1}. IP: ${node.ip}, 端口: ${node.port}, 钱包: ${node.wallet}`);
        }
        
        if (nodes.length > 5) {
            console.log(`   ... 还有 ${nodes.length - 5} 个节点`);
        }
        
        // 测试威胁情报合约
        const threatIntelABI = [
            "function isThreatSource(string memory _ip) external view returns (bool)"
        ];
        
        const threatIntelContract = new ethers.Contract(
            "0x5A3C242C35E9D2924716713fe1520133447C0339", // 威胁情报合约地址
            threatIntelABI,
            provider
        );
        
        console.log('🛡️ 测试威胁情报查询...');
        const isThreat = await Promise.race([
            threatIntelContract.isThreatSource("45.33.22.11"),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('威胁情报查询超时')), 10000)
            )
        ]);
        
        console.log(`✅ 威胁情报查询正常: ${isThreat}`);
        
        console.log('\n🎉 公网连接测试完成！');
        console.log('✅ 用户端可以成功连接到协议链');
        console.log('✅ 可以读取节点列表');
        console.log('✅ 可以查询威胁情报');
        console.log('✅ 协议链功能正常');
        
        return true;
        
    } catch (error) {
        console.error('❌ 公网连接测试失败:');
        
        if (error.message.includes('timeout')) {
            console.error('   连接超时 - 可能是网络问题或端点不可用');
        } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
            console.error('   无法连接到端点 - api.orasrs.net 可能不可用');
        } else {
            console.error(`   错误详情: ${error.message}`);
        }
        
        console.log('\n💡 提示: 如果连接失败，可能的原因:');
        console.log('   1. api.orasrs.net 服务暂时不可用');
        console.log('   2. 防火墙或网络策略阻止了连接');
        console.log('   3. 公网端点配置有误');
        console.log('   4. 合约地址在公网链上与本地不一致');
        
        return false;
    }
}

// 运行测试
if (import.meta.url === new URL(import.meta.url).href) {
    testActualPublicConnection().catch(error => {
        console.error('测试执行异常:', error);
        process.exit(1);
    });
}