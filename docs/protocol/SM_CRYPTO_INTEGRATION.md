# SecurityRiskAssessment 国密算法集成指南

## 概述

SecurityRiskAssessment 协议支持中国国家密码标准（国密算法），以满足国内合规要求并提高数据安全性。本指南介绍了如何在协议中使用 SM2、SM3 和 SM4 算法。

## 支持的国密算法

### SM2 - 椭圆曲线公钥密码算法
- 用途：数字签名、密钥交换、公钥加密
- 曲线：推荐使用 SM2P256V1 椭圆曲线
- 密钥长度：256 位

### SM3 - 密码杂凑算法
- 用途：消息摘要、数据完整性校验
- 输出长度：256 位
- 与 SHA-256 类似的安全强度

### SM4 - 分组密码算法
- 用途：数据加密、密钥加密
- 分组长度：128 位
- 密钥长度：128 位
- 模式：推荐使用 GCM 或 CBC 模式

## 在 SecurityRiskAssessment 中的应用

### 1. 质押合约中的国密算法

在 `contracts/OraSRSGovernance.sol` 中，我们使用国密算法进行：

- **节点身份验证**：使用 SM2 进行数字签名验证
- **数据完整性**：使用 SM3 进行哈希计算
- **数据加密**：使用 SM4 进行敏感数据加密

### 2. 身份与准入机制

```solidity
// 验证营业执照号（统一社会信用代码）
function validateBusinessLicense(string memory licenseNumber) internal pure returns (bool)

// 验证区块链备案号
function validateFilingNumber(string memory filingNumber) internal pure returns (bool)

// 使用SM3对IP地址进行哈希以保护隐私
function sm3HashIP(string memory ip, string memory salt) internal pure returns (bytes32)
```

### 3. 质押验证流程

1. 节点使用 SM2 签名质押请求
2. 合约使用节点公钥验证签名
3. 使用 SM3 验证数据完整性
4. 质押信息使用 SM4 加密存储（如适用）

## 部署要求

### 链支持
国密算法合约需要部署在支持国密算法的国产联盟链上，例如：
- 长安链（ChainMaker）
- FISCO BCOS
- 其他支持国密算法的联盟链

### 预编译合约
这些链通常提供预编译合约以执行国密算法操作：
- SM2 签名验证预编译合约
- SM3 哈希预编译合约
- SM4 加密预编译合约

## 安全考虑

### 1. 密钥管理
- 节点私钥必须安全存储
- 推荐使用硬件安全模块（HSM）存储私钥
- 定期轮换密钥

### 2. 算法实现
- 使用经过验证的国密算法库
- 避免使用纯软件实现以防止侧信道攻击
- 定期更新算法实现以修复安全漏洞

### 3. 合规性
- 符合《密码法》要求
- 通过国家密码管理局认证
- 满足等保三级要求

## 性能优化

### 1. 批量处理
对多个签名验证请求进行批量处理以提高效率

### 2. 缓存机制
缓存常用的哈希值和验证结果

### 3. 并行计算
在支持的环境中并行执行独立的密码学操作

## 开发指南

### 1. 智能合约开发
```solidity
// 国密算法功能集成在合约内部或通过外部库实现

contract MyContract {
    // 国密算法功能通过内部函数或预编译合约实现
    
    function verifySignature(
        bytes32 message,
        bytes memory signature,
        bytes memory publicKey
    ) public pure returns (bool) {
        return performSm2Verification(message, signature, publicKey);  // 内部实现或预编译合约
    }
    
    function calculateHash(bytes memory data) public pure returns (bytes32) {
        return performSm3Hash(data);  // 内部实现或预编译合约
    }
}
```

### 2. 客户端集成
客户端需要支持国密算法以生成和验证签名：

1. 使用国密算法生成密钥对
2. 使用 SM2 对交易进行签名
3. 使用 SM3 计算数据哈希
4. 验证来自合约的数据完整性

## 与标准密码算法的比较

| 特性 | 国密算法 | 标准算法 | SecurityRiskAssessment 选择 |
|------|----------|----------|-------------|
| 安全性 | 高 | 高 | 高 |
| 合规性 | 高（国内） | 中 | 国密算法 |
| 性能 | 高 | 高 | 依赖实现 |
| 标准化 | 国家标准 | 国际标准 | 国密算法 |

## 注意事项

1. **链兼容性**：国密算法合约只能部署在支持国密算法的链上
2. **性能影响**：国密算法的执行可能比标准算法稍慢
3. **开发工具**：需要使用支持国密算法的开发工具和库
4. **测试环境**：开发和测试时需要相应的国密算法环境

## 未来扩展

- 支持更多国密算法（如 SM9 标识密码）
- 优化国密算法的智能合约实现
- 增强与国产硬件的集成
- 完善国密算法的安全审计流程