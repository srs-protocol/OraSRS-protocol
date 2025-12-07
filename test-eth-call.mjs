// 验证客户端可以通过eth_call读取节点信息
import pkg from 'hardhat';
const { ethers } = pkg;

async function verifyEthCall() {
  console.log("验证通过eth_call读取节点信息...");

  // NodeRegistry合约地址
  const nodeRegistryAddress = "0x59b670e9fA9D0A427751Af201D676719a970857b";

  // 获取provider
  const provider = ethers.provider;

  // 计算getNodes()函数的函数选择器
  const functionSignature = "getNodes()";
  const functionSelector = ethers.keccak256(ethers.toUtf8Bytes(functionSignature)).substring(0, 10);

  console.log("函数选择器:", functionSelector);

  // 构造调用数据
  const callData = functionSelector;

  // 创建调用参数
  const tx = {
    to: nodeRegistryAddress,
    data: callData
  };

  try {
    console.log("执行eth_call...");
    const result = await provider.call(tx);
    console.log("✓ eth_call 成功，返回数据:", result);

    // 使用ABI解码结果
    const abi = new ethers.AbiCoder();
    const decoded = abi.decode(
      ["tuple(string ip, uint16 port, address wallet)[]"], 
      result
    );
    
    const nodes = decoded[0];
    console.log("解码后的节点数量:", nodes.length);

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      console.log(`节点 ${i+1}: IP=${node.ip}, 端口=${node.port.toString()}, 钱包=${node.wallet}`);
    }

    console.log("\n✓ eth_call读取验证完成！客户端可以通过eth_call方法从NodeRegistry合约读取节点信息。");
  } catch (error) {
    console.error("✗ eth_call失败:", error);
  }
}

verifyEthCall()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });