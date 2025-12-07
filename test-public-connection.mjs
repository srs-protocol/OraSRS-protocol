// 测试连接到公网api.orasrs.net
import pkg from 'hardhat';
const { ethers } = pkg;

async function testPublicConnection() {
  console.log("测试连接到公网api.orasrs.net...");

  try {
    // 连接到公网节点
    const provider = new ethers.JsonRpcProvider("https://api.orasrs.net");
    
    // 获取网络信息
    const network = await provider.getNetwork();
    console.log("已连接到网络:", network.name, " chainId:", network.chainId);

    // 尝试连接到NodeRegistry合约
    const contractAddress = "0x0B306BF915C4d645ff596e518fAf3F9669b97016";
    
    // 创建合约ABI（简化版）
    const contractABI = [
      "function registerNode(string memory _ip, uint16 _port) public",
      "function getNodes() public view returns (tuple(string ip, uint16 port, address wallet)[] memory)"
    ];
    
    const nodeRegistry = new ethers.Contract(contractAddress, contractABI, provider);
    
    // 尝试读取节点列表
    console.log("\n尝试读取节点列表...");
    const nodes = await nodeRegistry.getNodes();
    console.log("节点数量:", nodes.length);
    
    console.log("公网连接测试完成！");
  } catch (error) {
    console.log("连接到公网节点可能失败，这可能是由于合约尚未部署到公网或网络配置问题。");
    console.log("错误详情:", error.message);
  }
}

testPublicConnection()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
