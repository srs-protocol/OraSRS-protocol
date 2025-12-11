// simulate_attack.js
import { ethers } from "ethers";
import fs from "fs";

// 1. 读取配置和合约地址
const deployments = JSON.parse(fs.readFileSync("./all-deployments.json", "utf8")); // 确保路径正确
const RPC_URL = "http://127.0.0.1:8545"; 

// 2. 模拟一个恶意 IP 和威胁信息
const MOCK_ATTACKER_IP = "45.33.22.11"; // 假设这是来自国外的攻击 IP
const THREAT_LEVEL = 3; // Emergency level (对应合约中的枚举: Info=0, Warning=1, Critical=2, Emergency=3)
const THREAT_TYPE = "SSH Brute Force Attack Detected";

async function launchSimulation() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // 创建一个新钱包作为节点账户
    const newWallet = new ethers.Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", provider); // 从Hardhat预设账户中选择一个
    console.log(`🔑 [新节点] 已创建新钱包: ${newWallet.address}`);
    
    // 使用默认的管理员账户为新节点提供资金
    const deployerWallet = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
    
    // 为新节点转账以支付gas费用
    console.log(`💰 [资金] 为新节点转账...`);
    const transferTx = await deployerWallet.sendTransaction({
        to: newWallet.address,
        value: ethers.parseEther("0.1") // 发送0.1 ETH
    });
    await transferTx.wait();
    console.log(`✅ [资金] 转账成功，交易哈希: ${transferTx.hash}`);
    
    // 连接到NodeRegistry合约并注册新节点
    const nodeRegistryAddress = deployments.nodeRegistryAddress;
    const nodeRegistryABI = [
        "function registerNode(string memory _ip, uint16 _port) public",
        "function getNodes() public view returns (tuple(string ip, uint16 port, address wallet)[] memory)"
    ];
    
    const nodeRegistryContract = new ethers.Contract(nodeRegistryAddress, nodeRegistryABI, newWallet);
    
    console.log(`📡 [注册] 正在将新节点注册到NodeRegistry...`);
    try {
        const registerTx = await nodeRegistryContract.registerNode("192.168.1.100", 8080);
        console.log(`✅ [注册] 节点注册交易已发送，哈希: ${registerTx.hash}`);
        await registerTx.wait();
        console.log(`🎉 [注册] 新节点已成功注册到NodeRegistry`);
    } catch (error) {
        console.log(`⚠️ [注册] 节点注册可能已存在或出错: ${error.message}`);
    }
    
    // 等待一点时间确保nonce更新
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 现在使用新创建的节点账户作为"举报者"向威胁情报合约报告
    const threatIntelContractAddress = deployments.threatIntelligenceCoordinationAddress;
    const threatIntelABI = [
        "event ThreatIntelAdded(string indexed ip, uint8 threatLevel, string threatType, uint256 timestamp)",
        "function addThreatIntel(string memory _ip, uint8 _threatLevel, string memory _threatType) external",
        "function isThreatSource(string memory _ip) external view returns (bool)",
        "function getThreatIntel(string memory _ip) external view returns (string memory sourceIP, string memory targetIP, uint8 threatLevel, uint256 timestamp, string memory threatType, bool isActive)"
    ];

    const threatIntelContract = new ethers.Contract(threatIntelContractAddress, threatIntelABI, newWallet);

    console.log("🚨 [探针端] 正在监测网络流量...");
    console.log(`⚠️ [探针端] 发现异常流量! 源 IP: ${MOCK_ATTACKER_IP}`);
    console.log(`📡 [探针端] 正在将威胁情报上报至区块链...`);

    try {
        // 调用合约上报
        const tx = await threatIntelContract.addThreatIntel(
            MOCK_ATTACKER_IP, 
            THREAT_LEVEL, 
            THREAT_TYPE
        );
        
        console.log(`✅ [探针端] 上报成功! 交易哈希: ${tx.hash}`);
        console.log(`⏳ [探针端] 等待区块确认...`);
        await tx.wait();
        console.log(`🎉 [探针端] 威胁情报已写入区块，全网广播中！`);
        
    } catch (error) {
        console.error("❌ 上报失败:", error.message);
    }
}

launchSimulation();