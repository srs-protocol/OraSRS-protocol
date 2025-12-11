// 测试NodeRegistry合约功能
import pkg from 'hardhat';
const { ethers } = pkg;

async function testNodeRegistry() {
  console.log("连接到NodeRegistry合约进行测试...");

  // 获取合约实例
  const nodeRegistryAddress = "0x0B306BF915C4d645ff596e518fAf3F9669b97016";
  const NodeRegistry = await ethers.getContractFactory("NodeRegistry");
  const nodeRegistry = NodeRegistry.attach(nodeRegistryAddress);

  console.log("合约地址:", nodeRegistry.target);

  // 测试注册节点
  console.log("\n1. 注册新节点...");
  const [owner] = await ethers.getSigners();
  const registerTx = await nodeRegistry.registerNode("192.168.1.100", 8080);
  await registerTx.wait();
  console.log("节点注册成功:", registerTx.hash);

  // 查询节点列表
  console.log("\n2. 查询节点列表...");
  const nodes = await nodeRegistry.getNodes();
  console.log("当前节点列表:", nodes);

  // 再注册一个节点
  console.log("\n3. 注册另一个节点...");
  const registerTx2 = await nodeRegistry.registerNode("10.0.0.50", 9000);
  await registerTx2.wait();
  console.log("第二个节点注册成功:", registerTx2.hash);

  // 再次查询节点列表
  console.log("\n4. 再次查询节点列表...");
  const nodesAfter = await nodeRegistry.getNodes();
  console.log("更新后的节点列表:", nodesAfter);

  console.log("\n测试完成！");
}

testNodeRegistry()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
