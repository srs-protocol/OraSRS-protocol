/**
 * 区块链网络环境测试脚本
 * 测试与本地以太坊节点的连接
 */
import axios from 'axios';

async function testBlockchainConnection() {
  console.log("==================================================");
  console.log("    区块链网络环境测试");
  console.log("==================================================");

  const rpcUrl = 'http://localhost:8545';

  try {
    console.log("测试1: 检查RPC端点连接...");
    
    // 检查节点是否响应
    const response = await axios.post(rpcUrl, {
      jsonrpc: "2.0",
      method: "eth_blockNumber",
      params: [],
      id: 1
    }, {
      timeout: 5000
    });

    if (response.status === 200 && response.data.result) {
      const blockNumber = parseInt(response.data.result, 16);
      console.log(`✓ RPC端点连接成功! 当前区块高度: ${blockNumber}`);
    } else {
      console.log("✗ RPC端点连接失败");
      return false;
    }

    console.log("\n测试2: 获取网络ID...");
    const networkResponse = await axios.post(rpcUrl, {
      jsonrpc: "2.0",
      method: "net_version",
      params: [],
      id: 2
    });

    if (networkResponse.data.result) {
      console.log(`✓ 网络ID: ${networkResponse.data.result}`);
    } else {
      console.log("✗ 获取网络ID失败");
      return false;
    }

    console.log("\n测试3: 获取Gas价格...");
    const gasResponse = await axios.post(rpcUrl, {
      jsonrpc: "2.0",
      method: "eth_gasPrice",
      params: [],
      id: 3
    });

    if (gasResponse.data.result) {
      const gasPrice = parseInt(gasResponse.data.result, 16);
      console.log(`✓ Gas价格: ${gasPrice} wei`);
    } else {
      console.log("✗ 获取Gas价格失败");
      return false;
    }

    console.log("\n测试4: 获取账户列表...");
    const accountsResponse = await axios.post(rpcUrl, {
      jsonrpc: "2.0",
      method: "eth_accounts",
      params: [],
      id: 4
    });

    if (accountsResponse.data.result && accountsResponse.data.result.length > 0) {
      console.log(`✓ 账户数量: ${accountsResponse.data.result.length}`);
      console.log(`✓ 首个账户: ${accountsResponse.data.result[0]}`);
    } else {
      console.log("✗ 获取账户列表失败");
      return false;
    }

    console.log("\n测试5: 检查节点健康状态...");
    const syncResponse = await axios.post(rpcUrl, {
      jsonrpc: "2.0",
      method: "eth_syncing",
      params: [],
      id: 5
    });

    if (syncResponse.data.result === false) {
      console.log("✓ 节点同步状态: 已同步 (非同步中)");
    } else {
      console.log("✗ 节点正在同步或状态异常");
    }

    console.log("\n==================================================");
    console.log("区块链节点连接测试完成!");
    console.log("✓ 所有连接测试通过");
    console.log("==================================================");
    
    return true;

  } catch (error) {
    console.error("✗ 区块链节点连接测试失败:", error.message);
    return false;
  }
}

// 执行测试
testBlockchainConnection().catch(console.error);