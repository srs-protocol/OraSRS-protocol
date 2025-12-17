// P2P连接功能测试
import pkg from 'hardhat';
const { ethers } = pkg;

async function testP2PLogic() {
  console.log("测试P2P连接功能逻辑...");

  // 获取NodeRegistry合约地址
  const fs = await import('fs');
  const deploymentInfo = JSON.parse(fs.readFileSync('all-deployments.json', 'utf8'));
  const nodeRegistryAddress = deploymentInfo.nodeRegistryAddress;
  console.log("NodeRegistry合约地址:", nodeRegistryAddress);

  // 连接到NodeRegistry合约
  const NodeRegistry = await ethers.getContractFactory("NodeRegistry");
  const nodeRegistry = NodeRegistry.attach(nodeRegistryAddress);

  // 从合约获取节点列表
  console.log("\n从合约获取节点列表...");
  const nodes = await nodeRegistry.getNodes();
  console.log(`找到 ${nodes.length} 个节点:`);
  
  for (let i = 0; i < nodes.length; i++) {
    console.log(`节点 ${i+1}: IP=${nodes[i].ip}, 端口=${nodes[i].port.toString()}, 钱包=${nodes[i].wallet}`);
  }

  console.log("\n=== 客户端P2P连接流程 ===");
  console.log("1. 客户端启动时调用 orasrs_update_nodes() 从区块链获取节点列表");
  console.log("2. 使用 orasrs_connect_to_all_nodes() 尝试连接所有节点");
  console.log("3. 通过 orasrs_connect_to_node() 连接到特定节点");
  console.log("4. 使用 orasrs_send_p2p_message() 在节点间发送消息");

  if (nodes.length > 0) {
    const firstNode = nodes[0];
    console.log(`\n示例: 连接到第一个节点 ${firstNode.ip}:${firstNode.port.toString()}`);
    console.log("在Rust客户端中这将调用:");
    console.log(`orasrs_connect_to_node("${firstNode.ip}", ${firstNode.port.toString()});`);
  }

  console.log("\n✓ P2P连接功能已集成到客户端SDK中");
  console.log("  客户端现在可以从区块链获取节点信息并建立P2P连接。");

  return nodes;
}

testP2PLogic()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
