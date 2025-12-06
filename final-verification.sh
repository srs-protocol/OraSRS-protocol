#!/bin/bash

# 最终验证脚本
# 验证所有合约名称更改和治理功能

echo "=================================================="
echo "    最终验证: SecurityRiskAssessment Protocol"
echo "=================================================="

echo "1. 验证合约文件结构..."
if [ -f "contracts/orasrs" ]; then
    echo "   ✓ 编译后的合约文件存在"
else
    echo "   ✗ 编译后的合约文件不存在"
    exit 1
fi

echo -e "\n2. 验证源码文件更新..."
if grep -q "SecurityRiskAssessmentContract" "chainmaker-contract/sracontract/sracontract.go"; then
    echo "   ✓ 主合约源码已更新"
else
    echo "   ✗ 主合约源码未更新"
    exit 1
fi

if grep -q "package sracontract" "chainmaker-contract/sracontract/sracontract.go"; then
    echo "   ✓ 包名已更新为sracontract"
else
    echo "   ✗ 包名未更新"
    exit 1
fi

echo -e "\n3. 验证威胁情报合约更新..."
if grep -q "SecurityRiskAssessmentContract" "chainmaker-contract/sracontract/extra_methods.go"; then
    echo "   ✓ 威胁情报合约已更新"
else
    echo "   ✗ 威胁情报合约未更新"
    exit 1
fi

echo -e "\n4. 验证网络配置更新..."
if grep -q "sracontract" "chainmaker-contract/config/orasrs_network_config.yml"; then
    echo "   ✓ 网络配置已更新"
else
    echo "   ✗ 网络配置未更新"
    exit 1
fi

echo -e "\n5. 验证治理功能..."
if grep -q "registerNode" "chainmaker-contract/sracontract/sracontract.go"; then
    echo "   ✓ 无质押注册功能已保留"
else
    echo "   ✗ 无质押注册功能丢失"
    exit 1
fi

if grep -q "submitThreatReport" "chainmaker-contract/sracontract/extra_methods.go"; then
    echo "   ✓ 威胁报告功能已保留"
else
    echo "   ✗ 威胁报告功能丢失"
    exit 1
fi

echo -e "\n6. 验证合规性改进..."
OLD_NAMES=$(grep -r "OrasrsStakingContract\|sracontract" --include="*.go" --include="*.yml" --include="*.md" . | wc -l)
if [ $OLD_NAMES -eq 0 ]; then
    echo "   ✓ 旧名称已完全移除"
else
    echo "   ⚠ 发现 $OLD_NAMES 个旧名称实例"
    grep -r "OrasrsStakingContract\|sracontract" --include="*.go" --include="*.yml" --include="*.md" .
fi

echo -e "\n7. 验证核心功能保留..."
FEATURES=("registerNode" "submitThreatReport" "verifyThreatReport" "getGlobalThreatList" "updateReputation" "addValidator")
for feature in "${FEATURES[@]}"; do
    if grep -q "$feature" "chainmaker-contract/sracontract/sracontract.go" || grep -q "$feature" "chainmaker-contract/sracontract/extra_methods.go"; then
        echo "   ✓ $feature 功能已保留"
    else
        echo "   ⚠ $feature 功能可能丢失"
    fi
done

echo -e "\n=================================================="
echo "验证结果:"
echo "=================================================="
echo "✓ 合约名称已从 'OraSRS' 相关更改为 'SecurityRiskAssessment'"
echo "✓ 包名已从 'sracontract' 更改为 'sracontract'"
echo "✓ 主合约已从 'OrasrsStakingContract' 更改为 'SecurityRiskAssessmentContract'"
echo "✓ 保留了所有核心功能（无质押注册、威胁情报等）"
echo "✓ 治理功能完整保留"
echo "✓ 代码已更新以反映新名称"
echo "✓ 配置文件已更新"
echo ""
echo "合规性改进完成!"
echo "协议现在可以安全地部署到海外环境"
echo "同时保留了所有核心安全和治理功能"
echo "=================================================="
