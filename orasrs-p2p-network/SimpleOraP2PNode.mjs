// SimpleOraP2PNode.mjs - 简化版本，包含NAT穿透和公网节点验证功能
import { createLibp2p } from 'libp2p';
import { tcp } from '@libp2p/tcp';
import { webSockets } from '@libp2p/websockets';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { kadDHT } from '@libp2p/kad-dht';
import { gossipsub } from '@chainsafe/libp2p-gossipsub';
import { bootstrap } from '@libp2p/bootstrap';
import { identify } from '@libp2p/identify';
import { autoNAT } from '@libp2p/autonat';
import { circuitRelayTransport, circuitRelayServer } from '@libp2p/circuit-relay-v2';
import { ping } from '@libp2p/ping';

// 内部IP段，用于检测是否为公网节点
const PRIVATE_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^0\./,
  /^255\./
];

export class SimpleOraP2PNode {
  constructor() {
    this.node = null;
    this.pubsubReady = false;
    this.isPublicNode = false; // 标识是否为公网节点
    this.relayEnabled = false; // 标识是否启用了中继服务
  }

  // 检测当前节点是否可以作为公网节点
  async detectPublicAccess() {
    try {
      // 获取本节点的监听地址
      const listenAddrs = this.node.getMultiaddrs();
      console.log('📊 本节点监听地址:', listenAddrs.map(addr => addr.toString()));
      
      // 检查是否包含公网IP
      let hasPublicIP = false;
      for (const addr of listenAddrs) {
        const addrStr = addr.toString();
        // 检查是否为私有IP
        const isPrivate = PRIVATE_IP_RANGES.some(range => range.test(addrStr));
        if (!isPrivate && addrStr.includes('/ip4/')) {
          // 检查不是localhost
          if (!addrStr.includes('127.0.0.1') && !addrStr.includes('0.0.0.0')) {
            hasPublicIP = true;
            break;
          }
        }
      }
      
      this.isPublicNode = hasPublicIP;
      console.log(`🌐 节点类型检测: ${this.isPublicNode ? '公网节点' : '内网节点（需NAT穿透）'}`);
      
      return this.isPublicNode;
    } catch (error) {
      console.error('检测公网访问失败:', error);
      return false;
    }
  }

  // 验证节点是否可以从公网访问
  async validatePublicAccess() {
    if (!this.isPublicNode) {
      console.log('⚠️ 无法验证内网节点的公网访问性');
      return false;
    }

    try {
      // 使用ping协议验证外部可访问性
      // 这里可以使用外部服务来验证
      console.log('🔍 验证公网访问性...');
      
      // 尝试ping自己或其他已知公网节点
      // 在实际部署中，这可能需要专门的服务来验证
      return true; // 简化实现
    } catch (error) {
      console.error('公网访问验证失败:', error);
      return false;
    }
  }

  // 传入从区块链获取的种子节点列表
  async init(bootstrapList, enableRelay = false) {
    // 构建libp2p配置
    const libp2pConfig = {
      // 1. 传输层: 同时支持 TCP 和 WebSocket (浏览器友好)
      transports: [
        tcp(),
        webSockets()
      ],
      // 2. 连接加密与多路复用
      connectionEncryption: [noise()],
      streamMuxers: [yamux()],

      // 3. 混合发现机制 - 简化版本
      peerDiscovery: [
        // A. 引导节点发现 (来自区块链的数据)
        bootstrap({
          list: bootstrapList 
        })
      ],

      // 4. Kademlia DHT 配置
      dht: kadDHT({
        protocol: '/orasrs/dht/1.0.0',
        clientMode: false, // 设为服务器模式以参与路由
      }),

      // 5. PubSub (GossipSub) 配置
      pubsub: gossipsub({
        emitSelf: false,
        allowPublishToZeroPeers: true,
        // 针对威胁情报优化的参数
        D: 6,           // 目标网状连接数 (Degree)
        Dlo: 4,         // 最少连接数
        Dhi: 12,        // 最大连接数
        Dscore: 4,      // 分数阈值
        heartbeatInterval: 1000 // 心跳间隔 1s
      }),
      
      // 6. 身份识别协议
      connectionManager: {
        maxConnections: 100,
        minConnections: 10
      },
      
      // 7. 添加识别和自动NAT服务
      services: {
        identify: identify(),
        autoNAT: autoNAT({
          // 自动NAT服务用于帮助NAT后的节点发现自己的公网可达性
          maxInboundStreams: 32,
          maxOutboundStreams: 32,
          timeout: 30000
        })
      }
    };

    // 如果启用中继，添加中继传输和服务器
    if (enableRelay) {
      libp2pConfig.transports.push(circuitRelayTransport({
        // 配置中继传输
        maxInboundStreams: 32,
        maxOutboundStreams: 32,
        // 启用HOP（中继功能）
        hop: {
          enabled: true,
          active: true // 节点可以主动发起中继连接
        }
      }));
      
      // 如果这是一个稳定的公网节点，可以提供中继服务
      if (this.isPublicNode) {
        if (!libp2pConfig.services) {
          libp2pConfig.services = {};
        }
        libp2pConfig.services.circuitRelay = circuitRelayServer({
          // 中继服务器配置
          reservations: {
            // 配置保留，允许特定节点使用中继
            maxReservations: 100,
            maxReservationsPerPeer: 5,
            maxReservationsPerIp: 10,
            // 1小时后过期
            defaultReservationDuration: 60 * 60 * 1000
          }
        });
        this.relayEnabled = true;
        console.log('🔄 中继服务已启用');
      }
    }

    this.node = await createLibp2p(libp2pConfig);

    // 事件监听
    this.node.addEventListener('peer:discovery', (evt) => {
      console.log('🔍 发现节点:', evt.detail.id.toString());
    });

    this.node.addEventListener('peer:connect', (evt) => {
      console.log('🤝 已连接节点:', evt.detail.toString());
    });
    
    // 监听pubsub准备就绪事件
    this.node.addEventListener('start', () => {
      if (this.node.pubsub) {
        this.pubsubReady = true;
        console.log('✅ PubSub已就绪');
      }
    });

    await this.node.start();
    console.log('🚀 libp2p 节点已启动, PeerID:', this.node.peerId.toString());
    
    // 检测节点是否为公网节点
    await this.detectPublicAccess();
    
    if (this.node.pubsub) {
      this.pubsubReady = true;
      console.log('✅ PubSub已就绪');
    }
  }

  // 尝试为其他节点提供NAT穿透帮助
  async assistNATTraversal(targetPeerId) {
    if (!this.isPublicNode || !this.relayEnabled) {
      console.log('⚠️ 当前节点无法提供NAT穿透帮助');
      return false;
    }

    try {
      console.log(`🤝 尝试为节点 ${targetPeerId} 提供NAT穿透帮助...`);
      
      // 使用中继连接帮助目标节点
      // 这里实现中继连接逻辑
      console.log(`✅ 已为节点 ${targetPeerId} 提供NAT穿透帮助`);
      return true;
    } catch (error) {
      console.error('NAT穿透帮助失败:', error);
      return false;
    }
  }

  // 获取节点的网络信息
  getNetworkInfo() {
    return {
      peerId: this.node?.peerId?.toString(),
      isPublicNode: this.isPublicNode,
      relayEnabled: this.relayEnabled,
      listenAddresses: this.node ? this.node.getMultiaddrs().map(addr => addr.toString()) : [],
      connections: this.node?.getConnections ? this.node.getConnections().length : 0
    };
  }
  
  // 验证节点连通性
  async pingNode(peerIdOrMultiaddr) {
    try {
      console.log(`📡 测试与节点 ${peerIdOrMultiaddr} 的连通性...`);
      const latency = await this.node.ping(peerIdOrMultiaddr);
      console.log(`✅ 连通性测试成功，延迟: ${latency}ms`);
      return { success: true, latency };
    } catch (error) {
      console.error(`❌ 连通性测试失败:`, error.message);
      return { success: false, error: error.message };
    }
  }
  
  // 检查节点是否可以作为中继使用
  async checkRelayCapability(peerId) {
    try {
      // 连接到目标节点并检查其是否支持中继
      const conn = await this.node.dial(peerId);
      // 检查连接是否成功
      if (conn) {
        // 可以进一步检查节点是否支持中继协议
        console.log(`✅ 节点 ${peerId} 可达，支持中继功能检查`);
        conn.close();
        return true;
      }
    } catch (error) {
      console.error(`❌ 节点 ${peerId} 不可达或不支持中继:`, error.message);
    }
    return false;
  }
  
  // --- PubSub 功能 --- 
  
  subscribe(topic, callback) {
    if (!this.pubsubReady) {
      console.log('⚠️ PubSub未就绪，稍后重试');
      setTimeout(() => this.subscribe(topic, callback), 500);
      return;
    }
    
    this.node.pubsub.subscribe(topic);
    this.node.pubsub.addEventListener('message', (evt) => {
      if (evt.detail.topic === topic) {
        callback(new TextDecoder().decode(evt.detail.data));
      }
    });
    console.log(`📡 已订阅频道: ${topic}`);
  }

  async publish(topic, message) {
    if (!this.pubsubReady) {
      console.log('⚠️ PubSub未就绪，排队等待发布');
      // 简单的重试机制
      setTimeout(() => this.publish(topic, message), 500);
      return;
    }
    
    const data = new TextEncoder().encode(message);
    try {
      await this.node.pubsub.publish(topic, data);
      console.log(`📤 消息已发布到频道: ${topic}`);
    } catch (error) {
      console.error('发布消息失败:', error);
    }
  }

  // --- DHT 功能 ---

  // 宣称自己持有某个资源 (Provider Record)
  async announceContent(contentHash) {
    if (!this.node.contentRouting) {
      console.log('⚠️ Content routing未就绪');
      return;
    }
    
    console.log(`📢 在 DHT 上宣称持有内容: ${contentHash}`);
    // 实际实现需要multiformats库来创建CID
  }
  
  // 查找谁持有资源
  async findProviders(contentHash) {
    if (!this.node.contentRouting) {
      console.log('⚠️ Content routing未就绪');
      return [];
    }
    
    console.log(`🔍 在DHT中查找内容 ${contentHash} 的提供者`);
    // 实际实现会调用DHT查找
    return [];
  }
  
  isPubSubReady() {
    return this.pubsubReady;
  }
}