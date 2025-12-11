const { OraP2PNode } = require('./OraP2PNode');
const { ethers } = require('ethers');

class OraSRSNetwork {
  constructor() {
    this.p2pNode = new OraP2PNode();
    this.provider = new ethers.JsonRpcProvider('https://api.orasrs.net');
    
    // NodeRegistry合约ABI - 这里简化为基本ABI，实际应使用完整的ABI
    const nodeRegistryABI = [
      "function getNodes() view returns (tuple(string ip, uint16 port, address wallet)[] memory)"
    ];
    
    this.nodeRegistry = new ethers.Contract(
      '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512', // NodeRegistry合约地址
      nodeRegistryABI,
      this.provider
    );
  }

  /**
   * 从区块链获取节点列表并启动P2P网络
   */
  async startNetwork() {
    console.log('🌐 从区块链获取节点列表...');
    
    try {
      // 从NodeRegistry合约获取节点列表
      const nodes = await this.nodeRegistry.getNodes();
      console.log(`📋 从区块链获取到 ${nodes.length} 个节点:`);
      
      // 转换为libp2p多地址格式的引导列表
      const bootstrapList = [];
      for (const node of nodes) {
        // 注意：实际部署时需要正确的多地址格式
        // 例如: "/ip4/192.168.1.101/tcp/8081/p2p/Qm..."
        // 这里只是示例格式，实际需要根据节点的PeerID生成
        console.log(`  - ${node.ip}:${node.port} (${node.wallet})`);
        
        // 为每个节点生成一个示例引导地址（实际部署需要真实地址）
        // 在实际场景中，节点需要在启动时公布其PeerID
      }
      
      // 如果没有从区块链获取到节点，使用默认引导节点
      if (bootstrapList.length === 0) {
        bootstrapList.push('/ip4/127.0.0.1/tcp/8081/ws/p2p/Qm...');
      }
      
      // 初始化P2P节点
      await this.p2pNode.init(bootstrapList);
      
      // 订阅OraSRS协议相关的频道
      this.setupSubscriptions();
      
      console.log('✅ OraSRS P2P网络启动完成！');
    } catch (error) {
      console.error('❌ 启动P2P网络失败:', error);
      throw error;
    }
  }

  /**
   * 设置协议相关的订阅频道
   */
  setupSubscriptions() {
    // 全局威胁情报频道
    this.p2pNode.subscribe('orasrs-global-threat-intel', (message) => {
      console.log('🚨 收到威胁情报:', message);
      // 处理威胁情报消息
      this.handleThreatIntel(message);
    });

    // 节点状态频道
    this.p2pNode.subscribe('orasrs-node-status', (message) => {
      console.log('📊 收到节点状态:', message);
      // 更新节点状态
      this.updateNodeStatus(message);
    });

    // 治理提案频道
    this.p2pNode.subscribe('orasrs-governance', (message) => {
      console.log('🏛️ 收到治理提案:', message);
      // 处理治理消息
      this.handleGovernanceMessage(message);
    });
  }

  /**
   * 处理威胁情报消息
   */
  handleThreatIntel(message) {
    try {
      const threatData = JSON.parse(message);
      // 实现威胁情报处理逻辑
      console.log('处理威胁情报:', threatData);
    } catch (error) {
      console.error('解析威胁情报失败:', error);
    }
  }

  /**
   * 更新节点状态
   */
  updateNodeStatus(message) {
    try {
      const statusData = JSON.parse(message);
      // 更新本地节点状态缓存
      console.log('更新节点状态:', statusData);
    } catch (error) {
      console.error('解析节点状态失败:', error);
    }
  }

  /**
   * 处理治理消息
   */
  handleGovernanceMessage(message) {
    try {
      const governanceData = JSON.parse(message);
      // 实现治理消息处理逻辑
      console.log('处理治理消息:', governanceData);
    } catch (error) {
      console.error('解析治理消息失败:', error);
    }
  }

  /**
   * 发布威胁情报到网络
   */
  async publishThreatIntel(threatData) {
    const message = JSON.stringify({
      ...threatData,
      timestamp: Date.now(),
      publisher: this.p2pNode.node?.peerId?.toString() || 'unknown'
    });
    
    await this.p2pNode.publish('orasrs-global-threat-intel', message);
    console.log('📤 威胁情报已发布到网络');
  }

  /**
   * 发布节点状态到网络
   */
  async publishNodeStatus(statusData) {
    const message = JSON.stringify({
      ...statusData,
      timestamp: Date.now(),
      nodeId: this.p2pNode.node?.peerId?.toString() || 'unknown'
    });
    
    await this.p2pNode.publish('orasrs-node-status', message);
    console.log('📤 节点状态已发布到网络');
  }

  /**
   * 在DHT中注册自己为内容提供者
   */
  async registerAsProvider(contentId) {
    await this.p2pNode.announceContent(contentId);
    console.log(`📢 已注册为内容 ${contentId} 的提供者`);
  }

  /**
   * 在DHT中查找内容提供者
   */
  async findContentProviders(contentId) {
    // 这里应该返回找到的节点地址
    console.log(`🔍 在DHT中查找内容 ${contentId} 的提供者`);
    // 实际实现中会调用DHT查找
    return [];
  }
}

// 使用示例
async function main() {
  const network = new OraSRSNetwork();
  
  try {
    await network.startNetwork();
    
    // 示例：发布一条节点状态
    setTimeout(async () => {
      await network.publishNodeStatus({
        status: 'online',
        cpu: 25,
        memory: 60,
        network: 'good'
      });
    }, 5000);
    
    // 示例：注册为某个内容的提供者
    setTimeout(async () => {
      await network.registerAsProvider('threat-intel-feed-1');
    }, 10000);
    
  } catch (error) {
    console.error('网络启动失败:', error);
  }
}

if (require.main === module) {
  main();
}

module.exports = { OraSRSNetwork };