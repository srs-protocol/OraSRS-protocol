// cloud-read-test.js - 协议链云读取测试
import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 生成随机IP地址
function generateRandomIP() {
    const octets = [];
    for (let i = 0; i < 4; i++) {
        octets.push(Math.floor(Math.random() * 256));
    }
    return octets.join('.');
}

async function runCloudReadTest() {
    console.log('☁️  开始协议链云读取测试...');
    
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
                },
                {
                    "internalType": "uint8",
                    "name": "_threatLevel",
                    "type": "uint8"
                },
                {
                    "internalType": "string",
                    "name": "_threatType",
                    "type": "string"
                }
            ],
            "name": "addThreatIntel",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "string[]",
                    "name": "_ips",
                    "type": "string[]"
                },
                {
                    "internalType": "uint256[]",
                    "name": "_scores",
                    "type": "uint256[]"
                }
            ],
            "name": "batchUpdateThreatScores",
            "outputs": [],
            "stateMutability": "nonpayable",
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
    
    // 从合约读取数据的测试
    console.log('\n🔍 从合约读取数据测试...');
    
    // 测试1: 读取1000个IP的威胁分数
    console.log('测试1: 读取1000个IP的威胁分数...');
    const readTestIPs = [];
    const readScores = [];
    const startReadTime = Date.now();
    
    for (let i = 0; i < 1000; i++) {
        const randomIP = generateRandomIP();
        readTestIPs.push(randomIP);
        
        try {
            const score = await contract.getThreatScore(randomIP);
            readScores.push(Number(score));
        } catch (error) {
            // 如果查询失败，记录为0分
            readScores.push(0);
        }
        
        if ((i + 1) % 200 === 0) {
            console.log(`  已读取 ${i + 1}/1000 个IP`);
        }
    }
    
    const endReadTime = Date.now();
    const readTime = endReadTime - startReadTime;
    
    console.log(`  读取完成，总耗时: ${readTime}ms`);
    console.log(`  平均每次读取耗时: ${(readTime / 1000).toFixed(4)}ms`);
    console.log(`  QPS: ${(1000 / (readTime / 1000)).toFixed(2)}`);
    
    // 测试2: 检查部分IP是否为威胁源
    console.log('\n测试2: 检查部分IP是否为威胁源...');
    let threatCount = 0;
    for (let i = 0; i < 100; i++) {
        const ip = readTestIPs[i];
        try {
            const isThreat = await contract.isThreatSource(ip);
            if (isThreat) {
                threatCount++;
            }
        } catch (error) {
            // 查询失败则跳过
        }
    }
    console.log(`  在前100个IP中，发现 ${threatCount} 个威胁源IP`);
    
    // 测试3: 获取部分IP的详细威胁情报
    console.log('\n测试3: 获取部分IP的详细威胁情报...');
    let detailedInfoCount = 0;
    for (let i = 0; i < 50; i++) {
        const ip = readTestIPs[i];
        try {
            const [sourceIP, targetIP, threatLevel, timestamp, threatType, isActive] = 
                await contract.getThreatIntel(ip);
            
            if (isActive) {
                detailedInfoCount++;
                console.log(`  IP: ${ip}, Level: ${threatLevel}, Type: ${threatType}, Score: ${readScores[i]}`);
            }
        } catch (error) {
            // 查询失败则跳过
        }
    }
    console.log(`  成功获取 ${detailedInfoCount} 个IP的详细威胁情报`);
    
    // 生成测试报告
    const report = {
        test_run: new Date().toISOString(),
        test_type: 'Protocol Chain Cloud Read Test',
        contract_address: contractAddress,
        results: {
            read_test: {
                ip_count: 1000,
                total_time_ms: readTime,
                average_time_per_read: (readTime / 1000).toFixed(4),
                qps: (1000 / (readTime / 1000)).toFixed(2),
                threat_sources_found: threatCount
            },
            detailed_info_test: {
                attempts: 50,
                successful_fetches: detailedInfoCount
            }
        },
        summary: {
            overall_performance: `Read ${1000} IPs in ${readTime}ms (${(1000 / (readTime / 1000)).toFixed(2)} QPS)`,
            threat_detection: `${threatCount} threat sources found in 100 sample IPs`,
            detailed_info: `${detailedInfoCount} detailed threat info fetched`
        }
    };
    
    // 保存报告
    const reportPath = path.join(__dirname, 'cloud-read-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📊 云读取测试报告已保存到: ${reportPath}`);
    
    console.log('\n✅ 协议链云读取测试完成！');
    
    return report;
}

// 如果直接运行此脚本
if (process.argv[1] === new URL(import.meta.url).pathname) {
    runCloudReadTest()
        .then(() => console.log('云读取测试执行完成'))
        .catch(err => {
            console.error('云读取测试执行失败:', err);
            process.exit(1);
        });
}

export { runCloudReadTest };
