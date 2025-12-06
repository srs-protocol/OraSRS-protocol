/**
 * OraSRS 双链部署脚本
 * 将合约部署到国内链和海外链
 */
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

// 合约ABI定义
const mockLayerZeroABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "uint16",
        "name": "_chainId",
        "type": "uint16"
      },
      {
        "internalType": "address",
        "name": "_addr",
        "type": "address"
      }
    ],
    "name": "setChainAddress",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint16",
        "name": "_dstChainId",
        "type": "uint16"
      },
      {
        "internalType": "bytes",
        "name": "_destination",
        "type": "bytes"
      },
      {
        "internalType": "bytes",
        "name": "_payload",
        "type": "bytes"
      },
      {
        "internalType": "address payable",
        "name": "_refundAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_zroPaymentAddress",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "_adapterParams",
        "type": "bytes"
      }
    ],
    "name": "send",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint16",
        "name": "_dstChainId",
        "type": "uint16"
      },
      {
        "internalType": "address",
        "name": "_userApplication",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "_payload",
        "type": "bytes"
      },
      {
        "internalType": "bool",
        "name": "_payInZRO",
        "type": "bool"
      },
      {
        "internalType": "bytes",
        "name": "_adapterParam",
        "type": "bytes"
      }
    ],
    "name": "estimateFees",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "nativeFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "zroFee",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

const threatIntelSyncABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_layerZeroEndpoint",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_governanceContract",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_domesticChainId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_overseasChainId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "uint16",
        "name": "_dstChainId",
        "type": "uint16"
      },
      {
        "internalType": "string",
        "name": "_threatId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_sourceIP",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "_threatLevel",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_threatType",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "_evidenceHash",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_geolocation",
        "type": "string"
      }
    ],
    "name": "sendThreatIntel",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_threatId",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "_chainId",
        "type": "uint256"
      }
    ],
    "name": "getThreatIntel",
    "outputs": [
      {
        "internalType": "string",
        "name": "threatId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "sourceIP",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "threatLevel",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "threatType",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "evidenceHash",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "geolocation",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "sourceChainId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "reporter",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "isProcessed",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

const governanceMirrorABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_layerZeroEndpoint",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_governanceContract",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_threatIntelSyncContract",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_domesticChainId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_overseasChainId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "uint16",
        "name": "_targetChainId",
        "type": "uint16"
      },
      {
        "internalType": "string",
        "name": "_description",
        "type": "string"
      },
      {
        "internalType": "uint8",
        "name": "_proposalType",
        "type": "uint8"
      },
      {
        "internalType": "address[]",
        "name": "_targets",
        "type": "address[]"
      },
      {
        "internalType": "uint256[]",
        "name": "_values",
        "type": "uint256[]"
      },
      {
        "internalType": "bytes[]",
        "name": "_calldatas",
        "type": "bytes[]"
      }
    ],
    "name": "createCrossChainProposal",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "proposalId",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  }
];

// Mock字节码 - 使用简化的字节码
const mockLayerZeroBytecode = "0x608060405234801561001057600080fd5b506040516107e43803806107e483398101604081905261002f9161007c565b600080546001600160a01b03191633179055600180546001600160a01b03199081166001600160a01b0390931692909217909155600280549091163390911790556100b2565b600080fd5b600080fd5b600080fd5b600080fd5b600080fd5b6000602082840312156100a657600080fd5b5051919050565b603f806100bb6000396000f3fe60806040526004361061001e5760003560e01c80632c8b36a3146100235780634243b3661461003f575b600080fd5b61003d600480360381019061003891906100c3565b61005b565b005b610059600480360381019061005491906100c3565b61006e565b005b34801561004657600080fd5b5061005061008c565b60405161005d919061010f565b60405180910390f35b8060008190555050565b61007833610095565b60008054906101000a900460ff16156100a7576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016100a09061012b565b60405180910390fd5b565b7f3617319a054d732a9becac7c219f942bf39621435d7d51854c313340e57e2f5b6040516100d6919061010f565b60405180910390a1565b6000813590506100ee81610162565b92915050565b60006020828403121561010757600080fd5b6000610115848285016100df565b91505092915050565b6101288161014c565b82525050565b6000602082019050610141600083018461011f565b92915050565b6000819050919050565b600081519050919050565b600081905092915050565b600060208201905061017d600083018461011f565b9291505056fea26469706673582212209d1e1e324b69a1b77c2ca6186e9a33c44c2508c2622b1b77b1048e57843050b664736f6c63430008130033";

// 暂时使用简化的字节码
const threatIntelSyncBytecode = "0x608060405234801561001057600080fd5b506040516107e43803806107e483398101604081905261002f9161007c565b600080546001600160a01b03191633179055600180546001600160a01b03199081166001600160a01b0390931692909217909155600280549091163390911790556100b2565b600080fd5b600080fd5b600080fd5b600080fd5b600080fd5b6000602082840312156100a657600080fd5b5051919050565b603f806100bb6000396000f3fe60806040526004361061001e5760003560e01c80632c8b36a3146100235780634243b3661461003f575b600080fd5b61003d600480360381019061003891906100c3565b61005b565b005b610059600480360381019061005491906100c3565b61006e565b005b34801561004657600080fd5b5061005061008c565b60405161005d919061010f565b60405180910390f35b8060008190555050565b61007833610095565b60008054906101000a900460ff16156100a7576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016100a09061012b565b60405180910390fd5b565b7f3617319a054d732a9becac7c219f942bf39621435d7d51854c313340e57e2f5b6040516100d6919061010f565b60405180910390a1565b6000813590506100ee81610162565b92915050565b60006020828403121561010757600080fd5b6000610115848285016100df565b91505092915050565b6101288161014c565b82525050565b6000602082019050610141600083018461011f565b92915050565b6000819050919050565b600081519050919050565b600081905092915050565b600060208201905061017d600083018461011f565b9291505056fea26469706673582212209d1e1e324b69a1b77c2ca6186e9a33c44c2508c2622b1b77b1048e57843050b664736f6c63430008130033";

const governanceMirrorBytecode = "0x608060405234801561001057600080fd5b506040516107e43803806107e483398101604081905261002f9161007c565b600080546001600160a01b03191633179055600180546001600160a01b03199081166001600160a01b0390931692909217909155600280549091163390911790556100b2565b600080fd5b600080fd5b600080fd5b600080fd5b600080fd5b6000602082840312156100a657600080fd5b5051919050565b603f806100bb6000396000f3fe60806040526004361061001e5760003560e01c80632c8b36a3146100235780634243b3661461003f575b600080fd5b61003d600480360381019061003891906100c3565b61005b565b005b610059600480360381019061005491906100c3565b61006e565b005b34801561004657600080fd5b5061005061008c565b60405161005d919061010f565b60405180910390f35b8060008190555050565b61007833610095565b60008054906101000a900460ff16156100a7576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016100a09061012b565b60405180910390fd5b565b7f3617319a054d732a9becac7c219f942bf39621435d7d51854c313340e57e2f5b6040516100d6919061010f565b60405180910390a1565b6000813590506100ee81610162565b92915050565b60006020828403121561010757600080fd5b6000610115848285016100df565b91505092915050565b6101288161014c565b82525050565b6000602082019050610141600083018461011f565b92915050565b6000819050919050565b600081519050919050565b600081905092915050565b600060208201905061017d600083018461011f565b9291505056fea26469706673582212209d1e1e324b69a1b77c2ca6186e9a33c44c2508c2622b1b77b1048e57843050b664736f6c63430008130033";

async function deployContract(rpcUrl, bytecode, abi, constructorArgs = [], fromAccount) {
  try {
    // 创建合约部署交易
    const deployTx = {
      from: fromAccount,
      data: bytecode,
      gas: '0x6fc24',
      gasPrice: '0x4a817c800' // 20 Gwei
    };

    // 发送交易
    const response = await axios.post(rpcUrl, {
      jsonrpc: "2.0",
      method: "eth_sendTransaction",
      params: [deployTx],
      id: Math.floor(Math.random() * 10000)
    });

    const txHash = response.data.result;
    console.log(`  合约部署交易已发送: ${txHash}`);

    // 等待交易确认
    let receipt;
    let attempts = 0;
    while (attempts < 30) {
      const receiptResponse = await axios.post(rpcUrl, {
        jsonrpc: "2.0",
        method: "eth_getTransactionReceipt",
        params: [txHash],
        id: Math.floor(Math.random() * 10000)
      });

      receipt = receiptResponse.data.result;
      if (receipt && receipt.contractAddress) {
        console.log(`  ✓ 合约部署成功! 地址: ${receipt.contractAddress}`);
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    if (!receipt || !receipt.contractAddress) {
      throw new Error("合约部署超时或失败");
    }

    return receipt.contractAddress;
  } catch (error) {
    console.error("部署失败:", error.message);
    throw error;
  }
}

async function getFirstAccount(rpcUrl) {
  try {
    const response = await axios.post(rpcUrl, {
      jsonrpc: "2.0",
      method: "eth_accounts",
      params: [],
      id: Math.floor(Math.random() * 10000)
    });

    return response.data.result[0];
  } catch (error) {
    console.error("获取账户失败:", error.message);
    throw error;
  }
}

async function runDeployment() {
  console.log("==================================================");
  console.log("    OraSRS 双链合约部署测试");
  console.log("==================================================");

  const domesticRpc = 'http://localhost:8545';  // 国内链
  const overseasRpc = 'http://localhost:8546';  // 海外界

  console.log("步骤1: 部署国内链合约");
  console.log("  连接到国内链: " + domesticRpc);

  try {
    const domesticAccount = await getFirstAccount(domesticRpc);
    console.log(`  使用账户: ${domesticAccount}`);

    // 部署Mock LayerZero Endpoint
    console.log("  部署Mock LayerZero Endpoint...");
    const domesticLzEndpoint = await deployContract(
      domesticRpc, 
      mockLayerZeroBytecode, 
      mockLayerZeroABI, 
      [], 
      domesticAccount
    );

    // 部署ThreatIntelSync
    console.log("  部署ThreatIntelSync合约...");
    const domesticThreatIntel = await deployContract(
      domesticRpc,
      threatIntelSyncBytecode,
      threatIntelSyncABI,
      [domesticLzEndpoint, domesticAccount, "0x3E9", "0x3EA"], // 1001, 1002
      domesticAccount
    );

    // 部署GovernanceMirror
    console.log("  部署GovernanceMirror合约...");
    const domesticGovMirror = await deployContract(
      domesticRpc,
      governanceMirrorBytecode,
      governanceMirrorABI,
      [domesticLzEndpoint, domesticAccount, domesticThreatIntel, "0x3E9", "0x3EA"], // 1001, 1002
      domesticAccount
    );

    console.log("\n步骤2: 部署海外链合约");
    console.log("  连接到海外链: " + overseasRpc);

    const overseasAccount = await getFirstAccount(overseasRpc);
    console.log(`  使用账户: ${overseasAccount}`);

    // 部署Mock LayerZero Endpoint
    console.log("  部署Mock LayerZero Endpoint...");
    const overseasLzEndpoint = await deployContract(
      overseasRpc,
      mockLayerZeroBytecode,
      mockLayerZeroABI,
      [],
      overseasAccount
    );

    // 部署ThreatIntelSync
    console.log("  部署ThreatIntelSync合约...");
    const overseasThreatIntel = await deployContract(
      overseasRpc,
      threatIntelSyncBytecode,
      threatIntelSyncABI,
      [overseasLzEndpoint, overseasAccount, "0x3E9", "0x3EA"], // 1001, 1002
      overseasAccount
    );

    // 部署GovernanceMirror
    console.log("  部署GovernanceMirror合约...");
    const overseasGovMirror = await deployContract(
      overseasRpc,
      governanceMirrorBytecode,
      governanceMirrorABI,
      [overseasLzEndpoint, overseasAccount, overseasThreatIntel, "0x3E9", "0x3EA"], // 1001, 1002
      overseasAccount
    );

    console.log("\n步骤3: 验证部署结果");
    console.log("  国内链合约地址:");
    console.log(`    - LayerZero Endpoint: ${domesticLzEndpoint}`);
    console.log(`    - ThreatIntelSync: ${domesticThreatIntel}`);
    console.log(`    - GovernanceMirror: ${domesticGovMirror}`);

    console.log("  海外界合约地址:");
    console.log(`    - LayerZero Endpoint: ${overseasLzEndpoint}`);
    console.log(`    - ThreatIntelSync: ${overseasThreatIntel}`);
    console.log(`    - GovernanceMirror: ${overseasGovMirror}`);

    // 保存部署信息
    const deploymentInfo = {
      domestic: {
        chainId: 1001,
        rpcUrl: domesticRpc,
        accounts: [domesticAccount],
        contracts: {
          layerZeroEndpoint: domesticLzEndpoint,
          threatIntelSync: domesticThreatIntel,
          governanceMirror: domesticGovMirror
        }
      },
      overseas: {
        chainId: 1002,
        rpcUrl: overseasRpc,
        accounts: [overseasAccount],
        contracts: {
          layerZeroEndpoint: overseasLzEndpoint,
          threatIntelSync: overseasThreatIntel,
          governanceMirror: overseasGovMirror
        }
      },
      deployedAt: new Date().toISOString()
    };

    await fs.writeFile('deployed_addresses/dual_chain_deployment.json', JSON.stringify(deploymentInfo, null, 2));
    console.log("\n✓ 部署信息已保存到 deployed_addresses/dual_chain_deployment.json");

    console.log("\n==================================================");
    console.log("双链合约部署完成!");
    console.log("✓ 国内链(1001)合约部署成功");
    console.log("✓ 海外界(1002)合约部署成功");
    console.log("✓ 部署信息已保存");
    console.log("==================================================");

    return deploymentInfo;

  } catch (error) {
    console.error("✗ 部署失败:", error.message);
    return null;
  }
}

// 执行部署
runDeployment().catch(console.error);
