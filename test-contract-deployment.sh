#!/bin/bash

# OraSRS合约部署测试脚本
# 用于测试合约功能和注册治理地址

set -e

echo "=================================================="
echo "    OraSRS 合约部署与治理地址注册测试"
echo "=================================================="

# 检查合约是否存在
if [ ! -f "contracts/orasrs" ]; then
    echo "错误: 未找到合约文件 contracts/orasrs"
    echo "请先构建合约"
    exit 1
fi

echo "✓ 合约文件存在: contracts/orasrs"
echo "合约文件信息:"
ls -la contracts/orasrs
file contracts/orasrs 2>/dev/null || echo "file命令不可用"

# 创建模拟的治理地址注册和合约部署测试
echo ""
echo "创建治理地址注册和合约部署测试..."

cat > governance_test.go << 'EOF'
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/exec"
	"time"
)

// 模拟ChainMaker合约调用结构
type ContractRequest struct {
	Method string            `json:"method"`
	Params map[string]string `json:"params"`
}

// 模拟ChainMaker合约响应结构
type ContractResponse struct {
	Success bool   `json:"success"`
	Data    string `json:"data"`
	Error   string `json:"error,omitempty"`
}

func main() {
	fmt.Println("OraSRS 合约部署与治理地址注册测试")
	fmt.Println("=================================")

	// 检查合约文件是否存在
	if _, err := os.Stat("contracts/orasrs"); os.IsNotExist(err) {
		log.Fatal("错误: 未找到合约文件 contracts/orasrs")
	}
	
	fmt.Println("✓ 合约文件存在")

	// 步骤1: 模拟合约初始化
	fmt.Println("\n步骤1: 合约初始化测试...")
	initReq := ContractRequest{
		Method: "InitContract",
		Params: map[string]string{
			"_arg0": "16Uiu2HAmSe3bQVHxy5W6VrM5msPu7c6N4CJx4G4gRdX6V8q9T7Vj", // 模拟治理地址
		},
	}

	// 将请求序列化为JSON
	reqBytes, err := json.Marshal(initReq)
	if err != nil {
		log.Printf("序列化错误: %v", err)
	} else {
		fmt.Printf("✓ 初始化请求准备就绪: %s\n", string(reqBytes))
	}

	// 步骤2: 模拟注册治理地址
	fmt.Println("\n步骤2: 治理地址注册测试...")
	govAddr := "16Uiu2HAmSe3bQVHxy5W6VrM5msPu7c6N4CJx4G4gRdX6V8q9T7Vj"
	fmt.Printf("✓ 治理地址: %s\n", govAddr)

	// 步骤3: 模拟节点注册（无质押）
	fmt.Println("\n步骤3: 节点注册测试（无质押）...")
	
	// 创建无质押节点注册请求
	registerReq := ContractRequest{
		Method: "registerNode",  // 使用我们更新的无质押注册方法
		Params: map[string]string{
			"node_id":         "test-governance-node",
			"node_type":       "0",  // 根层节点
			"agent_version":   "2.0.0",
			"deployment_type": "edge",
		},
	}

	reqBytes, err = json.Marshal(registerReq)
	if err != nil {
		log.Printf("节点注册请求序列化错误: %v", err)
	} else {
		fmt.Printf("✓ 节点注册请求准备就绪: %s\n", string(reqBytes))
	}

	// 步骤4: 模拟威胁报告提交
	fmt.Println("\n步骤4: 威胁报告提交测试...")
	threatReq := ContractRequest{
		Method: "submitThreatReport",
		Params: map[string]string{
			"threat_type":   "DDoS",
			"source_ip":     "192.168.1.100",
			"target_ip":     "192.168.1.1",
			"threat_level":  "Critical",
			"context":       "Multiple DDoS attempts detected",
			"evidence_hash": "ipfs://test-evidence-hash",
			"geolocation":   "US-CA",
		},
	}

	reqBytes, err = json.Marshal(threatReq)
	if err != nil {
		log.Printf("威胁报告请求序列化错误: %v", err)
	} else {
		fmt.Printf("✓ 威胁报告请求准备就绪: %s\n", string(reqBytes))
	}

	// 步骤5: 模拟全局威胁列表查询
	fmt.Println("\n步骤5: 全局威胁列表查询测试...")
	queryReq := ContractRequest{
		Method: "getGlobalThreatList",
		Params: make(map[string]string),
	}

	reqBytes, err = json.Marshal(queryReq)
	if err != nil {
		log.Printf("查询请求序列化错误: %v", err)
	} else {
		fmt.Printf("✓ 查询请求准备就绪: %s\n", string(reqBytes))
	}

	// 步骤6: 显示治理地址和合约配置
	fmt.Println("\n步骤6: 治理配置摘要...")
	fmt.Println("  - 治理地址: 16Uiu2HAmSe3bQVHxy5W6VrM5msPu7c6N4CJx4G4gRdX6V8q9T7Vj")
	fmt.Println("  - 合约版本: OraSRS v2.0")
	fmt.Println("  - 注册方式: 无质押宽松注册")
	fmt.Println("  - 威胁情报: 实时同步")
	fmt.Println("  - 国密支持: SM2/SM3/SM4")
	fmt.Println("  - 合规标准: GDPR/CCPA/等保2.0")

	fmt.Println("\n✓ 所有测试步骤准备就绪！")
	fmt.Println("注意: 这是一个功能测试脚本，实际部署需要ChainMaker网络环境")
}
EOF

# 编译并运行测试
echo "编译治理地址注册测试..."
go mod init governance-test 2>/dev/null || true
go run governance_test.go

echo ""
echo "=================================================="
echo "测试完成!"
echo "=================================================="
echo ""
echo "要实际部署合约，需要:"
echo "1. 启动ChainMaker网络"
echo "2. 部署contracts/orasrs合约"
echo "3. 使用治理地址初始化合约"
echo "4. 注册节点并开始威胁情报收集"
echo ""
echo "当前合约已更新为无质押模式，任何节点都可注册"
echo "=================================================="
