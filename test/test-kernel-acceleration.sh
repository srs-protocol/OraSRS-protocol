#!/bin/bash

# OraSRS 内核加速功能测试脚本
# 测试所有核心功能和 API 端点

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 测试结果统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# API 端点
API_BASE="http://localhost:3006"

# 打印函数
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_test() {
    echo -e "${YELLOW}[TEST]${NC} $1"
}

print_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED_TESTS++))
}

print_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED_TESTS++))
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# 测试函数
run_test() {
    ((TOTAL_TESTS++))
    local test_name=$1
    local test_command=$2
    
    print_test "$test_name"
    
    if eval "$test_command" > /dev/null 2>&1; then
        print_pass "$test_name"
        return 0
    else
        print_fail "$test_name"
        return 1
    fi
}

# API 测试函数
test_api() {
    local endpoint=$1
    local method=${2:-GET}
    local data=${3:-}
    
    if [ -z "$data" ]; then
        curl -s -X "$method" "$API_BASE$endpoint" > /dev/null
    else
        curl -s -X "$method" "$API_BASE$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" > /dev/null
    fi
}

# 检查 API 响应
check_api_response() {
    local endpoint=$1
    local expected_field=$2
    
    local response=$(curl -s "$API_BASE$endpoint")
    echo "$response" | jq -e ".$expected_field" > /dev/null 2>&1
}

# ============================================
# 测试开始
# ============================================

print_header "OraSRS 内核加速功能测试"

# ============================================
# 1. 基础健康检查
# ============================================

print_header "1. 基础健康检查"

run_test "服务健康检查" "test_api /health"
run_test "API 版本检查" "check_api_response /health success"

# ============================================
# 2. 内核加速状态测试
# ============================================

print_header "2. 内核加速状态测试"

run_test "获取内核加速状态" "test_api /orasrs/v1/kernel/stats"
run_test "检查状态响应格式" "check_api_response /orasrs/v1/kernel/stats success"
run_test "检查 kernel_acceleration 字段" "check_api_response /orasrs/v1/kernel/stats kernel_acceleration"

# 检查详细统计
run_test "获取详细统计信息" "test_api /orasrs/v1/kernel/stats/detailed"
run_test "检查详细统计响应" "check_api_response /orasrs/v1/kernel/stats/detailed success"

# ============================================
# 3. 配置管理测试
# ============================================

print_header "3. 配置管理测试"

# 保存当前配置
print_info "保存当前配置..."
ORIGINAL_CONFIG=$(curl -s "$API_BASE/orasrs/v1/kernel/stats" | jq -r '.kernel_acceleration')

# 测试模式切换
if [ "$(echo $ORIGINAL_CONFIG | jq -r '.enabled')" == "true" ]; then
    print_test "测试配置更新 (调整阈值)"
    if curl -s -X POST "$API_BASE/orasrs/v1/kernel/config" \
        -H "Content-Type: application/json" \
        -d '{"riskThreshold": 85}' | jq -e '.success' > /dev/null 2>&1; then
        print_pass "配置更新成功"
        ((PASSED_TESTS++))
        ((TOTAL_TESTS++))
    else
        print_fail "配置更新失败"
        ((FAILED_TESTS++))
        ((TOTAL_TESTS++))
    fi
    
    # 验证配置已更新
    print_test "验证配置已更新"
    sleep 1
    NEW_THRESHOLD=$(curl -s "$API_BASE/orasrs/v1/kernel/stats" | jq -r '.kernel_acceleration.riskThreshold')
    if [ "$NEW_THRESHOLD" == "85" ]; then
        print_pass "配置验证成功"
        ((PASSED_TESTS++))
        ((TOTAL_TESTS++))
    else
        print_fail "配置验证失败 (期望: 85, 实际: $NEW_THRESHOLD)"
        ((FAILED_TESTS++))
        ((TOTAL_TESTS++))
    fi
    
    # 恢复原始配置
    print_info "恢复原始配置..."
    curl -s -X POST "$API_BASE/orasrs/v1/kernel/config" \
        -H "Content-Type: application/json" \
        -d '{"riskThreshold": 80}' > /dev/null
else
    print_info "eBPF 未启用，跳过配置测试"
fi

# ============================================
# 4. 威胁数据同步测试
# ============================================

print_header "4. 威胁数据同步测试"

run_test "手动同步威胁数据" "test_api /orasrs/v1/kernel/sync POST"

# ============================================
# 5. 缓存管理测试
# ============================================

print_header "5. 缓存管理测试"

run_test "获取缓存状态" "test_api /orasrs/v1/cache/status"
run_test "检查缓存统计" "check_api_response /orasrs/v1/cache/status success"

# ============================================
# 6. 威胁查询测试
# ============================================

print_header "6. 威胁查询测试"

# 测试 IP 查询
run_test "查询测试 IP (1.2.3.4)" "test_api '/orasrs/v1/query?ip=1.2.3.4'"
run_test "查询响应格式验证" "check_api_response '/orasrs/v1/query?ip=1.2.3.4' response"

# ============================================
# 7. 白名单管理测试
# ============================================

print_header "7. 白名单管理测试"

# 添加测试 IP 到白名单
TEST_IP="192.168.100.100"

print_test "添加 IP 到白名单"
if curl -s -X POST "$API_BASE/orasrs/v1/whitelist/add" \
    -H "Content-Type: application/json" \
    -d "{\"ip\": \"$TEST_IP\"}" | jq -e '.success' > /dev/null 2>&1; then
    print_pass "添加白名单成功"
    ((PASSED_TESTS++))
    ((TOTAL_TESTS++))
else
    print_fail "添加白名单失败"
    ((FAILED_TESTS++))
    ((TOTAL_TESTS++))
fi

# 验证白名单
run_test "获取白名单列表" "test_api /orasrs/v1/whitelist"

# 移除测试 IP
print_test "从白名单移除 IP"
if curl -s -X POST "$API_BASE/orasrs/v1/whitelist/remove" \
    -H "Content-Type: application/json" \
    -d "{\"ip\": \"$TEST_IP\"}" | jq -e '.success' > /dev/null 2>&1; then
    print_pass "移除白名单成功"
    ((PASSED_TESTS++))
    ((TOTAL_TESTS++))
else
    print_fail "移除白名单失败"
    ((FAILED_TESTS++))
    ((TOTAL_TESTS++))
fi

# ============================================
# 8. CLI 工具测试
# ============================================

print_header "8. CLI 工具测试"

if command -v orasrs-cli &> /dev/null; then
    run_test "CLI: 查看状态" "orasrs-cli status"
    run_test "CLI: 查看统计" "orasrs-cli stats"
    run_test "CLI: 查看缓存" "orasrs-cli cache status"
    
    if [ "$(echo $ORIGINAL_CONFIG | jq -r '.enabled')" == "true" ]; then
        run_test "CLI: 查看内核状态" "orasrs-cli kernel"
    else
        print_info "eBPF 未启用，跳过 CLI 内核测试"
    fi
else
    print_info "orasrs-cli 未安装，跳过 CLI 测试"
fi

# ============================================
# 9. 性能测试
# ============================================

print_header "9. 性能测试"

print_test "API 响应时间测试"
START_TIME=$(date +%s%N)
for i in {1..100}; do
    curl -s "$API_BASE/orasrs/v1/kernel/stats" > /dev/null
done
END_TIME=$(date +%s%N)
ELAPSED=$((($END_TIME - $START_TIME) / 1000000))
AVG_TIME=$(($ELAPSED / 100))

if [ $AVG_TIME -lt 50 ]; then
    print_pass "平均响应时间: ${AVG_TIME}ms (< 50ms)"
    ((PASSED_TESTS++))
else
    print_fail "平均响应时间: ${AVG_TIME}ms (>= 50ms)"
    ((FAILED_TESTS++))
fi
((TOTAL_TESTS++))

# ============================================
# 10. 错误处理测试
# ============================================

print_header "10. 错误处理测试"

# 测试无效端点
print_test "测试 404 错误处理"
if curl -s "$API_BASE/invalid/endpoint" | grep -q "Cannot GET"; then
    print_pass "404 错误处理正确"
    ((PASSED_TESTS++))
else
    print_fail "404 错误处理异常"
    ((FAILED_TESTS++))
fi
((TOTAL_TESTS++))

# 测试无效配置
print_test "测试无效配置拒绝"
if curl -s -X POST "$API_BASE/orasrs/v1/kernel/config" \
    -H "Content-Type: application/json" \
    -d '{"mode": "invalid_mode"}' | jq -e '.success == false' > /dev/null 2>&1; then
    print_pass "无效配置正确拒绝"
    ((PASSED_TESTS++))
else
    print_fail "无效配置未正确拒绝"
    ((FAILED_TESTS++))
fi
((TOTAL_TESTS++))

# ============================================
# 测试总结
# ============================================

print_header "测试总结"

echo -e "总测试数: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "通过: ${GREEN}$PASSED_TESTS${NC}"
echo -e "失败: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}✅ 所有测试通过！${NC}\n"
    exit 0
else
    PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo -e "\n${YELLOW}⚠️  通过率: ${PASS_RATE}%${NC}\n"
    exit 1
fi
