#!/bin/bash

# OraSRS ChainMaker 合约编译和测试脚本

set -e  # 遇到错误时退出

echo "==========================================="
echo "OraSRS ChainMaker 合约编译和测试脚本"
echo "==========================================="

# 检查 Go 环境
if ! command -v go &> /dev/null; then
    echo "错误: 未找到 Go 环境"
    exit 1
fi

echo "Go 版本: $(go version)"

# 进入合约目录
cd /home/Great/SRS-Protocol/chainmaker-contract

# 初始化 Go 模块（如果需要）
if [ ! -f "go.mod" ]; then
    echo "初始化 Go 模块..."
    go mod init orasrs-chainmaker-contract
fi

# 下载依赖
echo "下载依赖..."
go mod tidy

# 编译合约
echo "编译合约..."
GOOS=wasip1 GOARCH=wasm go build -o orasrs_staking.wasm orasrs_staking.go

if [ $? -eq 0 ]; then
    echo "✅ 合约编译成功: orasrs_staking.wasm"
    ls -la orasrs_staking.wasm
else
    echo "❌ 合约编译失败"
    exit 1
fi

# 运行安全测试
echo ""
echo "运行安全测试..."
go run main.go

if [ $? -eq 0 ]; then
    echo "✅ 安全测试完成"
else
    echo "❌ 安全测试失败"
    exit 1
fi

# 运行静态分析
echo ""
echo "运行静态分析..."
if command -v golangci-lint &> /dev/null; then
    golangci-lint run
else
    echo "⚠️  golangci-lint 未安装，跳过静态分析"
fi

# 生成安全报告
echo ""
echo "生成安全报告..."
if [ -f "security-test-report.json" ]; then
    echo "安全测试报告已生成:"
    cat security-test-report.json
else
    echo "未找到安全测试报告"
fi

echo ""
echo "==========================================="
echo "编译和测试完成"
echo "==========================================="

# 检查生成的文件
echo ""
echo "生成的文件:"
ls -la *.wasm *.json *.go *.mod 2>/dev/null || echo "无相关文件"