#!/bin/bash

# Hardhat 节点服务管理脚本
# 用于安装、启动、停止和管理 Hardhat 本地节点服务

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印函数
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SERVICE_FILE="$SCRIPT_DIR/hardhat-node.service"
SYSTEMD_SERVICE_PATH="/etc/systemd/system/hardhat-node.service"

# 检查是否为 root 用户
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "此脚本需要 root 权限运行"
        echo "请使用: sudo $0 $@"
        exit 1
    fi
}

# 安装服务
install_service() {
    print_info "安装 Hardhat 节点服务..."
    
    # 检查服务文件是否存在
    if [ ! -f "$SERVICE_FILE" ]; then
        print_error "服务文件不存在: $SERVICE_FILE"
        exit 1
    fi
    
    # 复制服务文件到 systemd 目录
    cp "$SERVICE_FILE" "$SYSTEMD_SERVICE_PATH"
    print_success "服务文件已复制到: $SYSTEMD_SERVICE_PATH"
    
    # 安装健康监控服务
    if [ -f "$SCRIPT_DIR/hardhat-health-monitor.service" ]; then
        print_info "安装健康监控服务..."
        cp "$SCRIPT_DIR/hardhat-health-monitor.service" "/etc/systemd/system/hardhat-health-monitor.service"
        print_success "健康监控服务已安装"
    fi
    
    # 重载 systemd 配置
    systemctl daemon-reload
    print_success "systemd 配置已重载"
    
    # 启用服务（开机自启）
    systemctl enable hardhat-node.service
    print_success "Hardhat 服务已设置为开机自启"
    
    # 启用健康监控服务
    if [ -f "/etc/systemd/system/hardhat-health-monitor.service" ]; then
        systemctl enable hardhat-health-monitor.service
        print_success "健康监控服务已设置为开机自启"
    fi
    
    print_success "Hardhat 节点服务安装完成！"
    echo ""
    echo "使用以下命令管理服务:"
    echo "  启动服务: sudo systemctl start hardhat-node"
    echo "  停止服务: sudo systemctl stop hardhat-node"
    echo "  重启服务: sudo systemctl restart hardhat-node"
    echo "  查看状态: sudo systemctl status hardhat-node"
    echo "  查看日志: sudo journalctl -u hardhat-node -f"
    echo ""
    echo "健康监控服务:"
    echo "  启动监控: sudo systemctl start hardhat-health-monitor"
    echo "  查看监控: sudo systemctl status hardhat-health-monitor"
    echo "  监控日志: sudo tail -f /var/log/hardhat-monitor.log"
}


# 卸载服务
uninstall_service() {
    print_info "卸载 Hardhat 节点服务..."
    
    # 停止健康监控服务
    if systemctl is-active --quiet hardhat-health-monitor.service 2>/dev/null; then
        systemctl stop hardhat-health-monitor.service
        print_success "健康监控服务已停止"
    fi
    
    # 停止主服务
    if systemctl is-active --quiet hardhat-node.service; then
        systemctl stop hardhat-node.service
        print_success "Hardhat 服务已停止"
    fi
    
    # 禁用健康监控服务
    if systemctl is-enabled --quiet hardhat-health-monitor.service 2>/dev/null; then
        systemctl disable hardhat-health-monitor.service
        print_success "健康监控服务已禁用"
    fi
    
    # 禁用主服务
    if systemctl is-enabled --quiet hardhat-node.service; then
        systemctl disable hardhat-node.service
        print_success "Hardhat 服务已禁用"
    fi
    
    # 删除健康监控服务文件
    if [ -f "/etc/systemd/system/hardhat-health-monitor.service" ]; then
        rm "/etc/systemd/system/hardhat-health-monitor.service"
        print_success "健康监控服务文件已删除"
    fi
    
    # 删除主服务文件
    if [ -f "$SYSTEMD_SERVICE_PATH" ]; then
        rm "$SYSTEMD_SERVICE_PATH"
        print_success "Hardhat 服务文件已删除"
    fi
    
    # 重载 systemd 配置
    systemctl daemon-reload
    print_success "systemd 配置已重载"
    
    print_success "Hardhat 节点服务已卸载"
}

# 启动服务
start_service() {
    print_info "启动 Hardhat 节点服务..."
    systemctl start hardhat-node.service
    sleep 2
    
    if systemctl is-active --quiet hardhat-node.service; then
        print_success "Hardhat 节点服务已启动"
        systemctl status hardhat-node.service --no-pager
    else
        print_error "Hardhat 节点服务启动失败"
        journalctl -u hardhat-node.service -n 20 --no-pager
        exit 1
    fi
}

# 停止服务
stop_service() {
    print_info "停止 Hardhat 节点服务..."
    systemctl stop hardhat-node.service
    print_success "Hardhat 节点服务已停止"
}

# 重启服务
restart_service() {
    print_info "重启 Hardhat 节点服务..."
    systemctl restart hardhat-node.service
    sleep 2
    
    if systemctl is-active --quiet hardhat-node.service; then
        print_success "Hardhat 节点服务已重启"
        systemctl status hardhat-node.service --no-pager
    else
        print_error "Hardhat 节点服务重启失败"
        journalctl -u hardhat-node.service -n 20 --no-pager
        exit 1
    fi
}

# 查看服务状态
status_service() {
    systemctl status hardhat-node.service --no-pager
}

# 查看服务日志
logs_service() {
    journalctl -u hardhat-node.service -f
}

# 测试自动重启
test_auto_restart() {
    print_info "测试自动重启功能..."
    
    if ! systemctl is-active --quiet hardhat-node.service; then
        print_error "服务未运行，请先启动服务"
        exit 1
    fi
    
    # 获取当前进程 PID
    OLD_PID=$(systemctl show hardhat-node.service -p MainPID --value)
    print_info "当前进程 PID: $OLD_PID"
    
    # 杀死进程
    print_info "终止进程以测试自动重启..."
    kill -9 $OLD_PID
    
    # 等待重启
    print_info "等待服务自动重启..."
    sleep 12
    
    # 检查新进程
    if systemctl is-active --quiet hardhat-node.service; then
        NEW_PID=$(systemctl show hardhat-node.service -p MainPID --value)
        print_success "服务已自动重启！"
        print_success "新进程 PID: $NEW_PID"
        systemctl status hardhat-node.service --no-pager
    else
        print_error "自动重启失败"
        journalctl -u hardhat-node.service -n 20 --no-pager
        exit 1
    fi
}

# 显示帮助信息
show_help() {
    echo "Hardhat 节点服务管理脚本"
    echo ""
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  install       安装 Hardhat 节点服务和健康监控"
    echo "  uninstall     卸载 Hardhat 节点服务和健康监控"
    echo "  start         启动服务"
    echo "  stop          停止服务"
    echo "  restart       重启服务"
    echo "  status        查看服务状态"
    echo "  logs          查看服务日志（实时）"
    echo "  test-restart  测试自动重启功能"
    echo "  monitor       启动健康监控"
    echo "  monitor-stop  停止健康监控"
    echo "  monitor-status 查看监控状态"
    echo "  health-check  执行健康检查"
    echo "  help          显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  sudo $0 install       # 安装服务和监控"
    echo "  sudo $0 start         # 启动服务"
    echo "  sudo $0 monitor       # 启动健康监控"
    echo "  sudo $0 status        # 查看状态"
    echo "  sudo $0 logs          # 查看日志"
}

# 主函数
main() {
    case "${1:-help}" in
        install)
            check_root
            install_service
            ;;
        uninstall)
            check_root
            uninstall_service
            ;;
        start)
            check_root
            start_service
            ;;
        stop)
            check_root
            stop_service
            ;;
        restart)
            check_root
            restart_service
            ;;
        status)
            status_service
            ;;
        logs)
            logs_service
            ;;
        test-restart)
            check_root
            test_auto_restart
            ;;
        monitor)
            check_root
            print_info "启动健康监控服务..."
            systemctl start hardhat-health-monitor.service
            sleep 2
            systemctl status hardhat-health-monitor.service --no-pager
            ;;
        monitor-stop)
            check_root
            print_info "停止健康监控服务..."
            systemctl stop hardhat-health-monitor.service
            print_success "健康监控服务已停止"
            ;;
        monitor-status)
            systemctl status hardhat-health-monitor.service --no-pager
            echo ""
            if [ -f "/var/log/hardhat-monitor.log" ]; then
                echo "最近的监控日志:"
                tail -20 /var/log/hardhat-monitor.log
            fi
            ;;
        health-check)
            bash "$SCRIPT_DIR/hardhat-health-monitor.sh" test
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "未知命令: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
