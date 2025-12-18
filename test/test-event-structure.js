// test-event-structure.js
import { ethers } from "ethers";
import fs from "fs";

// 读取部署信息
const deployments = JSON.parse(fs.readFileSync("./all-deployments.json", "utf8"));
const RPC_URL = "http://127.0.0.1:8545";

async function testEventStructure() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // 威胁情报合约ABI
    const threatIntelABI = [
        "event ThreatIntelAdded(string indexed ip, uint8 threatLevel, string threatType, uint256 timestamp)",
        "function addThreatIntel(string memory _ip, uint8 _threatLevel, string memory _threatType) external",
        "function isThreatSource(string memory _ip) external view returns (bool)",
        "function getThreatIntel(string memory _ip) external view returns (string memory sourceIP, string memory targetIP, uint8 threatLevel, uint256 timestamp, string memory threatType, bool isActive)"
    ];

    const contract = new ethers.Contract(deployments.threatIntelligenceCoordinationAddress, threatIntelABI, provider);
    
    console.log("测试事件结构...");
    
    // 查询事件日志
    const filter = contract.filters.ThreatIntelAdded();
    const events = await contract.queryFilter(filter, 0, 'latest');
    
    console.log(`找到 ${events.length} 个事件`);
    
    for (let i = 0; i < Math.min(3, events.length); i++) {
        const event = events[i];
        console.log(`\n事件 ${i+1}:`);
        console.log("完整事件对象:", JSON.stringify(event, null, 2));
        
        if (event.args) {
            console.log("事件参数:", event.args);
            console.log("参数长度:", event.args.length);
            
            // 访问参数的不同方式
            console.log("args.ip:", event.args.ip);
            console.log("args[0]:", event.args[0]);
            console.log("args.threatLevel:", event.args.threatLevel);
            console.log("args[1]:", event.args[1]);
            console.log("args.threatType:", event.args.threatType);
            console.log("args[2]:", event.args[2]);
        }
    }
}

testEventStructure().catch(console.error);