# SecurityRiskAssessment 协议智能合约安全测试指南

## 目录
1. [概述](#概述)
2. [安全测试方法论](#安全测试方法论)
3. [静态分析测试](#静态分析测试)
4. [动态测试](#动态测试)
5. [渗透测试](#渗透测试)
6. [国密算法特有安全测试](#国密算法特有安全测试)
7. [测试环境配置](#测试环境配置)
8. [常见漏洞及防护](#常见漏洞及防护)
9. [安全审计清单](#安全审计清单)

## 概述

本指南详细介绍了如何对 SecurityRiskAssessment 国密版质押合约进行全面的安全测试。SecurityRiskAssessment 协议智能合约是一个支持国密算法的质押系统，需要特别关注密码学算法的安全性和合约逻辑的正确性。

### 安全测试目标
- 验证合约逻辑的正确性
- 发现潜在的安全漏洞
- 确保国密算法的正确实现
- 验证权限控制机制
- 测试异常情况处理

## 安全测试方法论

### 测试层次
1. **代码审查** - 人工代码审查
2. **静态分析** - 工具辅助分析
3. **动态测试** - 运行时行为验证
4. **渗透测试** - 模拟攻击场景
5. **形式化验证** - 数学证明（可选）

### 测试原则
- 多工具交叉验证
- 端到端测试场景
- 边界条件测试
- 异常输入测试

## 静态分析测试

### 工具配置
使用以下工具进行静态分析：

#### Slither
```bash
# 基础安全检测
slither . --filter-paths "node_modules|test|script"

# 详细报告
slither contracts/OraSRSGovernance.sol --print human-summary

# 检查特定问题
slither-check-upgradeability contracts/OraSRSGovernance.sol
```

#### Mythril
```bash
# 符号执行分析
myth analyze contracts/OraSRSGovernance.sol --max-depth 15

# 生成交互式图形
myth analyze contracts/OraSRSGovernance.sol --graph /tmp/graph.html
```

#### Solhint
```bash
# 代码风格和安全检查
npx solhint 'contracts/**/*.sol'
```

### 静态分析检查点

#### 1. 重入攻击
```solidity
// 确保使用 Checks-Effects-Interactions 模式
function withdraw() external {
    uint256 amount = pendingWithdrawals[msg.sender];
    require(amount > 0, "No pending withdrawal");
    
    pendingWithdrawals[msg.sender] = 0;  // Effects before interactions
    
    (bool success, ) = payable(msg.sender).call{value: amount}("");
    require(success, "Withdrawal failed");
}
```

#### 2. 整数溢出/下溢
```solidity
// 使用 SafeMath 或启用编译器检查
pragma solidity ^0.8.0;  // 自动启用溢出检查
```

#### 3. 前瞻攻击
```solidity
// 避免使用易受攻击的随机源
block.timestamp  // 不安全
block.difficulty // 不安全
```

## 动态测试

### Foundry 测试框架

#### 安装 Foundry
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

#### 基础测试结构
```solidity
// test/SRA-security.t.sol
import "forge-std/Test.sol";
import "../contracts/OraSRSGovernance.sol";

contract OrasrsSecurityTest is Test {
    OrasrsStakingGmContract public stakingContract;
    
    function setUp() public {
        stakingContract = new OrasrsStakingGmContract(address(1));
    }
    
    function testReentrancyProtection() public {
        // 测试重入防护
    }
    
    function testAccessControl() public {
        // 测试权限控制
    }
}
```

### 重要测试场景

#### 1. 重入攻击测试
```solidity
contract ReentrancyAttacker {
    OrasrsStakingGmContract public target;
    
    constructor(address _target) {
        target = OrasrsStakingGmContract(_target);
    }
    
    function attack() public payable {
        // 攻击逻辑
    }
    
    receive() external payable {
        // 重入点
        if (address(target).balance >= 1 ether) {
            // 尝试再次提取
        }
    }
}
```

#### 2. 权限控制测试
```solidity
function testAccessControl() public {
    // 非授权地址不应能执行敏感操作
    vm.expectRevert();
    stakingContract.pauseContract();
    
    // 授权地址应该能执行
    vm.prank(governance);
    stakingContract.pauseContract();
}
```

#### 3. 边界条件测试
```solidity
function testBoundaryConditions() public {
    // 测试最大值
    vm.deal(node1, type(uint256).max);
    
    vm.expectRevert();
    stakingContract.stakeWithGmSign(
        "overflow-test",
        type(uint256).max,
        hex"",
        bytes32(0),
        1,
        "license_hash_1",
        "filing_hash_1",
        0
    );
}
```

### Hardhat 测试框架

#### 基础测试设置
```javascript
// test/SRA-security.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OrasrsStakingGmContract Security Tests", function () {
  let stakingContract;
  let governance, node1, attacker, validator;

  beforeEach(async function () {
    [governance, node1, attacker, validator] = await ethers.getSigners();
    
    const StakingContract = await ethers.getContractFactory("OrasrsStakingGmContract");
    stakingContract = await StakingContract.deploy(governance.address);
    await stakingContract.deployed();
    
    await stakingContract.connect(governance).addValidator(validator.address);
  });

  it("Should prevent reentrancy attacks", async function () {
    // 实现重入攻击测试
  });
});
```

## 渗透测试

### 攻击场景模拟

#### 1. 质押金额操纵
```javascript
it("Should prevent stake amount manipulation", async function () {
  // 尝试通过多次交易累积小额质押来规避检查
  await stakingContract.connect(node1).stakeWithGmSign(
    "multi-stake-1",
    ethers.utils.parseEther("5000"),
    "0x",
    ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test")),
    1,
    "license_hash",
    "filing_hash",
    2  // 边缘节点，较低的最小质押要求
  );
  
  // 验证节点类型和质押金额的正确性
});
```

#### 2. 时间依赖攻击
```javascript
it("Should handle time-dependent attacks", async function () {
  // 测试锁定期绕过
  await stakingContract.connect(node1).stakeWithGmSign(
    "timing-attack-node",
    ethers.utils.parseEther("15000"),
    "0x",
    ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test")),
    1,
    "license_hash",
    "filing_hash",
    0
  );
  
  // 立即尝试提取（应该失败）
  await expect(
    stakingContract.connect(node1).requestWithdrawal(5000)
  ).to.be.reverted;
  
  // 等待锁定期后提取（应该成功）
  await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 7天
  await ethers.provider.send("evm_mine");
  
  await stakingContract.connect(node1).requestWithdrawal(5000);
});
```

#### 3. 挑战系统滥用
```javascript
it("Should prevent challenge system abuse", async function () {
  // 设置挑战场景
  await stakingContract.connect(node1).stakeWithGmSign(
    "challenged-node",
    ethers.utils.parseEther("15000"),
    "0x",
    ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test")),
    1,
    "license_hash",
    "filing_hash",
    0
  );
  
  // 恶意节点提交大量无效挑战
  for (let i = 0; i < 100; i++) {
    await stakingContract.connect(attacker).submitCacheChallenge(
      `invalid-cache-key-${i}`,
      "invalid reason",
      "0x"
    );
  }
  
  // 验证合约仍能正常运行
  expect(await stakingContract.getContractStats()).to.not.be.reverted;
});
```

## 国密算法及抗量子算法特有安全测试

### SM2 签名验证测试
由于标准 EVM 不支持国密算法，需要在支持国密的国产联盟链上进行测试：

```javascript
// 在支持国密算法的环境中测试
function testSM2SignatureValidation() {
  // 生成 SM2 密钥对
  const { privateKey, publicKey } = generateSM2KeyPair();
  
  // 创建待签名数据
  const data = "test data for signing";
  const dataHash = sm3Hash(data);
  
  // 生成 SM2 签名
  const signature = signSM2(dataHash, privateKey);
  
  // 在合约中验证签名（概念性）
  // 实际测试需要在支持国密的链上执行
}
```

### SM3 哈希算法测试
```javascript
function testSM3HashConsistency() {
  // 测试不同输入的哈希值一致性
  const testCases = [
    { input: "", expected: "1ab21d8355cfa17f8e61194831e81a8f22bec8c728fefb747ed035eb5082aa2b" },
    { input: "abc", expected: "66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0" }
  ];
  
  for (const testCase of testCases) {
    const result = sm3Hash(testCase.input);
    expect(result).to.equal(testCase.expected);
  }
}

### 抗量子算法测试
function testPostQuantumSignatureValidation() {
  // 生成 Lamport 密钥对
  const { privateKey, publicKey } = generateLamportKeyPair();
  const message = "test data for post-quantum signature";
  const messageHash = keccak256(message);
  
  // 生成 Lamport 签名
  const signature = generateLamportSignature(messageHash, privateKey);
  
  // 验证 Lamport 签名
  const isValid = verifyLamportSignature(messageHash, signature, publicKey);
  assertTrue(isValid);
}

### KYBER 加密算法测试
function testKyberEncryption() {
  // 生成 KYBER 密钥对
  const { publicKey, privateKey } = generateKyberKeyPair();
  const plaintext = "test data for kyber encryption";
  
  // 使用 KYBER 公钥加密
  const ciphertext = kyberEncrypt(plaintext, publicKey);
  
  // 使用 KYBER 私钥解密
  const decrypted = kyberDecrypt(ciphertext, privateKey);
  
  assertEq(plaintext, decrypted);
}

### 混合加密方案测试
function testHybridEncryption() {
  // 生成传统加密密钥和抗量子加密密钥
  const traditionalKey = generateSM4Key();
  const pqKey = generateKyberPublicKey();
  const data = "test data for hybrid encryption";
  
  // 使用混合方案加密
  const encrypted = hybridEncrypt(data, traditionalKey, pqKey);
  
  // 使用混合方案解密
  const decrypted = hybridDecrypt(encrypted, traditionalKey, pqKey);
  
  assertEq(data, decrypted);
}
```

### 国密算法集成测试
```solidity
function testGmAlgorithmIntegration() public {
  // 测试国密算法库函数
  bytes32 hashResult = performSm3Hash("test data");  // 使用内部实现或预编译合约
  assertTrue(hashResult != bytes32(0));
  
  // 测试营业执照验证
  assertTrue(validateBusinessLicense("91110000000000000X"));  // 使用内部验证函数
  assertFalse(validateBusinessLicense("invalid"));  // 使用内部验证函数
  
  // 测试备案号验证
  assertTrue(validateFilingNumber("京网信备123456789012345678号"));  // 使用内部验证函数
}

### 抗量子算法集成测试
function testPostQuantumAlgorithmIntegration() public {
  // 测试抗量子算法库函数
  bytes memory privateKey = new bytes(16384); // Lamport私钥大小
  // 初始化私钥...
  
  bytes memory publicKey = PostQuantumCrypto.lamportGeneratePublicKey(privateKey);
  assertTrue(publicKey.length > 0);
  
  bytes32 message = keccak256("test message for pq crypto");
  bytes memory signature = PostQuantumCrypto.lamportSign(message, privateKey);
  
  bool isValid = PostQuantumCrypto.lamportVerify(message, signature, publicKey);
  assertTrue(isValid);
}
```

## 测试环境配置

### 开发环境设置
```bash
# 安装依赖
npm install --save-dev hardhat @nomiclabs/hardhat-ethers ethers @nomiclabs/hardhat-waffle ethereum-waffle chai

# 或使用 Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 本地测试节点
```bash
# 使用 Anvil（Foundry 的测试节点）
anvil

# 或使用 Hardhat Network
npx hardhat node
```

### 配置文件
```javascript
// hardhat.config.js
require("@nomiclabs/hardhat-waffle");

module.exports = {
  solidity: "0.8.0",
  networks: {
    hardhat: {
      // 硬件配置
    },
    localhost: {
      url: "http://127.0.0.1:8545"
    }
  },
  mocha: {
    timeout: 50000
  }
};
```

## 常见漏洞及防护

### 1. 重入攻击
**漏洞示例：**
```solidity
// 危险的代码模式
function withdraw() external {
    uint256 amount = pendingWithdrawals[msg.sender];
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
    pendingWithdrawals[msg.sender] = 0;  // 在转账后更新状态
}
```

**防护措施：**
```solidity
// 安全的代码模式
function withdraw() external {
    uint256 amount = pendingWithdrawals[msg.sender];
    pendingWithdrawals[msg.sender] = 0;  // 先更新状态
    (bool success, ) = payable(msg.sender).call{value: amount}("");
    require(success, "Transfer failed");
}
```

### 2. 整数溢出
**防护措施：**
```solidity
// 使用 Solidity 0.8.0+ 的内置检查
function addStake(uint256 amount) external {
    // 自动检查溢出
    nodes[msg.sender].stakeAmount += amount;
}

// 或使用 SafeMath 库（0.8.0以下版本）
using SafeMath for uint256;
```

### 3. 前瞻攻击
**防护措施：**
```solidity
// 避免使用易受攻击的随机源
// 不要使用：
block.timestamp
block.difficulty
block.gaslimit

// 考虑使用：
// Chainlink VRF
// 未来的区块哈希（需要用户提供）
```

### 4. 权限控制绕过
**防护措施：**
```solidity
// 使用明确的权限控制修饰符
modifier onlyGovernance() {
    require(msg.sender == governanceCommittee, "Only governance can call this function");
    _;
}

modifier onlyValidator() {
    require(authorizedValidators[msg.sender], "Only authorized validators can call this function");
    _;
}
```

### 5. 国密算法实现漏洞
**防护措施：**
- 使用经过验证的国密算法库
- 避免纯软件实现以防止侧信道攻击
- 定期更新算法实现
- 验证输入数据格式

## 安全审计清单

### 代码审查清单
- [ ] 所有外部调用后没有状态更新（重入检查）
- [ ] 所有算术运算都经过溢出/下溢检查
- [ ] 权限控制检查覆盖所有敏感函数
- [ ] 随机数生成不依赖易受攻击的源
- [ ] 事件日志记录所有重要状态变化
- [ ] 转换到 `address payable` 类型时进行验证
- [ ] 验证所有函数参数的有效性
- [ ] 检查数组访问边界
- [ ] 确保合约初始化正确

### 国密算法专项检查
- [ ] SM2 签名验证实现正确
- [ ] SM3 哈希算法实现正确
- [ ] SM4 加密算法实现正确
- [ ] 密钥管理安全
- [ ] 随机数生成安全
- [ ] 符合国家密码标准

### 业务逻辑检查
- [ ] 质押金额验证正确
- [ ] 锁定期限制有效
- [ ] 罚没机制按预期工作
- [ ] 声誉系统计算准确
- [ ] 挑战系统公平有效
- [ ] 治理机制正常运行

### 部署和升级检查
- [ ] 合约部署参数正确
- [ ] 依赖合约地址正确
- [ ] 初始状态设置正确
- [ ] 升级机制安全（如适用）

## 持续安全监控

### 运行时监控
- 监控异常交易模式
- 跟踪合约余额变化
- 监控节点行为异常
- 跟踪挑战频率和结果

### 定期审计
- 每季度进行代码审计
- 每年进行安全评估
- 重大更新前的安全审查
- 依赖库的安全更新检查

---

**注意：** 本指南提供了全面的安全测试框架，但不能保证发现所有漏洞。在部署到生产环境前，建议进行专业的安全审计。