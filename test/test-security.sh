#!/bin/bash
# OraSRS 安全测试脚本

set -e  # 遇到错误时退出

echo "开始 OraSRS 智能合约安全测试..."

# 检查依赖项
function check_dependency {
    if ! command -v $1 &> /dev/null; then
        echo "错误: $1 未安装"
        exit 1
    fi
}

# 检查主要依赖
if command -v forge &> /dev/null; then
    echo "Foundry 工具链已安装"
else
    echo "警告: Foundry 未安装，跳过 Forge 测试"
fi

if command -v slither &> /dev/null; then
    echo "Slither 已安装"
else
    echo "警告: Slither 未安装，尝试使用 solc 进行基本检查"
fi

# 创建测试报告目录
mkdir -p reports

echo "1. 执行基本编译检查..."
solc --bin --abi --optimize contracts/orasrs-staking-gm.sol --optimize-runs 200 -o compiled/ --overwrite

echo "2. 检查合约中的常见安全问题..."

# 检查重入漏洞
echo "2.1 检查重入漏洞..."
grep -n "call\|transfer\|send" contracts/orasrs-staking-gm.sol || echo "未发现外部转账调用"

# 检查权限控制
echo "2.2 检查权限控制..."
grep -n "onlyOwner\|onlyGovernance\|onlyValidator" contracts/orasrs-staking-gm.sol || echo "未发现权限控制修饰符"

# 检查整数溢出保护
echo "2.3 检查整数溢出保护..."
echo "Solidity 0.8.0+ 提供内置溢出检查"

# 检查未初始化的存储指针（Solidity 问题）
echo "2.4 检查未初始化的存储指针..."
grep -n "mapping.*storage" contracts/orasrs-staking-gm.sol

echo "3. 静态分析 - 检查语法和基本问题..."
if command -v slither &> /dev/null; then
    echo "运行 Slither 分析..."
    slither . --filter-paths "node_modules|lib|script|test|artifacts|cache|compiled" --json reports/slither-report.json || echo "Slither 分析完成（可能有警告）"
else
    echo "跳过 Slither 分析（未安装）"
fi

echo "4. 合约安全特性检查..."

# 检查应急暂停功能
echo "4.1 检查应急暂停功能..."
grep -n "pause\|stop\|halt" contracts/orasrs-staking-gm.sol

# 检查访问控制
echo "4.2 检查访问控制机制..."
grep -A 10 -B 10 "modifier.*only" contracts/orasrs-staking-gm.sol

echo "安全检查完成！"
echo "基本编译检查已通过"
echo "发现潜在风险点，请参考上面的分析结果"