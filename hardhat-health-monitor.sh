#!/bin/bash

# ============================================================================
# OraSRS Hardhat 健康监控守护进程
# ============================================================================
# 功能:
# 1. 监控 Hardhat 节点健康状态
# 2. 自动重启失败的服务
# 3. 指数退避重试策略
# 4. 详细日志记录
# ============================================================================

set -euo pipefail

# 配置参数
HARDHAT_RPC_URL="http://127.0.0.1:8545"
CHECK_INTERVAL=30          # 健康检查间隔（秒）
MAX_RETRY_DELAY=300        # 最大重试延迟（秒）
INITIAL_RETRY_DELAY=10     # 初始重试延迟（秒）
LOG_FILE="/var/log/hardhat-monitor.log"
PID_FILE="/var/run/hardhat-monitor.pid"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE"
}

log_info() {
    log "INFO" "${BLUE}$@${NC}"
}

log_success() {
    log "SUCCESS" "${GREEN}$@${NC}"
}

log_warning() {
    log "WARNING" "${YELLOW}$@${NC}"
}

log_error() {
    log "ERROR" "${RED}$@${NC}"
}

# 检查是否已经在运行
check_already_running() {
    if [ -f "$PID_FILE" ]; then
        local old_pid=$(cat "$PID_FILE")
        if kill -0 "$old_pid" 2>/dev/null; then
            log_error "监控进程已在运行 (PID: $old_pid)"
            exit 1
        else
            log_warning "发现过期的 PID 文件，清理中..."
            rm -f "$PID_FILE"
        fi
    fi
}

# 保存 PID
save_pid() {
    echo $$ > "$PID_FILE"
    log_info "监控进程已启动 (PID: $$)"
}

# 清理函数
cleanup() {
    log_info "正在停止监控进程..."
    rm -f "$PID_FILE"
    exit 0
}

# 捕获退出信号
trap cleanup SIGTERM SIGINT

# 检查 Hardhat 服务状态
check_service_status() {
    if systemctl is-active --quiet hardhat-node.service; then
        return 0
    else
        return 1
    fi
}

# 健康检查 - RPC 调用
check_rpc_health() {
    local response
    response=$(curl -s -X POST "$HARDHAT_RPC_URL" \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        --max-time 5 2>&1)
    
    if echo "$response" | grep -q '"result"'; then
        return 0
    else
        return 1
    fi
}

# 综合健康检查
health_check() {
    # 1. 检查服务状态
    if ! check_service_status; then
        log_error "Hardhat 服务未运行"
        return 1
    fi
    
    # 2. 检查 RPC 响应
    if ! check_rpc_health; then
        log_error "Hardhat RPC 无响应"
        return 1
    fi
    
    return 0
}

# 计算指数退避延迟
calculate_backoff_delay() {
    local retry_count=$1
    local delay=$INITIAL_RETRY_DELAY
    
    for ((i=0; i<retry_count; i++)); do
        delay=$((delay * 2))
        if [ $delay -gt $MAX_RETRY_DELAY ]; then
            delay=$MAX_RETRY_DELAY
            break
        fi
    done
    
    echo $delay
}

# 重启服务
restart_service() {
    local retry_count=$1
    local delay=$(calculate_backoff_delay $retry_count)
    
    log_warning "准备重启 Hardhat 服务 (重试次数: $retry_count, 延迟: ${delay}s)..."
    
    # 等待退避时间
    if [ $retry_count -gt 0 ]; then
        log_info "等待 ${delay} 秒后重试..."
        sleep $delay
    fi
    
    # 重启服务
    if systemctl restart hardhat-node.service; then
        log_success "Hardhat 服务重启成功"
        
        # 等待服务启动
        log_info "等待服务完全启动..."
        sleep 10
        
        # 验证重启是否成功
        if health_check; then
            log_success "Hardhat 服务健康检查通过"
            return 0
        else
            log_error "Hardhat 服务重启后健康检查失败"
            return 1
        fi
    else
        log_error "Hardhat 服务重启失败"
        return 1
    fi
}

# 获取服务信息
get_service_info() {
    local pid=$(systemctl show hardhat-node.service -p MainPID --value)
    local uptime=$(systemctl show hardhat-node.service -p ActiveEnterTimestamp --value)
    local memory=$(systemctl show hardhat-node.service -p MemoryCurrent --value)
    
    log_info "服务信息: PID=$pid, 启动时间=$uptime, 内存=${memory}B"
}

# 主监控循环
main_monitor_loop() {
    local consecutive_failures=0
    local total_restarts=0
    local last_success_time=$(date +%s)
    
    log_success "Hardhat 健康监控已启动"
    log_info "检查间隔: ${CHECK_INTERVAL}s"
    log_info "RPC 端点: $HARDHAT_RPC_URL"
    
    while true; do
        if health_check; then
            # 健康检查通过
            if [ $consecutive_failures -gt 0 ]; then
                log_success "服务已恢复正常"
                consecutive_failures=0
            fi
            
            last_success_time=$(date +%s)
            
            # 每小时输出一次状态
            local current_time=$(date +%s)
            local time_diff=$((current_time - last_success_time))
            if [ $((time_diff % 3600)) -lt $CHECK_INTERVAL ]; then
                get_service_info
                log_info "服务运行正常 (总重启次数: $total_restarts)"
            fi
        else
            # 健康检查失败
            consecutive_failures=$((consecutive_failures + 1))
            log_error "健康检查失败 (连续失败次数: $consecutive_failures)"
            
            # 尝试重启服务
            if restart_service $consecutive_failures; then
                total_restarts=$((total_restarts + 1))
                consecutive_failures=0
                log_success "服务已成功恢复 (总重启次数: $total_restarts)"
            else
                log_error "服务重启失败，将继续重试..."
                
                # 如果连续失败超过 10 次，增加检查间隔
                if [ $consecutive_failures -gt 10 ]; then
                    log_warning "连续失败次数过多，增加检查间隔到 ${CHECK_INTERVAL}s"
                    sleep $CHECK_INTERVAL
                fi
            fi
        fi
        
        # 等待下一次检查
        sleep $CHECK_INTERVAL
    done
}

# 显示使用说明
show_usage() {
    cat << EOF
OraSRS Hardhat 健康监控守护进程

用法: $0 [命令]

命令:
  start       启动监控守护进程
  stop        停止监控守护进程
  status      查看监控状态
  logs        查看监控日志
  test        测试健康检查功能

示例:
  $0 start        # 启动监控
  $0 status       # 查看状态
  $0 logs         # 查看日志
EOF
}

# 启动守护进程
start_daemon() {
    check_already_running
    save_pid
    
    # 创建日志文件
    touch "$LOG_FILE"
    
    log_info "========================================="
    log_info "OraSRS Hardhat 健康监控守护进程"
    log_info "========================================="
    
    # 初始健康检查
    if ! health_check; then
        log_warning "初始健康检查失败，尝试启动服务..."
        systemctl start hardhat-node.service
        sleep 10
    fi
    
    # 进入主监控循环
    main_monitor_loop
}

# 停止守护进程
stop_daemon() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            log_info "正在停止监控进程 (PID: $pid)..."
            kill -TERM "$pid"
            sleep 2
            
            if kill -0 "$pid" 2>/dev/null; then
                log_warning "进程未响应，强制终止..."
                kill -9 "$pid"
            fi
            
            rm -f "$PID_FILE"
            log_success "监控进程已停止"
        else
            log_warning "监控进程未运行"
            rm -f "$PID_FILE"
        fi
    else
        log_warning "未找到 PID 文件，监控进程可能未运行"
    fi
}

# 查看状态
show_status() {
    echo "========================================="
    echo "Hardhat 监控状态"
    echo "========================================="
    
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${GREEN}监控进程: 运行中 (PID: $pid)${NC}"
        else
            echo -e "${RED}监控进程: 已停止 (过期 PID: $pid)${NC}"
        fi
    else
        echo -e "${RED}监控进程: 未运行${NC}"
    fi
    
    echo ""
    echo "Hardhat 服务状态:"
    systemctl status hardhat-node.service --no-pager || true
    
    echo ""
    echo "健康检查:"
    if health_check; then
        echo -e "${GREEN}✓ 服务健康${NC}"
    else
        echo -e "${RED}✗ 服务异常${NC}"
    fi
}

# 查看日志
show_logs() {
    if [ -f "$LOG_FILE" ]; then
        tail -f "$LOG_FILE"
    else
        echo "日志文件不存在: $LOG_FILE"
    fi
}

# 测试健康检查
test_health() {
    echo "执行健康检查..."
    
    echo -n "1. 检查服务状态... "
    if check_service_status; then
        echo -e "${GREEN}通过${NC}"
    else
        echo -e "${RED}失败${NC}"
    fi
    
    echo -n "2. 检查 RPC 响应... "
    if check_rpc_health; then
        echo -e "${GREEN}通过${NC}"
    else
        echo -e "${RED}失败${NC}"
    fi
    
    echo -n "3. 综合健康检查... "
    if health_check; then
        echo -e "${GREEN}通过${NC}"
    else
        echo -e "${RED}失败${NC}"
    fi
}

# 主函数
main() {
    case "${1:-help}" in
        start)
            start_daemon
            ;;
        stop)
            stop_daemon
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs
            ;;
        test)
            test_health
            ;;
        restart)
            stop_daemon
            sleep 2
            start_daemon
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            echo "未知命令: $1"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
