#!/usr/bin/env node

import { SimpleOraSRSNetwork } from './SimpleOraSRSNetwork.mjs';

async function startOraSRSNetwork() {
  console.log('🚀 启动 OraSRS P2P 网络...');
  console.log('📋 混合架构: Kademlia DHT + GossipSub PubSub');
  console.log('🔗 结合区块链 NodeRegistry 进行节点发现');
  console.log('');

  const network = new SimpleOraSRSNetwork();

  try {
    // 启动网络
    await network.startNetwork();

    console.log('');
    console.log('✅ OraSRS P2P网络成功启动！');
    console.log('');
    console.log('📋 网络架构说明:');
    console.log('   - Kademlia DHT: 负责节点发现与内容路由 (慢速、准确)');
    console.log('   - GossipSub PubSub: 负责实时消息传递 (快速、高吞吐)');
    console.log('   - 区块链 NodeRegistry: 提供初始引导节点');
    console.log('');
    
    // 模拟网络运行
    console.log('🔄 网络正在运行... (按 Ctrl+C 停止)');

    // 设置退出处理
    process.on('SIGINT', async () => {
      console.log('\n🛑 正在关闭 OraSRS P2P 网络...');
      // 这以添加清理逻辑
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ 启动失败:', error);
    process.exit(1);
  }
}

// 运行网络
startOraSRSNetwork();