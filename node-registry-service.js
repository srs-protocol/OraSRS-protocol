// node-registry-service.js
// 后端服务：监听节点注册合约事件并通过API暴露节点列表

const express = require('express');
const { ethers } = require('ethers');
const cors = require('cors');

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3006;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 合约ABI - 只包含必要的事件和方法
const contractABI = [
    "event NodeRegistered(string indexed nodeId, string endpoint, string location, uint256 timestamp)",
    "event NodeHeartbeat(string indexed nodeId, uint256 timestamp)",
    "event NodeUnregistered(string indexed nodeId, uint256 timestamp)",
    "event ReputationUpdated(string indexed nodeId, uint256 newReputation, uint256 timestamp)",
    "function nodes(string) view returns (string nodeId, string endpoint, string location, uint256 registrationTimestamp, uint256 lastHeartbeat, bool isActive, uint256 reputation)",
    "function getActiveNodes() view returns ((string nodeId, string endpoint, string location, uint256 registrationTimestamp, uint256 lastHeartbeat, bool isActive, uint256 reputation)[])",
    "function getActiveNodeCount() view returns (uint256)",
    "function isNodeActive(string) view returns (bool)",
    "function getNode(string) view returns (string nodeId, string endpoint, string location, uint256 registrationTimestamp, uint256 lastHeartbeat, bool isActive, uint256 reputation)"
];

// 节点数据缓存
let nodeCache = {
    nodes: [],
    lastUpdated: null,
    totalActive: 0
};

// 初始化以太坊提供者
const provider = new ethers.JsonRpcProvider('https://api.orasrs.net');

// 替换为实际的合约地址
const CONTRACT_ADDRESS = process.env.NODE_REGISTRY_CONTRACT_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';

// 创建合约实例
const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);

// 函数缓存节点数据
async function updateNodeCache() {
    try {
        console.log('Updating node cache...');
        
        // 获取所有活跃节点
        const activeNodes = await contract.getActiveNodes();
        
        // 转换为更易用的格式
        const nodes = activeNodes.map(node => ({
            nodeId: node.nodeId,
            endpoint: node.endpoint,
            location: node.location,
            registrationTimestamp: Number(node.registrationTimestamp),
            lastHeartbeat: Number(node.lastHeartbeat),
            isActive: node.isActive,
            reputation: Number(node.reputation),
            lastHeartbeatFormatted: new Date(Number(node.lastHeartbeat) * 1000).toISOString(),
            registrationFormatted: new Date(Number(node.registrationTimestamp) * 1000).toISOString()
        }));
        
        // 更新缓存
        nodeCache = {
            nodes: nodes,
            lastUpdated: new Date().toISOString(),
            totalActive: nodes.length
        };
        
        console.log(`Node cache updated with ${nodes.length} active nodes`);
    } catch (error) {
        console.error('Error updating node cache:', error);
    }
}

// 监听合约事件
function startEventListeners() {
    console.log('Starting event listeners...');
    
    // 监听节点注册事件
    contract.on('NodeRegistered', (nodeId, endpoint, location, timestamp, event) => {
        console.log(`New node registered: ${nodeId} at ${endpoint} (${location})`);
        // 触发缓存更新
        setTimeout(updateNodeCache, 1000); // 延迟1秒更新，等待状态同步
    });
    
    // 监听节点心跳事件
    contract.on('NodeHeartbeat', (nodeId, timestamp, event) => {
        console.log(`Node heartbeat: ${nodeId}`);
        // 触发缓存更新
        setTimeout(updateNodeCache, 1000);
    });
    
    // 监听节点注销事件
    contract.on('NodeUnregistered', (nodeId, timestamp, event) => {
        console.log(`Node unregistered: ${nodeId}`);
        // 触发缓存更新
        setTimeout(updateNodeCache, 1000);
    });
    
    // 监听声誉更新事件
    contract.on('ReputationUpdated', (nodeId, newReputation, timestamp, event) => {
        console.log(`Node reputation updated: ${nodeId} -> ${newReputation}`);
        // 触发缓存更新
        setTimeout(updateNodeCache, 1000);
    });
    
    console.log('Event listeners started');
}

// API端点：获取所有活跃节点
app.get('/api/nodes', (req, res) => {
    try {
        res.json({
            success: true,
            data: nodeCache.nodes,
            lastUpdated: nodeCache.lastUpdated,
            totalActive: nodeCache.totalActive,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// API端点：获取单个节点信息
app.get('/api/nodes/:nodeId', async (req, res) => {
    try {
        const nodeId = req.params.nodeId;
        
        // 从合约获取节点信息
        const node = await contract.getNode(nodeId);
        
        // 检查节点是否存在
        if (!node || node.nodeId === '') {
            return res.status(404).json({
                success: false,
                error: 'Node not found',
                timestamp: new Date().toISOString()
            });
        }
        
        // 转换为更易用的格式
        const formattedNode = {
            nodeId: node.nodeId,
            endpoint: node.endpoint,
            location: node.location,
            registrationTimestamp: Number(node.registrationTimestamp),
            lastHeartbeat: Number(node.lastHeartbeat),
            isActive: node.isActive,
            reputation: Number(node.reputation),
            lastHeartbeatFormatted: new Date(Number(node.lastHeartbeat) * 1000).toISOString(),
            registrationFormatted: new Date(Number(node.registrationTimestamp) * 1000).toISOString()
        };
        
        res.json({
            success: true,
            data: formattedNode,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// API端点：获取活跃节点数量
app.get('/api/nodes/count', async (req, res) => {
    try {
        const count = await contract.getActiveNodeCount();
        
        res.json({
            success: true,
            data: {
                count: Number(count)
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// API端点：检查节点活跃状态
app.get('/api/nodes/:nodeId/active', async (req, res) => {
    try {
        const nodeId = req.params.nodeId;
        const isActive = await contract.isNodeActive(nodeId);
        
        res.json({
            success: true,
            data: {
                nodeId: nodeId,
                isActive: isActive
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// API端点：健康检查
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'Node Registry Service',
        lastCacheUpdate: nodeCache.lastUpdated,
        activeNodes: nodeCache.totalActive,
        timestamp: new Date().toISOString()
    });
});

// API端点：服务信息
app.get('/', (req, res) => {
    res.json({
        service: 'Node Registry Service',
        description: 'Provides API for OraSRS node registry',
        endpoints: {
            'GET /api/nodes': 'Get all active nodes',
            'GET /api/nodes/:nodeId': 'Get specific node information',
            'GET /api/nodes/count': 'Get count of active nodes',
            'GET /api/nodes/:nodeId/active': 'Check if node is active',
            'GET /health': 'Service health check'
        },
        lastCacheUpdate: nodeCache.lastUpdated,
        totalActive: nodeCache.totalActive,
        timestamp: new Date().toISOString()
    });
});

// 启动服务
async function startService() {
    try {
        console.log('Starting Node Registry Service...');
        
        // 初始化缓存
        await updateNodeCache();
        
        // 启动事件监听器
        startEventListeners();
        
        // 每5分钟更新一次缓存
        setInterval(async () => {
            await updateNodeCache();
        }, 5 * 60 * 1000); // 5分钟
        
        // 启动服务器
        app.listen(PORT, () => {
            console.log(`Node Registry Service listening on port ${PORT}`);
            console.log(`API base URL: http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start service:', error);
        process.exit(1);
    }
}

// 优雅关闭
process.on('SIGINT', async () => {
    console.log('Shutting down Node Registry Service...');
    try {
        // 停止合约事件监听
        contract.removeAllListeners();
        console.log('Contract listeners removed');
    } catch (err) {
        console.error('Error during shutdown:', err);
    }
    process.exit(0);
});

// 启动服务
startService();

module.exports = app;