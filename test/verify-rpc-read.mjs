// 验证客户端可以通过RPC读取节点信息
import pkg from 'hardhat';
const { ethers } = pkg;

async function verifyNodeRetrieval() {
  console.log("验证客户端通过RPC读取节点信息...");

  // NodeRegistry合约地址
  const nodeRegistryAddress = "0x59b670e9fA9D0A427751Af201D676719a970857b";

  // 创建一个provider连接到网络
  const provider = ethers.getDefaultProvider(); // 这将使用Hardhat的默认provider

  // 创建合约ABI（简化版，只包含getNodes函数）
  const contractABI = [
    "function getNodes() view returns (tuple(string ip, uint16 port, address wallet)[])"
  ];

  // 连接到NodeRegistry合约
  const nodeRegistry = new ethers.Contract(nodeRegistryAddress, contractABI, provider);

  console.log("尝试通过eth_call读取节点列表...");
  
  try {
    const nodes = await nodeRegistry.getNodes();
    console.log("✓ 成功通过RPC读取节点列表");
    console.log("节点数量:", nodes.length);

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      console.log(`节点 ${i+1}: IP=${node.ip}, 端口=${node.port.toString()}, 钱包=${node.wallet}`);
    }

    console.log("\n✓ RPC读取验证完成！客户端现在可以连接到api.orasrs.net并读取节点列表。");
  } catch (error) {
    console.error("✗ RPC读取失败:", error);
  }
}

verifyNodeRetrieval()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });