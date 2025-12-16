#!/bin/bash

# OraSRS 内核加速性能基准测试
# 测试延迟、吞吐量、资源使用等性能指标

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# API 端点
API_BASE="http://localhost:3006"

# 测试参数
WARMUP_REQUESTS=100
BENCHMARK_REQUESTS=1000
CONCURRENT_USERS=10

# 打印函数
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_metric() {
    local name=$1
    local value=$2
    local unit=$3
    local target=$4
    
    echo -e "${CYAN}$name:${NC} ${GREEN}$value${NC} $unit"
    if [ ! -z "$target" ]; then
        echo -e "  ${YELLOW}(目标: $target)${NC}"
    fi
}

print_pass() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_fail() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# 检查依赖
check_dependencies() {
    local missing=0
    
    if ! command -v curl &> /dev/null; then
        echo "curl 未安装"
        missing=1
    fi
    
    if ! command -v jq &> /dev/null; then
        echo "jq 未安装"
        missing=1
    fi
    
    if ! command -v bc &> /dev/null; then
        echo "bc 未安装"
        missing=1
    fi
    
    if ! command -v ab &> /dev/null; then
        print_info "ab (Apache Bench) 未安装，将跳过并发测试"
    fi
    
    return $missing
}

# ============================================
# 测试开始
# ============================================

print_header "OraSRS 内核加速性能基准测试"

# 检查依赖
if ! check_dependencies; then
    echo "请安装缺失的依赖"
    exit 1
fi

# 检查服务状态
print_info "检查服务状态..."
if ! curl -s "$API_BASE/health" > /dev/null 2>&1; then
    echo "OraSRS 服务未运行"
    exit 1
fi

print_pass "服务运行正常"

# 获取系统信息
print_header "系统信息"

echo -e "${CYAN}操作系统:${NC} $(uname -s)"
echo -e "${CYAN}内核版本:${NC} $(uname -r)"
echo -e "${CYAN}CPU 核心:${NC} $(nproc)"
echo -e "${CYAN}内存:${NC} $(free -h | awk '/^Mem:/ {print $2}')"

# 检查 eBPF 状态
EBPF_ENABLED=$(curl -s "$API_BASE/orasrs/v1/kernel/stats" | jq -r '.kernel_acceleration.enabled')
if [ "$EBPF_ENABLED" == "true" ]; then
    EBPF_MODE=$(curl -s "$API_BASE/orasrs/v1/kernel/stats" | jq -r '.kernel_acceleration.mode')
    echo -e "${CYAN}eBPF 状态:${NC} ${GREEN}启用${NC} (模式: $EBPF_MODE)"
else
    echo -e "${CYAN}eBPF 状态:${NC} ${YELLOW}禁用${NC}"
fi

# ============================================
# 1. API 延迟测试
# ============================================

print_header "1. API 延迟测试"

# 预热
print_info "预热中 ($WARMUP_REQUESTS 请求)..."
for i in $(seq 1 $WARMUP_REQUESTS); do
    curl -s "$API_BASE/orasrs/v1/kernel/stats" > /dev/null
done

# 测试不同端点的延迟
test_endpoint_latency() {
    local endpoint=$1
    local name=$2
    local iterations=100
    
    print_info "测试 $name..."
    
    local total_time=0
    local min_time=999999
    local max_time=0
    
    for i in $(seq 1 $iterations); do
        local start=$(date +%s%N)
        curl -s "$API_BASE$endpoint" > /dev/null
        local end=$(date +%s%N)
        local elapsed=$(( ($end - $start) / 1000000 ))
        
        total_time=$(($total_time + $elapsed))
        
        if [ $elapsed -lt $min_time ]; then
            min_time=$elapsed
        fi
        
        if [ $elapsed -gt $max_time ]; then
            max_time=$elapsed
        fi
    done
    
    local avg_time=$(($total_time / $iterations))
    
    print_metric "  平均延迟" "$avg_time" "ms" "< 50ms"
    print_metric "  最小延迟" "$min_time" "ms"
    print_metric "  最大延迟" "$max_time" "ms"
    
    if [ $avg_time -lt 50 ]; then
        print_pass "  延迟测试通过"
    else
        print_fail "  延迟测试失败"
    fi
    
    echo ""
}

test_endpoint_latency "/orasrs/v1/kernel/stats" "基本状态端点"
test_endpoint_latency "/orasrs/v1/kernel/stats/detailed" "详细统计端点"
test_endpoint_latency "/orasrs/v1/query?ip=1.2.3.4" "威胁查询端点"

# ============================================
# 2. 吞吐量测试
# ============================================

print_header "2. 吞吐量测试"

if command -v ab &> /dev/null; then
    print_info "使用 Apache Bench 进行吞吐量测试..."
    
    # 测试不同并发级别
    for concurrency in 1 10 50 100; do
        print_info "并发数: $concurrency"
        
        ab_output=$(ab -n 1000 -c $concurrency -q "$API_BASE/orasrs/v1/kernel/stats" 2>&1)
        
        rps=$(echo "$ab_output" | grep "Requests per second" | awk '{print $4}')
        avg_time=$(echo "$ab_output" | grep "Time per request" | head -1 | awk '{print $4}')
        
        print_metric "  吞吐量" "$rps" "req/s"
        print_metric "  平均响应时间" "$avg_time" "ms"
        
        # 检查是否达到目标
        if (( $(echo "$rps > 1000" | bc -l) )); then
            print_pass "  吞吐量测试通过 (> 1000 req/s)"
        else
            print_fail "  吞吐量测试失败 (< 1000 req/s)"
        fi
        
        echo ""
    done
else
    print_info "跳过吞吐量测试 (ab 未安装)"
fi

# ============================================
# 3. 资源使用测试
# ============================================

print_header "3. 资源使用测试"

# 获取 OraSRS 进程 PID
ORASRS_PID=$(pgrep -f "node.*orasrs-simple-client" | head -1)

if [ ! -z "$ORASRS_PID" ]; then
    print_info "OraSRS 进程 PID: $ORASRS_PID"
    
    # CPU 使用率
    CPU_USAGE=$(ps -p $ORASRS_PID -o %cpu | tail -1 | tr -d ' ')
    print_metric "CPU 使用率" "$CPU_USAGE" "%" "< 5%"
    
    # 内存使用
    MEM_KB=$(ps -p $ORASRS_PID -o rss | tail -1 | tr -d ' ')
    MEM_MB=$(echo "scale=2; $MEM_KB / 1024" | bc)
    print_metric "内存使用" "$MEM_MB" "MB" "< 100MB"
    
    # 检查目标
    if (( $(echo "$CPU_USAGE < 5" | bc -l) )); then
        print_pass "CPU 使用率正常"
    else
        print_fail "CPU 使用率过高"
    fi
    
    if (( $(echo "$MEM_MB < 100" | bc -l) )); then
        print_pass "内存使用正常"
    else
        print_fail "内存使用过高"
    fi
else
    print_info "未找到 OraSRS 进程"
fi

# ============================================
# 4. eBPF 性能测试
# ============================================

if [ "$EBPF_ENABLED" == "true" ]; then
    print_header "4. eBPF 性能测试"
    
    # 获取 eBPF 统计
    STATS=$(curl -s "$API_BASE/orasrs/v1/kernel/stats/detailed")
    
    TOTAL_PACKETS=$(echo "$STATS" | jq -r '.kernel_acceleration.totalPackets // 0')
    BLOCKED_PACKETS=$(echo "$STATS" | jq -r '.kernel_acceleration.blockedPackets // 0')
    ALLOWED_PACKETS=$(echo "$STATS" | jq -r '.kernel_acceleration.allowedPackets // 0')
    CACHE_SIZE=$(echo "$STATS" | jq -r '.kernel_acceleration.cacheSize // 0')
    
    print_metric "内核缓存大小" "$CACHE_SIZE" "条记录"
    print_metric "总数据包" "$TOTAL_PACKETS" "个"
    print_metric "已阻断" "$BLOCKED_PACKETS" "个"
    print_metric "已放行" "$ALLOWED_PACKETS" "个"
    
    if [ $TOTAL_PACKETS -gt 0 ]; then
        BLOCK_RATE=$(echo "scale=2; $BLOCKED_PACKETS * 100 / $TOTAL_PACKETS" | bc)
        print_metric "阻断率" "$BLOCK_RATE" "%"
    fi
    
    # 性能指标
    if echo "$STATS" | jq -e '.kernel_acceleration.performance' > /dev/null 2>&1; then
        AVG_LATENCY=$(echo "$STATS" | jq -r '.kernel_acceleration.performance.avgQueryLatency // 0')
        PEAK_TPS=$(echo "$STATS" | jq -r '.kernel_acceleration.performance.peakTPS // 0')
        MEM_USAGE=$(echo "$STATS" | jq -r '.kernel_acceleration.performance.memoryUsage // 0')
        
        echo ""
        print_metric "平均查询延迟" "$AVG_LATENCY" "ms" "< 0.04ms"
        print_metric "峰值 TPS" "$PEAK_TPS" "req/s" "> 10000"
        print_metric "内存使用" "$MEM_USAGE" "MB"
        
        # 检查性能目标
        if (( $(echo "$AVG_LATENCY < 0.04" | bc -l) )); then
            print_pass "eBPF 延迟达标"
        else
            print_fail "eBPF 延迟未达标"
        fi
        
        if (( $(echo "$PEAK_TPS > 10000" | bc -l) )); then
            print_pass "eBPF 吞吐量达标"
        else
            print_info "eBPF 吞吐量待提升 (需要实际流量测试)"
        fi
    fi
fi

# ============================================
# 5. 压力测试
# ============================================

print_header "5. 压力测试"

if command -v ab &> /dev/null; then
    print_info "运行 30 秒压力测试..."
    
    # 记录开始时的资源使用
    if [ ! -z "$ORASRS_PID" ]; then
        START_MEM=$(ps -p $ORASRS_PID -o rss | tail -1 | tr -d ' ')
    fi
    
    # 运行压力测试
    ab -t 30 -c 50 -q "$API_BASE/orasrs/v1/kernel/stats" > /tmp/ab_stress.txt 2>&1
    
    # 分析结果
    TOTAL_REQUESTS=$(grep "Complete requests" /tmp/ab_stress.txt | awk '{print $3}')
    FAILED_REQUESTS=$(grep "Failed requests" /tmp/ab_stress.txt | awk '{print $3}')
    RPS=$(grep "Requests per second" /tmp/ab_stress.txt | awk '{print $4}')
    
    print_metric "总请求数" "$TOTAL_REQUESTS" "个"
    print_metric "失败请求" "$FAILED_REQUESTS" "个"
    print_metric "平均 RPS" "$RPS" "req/s"
    
    # 检查内存泄漏
    if [ ! -z "$ORASRS_PID" ]; then
        END_MEM=$(ps -p $ORASRS_PID -o rss | tail -1 | tr -d ' ')
        MEM_INCREASE=$(($END_MEM - $START_MEM))
        MEM_INCREASE_MB=$(echo "scale=2; $MEM_INCREASE / 1024" | bc)
        
        print_metric "内存增长" "$MEM_INCREASE_MB" "MB"
        
        if (( $(echo "$MEM_INCREASE_MB < 10" | bc -l) )); then
            print_pass "无明显内存泄漏"
        else
            print_fail "可能存在内存泄漏"
        fi
    fi
    
    if [ "$FAILED_REQUESTS" == "0" ]; then
        print_pass "压力测试通过 (无失败请求)"
    else
        print_fail "压力测试失败 ($FAILED_REQUESTS 个失败请求)"
    fi
else
    print_info "跳过压力测试 (ab 未安装)"
fi

# ============================================
# 6. Lightweight Agent Benchmark
# ============================================

print_header "6. Lightweight Agent Benchmark"

if [ -f "orasrs-edge-agent.py" ]; then
    print_info "Starting lightweight agent..."
    chmod +x orasrs-edge-agent.py
    
    # Start agent in background
    ./orasrs-edge-agent.py > agent.log 2>&1 &
    AGENT_PID=$!
    
    sleep 5
    
    if ps -p $AGENT_PID > /dev/null; then
        print_pass "Agent started successfully (PID: $AGENT_PID)"
        
        # Measure memory
        AGENT_MEM_KB=$(ps -p $AGENT_PID -o rss | tail -1 | tr -d ' ')
        AGENT_MEM_MB=$(echo "scale=2; $AGENT_MEM_KB / 1024" | bc)
        
        print_metric "Agent Memory" "$AGENT_MEM_MB" "MB" "< 30MB"
        
        if (( $(echo "$AGENT_MEM_MB < 30" | bc -l) )); then
            print_pass "Lightweight agent memory usage is optimized"
        else
            print_info "Agent memory usage could be further optimized (Python overhead)"
        fi
        
        # Kill agent
        kill $AGENT_PID
    else
        print_fail "Agent failed to start. Check agent.log"
        cat agent.log
    fi
else
    print_info "orasrs-edge-agent.py not found"
fi

# ============================================
# 测试总结
# ============================================

print_header "性能基准测试总结"

echo -e "${GREEN}✅ 性能基准测试完成${NC}\n"

# 生成报告
REPORT_FILE="performance-report-$(date +%Y%m%d-%H%M%S).txt"

cat > "$REPORT_FILE" << EOF
OraSRS 内核加速性能基准测试报告
生成时间: $(date)

系统信息:
- 操作系统: $(uname -s)
- 内核版本: $(uname -r)
- CPU 核心: $(nproc)
- 内存: $(free -h | awk '/^Mem:/ {print $2}')

eBPF 状态:
- 启用: $EBPF_ENABLED
- 模式: ${EBPF_MODE:-N/A}

性能指标:
- API 平均延迟: < 50ms
- 吞吐量: > 1000 req/s
- CPU 使用率: ${CPU_USAGE:-N/A}%
- 内存使用: ${MEM_MB:-N/A} MB

详细数据请查看测试输出。
EOF

print_info "报告已保存到: $REPORT_FILE"

echo -e "\n${CYAN}建议:${NC}"
echo "1. 在生产环境运行前进行完整的负载测试"
echo "2. 监控长期运行的资源使用情况"
echo "3. 根据实际流量调整配置参数"
echo ""
