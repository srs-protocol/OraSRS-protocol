// verify-contract-data.js - 验证合约中存储的数据
import { ethers } from 'ethers';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 使用与部署脚本相同的IP生成逻辑以确保生成相同的IP
function generateRandomIP(seed = null) {
    if (seed !== null) {
        // 使用种子生成可预测的IP
        const random = (seed * 9301 + 49297) % 233280;
        const octets = [];
        for (let i = 0; i < 4; i++) {
            octets.push(Math.floor(random * (i + 1)) % 256);
        }
        return octets.join('.');
    } else {
        const octets = [];
        for (let i = 0; i < 4; i++) {
            octets.push(Math.floor(Math.random() * 256));
        }
        return octets.join('.');
    }
}

async function verifyContractData() {
    console.log('🔍 验证合约中存储的数据...');
    
    // 连接到Hardhat节点
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    
    // 使用部署的威胁情报合约ABI
    const abi = [
        {
            "inputs": [
                {
                    "internalType": "string",
                    "name": "_ip",
                    "type": "string"
                }
            ],
            "name": "getThreatScore",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "string",
                    "name": "_ip",
                    "type": "string"
                }
            ],
            "name": "isThreatSource",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "string",
                    "name": "_ip",
                    "type": "string"
                }
            ],
            "name": "getThreatIntel",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "sourceIP",
                    "type": "string"
                },
                {
                    "internalType": "string",
                    "name": "targetIP",
                    "type": "string"
                },
                {
                    "internalType": "uint8",
                    "name": "threatLevel",
                    "type": "uint8"
                },
                {
                    "internalType": "uint256",
                    "name": "timestamp",
                    "type": "uint256"
                },
                {
                    "internalType": "string",
                    "name": "threatType",
                    "type": "string"
                },
                {
                    "internalType": "bool",
                    "name": "isActive",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ];
    
    // 使用之前部署的合约地址
    const contractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
    const contract = new ethers.Contract(contractAddress, abi, provider);
    
    console.log(`连接到合约: ${contractAddress}`);
    
    // 测试一些可能存在于合约中的IP
    console.log('\n验证一些IP是否存在于合约中...');
    
    // 生成一些IP并检查它们是否存在于合约中
    let foundIPs = 0;
    const sampleIPs = [];
    
    // 尝试检查1000个IP以找到一些可能存在的
    for (let i = 0; i < 1000; i++) {
        const ip = generateRandomIP(i); // 使用种子以生成可预测的IP
        try {
            const isThreat = await contract.isThreatSource(ip);
            if (isThreat) {
                sampleIPs.push(ip);
                foundIPs++;
                
                // 获取详细信息
                const [sourceIP, targetIP, threatLevel, timestamp, threatType, isActive] = 
                    await contract.getThreatIntel(ip);
                const score = await contract.getThreatScore(ip);
                
                console.log(`  ✓ IP: ${ip} | Level: ${threatLevel} | Score: ${score} | Type: ${threatType}`);
                
                if (foundIPs >= 10) { // 只显示前10个找到的
                    break;
                }
            }
        } catch (error) {
            // 忽略错误并继续
        }
    }
    
    console.log(`\n总共找到 ${foundIPs} 个存在于合约中的IP`);
    
    // 如果找到了IP，进行性能测试
    if (sampleIPs.length > 0) {
        console.log(`\n进行性能测试，使用 ${sampleIPs.length} 个已知存在的IP...`);
        
        const startTime = Date.now();
        const scores = [];
        
        for (const ip of sampleIPs) {
            const score = await contract.getThreatScore(ip);
            scores.push(Number(score));
        }
        
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        
        console.log(`读取 ${sampleIPs.length} 个IP的威胁分数，总耗时: ${totalTime}ms`);
        console.log(`平均每次读取耗时: ${(totalTime / sampleIPs.length).toFixed(4)}ms`);
        console.log(`QPS: ${(sampleIPs.length / (totalTime / 1000)).toFixed(2)}`);
    } else {
        console.log('\n⚠️  没有找到存在于合约中的IP。这可能是因为:');
        console.log('   1. 合约地址不正确');
        console.log('   2. 数据已清理或合约已重新部署');
        console.log('   3. 生成的IP与存储的IP不匹配');
    }
    
    // 创建验证报告
    const report = {
        test_run: new Date().toISOString(),
        test_type: 'Contract Data Verification Test',
        contract_address: contractAddress,
        results: {
            ips_checked: 1000,
            ips_found: foundIPs,
            sample_ips: sampleIPs.slice(0, 10), // 只保存前10个找到的IP
            performance_test: sampleIPs.length > 0 ? {
                ip_count: sampleIPs.length,
                total_time_ms: sampleIPs.length > 0 ? totalTime : 0,
                average_time_per_read: sampleIPs.length > 0 ? (totalTime / sampleIPs.length).toFixed(4) : 0,
                qps: sampleIPs.length > 0 ? (sampleIPs.length / (totalTime / 1000)).toFixed(2) : 0
            } : null
        }
    };
    
    // 保存报告
    const reportPath = __dirname + '/contract-verification-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📊 合约数据验证报告已保存到: ${reportPath}`);
    
    console.log('\n✅ 合约数据验证完成！');
    
    return report;
}

// 如果直接运行此脚本
if (process.argv[1] === new URL(import.meta.url).pathname) {
    verifyContractData()
        .then(() => console.log('合约数据验证执行完成'))
        .catch(err => {
            console.error('合约数据验证执行失败:', err);
            process.exit(1);
        });
}

export { verifyContractData };
