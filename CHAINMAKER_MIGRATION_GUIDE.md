# ChainMaker 合约迁移指南（Solidity → Go）

## 1. 概述

### 1.1 迁移背景
本指南描述如何将基于 Solidity 的 OraSRS 质押合约迁移到长安链（ChainMaker）的 Go 语言智能合约。

### 1.2 ChainMaker 合约特性
- 使用 Go 语言编写
- 支持国密算法（SM2/SM3/SM4）
- 高性能执行环境
- 企业级安全特性

## 2. 开发环境准备

### 2.1 安装 Go 语言环境
```bash
# 安装 Go 1.18+
wget https://golang.org/dl/go1.19.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.19.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin
```

### 2.2 ChainMaker SDK
```bash
# 安装 ChainMaker Go SDK
go mod init orasrs-chainmaker-contract
go get github.com/chainmaker/chainmaker-sdk-go/v2
```

## 3. 合约结构对比

### 3.1 Solidity 到 Go 的映射

| Solidity | Go | 说明 |
|----------|-----|------|
| contract | struct | 合约结构 |
| function | method | 合约方法 |
| mapping | map | 键值对存储 |
| event | log | 事件日志 |
| modifier | validation | 验证逻辑 |

### 3.2 数据类型映射

| Solidity | Go | 说明 |
|----------|-----|------|
| uint256 | uint64/int64 | 大数类型 |
| address | string | 地址类型 |
| bytes32 | []byte | 字节切片 |
| string | string | 字符串 |
| bool | bool | 布尔类型 |

## 4. OraSRS Go 合约实现

### 4.1 基础合约结构

```go
package main

import (
    "encoding/json"
    "fmt"
    "strconv"
    
    "github.com/chainmaker/chainmaker-contract-go/v2/pkg/contract"
    "github.com/chainmaker/chainmaker-tools-go/v2/crypto/sm"
)

// NodeStatus 节点状态
type NodeStatus int

const (
    Unregistered NodeStatus = iota
    Registered
    Active
    Slashed
    PendingRemoval
)

// Node 节点结构
type Node struct {
    NodeAddress     string     `json:"node_address"`
    StakeAmount     uint64     `json:"stake_amount"`
    StakeStart      int64      `json:"stake_start"`
    ReputationScore uint64     `json:"reputation_score"`
    Status          NodeStatus `json:"status"`
    NodeId          string     `json:"node_id"`
    BusinessLicense string     `json:"business_license"`
    FilingNumber    string     `json:"filing_number"`
    ChallengeCount  uint64     `json:"challenge_count"`
    ChallengesWon   uint64     `json:"challenges_won"`
    ChallengesLost  uint64     `json:"challenges_lost"`
    LastSeen        int64      `json:"last_seen"`
    IsConsensusNode bool       `json:"is_consensus_node"`
}

// OrasrsStakingContract OraSRS 质押合约
type OrasrsStakingContract struct {
    // 合约相关状态存储
}

// NodeInfo 节点信息查询返回结构
type NodeInfo struct {
    Node    Node   `json:"node"`
    Success bool   `json:"success"`
    Error   string `json:"error,omitempty"`
}

// ContractStats 合约统计信息
type ContractStats struct {
    TotalStaked         uint64 `json:"total_staked"`
    ActiveNodes         uint64 `json:"active_nodes"`
    TotalConsensusNodes uint64 `json:"total_consensus_nodes"`
    TotalPartitionNodes uint64 `json:"total_partition_nodes"`
    TotalEdgeNodes      uint64 `json:"total_edge_nodes"`
}

// 质押参数常量
const (
    MinStakeRoot      = uint64(10000) // 根层最小质押
    MinStakePartition = uint64(5000)  // 分区层最小质押
    MinStakeEdge      = uint64(100)   // 边缘层最小质押
    StakeLockPeriod   = int64(7 * 24 * 60 * 60) // 质押锁定期（秒）
    MaxConsensusNodes = 21 // 最大共识节点数
)

// MainKey 合约主键前缀
const (
    NodeKeyPrefix        = "NODE_"
    NodeIdToAddressKey   = "NODEID_TO_ADDR_"
    ConsensusNodesKey    = "CONSENSUS_NODES"
    PartitionNodesKey    = "PARTITION_NODES"
    EdgeNodesKey         = "EDGE_NODES"
    PendingWithdrawalKey = "PENDING_WITHDRAWAL_"
    UsedNonceKey         = "USED_NONCE_"
    OwnerKey             = "OWNER"
    GovernanceKey        = "GOVERNANCE"
    ContractStateKey     = "CONTRACT_STATE"
)

// ContractState 合约状态
type ContractState int

const (
    Active ContractState = iota
    Paused
    EmergencyStopped
)
```

### 4.2 合约初始化方法

```go
// InitContract 合约初始化方法
func (c *OrasrsStakingContract) InitContract() error {
    // 初始化合约状态
    ctx := contract.GetContext()
    
    // 设置合约状态为活跃
    err := ctx.PutObject([]byte(ContractStateKey), []byte(strconv.Itoa(int(Active))))
    if err != nil {
        return fmt.Errorf("failed to set contract state: %v", err)
    }
    
    // 初始化 owner（调用者地址）
    caller := ctx.GetCallerAddress()
    err = ctx.PutObject([]byte(OwnerKey), []byte(caller))
    if err != nil {
        return fmt.Errorf("failed to set owner: %v", err)
    }
    
    // 初始化治理委员会地址（从参数获取）
    governanceAddr := ctx.GetArgs()["governance_address"]
    if governanceAddr == nil {
        return fmt.Errorf("governance address not provided")
    }
    
    err = ctx.PutObject([]byte(GovernanceKey), governanceAddr)
    if err != nil {
        return fmt.Errorf("failed to set governance: %v", err)
    }
    
    // 初始化节点列表
    consensusNodes := make([]string, 0)
    partitionNodes := make([]string, 0)
    edgeNodes := make([]string, 0)
    
    consensusNodesBytes, _ := json.Marshal(consensusNodes)
    partitionNodesBytes, _ := json.Marshal(partitionNodes)
    edgeNodesBytes, _ := json.Marshal(edgeNodes)
    
    ctx.PutObject([]byte(ConsensusNodesKey), consensusNodesBytes)
    ctx.PutObject([]byte(PartitionNodesKey), partitionNodesBytes)
    ctx.PutObject([]byte(EdgeNodesKey), edgeNodesBytes)
    
    return nil
}
```

### 4.3 节点质押方法（支持国密算法）

```go
// StakeWithGmSign 带国密签名的节点质押方法
func (c *OrasrsStakingContract) StakeWithGmSign() error {
    ctx := contract.GetContext()
    
    // 检查合约状态
    state, err := c.getContractState()
    if err != nil {
        return err
    }
    if state != Active {
        return fmt.Errorf("contract is not active")
    }
    
    // 获取参数
    args := ctx.GetArgs()
    nodeId := string(args["node_id"])
    amountStr := string(args["amount"])
    sm2Signature := args["sm2_signature"]
    dataHash := args["data_hash"]
    nonceStr := string(args["nonce"])
    businessLicenseHash := string(args["business_license_hash"])
    filingNumberHash := string(args["filing_number_hash"])
    nodeTypeStr := string(args["node_type"])
    
    // 类型转换
    amount, err := strconv.ParseUint(amountStr, 10, 64)
    if err != nil {
        return fmt.Errorf("invalid amount: %v", err)
    }
    
    nonce, err := strconv.ParseUint(nonceStr, 10, 64)
    if err != nil {
        return fmt.Errorf("invalid nonce: %v", err)
    }
    
    nodeType, err := strconv.ParseUint(nodeTypeStr, 10, 8)
    if err != nil {
        return fmt.Errorf("invalid node type: %v", err)
    }
    
    // 防重放攻击
    caller := ctx.GetCallerAddress()
    requestKey := fmt.Sprintf("%s_%s_%d_%d_%d", caller, nodeId, amount, ctx.GetTxTimeStamp(), nonce)
    requestHash := sm.Sm3Hash([]byte(requestKey))
    
    if c.isNonceUsed(requestHash) {
        return fmt.Errorf("nonce already used")
    }
    
    // 标记 nonce 已使用
    c.setNonceUsed(requestHash)
    
    // 验证 SM2 签名
    // 注意：在实际实现中，这需要调用长安链的内置国密验证函数
    valid, err := c.verifySM2Signature(sm2Signature, dataHash, caller)
    if err != nil {
        return fmt.Errorf("error in SM2 verification: %v", err)
    }
    if !valid {
        return fmt.Errorf("invalid SM2 signature")
    }
    
    // 验证质押金额
    minStake := c.getMinStakeForNodeType(uint8(nodeType))
    if amount < minStake {
        return fmt.Errorf("insufficient stake amount, required: %d, provided: %d", minStake, amount)
    }
    
    // 检查发送方余额
    balance, err := ctx.GetBalance(caller)
    if err != nil {
        return fmt.Errorf("failed to get balance: %v", err)
    }
    if balance < amount {
        return fmt.Errorf("insufficient balance")
    }
    
    // 验证节点是否已存在
    existingAddr, err := c.getNodeAddressById(nodeId)
    if err == nil && existingAddr != "" {
        return fmt.Errorf("node ID already exists")
    }
    
    // 验证营业执照和备案信息
    if businessLicenseHash == "" {
        return fmt.Errorf("business license hash is required")
    }
    if filingNumberHash == "" {
        return fmt.Errorf("filing number hash is required")
    }
    
    // 创建节点
    node := Node{
        NodeAddress:     caller,
        StakeAmount:     amount,
        StakeStart:      ctx.GetTxTimeStamp(),
        ReputationScore: 100, // 初始声誉分数
        Status:          Registered,
        NodeId:          nodeId,
        BusinessLicense: businessLicenseHash,
        FilingNumber:    filingNumberHash,
        ChallengeCount:  0,
        ChallengesWon:   0,
        ChallengesLost:  0,
        LastSeen:        ctx.GetTxTimeStamp(),
        IsConsensusNode: false,
    }
    
    // 保存节点信息
    err = c.saveNode(node)
    if err != nil {
        return fmt.Errorf("failed to save node: %v", err)
    }
    
    // 根据节点类型加入相应列表
    switch nodeType {
    case 0: // 根层节点
        err = c.addNodeToConsensusList(caller)
        if err != nil {
            return fmt.Errorf("failed to add to consensus list: %v", err)
        }
    case 1: // 分区层节点
        err = c.addNodeToPartitionList(caller)
        if err != nil {
            return fmt.Errorf("failed to add to partition list: %v", err)
        }
    default: // 边缘层节点
        err = c.addNodeToEdgeList(caller)
        if err != nil {
            return fmt.Errorf("failed to add to edge list: %v", err)
        }
    }
    
    // 扣除质押金额
    err = ctx.Transfer(caller, amount)
    if err != nil {
        return fmt.Errorf("failed to transfer stake amount: %v", err)
    }
    
    // 记录质押事件
    eventData := map[string]string{
        "node_id":     nodeId,
        "node_addr":   caller,
        "amount":      strconv.FormatUint(amount, 10),
        "timestamp":   strconv.FormatInt(ctx.GetTxTimeStamp(), 10),
    }
    
    ctx.EmitEvent("NodeStaked", eventData)
    
    return nil
}
```

### 4.4 辅助方法

```go
// getMinStakeForNodeType 根据节点类型获取最小质押额
func (c *OrasrsStakingContract) getMinStakeForNodeType(nodeType uint8) uint64 {
    switch nodeType {
    case 0: // 根层
        return MinStakeRoot
    case 1: // 分区层
        return MinStakePartition
    default: // 边缘层
        return MinStakeEdge
    }
}

// saveNode 保存节点信息
func (c *OrasrsStakingContract) saveNode(node Node) error {
    ctx := contract.GetContext()
    
    nodeBytes, err := json.Marshal(node)
    if err != nil {
        return fmt.Errorf("failed to marshal node: %v", err)
    }
    
    // 保存节点信息
    nodeKey := NodeKeyPrefix + node.NodeAddress
    err = ctx.PutObject([]byte(nodeKey), nodeBytes)
    if err != nil {
        return fmt.Errorf("failed to save node: %v", err)
    }
    
    // 保存节点ID到地址的映射
    idToAddrKey := NodeIdToAddressKey + node.NodeId
    err = ctx.PutObject([]byte(idToAddrKey), []byte(node.NodeAddress))
    if err != nil {
        return fmt.Errorf("failed to save node id mapping: %v", err)
    }
    
    return nil
}

// getNodeById 根据节点ID获取节点信息
func (c *OrasrsStakingContract) getNodeById(nodeId string) (*Node, error) {
    ctx := contract.GetContext()
    
    addr, err := c.getNodeAddressById(nodeId)
    if err != nil {
        return nil, err
    }
    
    nodeKey := NodeKeyPrefix + addr
    nodeBytes, err := ctx.GetObject([]byte(nodeKey))
    if err != nil {
        return nil, fmt.Errorf("node not found: %v", err)
    }
    
    var node Node
    err = json.Unmarshal(nodeBytes, &node)
    if err != nil {
        return nil, fmt.Errorf("failed to unmarshal node: %v", err)
    }
    
    return &node, nil
}

// getNodeAddressById 根据节点ID获取地址
func (c *OrasrsStakingContract) getNodeAddressById(nodeId string) (string, error) {
    ctx := contract.GetContext()
    
    idToAddrKey := NodeIdToAddressKey + nodeId
    addrBytes, err := ctx.GetObject([]byte(idToAddrKey))
    if err != nil {
        return "", fmt.Errorf("node id not found: %v", err)
    }
    
    return string(addrBytes), nil
}

// verifySM2Signature 验证SM2签名
func (c *OrasrsStakingContract) verifySM2Signature(signature, dataHash []byte, publicKey string) (bool, error) {
    // 在实际实现中，这将调用长安链的内置SM2验证函数
    // 这里是概念性实现
    fmt.Printf("Verifying SM2 signature for public key: %s\n", publicKey)
    
    // 长安链通常提供内置的国密验证函数
    // return sm.VerifySM2Signature(publicKey, dataHash, signature)
    
    // 模拟验证（仅用于演示）
    return true, nil
}

// isNonceUsed 检查nonce是否已被使用
func (c *OrasrsStakingContract) isNonceUsed(nonceHash []byte) bool {
    ctx := contract.GetContext()
    
    key := UsedNonceKey + string(nonceHash)
    _, err := ctx.GetObject([]byte(key))
    return err == nil
}

// setNonceUsed 设置nonce为已使用
func (c *OrasrsStakingContract) setNonceUsed(nonceHash []byte) error {
    ctx := contract.GetContext()
    
    key := UsedNonceKey + string(nonceHash)
    return ctx.PutObject([]byte(key), []byte("used"))
}

// getContractState 获取合约状态
func (c *OrasrsStakingContract) getContractState() (ContractState, error) {
    ctx := contract.GetContext()
    
    stateBytes, err := ctx.GetObject([]byte(ContractStateKey))
    if err != nil {
        return 0, fmt.Errorf("failed to get contract state: %v", err)
    }
    
    stateInt, err := strconv.Atoi(string(stateBytes))
    if err != nil {
        return 0, fmt.Errorf("invalid contract state: %v", err)
    }
    
    return ContractState(stateInt), nil
}

// onlyGovernance 仅治理地址可调用的验证
func (c *OrasrsStakingContract) onlyGovernance() error {
    ctx := contract.GetContext()
    caller := ctx.GetCallerAddress()
    
    governanceBytes, err := ctx.GetObject([]byte(GovernanceKey))
    if err != nil {
        return fmt.Errorf("failed to get governance address: %v", err)
    }
    
    governanceAddr := string(governanceBytes)
    if caller != governanceAddr {
        return fmt.Errorf("only governance can call this function")
    }
    
    return nil
}

// addNodeToConsensusList 添加节点到共识列表
func (c *OrasrsStakingContract) addNodeToConsensusList(nodeAddr string) error {
    ctx := contract.GetContext()
    
    consensusNodesBytes, err := ctx.GetObject([]byte(ConsensusNodesKey))
    if err != nil {
        return fmt.Errorf("failed to get consensus nodes: %v", err)
    }
    
    var consensusNodes []string
    err = json.Unmarshal(consensusNodesBytes, &consensusNodes)
    if err != nil {
        return fmt.Errorf("failed to unmarshal consensus nodes: %v", err)
    }
    
    // 检查是否已达到最大共识节点数
    if len(consensusNodes) >= MaxConsensusNodes {
        return fmt.Errorf("max consensus nodes reached")
    }
    
    // 检查节点是否已在列表中
    for _, addr := range consensusNodes {
        if addr == nodeAddr {
            return fmt.Errorf("node already in consensus list")
        }
    }
    
    // 添加节点
    consensusNodes = append(consensusNodes, nodeAddr)
    
    // 保存更新后的列表
    updatedBytes, err := json.Marshal(consensusNodes)
    if err != nil {
        return fmt.Errorf("failed to marshal consensus nodes: %v", err)
    }
    
    return ctx.PutObject([]byte(ConsensusNodesKey), updatedBytes)
}

// addNodeToPartitionList 添加节点到分区列表
func (c *OrasrsStakingContract) addNodeToPartitionList(nodeAddr string) error {
    ctx := contract.GetContext()
    
    partitionNodesBytes, err := ctx.GetObject([]byte(PartitionNodesKey))
    if err != nil {
        return fmt.Errorf("failed to get partition nodes: %v", err)
    }
    
    var partitionNodes []string
    err = json.Unmarshal(partitionNodesBytes, &partitionNodes)
    if err != nil {
        return fmt.Errorf("failed to unmarshal partition nodes: %v", err)
    }
    
    // 检查节点是否已在列表中
    for _, addr := range partitionNodes {
        if addr == nodeAddr {
            return fmt.Errorf("node already in partition list")
        }
    }
    
    // 添加节点
    partitionNodes = append(partitionNodes, nodeAddr)
    
    // 保存更新后的列表
    updatedBytes, err := json.Marshal(partitionNodes)
    if err != nil {
        return fmt.Errorf("failed to marshal partition nodes: %v", err)
    }
    
    return ctx.PutObject([]byte(PartitionNodesKey), updatedBytes)
}

// addNodeToEdgeList 添加节点到边缘列表
func (c *OrasrsStakingContract) addNodeToEdgeList(nodeAddr string) error {
    ctx := contract.GetContext()
    
    edgeNodesBytes, err := ctx.GetObject([]byte(EdgeNodesKey))
    if err != nil {
        return fmt.Errorf("failed to get edge nodes: %v", err)
    }
    
    var edgeNodes []string
    err = json.Unmarshal(edgeNodesBytes, &edgeNodes)
    if err != nil {
        return fmt.Errorf("failed to unmarshal edge nodes: %v", err)
    }
    
    // 检查节点是否已在列表中
    for _, addr := range edgeNodes {
        if addr == nodeAddr {
            return fmt.Errorf("node already in edge list")
        }
    }
    
    // 添加节点
    edgeNodes = append(edgeNodes, nodeAddr)
    
    // 保存更新后的列表
    updatedBytes, err := json.Marshal(edgeNodes)
    if err != nil {
        return fmt.Errorf("failed to marshal edge nodes: %v", err)
    }
    
    return ctx.PutObject([]byte(EdgeNodesKey), updatedBytes)
}

// GetNodeInfo 查询节点信息
func (c *OrasrsStakingContract) GetNodeInfo() ([]byte, error) {
    ctx := contract.GetContext()
    
    nodeAddr := string(ctx.GetArgs()["node_address"])
    if nodeAddr == "" {
        return nil, fmt.Errorf("node address is required")
    }
    
    node, err := c.getNodeByAddress(nodeAddr)
    if err != nil {
        return json.Marshal(NodeInfo{Success: false, Error: err.Error()})
    }
    
    result := NodeInfo{
        Node:    *node,
        Success: true,
    }
    
    return json.Marshal(result)
}

// getNodeByAddress 根据地址获取节点
func (c *OrasrsStakingContract) getNodeByAddress(nodeAddr string) (*Node, error) {
    ctx := contract.GetContext()
    
    nodeKey := NodeKeyPrefix + nodeAddr
    nodeBytes, err := ctx.GetObject([]byte(nodeKey))
    if err != nil {
        return nil, fmt.Errorf("node not found: %v", err)
    }
    
    var node Node
    err = json.Unmarshal(nodeBytes, &node)
    if err != nil {
        return nil, fmt.Errorf("failed to unmarshal node: %v", err)
    }
    
    return &node, nil
}

// GetContractStats 获取合约统计信息
func (c *OrasrsStakingContract) GetContractStats() ([]byte, error) {
    ctx := contract.GetContext()
    
    consensusNodesBytes, _ := ctx.GetObject([]byte(ConsensusNodesKey))
    partitionNodesBytes, _ := ctx.GetObject([]byte(PartitionNodesKey))
    edgeNodesBytes, _ := ctx.GetObject([]byte(EdgeNodesKey))
    
    var consensusNodes []string
    var partitionNodes []string
    var edgeNodes []string
    
    json.Unmarshal(consensusNodesBytes, &consensusNodes)
    json.Unmarshal(partitionNodesBytes, &partitionNodes)
    json.Unmarshal(edgeNodesBytes, &edgeNodes)
    
    stats := ContractStats{
        TotalConsensusNodes: uint64(len(consensusNodes)),
        TotalPartitionNodes: uint64(len(partitionNodes)),
        TotalEdgeNodes:      uint64(len(edgeNodes)),
    }
    
    // 计算活跃节点和总质押量
    for _, addr := range consensusNodes {
        node, err := c.getNodeByAddress(addr)
        if err == nil && node.Status == Active {
            stats.TotalStaked += node.StakeAmount
            stats.ActiveNodes++
        }
    }
    
    for _, addr := range partitionNodes {
        node, err := c.getNodeByAddress(addr)
        if err == nil && node.Status == Active {
            stats.TotalStaked += node.StakeAmount
            stats.ActiveNodes++
        }
    }
    
    for _, addr := range edgeNodes {
        node, err := c.getNodeByAddress(addr)
        if err == nil && node.Status == Active {
            stats.TotalStaked += node.StakeAmount
            stats.ActiveNodes++
        }
    }
    
    return json.Marshal(stats)
}

// Main 主函数入口
func Main() {
    contract.Start(&OrasrsStakingContract{})
}
```

## 5. 迁移注意事项

### 5.1 国密算法集成
- 使用长安链内置的 SM2/SM3/SM4 函数
- 合约中直接调用而非实现算法
- 确保证书和密钥管理合规

### 5.2 状态管理
- ChainMaker 使用键值存储
- 需要手动管理键的命名空间
- 注意键的唯一性

### 5.3 事件系统
- 使用 `ctx.EmitEvent` 发送事件
- 事件格式与以太坊事件不同
- 需要重新定义事件结构

### 5.4 权限控制
- 基于证书的身份验证
- 无内置修饰符，需手动实现验证逻辑
- 可使用策略引擎实现复杂权限

## 6. 测试指南

### 6.1 单元测试
```go
// test/orasrs_contract_test.go
package main

import (
    "testing"
)

func TestStakeWithGmSign(t *testing.T) {
    // 测试质押功能
    // 模拟 ChainMaker 上下文
}

func TestNodeManagement(t *testing.T) {
    // 测试节点管理功能
}
```

### 6.2 集成测试
- 使用 ChainMaker 测试网络
- 部署合约进行功能测试
- 性能基准测试

## 7. 部署指南

### 7.1 编译合约
```bash
# 编译 Go 合约为 WASM
GOOS=wasip1 GOARCH=wasm go build -o orasrs_staking.wasm orasrs_staking.go
```

### 7.2 部署合约
```bash
# 使用 ChainMaker 客户端部署合约
./bin/chainmaker contract install \
  --contract-name orasrs-staking \
  --contract-version 1.0.0 \
  --contract-file orasrs_staking.wasm \
  --parameters '{"governance_address":"your_governance_address"}'
```

## 8. 性能优化建议

### 8.1 存储优化
- 减少状态存储访问次数
- 合理设计键结构
- 批量操作优化

### 8.2 计算优化
- 算法复杂度优化
- 避免不必要的循环
- 使用内置函数

## 9. 安全建议

### 9.1 输入验证
- 严格验证所有输入参数
- 防止整数溢出
- 验证地址格式

### 9.2 访问控制
- 实现多级权限控制
- 详细的日志记录
- 操作审计功能

## 10. 常见问题

### 10.1 国密算法问题
- 确保长安链版本支持国密算法
- 验证国密函数调用格式

### 10.2 性能问题
- 优化状态存储访问
- 合理设置合约参数

### 10.3 部署问题
- 检查 WASM 编译选项
- 验证合约参数格式