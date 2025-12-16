#!/bin/sh
# OraSRS OpenWrt 一键安装脚本
# OraSRS OpenWrt Quick Installation Script
# Version: 2.0.0

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印函数
print_info() {
    echo "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo "${YELLOW}[WARNING]${NC} $1"
}

# 检查是否为 OpenWrt
check_openwrt() {
    if [ ! -f "/etc/openwrt_release" ]; then
        print_error "此脚本仅支持 OpenWrt 系统"
        exit 1
    fi
    
    . /etc/openwrt_release
    print_info "检测到 OpenWrt 版本: $DISTRIB_RELEASE"
}

# 检查系统资源
check_resources() {
    # 检查内存
    total_mem=$(free | grep Mem | awk '{print $2}')
    if [ "$total_mem" -lt 65536 ]; then
        print_warning "内存小于 64MB，可能影响性能"
    fi
    
    # 检查存储空间
    available_space=$(df / | tail -1 | awk '{print $4}')
    if [ "$available_space" -lt 10240 ]; then
        print_error "可用存储空间不足 10MB"
        exit 1
    fi
    
    print_info "系统资源检查通过"
}

# 安装依赖
install_dependencies() {
    print_info "安装依赖包..."
    
    opkg update
    
    # 基础依赖
    opkg install curl ca-certificates libustream-openssl || {
        print_warning "部分依赖包安装失败，尝试继续..."
    }
}

# 下载并安装 OraSRS Lite Client
install_orasrs() {
    print_info "下载 OraSRS Lite Client..."
    
    # 创建临时目录
    TMP_DIR="/tmp/orasrs-install"
    mkdir -p "$TMP_DIR"
    cd "$TMP_DIR"
    
    # 下载最新版本
    RELEASE_URL="https://github.com/srs-protocol/OraSRS-protocol/raw/lite-client/orasrs-lite-client/releases/orasrs-lite-client-v2.0.0-20251208"
    
    print_info "下载客户端脚本..."
    curl -L -o orasrs_client.sh "$RELEASE_URL/orasrs-lite-client.sh" || {
        print_error "下载失败，请检查网络连接"
        exit 1
    }
    
    # 安装到系统
    print_info "安装 OraSRS 客户端..."
    mkdir -p /usr/bin
    cp orasrs_client.sh /usr/bin/orasrs-client
    chmod +x /usr/bin/orasrs-client
    
    # 创建配置目录
    mkdir -p /etc/config
    mkdir -p /var/lib/orasrs
    
    # 创建默认配置
    create_config
    
    # 创建 init 脚本
    create_init_script
    
    # 清理临时文件
    cd /
    rm -rf "$TMP_DIR"
    
    print_info "OraSRS 客户端安装完成"
}

# 创建配置文件
create_config() {
    print_info "创建配置文件..."
    
    cat > /etc/config/orasrs << 'EOF'
config orasrs 'main'
    option enabled '1'
    option api_endpoint 'https://api.orasrs.net'
    option sync_interval '3600'
    option cache_size '1000'
    option log_level 'info'
    option enable_ipv6 '1'
    option block_mode 'monitor'
    option max_memory_mb '20'
    option cache_ttl '86400'
EOF
    
    print_info "配置文件已创建: /etc/config/orasrs"
}

# 创建 init 脚本
create_init_script() {
    print_info "创建服务脚本..."
    
    cat > /etc/init.d/orasrs << 'EOF'
#!/bin/sh /etc/rc.common

START=99
STOP=10

USE_PROCD=1

start_service() {
    local enabled
    config_load orasrs
    config_get enabled main enabled 0
    
    [ "$enabled" -eq 0 ] && {
        echo "OraSRS is disabled"
        return 1
    }
    
    procd_open_instance
    procd_set_param command /usr/bin/orasrs-client
    procd_set_param respawn
    procd_set_param stdout 1
    procd_set_param stderr 1
    procd_close_instance
}

stop_service() {
    killall orasrs-client 2>/dev/null
}

reload_service() {
    stop
    start
}
EOF
    
    chmod +x /etc/init.d/orasrs
    print_info "服务脚本已创建: /etc/init.d/orasrs"
}

# 启动服务
start_service() {
    print_info "启动 OraSRS 服务..."
    
    /etc/init.d/orasrs enable
    /etc/init.d/orasrs start
    
    sleep 2
    
    if pgrep -f orasrs-client > /dev/null; then
        print_info "✅ OraSRS 服务启动成功"
    else
        print_warning "⚠️  服务可能未正常启动，请检查日志: logread | grep orasrs"
    fi
}

# 显示安装信息
show_info() {
    echo ""
    echo "========================================="
    echo "  OraSRS OpenWrt 安装完成"
    echo "========================================="
    echo ""
    echo "服务管理命令:"
    echo "  启动: /etc/init.d/orasrs start"
    echo "  停止: /etc/init.d/orasrs stop"
    echo "  重启: /etc/init.d/orasrs restart"
    echo "  状态: /etc/init.d/orasrs status"
    echo ""
    echo "配置文件: /etc/config/orasrs"
    echo "查看日志: logread | grep orasrs"
    echo ""
    echo "更多信息: https://github.com/srs-protocol/OraSRS-protocol"
    echo "========================================="
}

# 主函数
main() {
    echo "========================================="
    echo "  OraSRS OpenWrt 安装脚本"
    echo "  Version: 2.0.0"
    echo "========================================="
    echo ""
    
    check_openwrt
    check_resources
    install_dependencies
    install_orasrs
    start_service
    show_info
}

# 运行主函数
main
