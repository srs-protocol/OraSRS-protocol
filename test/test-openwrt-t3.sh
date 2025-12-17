#!/bin/bash

# ============================================================================
# OraSRS OpenWrt T3 模块测试脚本
# ============================================================================
# 用途: 测试部署后的 T3 模块功能
# ============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置参数
OPENWRT_HOST="${1:-192.168.1.1}"
OPENWRT_USER="${2:-root}"
OPENWRT_PORT="${3:-22}"

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}  OraSRS OpenWrt T3 模块测试${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo "测试设备: ${OPENWRT_USER}@${OPENWRT_HOST}:${OPENWRT_PORT}"
echo ""

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${BLUE}[测试 ${TOTAL_TESTS}]${NC} ${test_name}"
    
    if ssh -p ${OPENWRT_PORT} ${OPENWRT_USER}@${OPENWRT_HOST} "${test_command}" 2>&1; then
        echo -e "${GREEN}  ✓ 通过${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}  ✗ 失败${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
    echo ""
}

# 1. 检查服务状态
echo -e "${YELLOW}=== 服务状态检查 ===${NC}"
echo ""

run_test "检查 OraSRS 进程" "pgrep -f orasrs-lite.js > /dev/null && echo '进程运行中'"

run_test "检查 HTTP 服务" "curl -s http://localhost:3006/health > /dev/null && echo 'HTTP 服务正常'"

# 2. 检查数据库
echo ""
echo -e "${YELLOW}=== 数据库检查 ===${NC}"
echo ""

run_test "检查数据库文件" "test -f /var/lib/orasrs/cache.db && echo '数据库文件存在'"

run_test "检查威胁表" "sqlite3 /var/lib/orasrs/cache.db 'SELECT COUNT(*) FROM threats' > /dev/null && echo '威胁表可访问'"

run_test "检查白名单表" "sqlite3 /var/lib/orasrs/cache.db 'SELECT COUNT(*) FROM whitelist' > /dev/null && echo '白名单表可访问'"

# 3. 测试 API 端点
echo ""
echo -e "${YELLOW}=== API 端点测试 ===${NC}"
echo ""

run_test "健康检查端点" "curl -s http://localhost:3006/health | grep -q 'healthy' && echo 'API 响应正常'"

run_test "统计端点" "curl -s http://localhost:3006/stats | grep -q 'totalQueries' && echo '统计端点正常'"

run_test "查询端点" "curl -s 'http://localhost:3006/query?ip=8.8.8.8' | grep -q 'risk_score' && echo '查询端点正常'"

# 4. 测试同步功能
echo ""
echo -e "${YELLOW}=== 同步功能测试 ===${NC}"
echo ""

echo -e "${BLUE}[测试]${NC} 触发手动同步..."
ssh -p ${OPENWRT_PORT} ${OPENWRT_USER}@${OPENWRT_HOST} "
    echo '触发同步...'
    killall -USR1 node 2>/dev/null || echo '发送同步信号'
    sleep 5
    echo '等待同步完成...'
"

run_test "检查同步后的威胁数量" "
    COUNT=\$(sqlite3 /var/lib/orasrs/cache.db 'SELECT COUNT(*) FROM threats WHERE expires_at > strftime(\"%s\", \"now\")')
    echo \"缓存威胁数: \$COUNT\"
    test \$COUNT -gt 0
"

# 5. 测试日志
echo ""
echo -e "${YELLOW}=== 日志检查 ===${NC}"
echo ""

run_test "检查日志文件" "test -f /var/log/orasrs.log && echo '日志文件存在'"

run_test "检查最近日志" "tail -5 /var/log/orasrs.log | grep -q 'INFO' && echo '日志正常记录'"

# 6. 显示详细信息
echo ""
echo -e "${YELLOW}=== 详细信息 ===${NC}"
echo ""

echo -e "${BLUE}服务信息:${NC}"
ssh -p ${OPENWRT_PORT} ${OPENWRT_USER}@${OPENWRT_HOST} "
    echo '进程信息:'
    ps | grep orasrs-lite | grep -v grep || echo '  未找到进程'
    echo ''
    echo '内存使用:'
    free -h | head -2
    echo ''
    echo '磁盘使用:'
    df -h /var/lib/orasrs 2>/dev/null || df -h / | head -2
"

echo ""
echo -e "${BLUE}威胁数据统计:${NC}"
ssh -p ${OPENWRT_PORT} ${OPENWRT_USER}@${OPENWRT_HOST} "
    if [ -f /var/lib/orasrs/cache.db ]; then
        echo '总威胁数:'
        sqlite3 /var/lib/orasrs/cache.db 'SELECT COUNT(*) FROM threats'
        echo ''
        echo '有效威胁数 (未过期):'
        sqlite3 /var/lib/orasrs/cache.db 'SELECT COUNT(*) FROM threats WHERE expires_at > strftime(\"%s\", \"now\")'
        echo ''
        echo '威胁来源分布:'
        sqlite3 /var/lib/orasrs/cache.db 'SELECT source, COUNT(*) FROM threats GROUP BY source'
    else
        echo '数据库文件不存在'
    fi
"

echo ""
echo -e "${BLUE}最近日志 (最后10行):${NC}"
ssh -p ${OPENWRT_PORT} ${OPENWRT_USER}@${OPENWRT_HOST} "
    if [ -f /var/log/orasrs.log ]; then
        tail -10 /var/log/orasrs.log
    else
        echo '日志文件不存在'
    fi
"

# 测试总结
echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}  测试总结${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo "总测试数: ${TOTAL_TESTS}"
echo -e "通过: ${GREEN}${PASSED_TESTS}${NC}"
echo -e "失败: ${RED}${FAILED_TESTS}${NC}"
echo ""

if [ ${FAILED_TESTS} -eq 0 ]; then
    echo -e "${GREEN}✓ 所有测试通过！${NC}"
    echo ""
    echo "T3 模块工作正常，可以投入使用。"
    exit 0
else
    echo -e "${RED}✗ 部分测试失败${NC}"
    echo ""
    echo "请检查失败的测试项并查看日志："
    echo "  ssh ${OPENWRT_USER}@${OPENWRT_HOST} 'tail -50 /var/log/orasrs.log'"
    exit 1
fi
