// 客户端P2P连接功能测试
import pkg from 'hardhat';
const { ethers } = pkg;

async function testP2PConnection() {
  console.log("测试客户端P2P连接功能...");

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

  // 说明P2P连接的实现逻辑
  console.log("\n=== P2P连接层实现说明 ===");
  console.log("1. 客户端SDK需要实现以下功能:");
  console.log("   - 从区块链读取节点列表");
  console.log("   - 尝试连接到每个节点");
  console.log("   - 检查节点的可用性");
  console.log("   - 维护P2P连接");

  console.log("\n2. 在Rust客户端中需要添加网络连接代码，类似:");
  console.log("   use tokio::net::TcpStream;");
  console.log("   use std::net::SocketAddr;");
  console.log("   ");
  console.log("   async fn connect_to_node(ip: &str, port: u16) -> Result<TcpStream, Box<dyn std::error::Error>> {");
  console.log("       let addr = format!(\"{}:{}\", ip, port);");
  console.log("       let stream = TcpStream::connect(addr).await?;");
  console.log("       Ok(stream)");
  console.log("   };");

  console.log("\n✓ P2P通信层实现需要在客户端SDK中完成");
  console.log("  目前我们已经验证了可以从合约获取节点信息，下一步是实现真正的连接逻辑。");

  return nodes;
}

testP2PConnection()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
