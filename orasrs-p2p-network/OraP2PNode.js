const { createLibp2p } = require('libp2p');
const { tcp } = require('@libp2p/tcp');
const { websockets } = require('@libp2p/websockets');
const { noise } = require('@chainsafe/libp2p-noise');
const { yamux } = require('@chainsafe/libp2p-yamux');
const { kadDHT } = require('@libp2p/kad-dht');
const { gossipsub } = require('@chainsafe/libp2p-gossipsub');
const { bootstrap } = require('@libp2p/bootstrap');
const { pubsubPeerDiscovery } = require('@libp2p/pubsub-peer-discovery');

class OraP2PNode {
  constructor() {
    this.node = null;
  }

  // 传入从区块链获取的种子节点列表
  async init(bootstrapList) {
    this.node = await createLibp2p({
      // 1. 传输层: 同时支持 TCP 和 WebSocket (浏览器友好)
      transports: [
        tcp(),
        websockets()
      ],
      // 2. 连接加密与多路复用
      connectionEncryption: [noise()],
      streamMuxers: [yamux()],

      // 3. 混合发现机制
      peerDiscovery: [
        // A. 引导节点发现 (来自区块链的数据)
        bootstrap({
          list: bootstrapList 
        }),
        // B. PubSub 发现 (在局域网或现有连接中发现)
        pubsubPeerDiscovery({
          interval: 1000
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
        // 针对视频流优化的参数
        D: 6,           // 目标网状连接数 (Degree)
        Dlo: 4,         // 最少连接数
        Dhi: 12,        // 最大连接数
        Dscore: 4,      // 分数阈值
        heartbeatInterval: 1000 // 心跳间隔 1s
      })
    });

    // 事件监听
    this.node.addEventListener('peer:discovery', (evt) => {
      console.log('🔍 发现节点:', evt.detail.id.toString());
    });

    this.node.addEventListener('peer:connect', (evt) => {
      console.log('🤝 已连接节点:', evt.detail.toString());
    });

    await this.node.start();
    console.log('🚀 libp2p 节点已启动, PeerID:', this.node.peerId.toString());
  }

  // --- PubSub 功能 --- 
  
  subscribe(topic, callback) {
    this.node.pubsub.subscribe(topic);
    this.node.pubsub.addEventListener('message', (evt) => {
      if (evt.detail.topic === topic) {
        callback(new TextDecoder().decode(evt.detail.data));
      }
    });
    console.log(`📡 已订阅频道: ${topic}`);
  }

  async publish(topic, message) {
    const data = new TextEncoder().encode(message);
    await this.node.pubsub.publish(topic, data);
  }

  // --- DHT 功能 ---

  // 宣称自己持有某个资源 (Provider Record)
  async announceContent(contentHash) {
    // 将 contentHash 转换为 CID (需要引入 multiformats 库)
    // await this.node.contentRouting.provide(cid)
    console.log(`📢 在 DHT 上宣称持有内容: ${contentHash}`);
  }
  
  // 查找谁持有资源
  async findProviders(contentHash) {
    // const providers = this.node.contentRouting.findProviders(cid)
    // return providers
  }
}

module.exports = { OraP2PNode };