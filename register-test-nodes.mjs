// 注册测试节点到NodeRegistry合约
import pkg from 'hardhat';
const { ethers } = pkg;

async function registerTestNodes() {
  console.log("开始注册测试节点到NodeRegistry合约...");

  const [owner] = await ethers.getSigners();
  console.log("操作账户:", owner.address);

  // NodeRegistry合约地址
  const nodeRegistryAddress = "0x59b670e9fA9D0A427751Af201D676719a970857b";

  // 连接到NodeRegistry合约
  const NodeRegistry = await ethers.getContractFactory("NodeRegistry");
  const nodeRegistry = NodeRegistry.attach(nodeRegistryAddress);

  // 要注册的测试节点列表
  const testNodes = [
    { ip: "127.0.0.1", port: 3000 },
    { ip: "192.168.1.100", port: 8080 },
    { ip: "10.0.0.50", port: 9000 },
    { ip: "8.8.8.8", port: 53 },
    { ip: "1.1.1.1", port: 53 }
  ];

  console.log("准备注册", testNodes.length, "个测试节点...");
  
  for (let i = 0; i < testNodes.length; i++) {
    const node = testNodes[i];
    console.log(`注册节点 ${i+1}/${testNodes.length}: ${node.ip}:${node.port}`);
    
    const registerTx = await nodeRegistry.registerNode(node.ip, node.port);
    await registerTx.wait();
    console.log("✓ 节点注册成功:", node.ip, ":", node.port);
  }

  // 查询所有已注册的节点
  console.log("\n查询所有已注册节点...");
  const nodes = await nodeRegistry.getNodes();
  console.log("当前节点数量:", nodes.length);
  
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    console.log(`节点 ${i+1}: IP=${node.ip}, 端口=${node.port.toString()}, 钱包=${node.wallet}`);
  }

  console.log("\n✓ 所有测试节点注册完成！");
}

registerTestNodes()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });