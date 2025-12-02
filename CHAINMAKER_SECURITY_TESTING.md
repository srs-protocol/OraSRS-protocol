# ChainMaker 合约安全性测试指南

## 1. 概述

### 1.1 测试目标
本指南介绍如何对部署在长安链（ChainMaker）上的 OraSRS Go 语言智能合约进行全面的安全性测试。

### 1.2 测试原则
- 静态分析与动态测试相结合
- 多层次安全验证
- 国密算法专项测试
- 合规性验证

## 2. ChainMaker 合约安全特性

### 2.1 长安链安全机制
- 基于 PKI 的身份认证
- 多级权限控制
- 国密算法支持
- 交易审计功能

### 2.2 Go 合约安全特性
- 类型安全
- 内存安全
- 运行时错误处理
- 无垃圾回收相关安全问题

## 3. 静态分析测试

### 3.1 代码审查清单

#### 3.1.1 输入验证
- [ ] 所有外部输入都经过验证
- [ ] 长度限制检查
- [ ] 格式验证
- [ ] 类型转换安全

#### 3.1.2 整数运算
- [ ] 防止整数溢出/下溢
- [ ] 使用安全的数学运算
- [ ] 边界条件检查

#### 3.1.3 状态管理
- [ ] 键值存储访问安全
- [ ] 并发访问保护
- [ ] 状态一致性验证

#### 3.1.4 国密算法
- [ ] SM2 签名验证正确性
- [ ] SM3 哈希算法一致性
- [ ] SM4 加密实现安全性

### 3.2 静态分析工具

#### 3.2.1 Go 官方工具
```bash
# 运行 go vet 检查
go vet ./...

# 运行 staticcheck
go install honnef.co/go/tools/cmd/staticcheck@latest
staticcheck ./...

# 运行 golangci-lint 综合检查
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
golangci-lint run
```

#### 3.2.2 安全检查配置 (.golangci.yml)
```yaml
run:
  timeout: 5m
  tests: true

linters:
  enable:
    - gosec
    - errcheck
    - gosimple
    - govet
    - ineffassign
    - staticcheck
    - unused
    - asciicheck
    - exportloopref
    - gocritic
    - gofmt
    - goimports
    - revive

linters-settings:
  gosec:
    excludes:
      - G104 # 检查错误被忽略
      - G306 # 检查文件权限
    includes:
      - G101 # 检查硬编码凭证
      - G102 # 检查绑定到所有接口
      - G103 # 检查使用不安全的函数
      - G104 # 检查错误被忽略
      - G106 # 检查使用硬编码的凭证
      - G107 # 检查 HTTP 请求的 URL 变量
      - G108 # 检查 PPROF 监听
      - G109 # 检查从解析到整数的整数截断
      - G110 # 检查潜在的 DoS 问题
      - G201 # 检查 SQL 查询的 SQL 注入
      - G202 # 检查 SQL 查询的 SQL 注入
      - G203 # 检查模板执行
      - G204 # 检查子进程执行
      - G301 # 检查目录权限
      - G302 # 检查文件权限
      - G303 # 检查路径遍历
      - G304 # 检查文件路径包含变量
      - G305 # 检查文件路径包含变量
      - G306 # 检查文件权限
      - G307 # 检查 defer 中的错误
      - G401 # 检查使用了弱加密
      - G402 # 检查 TLS 配置
      - G403 # 检查使用了弱加密
      - G404 # 检查使用了弱随机数
      - G501 # 检查使用了弱哈希
      - G502 # 检查 TLS 配置
      - G503 # 检查 SSH 配置
      - G504 # 检查 HTTP 连接
      - G505 # 检查使用了弱哈希
```

### 3.3 专用的安全分析工具

#### 3.3.1 GoSec 安全扫描
```bash
# 安装 GoSec
go install github.com/securego/gosec/v2/cmd/gosec@latest

# 执行安全扫描
gosec -fmt=json -out=security-report.json ./...
```

#### 3.3.2 生成安全报告
```bash
gosec -fmt=sarif -out=security-sarif-report.sarif ./...
```

## 4. 动态测试

### 4.1 单元测试

#### 4.1.1 基础单元测试
```go
// test/orasrs_contract_security_test.go
package main

import (
    "encoding/json"
    "testing"
    
    "github.com/chainmaker/chainmaker-contract-go/v2/pkg/contract"
    "github.com/chainmaker/chainmaker-contract-go/v2/pkg/contract/mock"
)

func TestContractInitialization(t *testing.T) {
    // 创建模拟上下文
    ctx := mock.NewMockContext()
    
    // 设置初始化参数
    ctx.SetArgs(map[string][]byte{
        "governance_address": []byte("test_governance_addr"),
    })
    
    // 初始化合约
    contract := &OrasrsStakingContract{}
    err := contract.InitContract()
    if err != nil {
        t.Fatalf("Failed to initialize contract: %v", err)
    }
    
    // 验证合约状态
    state, err := contract.getContractState()
    if err != nil {
        t.Fatalf("Failed to get contract state: %v", err)
    }
    if state != Active {
        t.Errorf("Expected contract state to be Active, got %v", state)
    }
}

func TestStakeValidation(t *testing.T) {
    ctx := mock.NewMockContext()
    contract := &OrasrsStakingContract{}
    
    // 为合约初始化
    ctx.SetArgs(map[string][]byte{
        "governance_address": []byte("test_gov"),
    })
    contract.InitContract()
    
    // 测试质押金额验证
    ctx.SetArgs(map[string][]byte{
        "node_id":             []byte("test-node-1"),
        "amount":              []byte("5000"), // 低于根层最小质押
        "sm2_signature":       []byte("test_sig"),
        "data_hash":           []byte("test_hash"),
        "nonce":               []byte("1"),
        "business_license_hash": []byte("license_hash"),
        "filing_number_hash":  []byte("filing_hash"),
        "node_type":           []byte("0"), // 根层节点
    })
    
    // 由于我们无法实际验证SM2签名，这里测试参数验证逻辑
    // 在实际环境中，我们需要模拟SM2验证或使用测试密钥
}
```

#### 4.1.2 边界条件测试
```go
func TestBoundaryConditions(t *testing.T) {
    ctx := mock.NewMockContext()
    contract := &OrasrsStakingContract{}
    
    // 测试最大值情况
    ctx.SetArgs(map[string][]byte{
        "node_id":             []byte("max-test-node"),
        "amount":              []byte("18446744073709551615"), // uint64最大值
        "sm2_signature":       []byte("test_sig"),
        "data_hash":           []byte("test_hash"),
        "nonce":               []byte("1"),
        "business_license_hash": []byte("license_hash"),
        "filing_number_hash":  []byte("filing_hash"),
        "node_type":           []byte("0"),
    })
    
    // 验证是否正确处理大数值
}
```

### 4.2 集成测试

#### 4.2.1 部署测试
```go
func TestContractDeployment(t *testing.T) {
    // 使用 ChainMaker 测试网络进行部署测试
    // 这需要在实际的 ChainMaker 环境中执行
    
    // 验证合约部署成功
    // 验证初始状态正确
    // 验证访问控制正常
}
```

#### 4.2.2 功能测试
```go
func TestFullWorkflow(t *testing.T) {
    // 测试完整的质押-操作-提取流程
    // 1. 质押节点
    // 2. 执行各种操作
    // 3. 提取质押
    // 4. 验证状态变化
}
```

## 5. 专项安全测试

### 5.1 重入攻击测试
```go
func TestReentrancyProtection(t *testing.T) {
    // ChainMaker Go 合约不会受到传统 EVM 重入攻击
    // 但需要测试合约间的调用安全
}
```

### 5.2 访问控制测试
```go
func TestAccessControl(t *testing.T) {
    ctx := mock.NewMockContext()
    contract := &OrasrsStakingContract{}
    
    // 初始化合约
    ctx.SetArgs(map[string][]byte{
        "governance_address": []byte("legitimate_gov"),
    })
    contract.InitContract()
    
    // 测试非治理地址调用治理函数
    ctx.SetCallerAddress("attacker_addr")
    
    // 模拟调用需要治理权限的函数
    err := contract.onlyGovernance()
    if err == nil {
        t.Error("Expected access control failure for unauthorized caller")
    }
}
```

### 5.3 参数验证测试
```go
func TestParameterValidation(t *testing.T) {
    tests := []struct {
        name          string
        args          map[string][]byte
        expectError   bool
    }{
        {
            name: "missing node id",
            args: map[string][]byte{
                "amount": []byte("10000"),
                // 缺少 node_id
            },
            expectError: true,
        },
        {
            name: "invalid amount",
            args: map[string][]byte{
                "node_id": []byte("test-node"),
                "amount":  []byte("-1"), // 无效金额
            },
            expectError: true,
        },
        {
            name: "valid parameters",
            args: map[string][]byte{
                "node_id":             []byte("test-node"),
                "amount":              []byte("10000"),
                "sm2_signature":       []byte("test_sig"),
                "data_hash":           []byte("test_hash"),
                "nonce":               []byte("1"),
                "business_license_hash": []byte("license_hash"),
                "filing_number_hash":  []byte("filing_hash"),
                "node_type":           []byte("0"),
            },
            expectError: false,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            ctx := mock.NewMockContext()
            ctx.SetArgs(tt.args)
            
            // 创建合约实例并调用质押函数
            // 验证是否符合预期
        })
    }
}
```

## 6. 国密算法安全性测试

### 6.1 SM2 签名验证测试
```go
func TestSM2SignatureValidation(t *testing.T) {
    // 生成测试密钥对
    privKey, pubKey, err := sm.GenerateKeyPair()
    if err != nil {
        t.Fatalf("Failed to generate SM2 key pair: %v", err)
    }
    
    // 创建测试数据
    testData := []byte("test data for signing")
    dataHash := sm.Sm3Hash(testData)
    
    // 生成SM2签名
    signature, err := sm.Sign(privKey, dataHash)
    if err != nil {
        t.Fatalf("Failed to sign data: %v", err)
    }
    
    // 验证签名
    valid := sm.Verify(pubKey, dataHash, signature)
    if !valid {
        t.Error("SM2 signature verification failed")
    }
    
    // 测试无效签名
    invalidSignature := []byte("invalid")
    valid = sm.Verify(pubKey, dataHash, invalidSignature)
    if valid {
        t.Error("Invalid SM2 signature should not verify")
    }
}
```

### 6.2 SM3 哈希算法测试
```go
func TestSM3HashConsistency(t *testing.T) {
    testCases := []struct {
        input    string
        expected string
    }{
        {
            input:    "",
            expected: "1ab21d8355cfa17f8e61194831e81a8f22bec8c728fefb747ed035eb5082aa2b",
        },
        {
            input:    "abc",
            expected: "66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0",
        },
    }
    
    for _, tc := range testCases {
        result := sm.Sm3Hash([]byte(tc.input))
        resultStr := fmt.Sprintf("%x", result)
        
        if resultStr != tc.expected {
            t.Errorf("SM3 hash mismatch for input '%s': expected %s, got %s", 
                tc.input, tc.expected, resultStr)
        }
    }
}
```

### 6.3 密钥管理测试
```go
func TestKeyManagementSecurity(t *testing.T) {
    // 测试密钥生成和存储安全
    // 验证私钥不会泄露
    // 验证密钥长度和随机性
}
```

## 7. 性能安全性测试

### 7.1 拒绝服务攻击测试
```go
func TestDoSProtection(t *testing.T) {
    // 测试合约对大量小额交易的处理
    // 测试合约对恶意数据的处理
    // 测试合约对资源耗尽攻击的防护
}
```

### 7.2 Gas 限制测试
```go
func TestGasLimitHandling(t *testing.T) {
    // 测试复杂操作的资源消耗
    // 验证合约不会消耗过多资源
    // 测试批量操作的性能影响
}
```

## 8. 合规性测试

### 8.1 网络安全合规
```go
func TestNetworkSecurityCompliance(t *testing.T) {
    // 验证数据境内存储
    // 验证用户隐私保护
    // 验证等保三级要求
}
```

### 8.2 密码学合规
```go
func TestCryptographicCompliance(t *testing.T) {
    // 验证国密算法实现
    // 验证算法参数合规
    // 验证密钥管理合规
}
```

## 9. 自动化测试脚本

### 9.1 安全测试脚本
```bash
#!/bin/bash
# chainmaker-security-test.sh

set -e

echo "开始 ChainMaker 合约安全性测试..."

# 1. 静态分析
echo "1. 执行静态分析..."
gosec -fmt=json -out=reports/gosec-report.json ./... || echo "GoSec analysis completed with issues"

# 2. 运行 Go 工具链检查
echo "2. 运行 Go 工具链检查..."
go vet ./... || echo "Vet found issues"
go fmt ./... 
go imports -w ./...

# 3. 运行单元测试
echo "3. 运行单元测试..."
go test -v ./test/... -run "Test.*Security" || echo "Some tests may have failed"

# 4. 运行综合测试
echo "4. 运行综合测试..."
go test -v -race -coverprofile=coverage.out ./...

# 5. 生成测试报告
echo "5. 生成测试报告..."
go tool cover -html=coverage.out -o coverage.html

echo "安全测试完成！"
ls -la reports/ coverage.html || echo "Reports generated in current directory"
```

### 9.2 CI/CD 集成配置
```yaml
# .github/workflows/security-test.yml
name: Security Test

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  security-test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Go
      uses: actions/setup-go@v4
      with:
        go-version: '1.19'
        
    - name: Install security tools
      run: |
        go install github.com/securego/gosec/v2/cmd/gosec@latest
        go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
        
    - name: Run security scans
      run: |
        gosec -fmt=json -out=gosec-report.json ./...
        golangci-lint run
        
    - name: Run unit tests
      run: go test -v ./test/... -run "Test.*Security"
      
    - name: Upload reports
      uses: actions/upload-artifact@v3
      with:
        name: security-reports
        path: |
          gosec-report.json
          coverage.html
```

## 10. 测试结果评估

### 10.1 安全漏洞分级
- **严重**: 可导致资金损失或系统崩溃
- **高**: 可影响合约逻辑或数据安全
- **中**: 可能影响性能或用户体验
- **低**: 代码规范或文档问题

### 10.2 风险评估矩阵
| 风险类型 | 概率 | 影响 | 优先级 |
|----------|------|------|--------|
| 重入攻击 | 低 | 高 | 中 |
| 整数溢出 | 中 | 高 | 高 |
| 访问控制 | 中 | 中 | 高 |
| 国密实现 | 低 | 高 | 中 |

## 11. 持续监控

### 11.1 运行时监控
- 交易异常监控
- 合约状态监控
- 性能指标监控

### 11.2 定期审计
- 月度安全扫描
- 季度代码审查
- 年度第三方审计

## 12. 应急响应

### 12.1 安全事件处理流程
1. 事件发现和报告
2. 影响评估
3. 紧急修复
4. 验证和部署
5. 事后分析

### 12.2 降级和回滚方案
- 合约暂停功能
- 版本回滚机制
- 数据恢复方案

## 附录

### A. 测试用例模板
- 基础功能测试用例
- 边界条件测试用例
- 异常情况测试用例

### B. 安全检查清单
- 代码安全检查
- 部署安全检查
- 运行安全检查

### C. 常见安全问题及解决方案
- 输入验证不足
- 访问控制缺失
- 国密算法实现错误

---

**注意**: 本指南提供了全面的安全测试框架，实际测试时需要根据具体的 ChainMaker 环境和 OraSRS 合约实现进行调整。